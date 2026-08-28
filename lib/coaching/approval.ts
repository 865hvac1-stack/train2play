import { prisma } from "@/lib/db";
import { writeAdminAudit } from "@/lib/admin-audit";
import { createNotification, NOTIFICATION_TYPE } from "@/lib/notifications";
import {
  BACKGROUND_CHECK_STATUS,
  COACH_DISCOVERY_STATUS,
  isBackgroundCheckStatus,
  isCoachDiscoveryStatus,
} from "@/lib/coaching/status";
import { coachProfileCompletion, ensureCoachProfile, ensureCoachPublicSlug } from "@/lib/coaching/profile";

export async function submitCoachProfileForApproval(userId: string) {
  const profile = await prisma.coachProfile.findUnique({
    where: { userId },
    include: { sports: true, user: { select: { name: true } } },
  });
  if (!profile) throw new Error("Complete your Coach Profile first.");
  if (profile.discoveryStatus === COACH_DISCOVERY_STATUS.APPROVED) {
    throw new Error("This profile is already Train2Play Approved.");
  }
  if (profile.discoveryStatus === COACH_DISCOVERY_STATUS.SUSPENDED) {
    throw new Error("This profile is suspended from discovery. Contact Train2Play Admin.");
  }
  if (
    profile.discoveryStatus === COACH_DISCOVERY_STATUS.SUBMITTED ||
    profile.discoveryStatus === COACH_DISCOVERY_STATUS.UNDER_REVIEW
  ) {
    throw new Error("Your application is already in review.");
  }
  const completion = coachProfileCompletion(profile);
  if (!completion.canSubmit) {
    throw new Error(
      `Add missing profile details before submitting: ${completion.missing
        .filter((item) => item.id !== "submit")
        .map((item) => item.label)
        .join(", ")}`,
    );
  }

  await ensureCoachPublicSlug(profile);
  const updated = await prisma.coachProfile.update({
    where: { id: profile.id },
    data: {
      discoveryStatus: COACH_DISCOVERY_STATUS.SUBMITTED,
      submittedAt: new Date(),
      requestChangesNote: null,
    },
  });

  await createNotification({
    userId,
    type: NOTIFICATION_TYPE.COACH_CONNECTION,
    title: "Coach Profile submitted",
    body: "Train2Play Admin will review your profile for discovery.",
    href: "/dashboard/profile",
    entityId: profile.id,
    entityType: "CoachProfile",
  });

  return updated;
}

export async function adminReviewCoachProfile(options: {
  adminUserId: string;
  coachProfileId: string;
  action: "APPROVE" | "DECLINE" | "REQUEST_CHANGES" | "SUSPEND" | "REACTIVATE" | "UNDER_REVIEW";
  adminNote?: string | null;
  declineReason?: string | null;
  requestChangesNote?: string | null;
}) {
  const profile = await prisma.coachProfile.findUnique({
    where: { id: options.coachProfileId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!profile) throw new Error("Coach profile not found.");

  const now = new Date();
  let discoveryStatus = profile.discoveryStatus;
  let train2playApprovedAt = profile.train2playApprovedAt;
  let appearInFindACoach = profile.appearInFindACoach;

  if (options.action === "APPROVE") {
    discoveryStatus = COACH_DISCOVERY_STATUS.APPROVED;
    train2playApprovedAt = now;
    appearInFindACoach = true;
  } else if (options.action === "DECLINE") {
    discoveryStatus = COACH_DISCOVERY_STATUS.DECLINED;
    appearInFindACoach = false;
  } else if (options.action === "REQUEST_CHANGES") {
    discoveryStatus = COACH_DISCOVERY_STATUS.DRAFT;
  } else if (options.action === "SUSPEND") {
    discoveryStatus = COACH_DISCOVERY_STATUS.SUSPENDED;
    appearInFindACoach = false;
  } else if (options.action === "REACTIVATE") {
    discoveryStatus = COACH_DISCOVERY_STATUS.APPROVED;
    train2playApprovedAt = train2playApprovedAt ?? now;
    appearInFindACoach = true;
  } else if (options.action === "UNDER_REVIEW") {
    discoveryStatus = COACH_DISCOVERY_STATUS.UNDER_REVIEW;
  }

  const updated = await prisma.coachProfile.update({
    where: { id: profile.id },
    data: {
      discoveryStatus,
      train2playApprovedAt,
      appearInFindACoach,
      reviewedAt: now,
      reviewedByUserId: options.adminUserId,
      adminNote: options.adminNote?.trim() || profile.adminNote,
      declineReason: options.declineReason?.trim() ?? profile.declineReason,
      requestChangesNote: options.requestChangesNote?.trim() ?? profile.requestChangesNote,
    },
  });

  await writeAdminAudit({
    actorUserId: options.adminUserId,
    action: `COACH_PROFILE_${options.action}`,
    entityType: "CoachProfile",
    entityId: profile.id,
    summary: `${options.action} coach discovery for ${profile.user.name}`,
  });

  const titles: Record<string, string> = {
    APPROVE: "Your Coach Profile is Train2Play Approved",
    DECLINE: "Coach Profile application update",
    REQUEST_CHANGES: "Coach Profile needs a few updates",
    SUSPEND: "Your profile was removed from Find a Coach",
    REACTIVATE: "Your Coach Profile is visible again",
    UNDER_REVIEW: "Your Coach Profile is under review",
  };
  await createNotification({
    userId: profile.userId,
    type: NOTIFICATION_TYPE.COACH_CONNECTION,
    title: titles[options.action] ?? "Coach Profile update",
    body:
      options.action === "DECLINE"
        ? "This coach profile is not approved for discovery right now."
        : options.action === "REQUEST_CHANGES"
          ? options.requestChangesNote?.trim() || "Admin requested changes before approval."
          : options.action === "APPROVE"
            ? "You can appear in Find a Coach when you enable accepting athletes."
            : undefined,
    href: "/dashboard/profile",
    entityId: profile.id,
    entityType: "CoachProfile",
  });

  return updated;
}

export async function adminUpdateBackgroundCheck(options: {
  adminUserId: string;
  coachProfileId: string;
  status: string;
  provider?: string | null;
  reference?: string | null;
  note?: string | null;
  expiresAt?: Date | null;
}) {
  if (!isBackgroundCheckStatus(options.status)) {
    throw new Error("Choose a valid background-check status.");
  }
  const profile = await prisma.coachProfile.findUnique({
    where: { id: options.coachProfileId },
    select: { id: true, userId: true, backgroundCheckStatus: true },
  });
  if (!profile) throw new Error("Coach profile not found.");

  const now = new Date();
  const updated = await prisma.coachProfile.update({
    where: { id: profile.id },
    data: {
      backgroundCheckStatus: options.status,
      backgroundCheckProvider: options.provider?.trim() || null,
      backgroundCheckReference: options.reference?.trim() || null,
      backgroundCheckAdminNote: options.note?.trim() || null,
      backgroundCheckRequestedAt:
        options.status === BACKGROUND_CHECK_STATUS.PENDING ? now : undefined,
      backgroundCheckCompletedAt:
        options.status === BACKGROUND_CHECK_STATUS.CLEAR ? now : undefined,
      backgroundCheckExpiresAt: options.expiresAt,
    },
  });

  await writeAdminAudit({
    actorUserId: options.adminUserId,
    action: "COACH_BACKGROUND_CHECK_STATUS",
    entityType: "CoachProfile",
    entityId: profile.id,
    summary: `Background-check status set to ${options.status}`,
  });

  if (profile.backgroundCheckStatus !== options.status) {
    await createNotification({
      userId: profile.userId,
      type: NOTIFICATION_TYPE.COACH_CONNECTION,
      title: "Background check status updated",
      body: "Train2Play updated the background-check status on your Coach Profile.",
      href: "/dashboard/profile",
      entityId: profile.id,
      entityType: "CoachProfile",
    });
  }

  return updated;
}

export { isCoachDiscoveryStatus, ensureCoachProfile };
