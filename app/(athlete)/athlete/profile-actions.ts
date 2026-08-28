"use server";

import { revalidatePath } from "next/cache";

import { parseSportsFromFormData } from "@/lib/athletes";
import { replaceAthleteSports } from "@/lib/athlete-sports";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { prisma } from "@/lib/db";
import { AGE_OF_MAJORITY, ageOn } from "@/lib/consent";
import {
  allocateUniqueSlug,
  isReservedProfileSlug,
  isValidProfileSlug,
  slugifyProfileName,
} from "@/lib/community/slugs";
import { parseSocialInput, type SocialNetwork } from "@/lib/community/social";
import { normalizeStateCode } from "@/lib/community/age-groups";
import { ensurePublicSlug } from "@/lib/community/profile";
import type { ProfileVisibility } from "@/lib/generated/prisma/client";

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
    secondaryPosition: String(formData.get("secondaryPosition") ?? "").trim() || null,
    legacyAthleteId: ctx.athleteId,
  });

  revalidatePath("/athlete");
  revalidatePath("/athlete/profile");
  revalidatePath("/athlete/profile/edit");
  revalidatePath("/athlete/videos/new");
  revalidatePath("/athlete/library");
  return { success: "Sports saved." };
}

const VISIBILITY: ProfileVisibility[] = [
  "PRIVATE",
  "AUTHENTICATED",
  "ORGANIZATION",
  "PUBLIC",
];

export async function updatePlayerProfileAction(
  _prev: AthleteProfileActionState,
  formData: FormData,
): Promise<AthleteProfileActionState> {
  const ctx = await requireAthleteContext();
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: ctx.profileId },
  });
  if (!profile) return { error: "Profile not found." };

  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 600) || null;
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim() || null;
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim() || null;
  const graduationYearRaw = String(formData.get("graduationYear") ?? "").trim();
  const graduationYear = graduationYearRaw ? Number(graduationYearRaw) : null;
  const locationState = normalizeStateCode(String(formData.get("locationState") ?? ""));
  const visibilityRaw = String(formData.get("profileVisibility") ?? "PRIVATE");
  const profileVisibility = VISIBILITY.includes(visibilityRaw as ProfileVisibility)
    ? (visibilityRaw as ProfileVisibility)
    : "PRIVATE";

  const isAthleteMinor = profile.dateOfBirth
    ? ageOn(profile.dateOfBirth) < AGE_OF_MAJORITY
    : true;

  if (profileVisibility === "PUBLIC" && isAthleteMinor && !profile.publicVideoSharingEnabled) {
    // Minors may publish a privacy-safe profile, but default stays conservative.
  }

  const requestedSlug = slugifyProfileName(String(formData.get("publicSlug") ?? ""));
  let publicSlug = profile.publicSlug;
  if (requestedSlug && requestedSlug !== profile.publicSlug) {
    if (!isValidProfileSlug(requestedSlug) || isReservedProfileSlug(requestedSlug)) {
      return { error: "That profile URL is not available." };
    }
    publicSlug = await allocateUniqueSlug(requestedSlug, async (candidate) => {
      const existing = await prisma.athleteProfile.findUnique({
        where: { publicSlug: candidate },
        select: { id: true },
      });
      return Boolean(existing && existing.id !== profile.id);
    });
  }
  if (!publicSlug) {
    publicSlug = await ensurePublicSlug(profile);
  }

  function socialFromForm(network: SocialNetwork, publicField: string) {
    const parsed = parseSocialInput(network, String(formData.get(`${network}Url`) ?? ""));
    const wantPublic = formData.get(publicField) === "on";
    if (parsed && "error" in parsed) return { error: parsed.error };
    if (isAthleteMinor && wantPublic && !parsed) {
      return { handle: null, url: null, public: false };
    }
    return {
      handle: parsed && "handle" in parsed ? parsed.handle : null,
      url: parsed && "url" in parsed ? parsed.url : null,
      public: Boolean(parsed && wantPublic && (!isAthleteMinor || wantPublic)),
    };
  }

  const instagram = socialFromForm("instagram", "instagramPublic");
  if ("error" in instagram) return { error: instagram.error };
  const x = socialFromForm("x", "xPublic");
  if ("error" in x) return { error: x.error };
  const tiktok = socialFromForm("tiktok", "tiktokPublic");
  if ("error" in tiktok) return { error: tiktok.error };
  const youtube = socialFromForm("youtube", "youtubePublic");
  if ("error" in youtube) return { error: youtube.error };

  const featuredVideoReviewId =
    String(formData.get("featuredVideoReviewId") ?? "").trim() || null;
  if (featuredVideoReviewId) {
    const owned = await prisma.videoReview.findFirst({
      where: { id: featuredVideoReviewId, athleteProfileId: profile.id },
      select: { id: true },
    });
    if (!owned) return { error: "Choose one of your own videos to feature." };
  }

  const showcaseIds = formData.getAll("showcaseVideoIds").map(String).filter(Boolean);
  const featuredMetricIds = formData.getAll("featuredMetricIds").map(String).filter(Boolean);

  if (showcaseIds.length > 0) {
    const owned = await prisma.videoReview.findMany({
      where: { id: { in: showcaseIds }, athleteProfileId: profile.id },
      select: { id: true },
    });
    if (owned.length !== showcaseIds.length) {
      return { error: "Showcase videos must belong to you." };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.athleteProfile.update({
      where: { id: profile.id },
      data: {
        displayName,
        bio,
        avatarUrl,
        coverImageUrl,
        graduationYear:
          graduationYear && graduationYear >= 2000 && graduationYear <= 2040
            ? graduationYear
            : null,
        locationState,
        profileVisibility,
        publicSlug,
        slugUpdatedAt: publicSlug !== profile.publicSlug ? new Date() : profile.slugUpdatedAt,
        instagramHandle: instagram.handle,
        instagramUrl: instagram.url,
        instagramPublic: instagram.public,
        xHandle: x.handle,
        xUrl: x.url,
        xPublic: x.public,
        tiktokHandle: tiktok.handle,
        tiktokUrl: tiktok.url,
        tiktokPublic: tiktok.public,
        youtubeHandle: youtube.handle,
        youtubeUrl: youtube.url,
        youtubePublic: youtube.public,
        featuredVideoReviewId,
        featuredMetricIds,
        publicVideoSharingEnabled: formData.get("publicVideoSharingEnabled") === "on",
        publicLeaderboardOptIn: formData.get("publicLeaderboardOptIn") === "on",
        privacySettingsUpdatedAt: new Date(),
        recruitingStatus: String(formData.get("recruitingStatus") ?? "").trim() || null,
        collegeInterest: String(formData.get("collegeInterest") ?? "").trim() || null,
      },
    });

    await tx.athleteProfileVideoShowcase.deleteMany({
      where: {
        athleteProfileId: profile.id,
        ...(showcaseIds.length ? { videoReviewId: { notIn: showcaseIds } } : {}),
      },
    });
    if (showcaseIds.length === 0) {
      await tx.athleteProfileVideoShowcase.deleteMany({
        where: { athleteProfileId: profile.id },
      });
    }
    for (const [index, videoReviewId] of showcaseIds.entries()) {
      await tx.athleteProfileVideoShowcase.upsert({
        where: {
          athleteProfileId_videoReviewId: {
            athleteProfileId: profile.id,
            videoReviewId,
          },
        },
        update: { sortOrder: index },
        create: {
          athleteProfileId: profile.id,
          videoReviewId,
          sortOrder: index,
        },
      });
    }
  });

  const { sports, primarySport } = parseSportsFromFormData(formData);
  if (sports.length > 0) {
    await replaceAthleteSports({
      athleteProfileId: ctx.profileId,
      sports,
      primarySport,
      position: String(formData.get("position") ?? "").trim() || null,
      secondaryPosition: String(formData.get("secondaryPosition") ?? "").trim() || null,
      legacyAthleteId: ctx.athleteId,
    });
  }

  revalidatePath("/athlete");
  revalidatePath("/athlete/profile");
  revalidatePath("/athlete/profile/edit");
  revalidatePath("/athlete/community");
  if (publicSlug) revalidatePath(`/p/${publicSlug}`);
  return { success: "Saved successfully." };
}
