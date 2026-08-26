"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AGE_BANDS } from "@/lib/drills";
import { CATALOG_SPORTS } from "@/lib/catalog-drills";
import { prisma } from "@/lib/db";
import { requireLibraryEditor } from "@/lib/session";
import { z } from "zod";

export type DrillActionState = { error?: string; success?: string };

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

  const count = await prisma.catalogDrill.count({
    where: { sport: parsed.data.sport, ageBand: parsed.data.ageBand },
  });
  await prisma.catalogDrill.create({
    data: {
      ...parsed.data,
      sortOrder: count,
      updatedById: user.id,
    },
  });
  revalidatePath("/trainer/drills");
  redirect(
    `/trainer/drills?sport=${encodeURIComponent(parsed.data.sport)}&ageBand=${parsed.data.ageBand}`,
  );
}

export async function updateCatalogDrillAction(
  drillId: string,
  _prev: DrillActionState,
  formData: FormData,
): Promise<DrillActionState> {
  await requireLibraryEditor();
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
  await prisma.catalogDrill.update({
    where: { id: drillId },
    data: parsed.data,
  });
  revalidatePath("/trainer/drills");
  return { success: "Drill saved." };
}

export async function deleteCatalogDrillAction(drillId: string) {
  await requireLibraryEditor();
  await prisma.catalogDrill.update({
    where: { id: drillId },
    data: { isActive: false },
  });
  revalidatePath("/trainer/drills");
}
