export const COACH_DISCOVERY_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  DECLINED: "DECLINED",
  SUSPENDED: "SUSPENDED",
  REREVIEW: "REREVIEW",
} as const;

export type CoachDiscoveryStatus =
  (typeof COACH_DISCOVERY_STATUS)[keyof typeof COACH_DISCOVERY_STATUS];

export const BACKGROUND_CHECK_STATUS = {
  NOT_REQUIRED: "NOT_REQUIRED",
  NOT_STARTED: "NOT_STARTED",
  PENDING: "PENDING",
  CLEAR: "CLEAR",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  EXPIRED: "EXPIRED",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type BackgroundCheckStatus =
  (typeof BACKGROUND_CHECK_STATUS)[keyof typeof BACKGROUND_CHECK_STATUS];

export const COACH_VIDEO_KIND = {
  TRAINING: "TRAINING",
  DRILL: "DRILL",
  INTRODUCTION: "INTRODUCTION",
} as const;

export type CoachVideoKind = (typeof COACH_VIDEO_KIND)[keyof typeof COACH_VIDEO_KIND];

export const COACH_EDIT_SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "coaching", label: "Coaching" },
  { id: "sports", label: "Sports & specialties" },
  { id: "location", label: "Location" },
  { id: "videos", label: "Videos" },
  { id: "social", label: "Social" },
  { id: "availability", label: "Availability" },
  { id: "verification", label: "Verification" },
] as const;

export type CoachEditSectionId = (typeof COACH_EDIT_SECTIONS)[number]["id"];

export function isCoachEditSection(value: string | null | undefined): value is CoachEditSectionId {
  return COACH_EDIT_SECTIONS.some((section) => section.id === value);
}

export function formatDiscoveryStatus(status: string) {
  switch (status) {
    case COACH_DISCOVERY_STATUS.DRAFT:
      return "Draft";
    case COACH_DISCOVERY_STATUS.SUBMITTED:
      return "Submitted";
    case COACH_DISCOVERY_STATUS.UNDER_REVIEW:
      return "Under review";
    case COACH_DISCOVERY_STATUS.APPROVED:
      return "Train2Play Approved";
    case COACH_DISCOVERY_STATUS.DECLINED:
      return "Declined";
    case COACH_DISCOVERY_STATUS.SUSPENDED:
      return "Suspended from discovery";
    case COACH_DISCOVERY_STATUS.REREVIEW:
      return "Re-review required";
    default:
      return status;
  }
}

export function formatBackgroundCheckStatus(status: string) {
  switch (status) {
    case BACKGROUND_CHECK_STATUS.NOT_REQUIRED:
      return "Not required";
    case BACKGROUND_CHECK_STATUS.NOT_STARTED:
      return "Not started";
    case BACKGROUND_CHECK_STATUS.PENDING:
      return "Pending";
    case BACKGROUND_CHECK_STATUS.CLEAR:
      return "Completed";
    case BACKGROUND_CHECK_STATUS.REVIEW_REQUIRED:
      return "Review required";
    case BACKGROUND_CHECK_STATUS.EXPIRED:
      return "Expired";
    case BACKGROUND_CHECK_STATUS.UNAVAILABLE:
      return "Unavailable";
    default:
      return status;
  }
}

export function isTrain2PlayApproved(status: string) {
  return status === COACH_DISCOVERY_STATUS.APPROVED;
}

/** Public badge only when the stored status currently qualifies. Never a safety claim. */
export function isBackgroundCheckPublicBadge(options: {
  status: string;
  expiresAt?: Date | null;
}) {
  if (options.status !== BACKGROUND_CHECK_STATUS.CLEAR) return false;
  if (options.expiresAt && options.expiresAt.getTime() < Date.now()) return false;
  return true;
}

export function isCoachVideoKind(value: string): value is CoachVideoKind {
  return (Object.values(COACH_VIDEO_KIND) as string[]).includes(value);
}

export function isCoachDiscoveryStatus(value: string): value is CoachDiscoveryStatus {
  return (Object.values(COACH_DISCOVERY_STATUS) as string[]).includes(value);
}

export function isBackgroundCheckStatus(value: string): value is BackgroundCheckStatus {
  return (Object.values(BACKGROUND_CHECK_STATUS) as string[]).includes(value);
}
