"use server";

import { revalidatePath } from "next/cache";

import { parseSportsFromFormData } from "@/lib/athletes";
import { replaceAthleteSports } from "@/lib/athlete-sports";
import { requireAthleteContext } from "@/lib/athlete-dashboard";

export type AthleteProfileActionState = {
  error?: string;
  success?: string;
};

export async function updateAthleteSportsAction(
  _prev: AthleteProfileActionState,
  formData: FormData,
): Promise<AthleteProfileActionState> {
  const ctx = await requireAthleteContext();
  const { sports, primarySport } = parseSportsFromFormData(formData);
  if (sports.length === 0) {
    return { error: "Select at least one sport." };
  }

  await replaceAthleteSports({
    athleteProfileId: ctx.profileId,
    sports,
    primarySport,
    position: String(formData.get("position") ?? "").trim() || null,
    legacyAthleteId: ctx.athleteId,
  });

  revalidatePath("/athlete");
  revalidatePath("/athlete/profile");
  revalidatePath("/athlete/videos/new");
  revalidatePath("/athlete/library");
  return { success: "Sports saved." };
}
