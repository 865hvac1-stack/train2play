"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAudit } from "@/lib/admin-audit";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/session";
import {
  publishPlayerOfTheWeek,
  unpublishPlayerOfTheWeek,
} from "@/lib/community/player-of-the-week";
import { markChallengeWinners } from "@/lib/community/challenges";
import { awardAchievement } from "@/lib/community/achievements";
import { invalidateRankingCache } from "@/lib/community/ranking";
import { startOfWeekMonday } from "@/lib/community/age-groups";
import type {
  ChallengeScoringType,
  ChallengeStatus,
  HomepageModuleKind,
  ResultStatus,
  VerificationType,
} from "@/lib/generated/prisma/client";

export type AdminCommunityState = { error?: string; success?: string };

function revalidateCommunity() {
  revalidatePath("/");
  revalidatePath("/admin/community");
  revalidatePath("/athlete/community");
  revalidatePath("/dashboard/community");
  revalidatePath("/trainer/community");
  invalidateRankingCache();
}

export async function savePlayerOfTheWeekAction(
  _prev: AdminCommunityState,
  formData: FormData,
): Promise<AdminCommunityState> {
  const admin = await requirePlatformAdmin();
  const athleteProfileId = String(formData.get("athleteProfileId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startDate = new Date(String(formData.get("startDate") ?? ""));
  const endDate = new Date(String(formData.get("endDate") ?? ""));
  if (!athleteProfileId || !description || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { error: "Athlete, description, and dates are required." };
  }
  const id = String(formData.get("id") ?? "").trim();
  const data = {
    athleteProfileId,
    sport: String(formData.get("sport") ?? "").trim() || null,
    featuredVideoReviewId: String(formData.get("featuredVideoReviewId") ?? "").trim() || null,
    highlight: String(formData.get("highlight") ?? "").trim() || null,
    description,
    startDate,
    endDate,
    createdByUserId: admin.id,
  };
  const row = id
    ? await prisma.playerOfTheWeek.update({ where: { id }, data })
    : await prisma.playerOfTheWeek.create({ data });
  await writeAdminAudit({
    actorUserId: admin.id,
    action: id ? "POTW_UPDATE" : "POTW_CREATE",
    entityType: "PlayerOfTheWeek",
    entityId: row.id,
    summary: `Player of the Week ${id ? "updated" : "created"}`,
  });
  revalidateCommunity();
  return { success: "Player of the Week saved." };
}

export async function publishPlayerOfTheWeekAction(id: string) {
  const admin = await requirePlatformAdmin();
  await publishPlayerOfTheWeek(id);
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "POTW_PUBLISH",
    entityType: "PlayerOfTheWeek",
    entityId: id,
    summary: "Published Player of the Week",
  });
  revalidateCommunity();
}

export async function unpublishPlayerOfTheWeekAction(id: string) {
  const admin = await requirePlatformAdmin();
  await unpublishPlayerOfTheWeek(id);
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "POTW_UNPUBLISH",
    entityType: "PlayerOfTheWeek",
    entityId: id,
    summary: "Unpublished Player of the Week",
  });
  revalidateCommunity();
}

export async function saveChallengeAction(
  _prev: AdminCommunityState,
  formData: FormData,
): Promise<AdminCommunityState> {
  const admin = await requirePlatformAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const scoringType = String(formData.get("scoringType") ?? "TRAINING_DAYS") as ChallengeScoringType;
  const startAt = new Date(String(formData.get("startAt") ?? ""));
  const endAt = new Date(String(formData.get("endAt") ?? ""));
  if (!name || !description || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return { error: "Name, description, and dates are required." };
  }
  const id = String(formData.get("id") ?? "").trim();
  const status = (String(formData.get("status") ?? "DRAFT") as ChallengeStatus) || "DRAFT";
  const data = {
    name,
    description,
    sport: String(formData.get("sport") ?? "").trim() || null,
    scoringType,
    targetValue: Number(formData.get("targetValue") ?? 5) || 5,
    metricDefinitionId: String(formData.get("metricDefinitionId") ?? "").trim() || null,
    workoutTitle: String(formData.get("workoutTitle") ?? "").trim() || null,
    startAt,
    endAt,
    status,
    createdByUserId: admin.id,
  };
  const row = id
    ? await prisma.challenge.update({ where: { id }, data })
    : await prisma.challenge.create({ data });
  if (status === "ARCHIVED") await markChallengeWinners(row.id);
  await writeAdminAudit({
    actorUserId: admin.id,
    action: id ? "CHALLENGE_UPDATE" : "CHALLENGE_CREATE",
    entityType: "Challenge",
    entityId: row.id,
    summary: `${row.name} ${status}`,
  });
  revalidateCommunity();
  return { success: "Challenge saved." };
}

export async function saveHomepageWeekAction(
  _prev: AdminCommunityState,
  formData: FormData,
): Promise<AdminCommunityState> {
  const admin = await requirePlatformAdmin();
  const weekOf = startOfWeekMonday(new Date(String(formData.get("weekOf") ?? "") || Date.now()));
  const headline = String(formData.get("headline") ?? "").trim() || "What's happening on Train2Play";
  const published = formData.get("published") === "on";
  const week = await prisma.homepageWeek.upsert({
    where: { weekOf },
    update: {
      headline,
      published,
      publishedAt: published ? new Date() : null,
    },
    create: {
      weekOf,
      headline,
      published,
      publishedAt: published ? new Date() : null,
      createdByUserId: admin.id,
    },
  });

  await prisma.homepageModule.deleteMany({ where: { weekId: week.id } });
  for (let slot = 1; slot <= 6; slot += 1) {
    const kind = String(formData.get(`slot${slot}Kind`) ?? "").trim() as HomepageModuleKind;
    if (!kind) continue;
    await prisma.homepageModule.create({
      data: {
        weekId: week.id,
        slot,
        kind,
        published: formData.get(`slot${slot}Published`) !== "off",
        title: String(formData.get(`slot${slot}Title`) ?? "").trim() || null,
        subtitle: String(formData.get(`slot${slot}Subtitle`) ?? "").trim() || null,
        body: String(formData.get(`slot${slot}Body`) ?? "").trim() || null,
        playerOfTheWeekId: String(formData.get(`slot${slot}Potw`) ?? "").trim() || null,
        challengeId: String(formData.get(`slot${slot}Challenge`) ?? "").trim() || null,
        metricDefinitionId: String(formData.get(`slot${slot}Metric`) ?? "").trim() || null,
        sport: String(formData.get(`slot${slot}Sport`) ?? "").trim() || null,
      },
    });
  }

  await writeAdminAudit({
    actorUserId: admin.id,
    action: "HOMEPAGE_WEEK_SAVE",
    entityType: "HomepageWeek",
    entityId: week.id,
    summary: `Homepage week ${weekOf.toISOString().slice(0, 10)} ${published ? "published" : "draft"}`,
  });
  revalidateCommunity();
  return { success: "Homepage week saved. This is what the public site will show." };
}

export async function verifyMetricEntryAction(
  _prev: AdminCommunityState,
  formData: FormData,
): Promise<AdminCommunityState> {
  const admin = await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const verificationType = String(formData.get("verificationType") ?? "COACH") as VerificationType;
  const resultStatus = String(formData.get("resultStatus") ?? "ACTIVE") as ResultStatus;
  const flaggedReason = String(formData.get("flaggedReason") ?? "").trim() || null;
  const entry = await prisma.metricEntry.update({
    where: { id },
    data: {
      verificationType,
      resultStatus,
      verifiedAt:
        verificationType === "COACH" || verificationType === "TRAIN2PLAY"
          ? new Date()
          : null,
      verifiedByUserId:
        verificationType === "COACH" || verificationType === "TRAIN2PLAY"
          ? admin.id
          : null,
      flaggedAt: resultStatus === "FLAGGED" ? new Date() : null,
      flaggedReason,
    },
    include: { metricDefinition: true },
  });
  if (resultStatus === "ACTIVE" && (verificationType === "COACH" || verificationType === "TRAIN2PLAY")) {
    await awardAchievement({
      athleteProfileId: entry.athleteProfileId,
      key: "NEW_PR",
      occurrenceKey: `VERIFIED:${entry.id}`,
      metadata: { metric: entry.metricDefinition.name, value: entry.value },
    });
  }
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "METRIC_VERIFY",
    entityType: "MetricEntry",
    entityId: id,
    summary: `Result ${resultStatus} / ${verificationType}`,
  });
  revalidateCommunity();
  return { success: "Result updated." };
}

export async function savePlayerOfTheWeekForm(formData: FormData) {
  await savePlayerOfTheWeekAction({}, formData);
}

export async function saveChallengeForm(formData: FormData) {
  await saveChallengeAction({}, formData);
}

export async function saveHomepageWeekForm(formData: FormData) {
  await saveHomepageWeekAction({}, formData);
}

export async function verifyMetricEntryForm(formData: FormData) {
  await verifyMetricEntryAction({}, formData);
}

export async function reviewContentSubmissionForm(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const adminNote = String(formData.get("adminNote") ?? "").trim() || null;
  if (!id || (status !== "APPROVED" && status !== "REJECTED" && status !== "PENDING")) {
    return;
  }
  await prisma.athleteContentSubmission.update({
    where: { id },
    data: {
      status,
      adminNote,
      reviewedAt: status === "PENDING" ? null : new Date(),
      reviewedByUserId: status === "PENDING" ? null : admin.id,
    },
  });
  await writeAdminAudit({
    actorUserId: admin.id,
    action: "CONTENT_SUBMISSION_REVIEW",
    entityType: "AthleteContentSubmission",
    entityId: id,
    summary: `Content submission ${status}`,
  });
  revalidatePath("/admin/community");
  revalidatePath("/admin/community/content");
}
