"use server";

import { revalidatePath } from "next/cache";

import { requireCoach } from "@/lib/session";
import { prisma } from "@/lib/db";
import { isProductionRuntime } from "@/lib/env";
import { isObjectStorageConfigured, storeImageFile, storeVideoFile } from "@/lib/storage";
import { reportVideoUploadFailure } from "@/lib/video-upload-errors";
import { MAX_VIDEO_UPLOAD_BYTES } from "@/lib/video-upload-limits";
import { allCoachingSports, isKnownAgeGroup, specialtiesForSport } from "@/lib/coaching/specialties";
import { applyCoachSocialsFromForm, ensureCoachProfile, ensureCoachPublicSlug } from "@/lib/coaching/profile";
import { submitCoachProfileForApproval } from "@/lib/coaching/approval";
import { addCoachProfileVideo } from "@/lib/coaching/videos";
import { COACH_DISCOVERY_STATUS, isCoachVideoKind } from "@/lib/coaching/status";
import { isKnownSport } from "@/lib/athletes";

export type CoachProfileActionState = { error?: string; success?: string };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function revalidateCoach(slug?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/profile/edit");
  if (slug) revalidatePath(`/coach/${slug}`);
}

async function storeImageFromForm(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) {
    return { error: "Choose a photo (JPG, PNG, or WebP)." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Photos must be 5 MB or smaller." };
  }
  if (isProductionRuntime() && !isObjectStorageConfigured()) {
    return { error: "Photo uploads need Cloudinary or R2." };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  try {
    const stored = await storeImageFile(
      Buffer.from(await file.arrayBuffer()),
      `${crypto.randomUUID()}.${ext}`,
      file.type || "image/jpeg",
    );
    return { url: stored.imageUrl };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not upload photo.",
    };
  }
}

export async function saveCoachProfileAction(
  _prev: CoachProfileActionState,
  formData: FormData,
): Promise<CoachProfileActionState> {
  const coach = await requireCoach();
  const profile = await ensureCoachProfile(coach.id);

  const socials = applyCoachSocialsFromForm(formData);
  if ("error" in socials && socials.error) return { error: socials.error };

  const avatar = await storeImageFromForm(formData.get("avatarFile"));
  if (avatar && "error" in avatar) return { error: avatar.error };
  const cover = await storeImageFromForm(formData.get("coverFile"));
  if (cover && "error" in cover) return { error: cover.error };

  const sports = formData
    .getAll("sports")
    .map((value) => String(value).trim())
    .filter((value) => isKnownSport(value) || allCoachingSports().includes(value as never));
  const uniqueSports = [...new Set(sports)];
  const primarySport =
    uniqueSports.find((sport) => sport === String(formData.get("primarySport") ?? "").trim()) ??
    uniqueSports[0] ??
    null;

  const yearsRaw = String(formData.get("yearsCoaching") ?? "").trim();
  const yearsCoaching = yearsRaw ? Number.parseInt(yearsRaw, 10) : null;
  const maxRaw = String(formData.get("maxActiveAthletes") ?? "").trim();
  const maxActiveAthletes = maxRaw ? Number.parseInt(maxRaw, 10) : null;

  const appearRequested = formData.get("appearInFindACoach") === "on";
  const appearInFindACoach =
    profile.discoveryStatus === COACH_DISCOVERY_STATUS.APPROVED ? appearRequested : false;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.coachProfile.update({
        where: { id: profile.id },
        data: {
          displayName: String(formData.get("displayName") ?? "").trim() || coach.name,
          bio: String(formData.get("bio") ?? "").trim() || null,
          organizationName: String(formData.get("organizationName") ?? "").trim() || null,
          locationLabel: String(formData.get("locationLabel") ?? "").trim() || null,
          locationCity: String(formData.get("locationCity") ?? "").trim() || null,
          locationState: String(formData.get("locationState") ?? "").trim() || null,
          serviceArea: String(formData.get("serviceArea") ?? "").trim() || null,
          yearsCoaching: Number.isFinite(yearsCoaching) ? yearsCoaching : null,
          experienceText: String(formData.get("experienceText") ?? "").trim() || null,
          certifications: String(formData.get("certifications") ?? "").trim() || null,
          inPersonCoaching: formData.get("inPersonCoaching") === "on",
          remoteCoaching: formData.get("remoteCoaching") === "on",
          acceptingAthletes: formData.get("acceptingAthletes") === "on",
          appearInFindACoach,
          maxActiveAthletes: Number.isFinite(maxActiveAthletes) ? maxActiveAthletes : null,
          ...(avatar && "url" in avatar ? { avatarUrl: avatar.url } : {}),
          ...(cover && "url" in cover ? { coverImageUrl: cover.url } : {}),
          ...(socials.data ?? {}),
        },
      });

      await tx.coachProfileSport.deleteMany({ where: { coachProfileId: profile.id } });
      if (uniqueSports.length > 0) {
        await tx.coachProfileSport.createMany({
          data: uniqueSports.map((sport) => ({
            coachProfileId: profile.id,
            sport,
            isPrimary: sport === primarySport,
            specialties: formData
              .getAll(`specialties:${sport}`)
              .map((value) => String(value))
              .filter((value) => specialtiesForSport(sport).includes(value)),
            positions: String(formData.get(`positions:${sport}`) ?? "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
              .slice(0, 8),
            ageGroups: formData
              .getAll(`ageGroups:${sport}`)
              .map((value) => String(value))
              .filter(isKnownAgeGroup),
          })),
        });
      }
    });

    const slug = await ensureCoachPublicSlug({
      id: profile.id,
      publicSlug: profile.publicSlug,
      displayName: String(formData.get("displayName") ?? "").trim() || coach.name,
    });
    revalidateCoach(slug);
    return { success: "Coach Profile saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save profile." };
  }
}

export async function submitCoachProfileAction(): Promise<CoachProfileActionState> {
  const coach = await requireCoach();
  try {
    await submitCoachProfileForApproval(coach.id);
    revalidateCoach();
    return { success: "Submitted for Train2Play approval." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not submit." };
  }
}

export async function submitCoachProfileFormAction(
  _prev: CoachProfileActionState,
  _formData: FormData,
): Promise<CoachProfileActionState> {
  return submitCoachProfileAction();
}

export async function uploadCoachProfileVideoAction(
  _prev: CoachProfileActionState,
  formData: FormData,
): Promise<CoachProfileActionState> {
  const coach = await requireCoach();
  const profile = await ensureCoachProfile(coach.id);
  const file = formData.get("videoFile");
  const title = String(formData.get("title") ?? "").trim() || "Coaching clip";
  const kind = String(formData.get("kind") ?? "TRAINING");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a video from your device." };
  }
  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    return { error: "Video must be 100 MB or smaller." };
  }
  if (isProductionRuntime() && !isObjectStorageConfigured()) {
    return { error: "Video uploads need Cloudinary or R2." };
  }
  try {
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const stored = await storeVideoFile(
      Buffer.from(await file.arrayBuffer()),
      `${crypto.randomUUID()}.${ext}`,
      file.type || "video/mp4",
    );
    await addCoachProfileVideo({
      coachProfileId: profile.id,
      coachUserId: coach.id,
      title,
      videoUrl: stored.videoUrl,
      storageKey: stored.storageKey,
      kind: isCoachVideoKind(kind) ? kind : "TRAINING",
      publicEligible: formData.get("publicEligible") === "on",
      featured: formData.get("featured") === "on",
    });
    revalidateCoach(profile.publicSlug);
    return { success: "Video added to your Coach Profile." };
  } catch (error) {
    return {
      error: reportVideoUploadFailure(error, {
        surface: "coach-profile-video",
        userId: coach.id,
        file: file instanceof File ? file : null,
      }),
    };
  }
}
