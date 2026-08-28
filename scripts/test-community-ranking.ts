/**
 * Ranking engine unit tests — shared by athlete, coach, director, admin, homepage.
 * Run: npx tsx scripts/test-community-ranking.ts
 */
import {
  creditedTrainingDays,
  denseCompetitionRank,
  improvementDelta,
  MAX_CREDITED_TRAINING_DAYS_PER_WEEK,
  rankMovement,
  uniqueTrainingDays,
} from "../lib/community/ranking-core";
import {
  isReservedProfileSlug,
  isValidProfileSlug,
  slugifyProfileName,
  suggestedProfileSlug,
} from "../lib/community/slugs";
import { parseSocialInput } from "../lib/community/social";
import { profileCompletion } from "../lib/community/profile";
import { publicSocialLinks, safeDisplayName } from "../lib/community/privacy";
import { ageGroupFromAge } from "../lib/community/age-groups";
import {
  mostImprovedEmptyCopy,
  resolveAthleteCommunityFilters,
  topPerformancesEmptyCopy,
} from "../lib/community/athlete-community";
import {
  isCommunityPublicMetric,
  isCommunityPublicProfile,
  verificationLabel,
} from "../lib/community/verification";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  }
}

const ties = denseCompetitionRank(
  [
    { athleteProfileId: "a", value: 80 },
    { athleteProfileId: "b", value: 78 },
    { athleteProfileId: "c", value: 78 },
    { athleteProfileId: "d", value: 74 },
  ],
  "HIGHER_IS_BETTER",
);
assertEqual(
  ties.map((row) => row.rank),
  [1, 2, 2, 4],
  "higher-is-better ties should be 1,2,2,4",
);
assert(ties[1]!.tied && ties[2]!.tied, "tied rows marked");

const sprints = denseCompetitionRank(
  [
    { athleteProfileId: "a", value: 7.1 },
    { athleteProfileId: "b", value: 7.4 },
    { athleteProfileId: "c", value: 7.1 },
  ],
  "LOWER_IS_BETTER",
);
assert(sprints[0]!.rank === 1 && sprints[1]!.rank === 1, "faster times share rank 1");
assert(sprints[2]!.rank === 3, "next rank skips to 3");

assertEqual(
  improvementDelta({ first: 68, latest: 78, direction: "HIGHER_IS_BETTER" }),
  10,
  "velo improvement",
);
assert(
  Math.abs(
    improvementDelta({ first: 7.6, latest: 7.2, direction: "LOWER_IS_BETTER" }) - 0.4,
  ) < 1e-9,
  "faster sprint is improvement",
);
assert(
  improvementDelta({ first: 7.6, latest: 7.2, direction: "LOWER_IS_BETTER" }) > 0,
  "faster sprint is improvement",
);
assert(
  improvementDelta({ first: 78, latest: 76, direction: "HIGHER_IS_BETTER" }) < 0,
  "do not fabricate improvement",
);

const weekDates = Array.from({ length: 10 }, (_, i) => {
  const d = new Date("2026-08-24T12:00:00");
  d.setDate(d.getDate() + i);
  return d;
});
assert(uniqueTrainingDays(weekDates) === 10, "unique days count calendar days");
assert(
  creditedTrainingDays(weekDates) <= weekDates.length,
  "credited days never exceed unique days",
);
assert(
  creditedTrainingDays(weekDates) < uniqueTrainingDays(weekDates),
  "spam sessions in a week are capped",
);
assert(MAX_CREDITED_TRAINING_DAYS_PER_WEEK === 6, "weekly cap is 6 days");

assertEqual(rankMovement(8, 12), 4, "moved up 4 spots");
assertEqual(rankMovement(null, 4), null, "no movement without both ranks");

assert(suggestedProfileSlug("Hudson", "Reed") === "hudson-r", "hudson-r slug");
assert(isReservedProfileSlug("admin"), "admin reserved");
assert(isReservedProfileSlug("login"), "login reserved");
assert(!isValidProfileSlug("ab"), "too short");
assert(isValidProfileSlug("hudson-h"), "valid slug");
assert(slugifyProfileName("Hudson H.") === "hudson-h", "slugify name");

const ig = parseSocialInput("instagram", "@hudson.ball");
assert(ig && "url" in ig && ig.url.includes("instagram.com/hudson.ball"), "instagram handle");
const bad = parseSocialInput("instagram", "not a valid handle!!!");
assert(bad && "error" in bad, "reject junk handle");
const yt = parseSocialInput("youtube", "https://www.youtube.com/@hudson");
assert(yt && "url" in yt, "youtube url");

const minorName = safeDisplayName({
  firstName: "Hudson",
  lastName: "Reed",
  dateOfBirth: new Date("2012-05-18"),
});
assert(minorName === "Hudson R.", `minor safe name, got ${minorName}`);
const adultName = safeDisplayName({
  firstName: "Hudson",
  lastName: "Reed",
  displayName: "H-Train",
  dateOfBirth: new Date("2000-01-01"),
});
assert(adultName === "H-Train", "adult display name");

const hidden = publicSocialLinks({
  links: [
    {
      network: "instagram",
      label: "Instagram",
      handle: "kid",
      url: "https://instagram.com/kid",
      public: false,
    },
  ],
  dateOfBirth: new Date("2012-05-18"),
  profileVisibility: "PUBLIC",
});
assert(hidden.length === 0, "social links default hidden");

const shown = publicSocialLinks({
  links: [
    {
      network: "instagram",
      label: "Instagram",
      handle: "kid",
      url: "https://instagram.com/kid",
      public: true,
    },
  ],
  dateOfBirth: new Date("2012-05-18"),
  profileVisibility: "PUBLIC",
});
assert(shown.length === 1, "explicit social opt-in is respected");

const privateSocial = publicSocialLinks({
  links: shown,
  dateOfBirth: new Date("2012-05-18"),
  profileVisibility: "PRIVATE",
});
assert(privateSocial.length === 0, "private profiles expose no socials");

const ownerPreviewSocial = publicSocialLinks({
  links: shown,
  dateOfBirth: new Date("2012-05-18"),
  profileVisibility: "PRIVATE",
  previewAsPublic: true,
});
assert(ownerPreviewSocial.length === 1, "owner preview can show opted-in socials without publishing");

const completion = profileCompletion({
  avatarUrl: null,
  coverImageUrl: null,
  bio: null,
  featuredVideoReviewId: null,
  instagramUrl: null,
  xUrl: null,
  tiktokUrl: null,
  youtubeUrl: null,
  sports: [{ position: null }],
  metricCount: 0,
});
assert(
  completion.missing.find((item) => item.id === "social")?.href ===
    "/athlete/profile/edit?section=social",
  "social completion links to edit social section",
);
assert(
  completion.missing.find((item) => item.id === "metric")?.href === "/athlete/progress",
  "metric completion links to progress",
);
assert(
  completion.missing.find((item) => item.id === "video")?.href ===
    "/athlete/profile?upload=1",
  "video completion links to profile upload",
);

assert(ageGroupFromAge(12) === "12U", "12 year old is 12U");
assert(ageGroupFromAge(19) === "19+", "adult age group");

const resolved = resolveAthleteCommunityFilters({
  query: {},
  sports: ["Baseball", "Basketball"],
  primarySport: "Baseball",
  ageGroup: "12U",
  organizations: [],
  locationState: "TN",
});
assert(resolved.sport === "Baseball", "default sport is my sport");
assert(resolved.metricSport === "Baseball", "metric sport follows selected sport");
assert(resolved.ageGroup === "12U", "default age group is my cohort");
assert(resolved.state === null, "state defaults to all eligible");

const basketball = resolveAthleteCommunityFilters({
  query: { sport: "Basketball", ageGroup: "all" },
  sports: ["Baseball", "Basketball"],
  primarySport: "Baseball",
  ageGroup: "12U",
  organizations: [],
  locationState: "TN",
});
assert(basketball.sport === "Basketball", "multi-sport athletes can switch sports");
assert(basketball.metricSport === "Basketball", "do not mix baseball metrics into basketball");
assert(basketball.ageGroup === null, "all eligible age groups is explicit");

const allSports = resolveAthleteCommunityFilters({
  query: { sport: "all" },
  sports: ["Baseball", "Basketball"],
  primarySport: "Baseball",
  ageGroup: "12U",
  organizations: [],
  locationState: null,
});
assert(allSports.sport === null, "all eligible sports drops the sport filter");
assert(
  allSports.metricSport === "Baseball",
  "metric boards stay on my sport so baseball is never ranked against basketball",
);

assert(verificationLabel("COACH") === "Coach verified", "coach verification label");
assert(
  verificationLabel("TRAIN2PLAY") === "Train2Play verified",
  "train2play verification label",
);
assert(verificationLabel("SELF_REPORTED") === "Self reported", "self-reported is labeled");
assert(
  isCommunityPublicProfile({
    profileVisibility: "PRIVATE",
    publicLeaderboardOptIn: true,
  }) === false,
  "private profiles stay off community boards",
);
assert(
  isCommunityPublicProfile({
    profileVisibility: "PUBLIC",
    publicLeaderboardOptIn: false,
  }) === false,
  "leaderboard opt-out is honored",
);
assert(
  isCommunityPublicMetric({ isSensitive: true, publicLeaderboardEligible: true }) ===
    false,
  "sensitive metrics never appear",
);
assert(
  mostImprovedEmptyCopy(0).includes("over time"),
  "zero-result empty copy explains how improvement appears",
);
assert(
  mostImprovedEmptyCopy(1).includes("Nice start"),
  "one-result empty copy is context-aware",
);
assert(
  topPerformancesEmptyCopy("Baseball").includes("Baseball"),
  "top performances empty copy uses the selected sport",
);

console.log("community ranking/privacy tests passed");
