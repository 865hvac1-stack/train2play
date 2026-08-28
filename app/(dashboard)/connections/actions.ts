"use server";

import { revalidatePath } from "next/cache";

import {
  approveCoachConnection,
  declineCoachConnection,
  ensureCoachConnectionCode,
  lookupCoachByConnectionCode,
  normalizeConnectionCode,
  regenerateCoachConnectionCode,
  requestCoachConnection,
  CONNECTION_SOURCE,
} from "@/lib/coach-connections";
import { requireAthlete, requireCoach } from "@/lib/session";
import { prisma } from "@/lib/db";

export type ConnectionActionState = {
  error?: string;
  success?: string;
  preview?: {
    id: string;
    name: string;
    sport: string | null;
    organizationName: string | null;
    code: string;
  };
};

export async function ensureMyConnectionCodeAction() {
  const coach = await requireCoach();
  return ensureCoachConnectionCode(coach.id);
}

export async function regenerateMyConnectionCodeAction(): Promise<ConnectionActionState> {
  const coach = await requireCoach();
  try {
    await regenerateCoachConnectionCode(coach.id);
    revalidatePath("/settings");
    return { success: "New connection code generated. Old codes no longer work for new requests." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not regenerate code",
    };
  }
}

export async function previewCoachCodeAction(
  _prev: ConnectionActionState,
  formData: FormData,
): Promise<ConnectionActionState> {
  await requireAthlete();
  const code = normalizeConnectionCode(String(formData.get("code") ?? ""));
  if (!code) {
    return { error: "Enter a coach connection code" };
  }

  const preview = await lookupCoachByConnectionCode(code);
  if (!preview) {
    return { error: "No coach found for that code. Check with your coach and try again." };
  }

  return { preview };
}

export async function requestCoachConnectionAction(
  coachUserId: string,
  _prev: ConnectionActionState,
  formData: FormData,
): Promise<ConnectionActionState> {
  const user = await requireAthlete();
  const sourceRaw = String(formData.get("source") ?? "COACH_CODE");
  const source =
    sourceRaw === "QR_CODE"
      ? CONNECTION_SOURCE.QR_CODE
      : CONNECTION_SOURCE.COACH_CODE;

  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) {
    return { error: "Athlete profile not found" };
  }

  if (coachUserId === user.id) {
    return { error: "You cannot connect with yourself" };
  }

  try {
    await requestCoachConnection({
      athleteProfileId: profile.id,
      coachUserId,
      source,
    });
    revalidatePath("/athlete");
    revalidatePath("/athlete/connect");
    revalidatePath("/athlete/profile");
    revalidatePath("/dashboard");
    return { success: "Request sent. Your coach will approve or decline it." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not send request",
    };
  }
}

export async function approveConnectionRequestAction(connectionId: string) {
  const coach = await requireCoach();
  await approveCoachConnection({
    connectionId,
    coachUserId: coach.id,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/requests");
  revalidatePath("/athletes");
  revalidatePath("/settings");
  revalidatePath("/athlete/coaches");
}

export async function declineConnectionRequestAction(connectionId: string) {
  const coach = await requireCoach();
  await declineCoachConnection({
    connectionId,
    coachUserId: coach.id,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/requests");
  revalidatePath("/athletes");
  revalidatePath("/athlete/coaches");
}
