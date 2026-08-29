"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { parsePhoneToE164 } from "@/lib/phone";
import { requireUser } from "@/lib/session";

export type AlertPreferenceState = {
  error?: string;
  success?: string;
};

export async function updateSmsAlertsAction(
  _prev: AlertPreferenceState,
  formData: FormData,
): Promise<AlertPreferenceState> {
  const user = await requireUser();
  const enabled = String(formData.get("smsEnabled") ?? "") === "on";
  const rawPhone = String(formData.get("phone") ?? "");
  const parsed = parsePhoneToE164(rawPhone);

  if (enabled && !parsed) {
    return { error: "Enter a valid mobile number to get text alerts." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phoneE164: parsed,
      smsAlertsEnabled: enabled && Boolean(parsed),
      smsOptInAt: enabled && parsed ? new Date() : null,
    },
  });

  revalidatePath("/athlete/profile");
  revalidatePath("/settings");
  return {
    success: enabled
      ? "Text alerts are on. We'll text this number when a coach reviews your video."
      : "Text alerts are off.",
  };
}
