"use server";

import { revalidatePath } from "next/cache";

import { requireAthlete } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  approveGuardianForConnection,
  cancelCoachConnectionRequest,
  CONNECTION_SOURCE,
  requestCoachConnection,
} from "@/lib/coach-connections";

export type CoachRequestActionState = { error?: string; success?: string };

export async function requestDiscoverableCoachAction(
  coachUserId: string,
  _prev: CoachRequestActionState,
  formData: FormData,
): Promise<CoachRequestActionState> {
  const user = await requireAthlete();
  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) return { error: "Athlete profile not found." };
  if (coachUserId === user.id) return { error: "You cannot connect with yourself." };
  try {
    await requestCoachConnection({
      athleteProfileId: profile.id,
      coachUserId,
      source: CONNECTION_SOURCE.DISCOVERY,
      athleteNote: String(formData.get("athleteNote") ?? "").trim() || null,
      requestedSpecialty: String(formData.get("requestedSpecialty") ?? "").trim() || null,
    });
    revalidatePath("/athlete");
    revalidatePath("/athlete/coaches");
    revalidatePath("/dashboard/requests");
    revalidatePath("/dashboard");
    return { success: "Request sent. We'll let you know when the coach responds." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not send request." };
  }
}

export async function approveGuardianCoachRequestAction(connectionId: string) {
  const user = await requireAthlete();
  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) throw new Error("Athlete profile not found.");
  await approveGuardianForConnection({
    connectionId,
    athleteProfileId: profile.id,
  });
  revalidatePath("/athlete/coaches");
  revalidatePath("/dashboard/requests");
}

export async function cancelCoachRequestAction(connectionId: string) {
  const user = await requireAthlete();
  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) throw new Error("Athlete profile not found.");
  await cancelCoachConnectionRequest({
    connectionId,
    athleteProfileId: profile.id,
  });
  revalidatePath("/athlete/coaches");
  revalidatePath("/dashboard/requests");
}
