"use server";

import { revalidatePath } from "next/cache";

import {
  listCoachPushAthletes,
  pushDrillToAthletes,
} from "@/lib/catalog-drill-delivery";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/session";

/** Coach forwards a director's suggested drill to one of their own players. */
export async function sendSuggestedDrillToAthleteAction(
  drillId: string,
  athleteProfileId: string,
) {
  const user = await requireCoach();
  const drill = await prisma.catalogDrill.findFirst({
    where: { id: drillId, isActive: true, shareWithCoaches: true },
    select: { id: true, sport: true },
  });
  if (!drill) throw new Error("Drill is not shared with coaches");

  const allowed = await listCoachPushAthletes(user.id);
  if (!allowed.some((athlete) => athlete.id === athleteProfileId)) {
    throw new Error("That player is not on your roster");
  }

  await pushDrillToAthletes({
    drillId: drill.id,
    athleteProfileIds: [athleteProfileId],
    pushedByUserId: user.id,
    source: "COACH",
    resetViewed: true,
  });

  revalidatePath("/dashboard");
  revalidatePath("/athletes");
  revalidatePath("/athlete");
  revalidatePath("/trainer/drills");
}
