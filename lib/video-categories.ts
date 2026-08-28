/** Sport-flexible video review categories. Unknown sports fall back to generic. */

const GENERIC = [
  "Technique",
  "Footwork",
  "Strength",
  "Game Film",
  "Other",
] as const;

const BY_SPORT: Record<string, readonly string[]> = {
  Basketball: [
    "Shooting",
    "Ball Handling",
    "Defense",
    "Footwork",
    "Game Film",
    "Other",
  ],
  Baseball: [
    "Hitting",
    "Pitching",
    "Throwing",
    "Fielding",
    "Game Film",
    "Other",
  ],
  Softball: [
    "Hitting",
    "Pitching",
    "Throwing",
    "Fielding",
    "Game Film",
    "Other",
  ],
  Volleyball: [
    "Serving",
    "Hitting",
    "Passing",
    "Setting",
    "Footwork",
    "Game Film",
    "Other",
  ],
  Football: [
    "Throwing",
    "Route Running",
    "Position Work",
    "Footwork",
    "Game Film",
    "Other",
  ],
  Soccer: [
    "Shooting",
    "Passing",
    "Dribbling",
    "Defending",
    "Footwork",
    "Game Film",
    "Other",
  ],
};

export function getVideoCategoriesForSport(sport: string): string[] {
  const key = Object.keys(BY_SPORT).find(
    (s) => s.toLowerCase() === sport.trim().toLowerCase(),
  );
  return [...(key ? BY_SPORT[key] : GENERIC)];
}

export const VIDEO_REVIEW_STATUS = {
  AWAITING_REVIEW: "AWAITING_REVIEW",
  IN_REVIEW: "IN_REVIEW",
  REVIEWED: "REVIEWED",
  LIBRARY: "LIBRARY",
  ARCHIVED: "ARCHIVED",
} as const;

export type VideoReviewStatus =
  (typeof VIDEO_REVIEW_STATUS)[keyof typeof VIDEO_REVIEW_STATUS];

export function formatVideoReviewStatus(status: string) {
  switch (status) {
    case VIDEO_REVIEW_STATUS.AWAITING_REVIEW:
      return "Awaiting review";
    case VIDEO_REVIEW_STATUS.IN_REVIEW:
      return "In review";
    case VIDEO_REVIEW_STATUS.REVIEWED:
      return "Reviewed";
    case VIDEO_REVIEW_STATUS.LIBRARY:
      return "On my profile";
    case VIDEO_REVIEW_STATUS.ARCHIVED:
      return "Archived";
    default:
      return status;
  }
}

export const VIDEO_PURPOSE = {
  REVIEW: "REVIEW",
  LIBRARY: "LIBRARY",
} as const;

export const VIDEO_SHOWCASE_VISIBILITY = {
  PRIVATE: "PRIVATE",
  COACHES: "COACHES",
  TRAIN2PLAY: "TRAIN2PLAY",
  PUBLIC_PROFILE: "PUBLIC_PROFILE",
} as const;

export type VideoShowcaseVisibility =
  (typeof VIDEO_SHOWCASE_VISIBILITY)[keyof typeof VIDEO_SHOWCASE_VISIBILITY];

export const PROFILE_VIDEO_TYPES = [
  "Training",
  "Skill Development",
  "Game Highlight",
  "Performance Test",
  "New PR",
  "Challenge",
  "Coaching",
  "Other",
] as const;

export type ProfileVideoType = (typeof PROFILE_VIDEO_TYPES)[number];

export function formatShowcaseVisibility(value: string) {
  switch (value) {
    case VIDEO_SHOWCASE_VISIBILITY.PRIVATE:
      return "Private";
    case VIDEO_SHOWCASE_VISIBILITY.COACHES:
      return "Coaches only";
    case VIDEO_SHOWCASE_VISIBILITY.TRAIN2PLAY:
      return "Train2Play";
    case VIDEO_SHOWCASE_VISIBILITY.PUBLIC_PROFILE:
      return "Public profile";
    default:
      return value;
  }
}

export function isVideoShowcaseVisibility(value: string): value is VideoShowcaseVisibility {
  return (Object.values(VIDEO_SHOWCASE_VISIBILITY) as string[]).includes(value);
}
