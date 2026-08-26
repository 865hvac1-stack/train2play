import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { ensureOrganizationMembership } from "@/lib/organizations";
import { SPORTS } from "@/lib/athletes";

export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Password must include a letter")
      .regex(/[0-9]/, "Password must include a number"),
    accountType: z.enum(["COACH", "ATHLETE"]).default("COACH"),
    sports: z.array(z.string()).optional(),
    sport: z.string().optional(),
    position: z.string().optional(),
    dateOfBirth: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.accountType === "ATHLETE") {
      const sports = [...new Set((data.sports ?? []).filter(Boolean))];
      if (sports.length === 0 && data.sport?.trim()) {
        sports.push(data.sport.trim());
      }
      if (sports.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Select at least one sport",
          path: ["sports"],
        });
        return;
      }
      for (const sport of sports) {
        if (!SPORTS.includes(sport as (typeof SPORTS)[number])) {
          ctx.addIssue({
            code: "custom",
            message: "Select a valid sport",
            path: ["sports"],
          });
          return;
        }
      }
    }
  });

export type SignupInput = z.infer<typeof signupSchema>;

function splitDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "Athlete";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;
  return { firstName, lastName };
}

function staffRoleForEmail(email: string) {
  const lowered = email.toLowerCase();
  const admins = (process.env.PLATFORM_ADMIN_EMAIL ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (admins.includes(lowered)) return "PLATFORM_ADMIN" as const;
  const trainers = (process.env.TRAINER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (trainers.includes(lowered)) return "TRAINER" as const;
  return "COACH" as const;
}

export async function createUser(input: SignupInput) {
  const data = signupSchema.parse(input);
  const email = data.email.toLowerCase();
  const accountType = data.accountType ?? "COACH";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const displayName = data.name.trim();

  if (accountType === "ATHLETE") {
    const { firstName, lastName } = splitDisplayName(displayName);
    const listed = [
      ...new Set(
        (data.sports ?? [])
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
    const sport =
      (data.sport?.trim() && listed.includes(data.sport.trim())
        ? data.sport.trim()
        : listed[0]!) ;
    const sports = [sport, ...listed.filter((item) => item !== sport)];
    const position = data.position?.trim() || null;
    const dateOfBirth = data.dateOfBirth
      ? new Date(`${data.dateOfBirth}T12:00:00`)
      : null;

    const user = await prisma.user.create({
      data: {
        name: displayName,
        email,
        passwordHash,
        role: "ATHLETE",
        onboardingCompletedAt: new Date(),
      },
    });

    await prisma.athleteProfile.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        dateOfBirth:
          dateOfBirth && !Number.isNaN(dateOfBirth.getTime())
            ? dateOfBirth
            : null,
        primarySport: sport,
        sports: {
          create: sports.map((item, index) => ({
            sport: item,
            position: index === 0 ? position : null,
            isPrimary: index === 0,
          })),
        },
      },
    });

    return user;
  }

  const staffRole = staffRoleForEmail(email);
  const user = await prisma.user.create({
    data: {
      name: displayName,
      email,
      passwordHash,
      role: staffRole,
      onboardingCompletedAt:
        staffRole === "COACH" ? null : new Date(),
    },
  });

  await ensureOrganizationMembership(user.id);

  return user;
}
