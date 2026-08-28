import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { ensureOrganizationMembership } from "@/lib/organizations";
import { allowlistedRoleForEmail } from "@/lib/role-allowlist";
import { SPORTS } from "@/lib/athletes";
import {
  CONSENT_DOCUMENT_VERSION,
  CONSENT_TYPE,
  isMinor,
  parseDateOfBirth,
} from "@/lib/consent";

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
    signupRole: z.enum(["PLAYER", "PARENT", "COACH"]).optional(),
    sports: z.array(z.string()).optional(),
    sport: z.string().optional(),
    position: z.string().optional(),
    dateOfBirth: z.string().optional(),
    acceptTerms: z.boolean().default(false),
    guardianFirstName: z.string().optional(),
    guardianLastName: z.string().optional(),
    guardianRelationship: z.string().optional(),
    guardianEmail: z.string().optional(),
    guardianPhone: z.string().optional(),
    parentalConsent: z.boolean().default(false),
    publicVideoConsent: z.boolean().default(false),
    publicLeaderboardConsent: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.acceptTerms) {
      ctx.addIssue({
        code: "custom",
        message: "Please agree to the Terms of Service and Privacy Policy",
        path: ["acceptTerms"],
      });
    }
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
      if (!data.dateOfBirth) {
        ctx.addIssue({
          code: "custom",
          message: "Enter the athlete's date of birth",
          path: ["dateOfBirth"],
        });
        return;
      }
      const dateOfBirth = parseDateOfBirth(data.dateOfBirth);
      if (!dateOfBirth) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid date of birth",
          path: ["dateOfBirth"],
        });
        return;
      }
      if (data.signupRole === "PARENT" && !isMinor(dateOfBirth)) {
        ctx.addIssue({
          code: "custom",
          message:
            "Players 18 and older should sign up as an Athlete with their own email.",
          path: ["dateOfBirth"],
        });
        return;
      }
      if (data.signupRole === "PARENT") {
        const loginEmail = data.email.trim().toLowerCase();
        const guardianEmail = data.guardianEmail?.trim().toLowerCase();
        if (guardianEmail && guardianEmail !== loginEmail) {
          ctx.addIssue({
            code: "custom",
            message:
              "The parent email is the login for this player account.",
            path: ["guardianEmail"],
          });
          return;
        }
      }
      if (isMinor(dateOfBirth)) {
        const requiredGuardianFields = [
          ["guardianFirstName", data.guardianFirstName, "Parent/guardian first name"],
          ["guardianLastName", data.guardianLastName, "Parent/guardian last name"],
          ["guardianRelationship", data.guardianRelationship, "Relationship"],
          ["guardianEmail", data.guardianEmail, "Parent/guardian email"],
        ] as const;
        for (const [path, value, label] of requiredGuardianFields) {
          if (!value?.trim()) {
            ctx.addIssue({
              code: "custom",
              message: `${label} is required for athletes under 18`,
              path: [path],
            });
            return;
          }
        }
        if (!z.string().email().safeParse(data.guardianEmail).success) {
          ctx.addIssue({
            code: "custom",
            message: "Enter a valid parent/guardian email address",
            path: ["guardianEmail"],
          });
          return;
        }
        if (!data.parentalConsent) {
          ctx.addIssue({
            code: "custom",
            message: "A parent or legal guardian must provide consent",
            path: ["parentalConsent"],
          });
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
  return allowlistedRoleForEmail(email) ?? ("COACH" as const);
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
    const dateOfBirth = parseDateOfBirth(data.dateOfBirth!);
    if (!dateOfBirth) throw new Error("Enter a valid date of birth");
    const minor = isMinor(dateOfBirth);
    const guardianName = minor
      ? `${data.guardianFirstName!.trim()} ${data.guardianLastName!.trim()}`
      : null;
    const guardianEmail = minor ? data.guardianEmail!.trim().toLowerCase() : null;

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: displayName,
          email,
          passwordHash,
          role: "ATHLETE",
          onboardingCompletedAt: new Date(),
        },
      });

      await tx.athleteProfile.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          dateOfBirth,
          primarySport: sport,
          publicVideoSharingEnabled: data.publicVideoConsent,
          publicLeaderboardOptIn: data.publicLeaderboardConsent,
          privacySettingsUpdatedAt: new Date(),
          sports: {
            create: sports.map((item, index) => ({
              sport: item,
              position: index === 0 ? position : null,
              isPrimary: index === 0,
            })),
          },
          guardianContacts: minor
            ? {
                create: {
                  firstName: data.guardianFirstName!.trim(),
                  lastName: data.guardianLastName!.trim(),
                  relationship: data.guardianRelationship!.trim(),
                  email: guardianEmail!,
                  phone: data.guardianPhone?.trim() || null,
                },
              }
            : undefined,
          consentRecords: {
            create: [
              {
                grantedByUserId: user.id,
                consentType: CONSENT_TYPE.TERMS_AND_PRIVACY,
                granted: true,
                documentVersion: CONSENT_DOCUMENT_VERSION,
                guardianName,
                guardianEmail,
              },
              ...(minor
                ? [
                    {
                      grantedByUserId: user.id,
                      consentType: CONSENT_TYPE.PARENTAL_DATA,
                      granted: true,
                      documentVersion: CONSENT_DOCUMENT_VERSION,
                      guardianName,
                      guardianEmail,
                    },
                  ]
                : []),
              {
                grantedByUserId: user.id,
                consentType: CONSENT_TYPE.PUBLIC_VIDEO,
                granted: data.publicVideoConsent,
                documentVersion: CONSENT_DOCUMENT_VERSION,
                guardianName,
                guardianEmail,
              },
              {
                grantedByUserId: user.id,
                consentType: CONSENT_TYPE.PUBLIC_LEADERBOARD,
                granted: data.publicLeaderboardConsent,
                documentVersion: CONSENT_DOCUMENT_VERSION,
                guardianName,
                guardianEmail,
              },
            ],
          },
        },
      });

      return user;
    });
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
