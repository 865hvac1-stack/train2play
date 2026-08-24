"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { PROFILE_METRICS } from "@/lib/player-profile";
import { requireUser } from "@/lib/session";

export type PickupPlayerActionState = {
  error?: string;
};

const pickupPlayerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  sport: z.string().min(1, "Sport is required"),
  position: z.string().optional(),
  throws: z.string().optional(),
  bats: z.string().optional(),
  notes: z.string().optional(),
});

function parseOptionalNumber(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export async function createPickupPlayerAction(
  _prevState: PickupPlayerActionState,
  formData: FormData,
): Promise<PickupPlayerActionState> {
  const user = await requireUser();

  const parsed = pickupPlayerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    sport: formData.get("sport"),
    position: formData.get("position") || undefined,
    throws: formData.get("throws") || undefined,
    bats: formData.get("bats") || undefined,
    notes: formData.get("notes") || undefined,
    throwingVelo: parseOptionalNumber(formData.get("throwingVelo")),
    batSpeed: parseOptionalNumber(formData.get("batSpeed")),
    exitVelo: parseOptionalNumber(formData.get("exitVelo")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const metricEntries: { label: string; value: number; unit: string }[] = [];
  if (parsed.data.throwingVelo) {
    metricEntries.push({
      label: PROFILE_METRICS[0].label,
      value: parsed.data.throwingVelo,
      unit: PROFILE_METRICS[0].unit,
    });
  }
  if (parsed.data.batSpeed) {
    metricEntries.push({
      label: PROFILE_METRICS[1].label,
      value: parsed.data.batSpeed,
      unit: PROFILE_METRICS[1].unit,
    });
  }
  if (parsed.data.exitVelo) {
    metricEntries.push({
      label: PROFILE_METRICS[2].label,
      value: parsed.data.exitVelo,
      unit: PROFILE_METRICS[2].unit,
    });
  }

  const athlete = await prisma.athlete.create({
    data: {
      coachId: user.id,
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      sport: parsed.data.sport,
      position: parsed.data.position?.trim() || null,
      throws: parsed.data.throws?.trim() || null,
      bats: parsed.data.bats?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      rosterStatus: "PICKUP",
      progressMetrics:
        metricEntries.length > 0
          ? {
              create: metricEntries.map((entry) => ({
                label: entry.label,
                value: entry.value,
                unit: entry.unit,
                notes: "Logged at pickup signup",
              })),
            }
          : undefined,
    },
  });

  revalidatePath("/pickup-players");
  revalidatePath("/athletes");
  revalidatePath("/dashboard");
  redirect(`/athletes/${athlete.id}`);
}

export async function promotePickupToRosterAction(athleteId: string) {
  const user = await requireUser();

  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, coachId: user.id, rosterStatus: "PICKUP" },
  });

  if (!athlete) {
    throw new Error("Pickup player not found");
  }

  await prisma.athlete.update({
    where: { id: athleteId },
    data: { rosterStatus: "ROSTER" },
  });

  revalidatePath(`/athletes/${athleteId}`);
  revalidatePath("/pickup-players");
  revalidatePath("/athletes");
}
