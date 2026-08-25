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
    default:
      return status;
  }
}
