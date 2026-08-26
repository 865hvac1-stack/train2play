"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AGE_BANDS } from "@/lib/drills";
import { pushDrillToSavedAudience } from "@/lib/catalog-drill-delivery";
import { CATALOG_SPORTS } from "@/lib/catalog-drills";
import { prisma } from "@/lib/db";
import { resolveOptionalInstructionVideo } from "@/lib/instruction-video-upload";
import { requireLibraryEditor } from "@/lib/session";
import { z } from "zod";

export type DrillActionState = { error?: string; success?: string };

function revalidateDrillSurfaces() {
  revalidatePath("/trainer/drills");
  revalidatePath("/trainer");
  revalidatePath("/athlete");
  revalidatePath("/dashboard");
  revalidatePath("/athletes");
}

const drillSchema = z.object({
  sport: z.string().min(1),
  ageBand: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  focus: z.string().min(1, "Focus is required"),
  durationMin: z.coerce.number().int().min(1).max(180),
  equipment: z.string().min(1, "Equipment is required"),
  howTo: z.string().min(1, "How-to is required"),
  coachingCue: z.string().min(1, "Cue is required"),
});

async function resolveAthleteAudience(sport: string, formData: FormData) {
  const requested = String(
    formData.get("athleteAudience") ?? "ALL_SPORT",
  ).toUpperCase();
  const athleteAudience = ["NONE", "ALL_SPORT", "SELECTED"].includes(requested)
    ? requested
    : "ALL_SPORT";
  if (athleteAudience !== "SELECTED") {
    return { athleteAudience, athleteProfileIds: [] };
  }

  const requestedIds = [
    ...new Set(
      formData
        .getAll("athleteProfileIds")
        .map((value) => String(value))
        .filter(Boolean),
    ),
  ];
  if (requestedIds.length === 0) {
    return { athleteAudience, athleteProfileIds: [] };
  }

  const eligible = await prisma.athleteProfile.findMany({
    where: {
      id: { in: requestedIds },
      OR: [
        {
          sports: {
            some: { sport: { equals: sport, mode: "insensitive" } },
          },
        },
        { primarySport: { equals: sport, mode: "insensitive" } },
        {
          legacyAthlete: {
            is: { sport: { equals: sport, mode: "insensitive" } },
          },
        },
      ],
    },
    select: { id: true },
  });
  return {
    athleteAudience,
    athleteProfileIds: eligible.map((athlete) => athlete.id),
  };
}

export async function createCatalogDrillAction(
  _prev: DrillActionState,
  formData: FormData,
): Promise<DrillActionState> {
  const user = await requireLibraryEditor();
  const parsed = drillSchema.safeParse({
    sport: formData.get("sport"),
    ageBand: formData.get("ageBand"),
    title: formData.get("title"),
    focus: formData.get("focus"),
    durationMin: formData.get("durationMin"),
    equipment: formData.get("equipment"),
    howTo: formData.get("howTo"),
    coachingCue: formData.get("coachingCue"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid drill" };
  }
  if (!CATALOG_SPORTS.includes(parsed.data.sport as (typeof CATALOG_SPORTS)[number])) {
    return { error: "Pick a sport from the list" };
  }
  if (!AGE_BANDS.some((band) => band.id === parsed.data.ageBand)) {
    return { error: "Pick an age band" };
  }
  const video = await resolveOptionalInstructionVideo(formData);
  if (!video.ok) return { error: video.error };
  const audience = await resolveAthleteAudience(parsed.data.sport, formData);

  const count = await prisma.catalogDrill.count({
    where: { sport: parsed.data.sport, ageBand: parsed.data.ageBand },
  });
  const created = await prisma.catalogDrill.create({
    data: {
      ...parsed.data,
      videoUrl: video.url,
      videoStorageKey: video.storageKey,
      shareWithCoaches: formData.get("shareWithCoaches") === "on",
      shareWithAthletes: audience.athleteAudience !== "NONE",
      athleteAudience: audience.athleteAudience,
      athleteRecipients:
        audience.athleteAudience === "SELECTED"
          ? {
              create: audience.athleteProfileIds.map((athleteProfileId) => ({
                athleteProfileId,
              })),
            }
          : undefined,
      sortOrder: count,
      updatedById: user.id,
    },
    select: { id: true },
  });
  const sent = await pushDrillToSavedAudience({
    drillId: created.id,
    pushedByUserId: user.id,
  });
  revalidateDrillSurfaces();
  redirect(`/trainer/drills/${created.id}?sent=${sent.sent}`);
}

export async function updateCatalogDrillAction(
  drillId: string,
  _prev: DrillActionState,
  formData: FormData,
): Promise<DrillActionState> {
  const user = await requireLibraryEditor();
  const parsed = drillSchema.safeParse({
    sport: formData.get("sport"),
    ageBand: formData.get("ageBand"),
    title: formData.get("title"),
    focus: formData.get("focus"),
    durationMin: formData.get("durationMin"),
    equipment: formData.get("equipment"),
    howTo: formData.get("howTo"),
    coachingCue: formData.get("coachingCue"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid drill" };
  }
  const video = await resolveOptionalInstructionVideo(formData);
  if (!video.ok) return { error: video.error };
  const audience = await resolveAthleteAudience(parsed.data.sport, formData);
  await prisma.catalogDrill.update({
    where: { id: drillId },
    data: {
      ...parsed.data,
      ...(video.url
        ? { videoUrl: video.url, videoStorageKey: video.storageKey }
        : {}),
      shareWithCoaches: formData.get("shareWithCoaches") === "on",
      shareWithAthletes: audience.athleteAudience !== "NONE",
      athleteAudience: audience.athleteAudience,
      athleteRecipients: {
        deleteMany: {},
        create:
          audience.athleteAudience === "SELECTED"
            ? audience.athleteProfileIds.map((athleteProfileId) => ({
                athleteProfileId,
              }))
            : [],
      },
    },
  });
  const sent = await pushDrillToSavedAudience({
    drillId,
    pushedByUserId: user.id,
  });
  revalidateDrillSurfaces();
  revalidatePath(`/trainer/drills/${drillId}`);
  return {
    success:
      sent.sent > 0
        ? `Drill saved and sent to ${sent.sent} player${sent.sent === 1 ? "" : "s"}.`
        : "Drill saved. No players are set to receive it yet.",
  };
}

export async function updateCatalogDrillAudienceAction(
  drillId: string,
  formData: FormData,
) {
  const user = await requireLibraryEditor();
  const drill = await prisma.catalogDrill.findUnique({
    where: { id: drillId },
    select: { sport: true },
  });
  if (!drill) throw new Error("Drill not found");
  const audience = await resolveAthleteAudience(drill.sport, formData);
  await prisma.catalogDrill.update({
    where: { id: drillId },
    data: {
      shareWithCoaches: formData.get("shareWithCoaches") === "on",
      shareWithAthletes: audience.athleteAudience !== "NONE",
      athleteAudience: audience.athleteAudience,
      athleteRecipients: {
        deleteMany: {},
        create:
          audience.athleteAudience === "SELECTED"
            ? audience.athleteProfileIds.map((athleteProfileId) => ({
                athleteProfileId,
              }))
            : [],
      },
    },
  });
  const sent = await pushDrillToSavedAudience({
    drillId,
    pushedByUserId: user.id,
  });
  revalidateDrillSurfaces();
  revalidatePath(`/trainer/drills/${drillId}`);
  redirect(`/trainer/drills/${drillId}?sent=${sent.sent}`);
}

/** Director "send now": deliver the drill to everyone the saved audience covers. */
export async function pushCatalogDrillAction(drillId: string) {
  const user = await requireLibraryEditor();
  const result = await pushDrillToSavedAudience({
    drillId,
    pushedByUserId: user.id,
  });
  revalidateDrillSurfaces();
  revalidatePath(`/trainer/drills/${drillId}`);
  redirect(`/trainer/drills/${drillId}?sent=${result.sent}`);
}

export async function deleteCatalogDrillAction(drillId: string) {
  await requireLibraryEditor();
  await prisma.catalogDrill.update({
    where: { id: drillId },
    data: { isActive: false },
  });
  revalidateDrillSurfaces();
}
