import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "@/auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { prisma } = await import("@/lib/db");

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!isValid) {
          return null;
        }

        const staffRole = (() => {
          const lowered = user.email.toLowerCase();
          const admins = (process.env.PLATFORM_ADMIN_EMAIL ?? "")
            .split(",")
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean);
          if (admins.includes(lowered) && user.role !== "PLATFORM_ADMIN") {
            return "PLATFORM_ADMIN" as const;
          }
          const trainers = (process.env.TRAINER_EMAILS ?? "")
            .split(",")
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean);
          if (
            trainers.includes(lowered) &&
            user.role !== "PLATFORM_ADMIN" &&
            user.role !== "TRAINER"
          ) {
            return "TRAINER" as const;
          }
          return null;
        })();
        let role = user.role;
        if (staffRole) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              role: staffRole,
              onboardingCompletedAt: user.onboardingCompletedAt ?? new Date(),
            },
          });
          role = staffRole;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role,
        };
      },
    }),
  ],
});
