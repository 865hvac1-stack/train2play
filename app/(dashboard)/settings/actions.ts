"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { sendShareInviteEmail } from "@/lib/email";
import { getShareUrl } from "@/lib/share";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "@/lib/settings";
import { requireUser } from "@/lib/session";

export type SettingsActionState = {
  error?: string;
  success?: string;
};

export async function updateProfileAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await requireUser();

  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name.trim() },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: "Profile updated successfully." };
}

export async function changePasswordAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const sessionUser = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });

  if (!user) {
    return { error: "Account not found" };
  }

  const isValid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash,
  );

  if (!isValid) {
    return { error: "Current password is incorrect" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { success: "Password updated successfully." };
}

export type EmailActionState = {
  error?: string;
  success?: string;
};

export async function sendShareInviteEmailAction(
  athleteId: string,
  linkId: string,
): Promise<EmailActionState> {
  const user = await requireUser();

  const link = await prisma.parentShareLink.findFirst({
    where: {
      id: linkId,
      athleteId,
      revokedAt: null,
      athlete: { coachId: user.id },
    },
    include: {
      athlete: { select: { firstName: true, lastName: true } },
    },
  });

  if (!link) {
    return { error: "Share link not found" };
  }

  if (!link.parentEmail) {
    return { error: "Add a parent email when generating this link first." };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const coachName = dbUser?.name ?? "Your coach";
  const athleteName = `${link.athlete.firstName} ${link.athlete.lastName}`;
  const shareUrl = getShareUrl(link.token);

  const result = await sendShareInviteEmail({
    to: link.parentEmail,
    athleteName,
    coachName,
    shareUrl,
  });

  if (!result.sent) {
    return { error: result.reason };
  }

  return { success: `Invite sent to ${link.parentEmail}` };
}
