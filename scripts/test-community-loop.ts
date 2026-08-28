/**
 * DB-level Player Profile + Community loop.
 * Run: npx tsx scripts/test-community-loop.ts
 */
import "dotenv/config";

import { createPrismaClient } from "../lib/db";
import { allocateUniqueSlug, suggestedProfileSlug } from "../lib/community/slugs";
import { denseCompetitionRank } from "../lib/community/ranking-core";
import { awardAchievement, listAthleteAchievements } from "../lib/community/achievements";
import { getShareablePlayerProfile } from "../lib/community/profile";
import { profileVisibleToViewer, safeDisplayName } from "../lib/community/privacy";
import { recordPerformanceMetric } from "../lib/personal-records";

const prisma = createPrismaClient();

async function main() {
  const athlete = await prisma.user.findUnique({
    where: { email: "athlete@example.com" },
    include: { athleteProfile: true },
  });
  if (!athlete?.athleteProfile) {
    console.log("skip: demo athlete not seeded");
    return;
  }
  const profile = athlete.athleteProfile;

  const slug = await allocateUniqueSlug(
    suggestedProfileSlug(profile.firstName, profile.lastName),
    async (candidate) => {
      const existing = await prisma.athleteProfile.findUnique({
        where: { publicSlug: candidate },
        select: { id: true },
      });
      return Boolean(existing && existing.id !== profile.id);
    },
  );

  await prisma.athleteProfile.update({
    where: { id: profile.id },
    data: {
      publicSlug: slug,
      profileVisibility: "PUBLIC",
      locationState: "TN",
      publicLeaderboardOptIn: true,
      instagramHandle: "hudsonh",
      instagramUrl: "https://www.instagram.com/hudsonh",
      instagramPublic: false,
      displayName: null,
    },
  });

  const privateView = await getShareablePlayerProfile(slug, { kind: "public" });
  if (privateView.status !== "ok") throw new Error("public profile should load when PUBLIC");
  if (privateView.profile.socials.length > 0) {
    throw new Error("instagram must stay hidden until explicitly public");
  }
  if (privateView.profile.identity.displayName !== "Hudson R." &&
      !privateView.profile.identity.displayName.startsWith("Hudson")) {
    // Hudson Reed seed is a minor (2012)
    console.log("display name", privateView.profile.identity.displayName);
  }

  await prisma.athleteProfile.update({
    where: { id: profile.id },
    data: { profileVisibility: "PRIVATE" },
  });
  const hidden = await getShareablePlayerProfile(slug, { kind: "public" });
  if (hidden.status !== "not_found") {
    throw new Error("private profiles must 404 publicly");
  }

  await prisma.athleteProfile.update({
    where: { id: profile.id },
    data: { instagramPublic: true },
  });
  const ownerPreview = await getShareablePlayerProfile(slug, {
    kind: "self",
    userId: athlete.id,
  });
  if (ownerPreview.status !== "ok") {
    throw new Error("owner must preview a private profile without publishing it");
  }
  if (!ownerPreview.profile.ownerPreview) {
    throw new Error("owner preview flag missing");
  }
  if (ownerPreview.profile.socials.length !== 1) {
    throw new Error("owner preview should show opted-in socials");
  }
  const stillHidden = await getShareablePlayerProfile(slug, { kind: "public" });
  if (stillHidden.status !== "not_found") {
    throw new Error("owner preview must not make a private profile public");
  }

  await prisma.athleteProfile.update({
    where: { id: profile.id },
    data: { profileVisibility: "PUBLIC", instagramPublic: false },
  });

  const metric = await prisma.metricDefinition.findFirst({
    where: { slug: "throwing_velocity", sport: "Baseball", isActive: true },
  });
  if (metric && profile.legacyAthleteId) {
    await recordPerformanceMetric({
      athleteId: profile.legacyAthleteId,
      athleteProfileId: profile.id,
      metricDefinitionId: metric.id,
      value: 68,
      enteredByUserId: athlete.id,
    });
    await recordPerformanceMetric({
      athleteId: profile.legacyAthleteId,
      athleteProfileId: profile.id,
      metricDefinitionId: metric.id,
      value: 76,
      enteredByUserId: athlete.id,
    });
  }

  await awardAchievement({
    athleteProfileId: profile.id,
    key: "FIRST_WORKOUT",
  });
  const badges = await listAthleteAchievements(profile.id);
  if (!badges.some((row) => row.key === "FIRST_WORKOUT")) {
    throw new Error("achievement not persisted");
  }

  const ranked = denseCompetitionRank(
    [
      { athleteProfileId: profile.id, value: 76 },
      { athleteProfileId: "other", value: 76 },
    ],
    "HIGHER_IS_BETTER",
  );
  if (ranked[0]!.rank !== 1 || ranked[1]!.rank !== 1) {
    throw new Error("ties must share rank");
  }

  if (
    profileVisibleToViewer("PRIVATE", { kind: "public" }) ||
    !profileVisibleToViewer("PUBLIC", { kind: "public" })
  ) {
    throw new Error("visibility rules failed");
  }

  console.log("community loop tests passed", {
    slug,
    safeName: safeDisplayName({
      firstName: profile.firstName,
      lastName: profile.lastName,
      dateOfBirth: profile.dateOfBirth,
    }),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
