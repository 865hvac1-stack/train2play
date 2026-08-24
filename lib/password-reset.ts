import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { sendPasswordResetEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { prisma } from "@/lib/db";

export const requestResetSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Password must include a letter")
      .regex(/[0-9]/, "Password must include a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function requestPasswordReset(email: string) {
  const normalized = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  // Always return success to avoid email enumeration
  if (!user) {
    return { ok: true as const };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
  const result = await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });

  if (!result.sent) {
    return { ok: false as const, error: result.reason };
  }

  return { ok: true as const };
}

export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
}) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token: input.token },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new Error("This reset link is invalid or has expired.");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
}
