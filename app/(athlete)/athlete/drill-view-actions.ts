"use server";

import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { markDrillPushesViewed } from "@/lib/catalog-drill-delivery";

/** Records that the athlete actually saw a drill a director or coach sent. */
export async function markSuggestedDrillsSeenAction(drillIds: string[]) {
  const ctx = await requireAthleteContext();
  await markDrillPushesViewed({
    athleteProfileId: ctx.profileId,
    drillIds: drillIds.filter(Boolean).slice(0, 25),
  });
}
