"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { geocodeZipCode, normalizeZipCode, distanceMiles } from "@/lib/geocoding";
import { getNearbyPickupUrl, getPickupProfileUrl } from "@/lib/app-url";
import { sendPickupInterestEmail, sendPickupPlayerAlertEmail } from "@/lib/email";
import { findCoachesToNotifyForPickupPlayer } from "@/lib/pickup-matching-server";
import { getLatestMetricForLabel, PROFILE_METRICS } from "@/lib/player-profile";

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
  zipCode: z
    .string()
    .min(5, "Zip code is required")
    .transform((value) => normalizeZipCode(value))
    .refine((value) => /^\d{5}$/.test(value), "Enter a valid 5-digit US zip code"),
  pickupType: z.enum(["GUEST", "LOOKING_FOR_TEAM"]).default("GUEST"),
  availabilityNotes: z.string().optional(),
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

  const throwingVelo = parseOptionalNumber(formData.get("throwingVelo"));
  const batSpeed = parseOptionalNumber(formData.get("batSpeed"));
  const exitVelo = parseOptionalNumber(formData.get("exitVelo"));

  const parsed = pickupPlayerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    sport: formData.get("sport"),
    position: formData.get("position") || undefined,
    throws: formData.get("throws") || undefined,
    bats: formData.get("bats") || undefined,
    notes: formData.get("notes") || undefined,
    zipCode: formData.get("zipCode"),
    pickupType: formData.get("pickupType") || "GUEST",
    availabilityNotes: formData.get("availabilityNotes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const geo = await geocodeZipCode(parsed.data.zipCode);
  if (!geo) {
    return { error: "Could not find that US zip code. Double-check and try again." };
  }

  const listedForPickup = formData.get("listedForPickup") === "true";

  const metricEntries: { label: string; value: number; unit: string }[] = [];
  if (throwingVelo) {
    metricEntries.push({
      label: PROFILE_METRICS[0].label,
      value: throwingVelo,
      unit: PROFILE_METRICS[0].unit,
    });
  }
  if (batSpeed) {
    metricEntries.push({
      label: PROFILE_METRICS[1].label,
      value: batSpeed,
      unit: PROFILE_METRICS[1].unit,
    });
  }
  if (exitVelo) {
    metricEntries.push({
      label: PROFILE_METRICS[2].label,
      value: exitVelo,
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
      zipCode: geo.zipCode,
      latitude: geo.latitude,
      longitude: geo.longitude,
      pickupType: parsed.data.pickupType,
      availabilityNotes: parsed.data.availabilityNotes?.trim() || null,
      listedForPickup,
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

  if (listedForPickup) {
    const coaches = await findCoachesToNotifyForPickupPlayer(athlete.id, user.id);
    const profileUrl = getPickupProfileUrl(athlete.id);
    const nearbyUrl = getNearbyPickupUrl();
    const playerWithMetrics = await prisma.athlete.findUnique({
      where: { id: athlete.id },
      include: { progressMetrics: { orderBy: { recordedAt: "desc" } } },
    });
    const throwing = playerWithMetrics
      ? getLatestMetricForLabel(playerWithMetrics.progressMetrics, "Throwing velo")
      : null;

    for (const coach of coaches) {
      if (coach.latitude == null || coach.longitude == null) continue;
      const miles = distanceMiles(
        coach.latitude,
        coach.longitude,
        geo.latitude,
        geo.longitude,
      );
      await sendPickupPlayerAlertEmail({
        to: coach.email,
        coachName: coach.name,
        playerName: `${athlete.firstName} ${athlete.lastName}`,
        sport: athlete.sport,
        position: athlete.position,
        zipCode: geo.zipCode,
        distanceMiles: miles,
        throwingVelo: throwing?.value ?? null,
        pickupType: athlete.pickupType,
        profileUrl,
        nearbyUrl,
      });
    }
  }

  revalidatePath("/pickup-players");
  revalidatePath("/pickup-players/nearby");
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
    data: { rosterStatus: "ROSTER", listedForPickup: false },
  });

  revalidatePath(`/athletes/${athleteId}`);
  revalidatePath("/pickup-players");
  revalidatePath("/athletes");
}

export async function expressInterestAction(pickupAthleteId: string) {
  const user = await requireUser();

  const pickupAthlete = await prisma.athlete.findFirst({
    where: {
      id: pickupAthleteId,
      rosterStatus: "PICKUP",
      listedForPickup: true,
      NOT: { coachId: user.id },
    },
    include: {
      coach: { select: { id: true, name: true, email: true } },
    },
  });

  if (!pickupAthlete) {
    throw new Error("Pickup player not found");
  }

  const existing = await prisma.pickupInterest.findUnique({
    where: {
      interestedCoachId_pickupAthleteId: {
        interestedCoachId: user.id,
        pickupAthleteId,
      },
    },
  });

  if (existing) {
    revalidatePath("/pickup-players/nearby");
    return;
  }

  await prisma.pickupInterest.create({
    data: {
      interestedCoachId: user.id,
      pickupAthleteId,
    },
  });

  const interestedCoach = await prisma.user.findUnique({ where: { id: user.id } });

  await sendPickupInterestEmail({
    to: pickupAthlete.coach.email,
    listingCoachName: pickupAthlete.coach.name,
    interestedCoachName: interestedCoach?.name ?? "A coach",
    interestedCoachEmail: interestedCoach?.email ?? user.email ?? "",
    playerName: `${pickupAthlete.firstName} ${pickupAthlete.lastName}`,
    message: null,
    profileUrl: getPickupProfileUrl(pickupAthleteId),
  });

  revalidatePath("/pickup-players/nearby");
}
