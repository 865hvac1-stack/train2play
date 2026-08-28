/** Display labels only — ranking still uses ranking-core.isVerifiedType. */
export function verificationLabel(type: string | null | undefined) {
  if (type === "TRAIN2PLAY") return "Train2Play verified";
  if (type === "COACH") return "Coach verified";
  if (type === "SELF_REPORTED") return "Self reported";
  return null;
}

export function isCommunityPublicProfile(profile: {
  profileVisibility: string;
  publicLeaderboardOptIn: boolean;
}) {
  return (
    profile.profileVisibility === "PUBLIC" && profile.publicLeaderboardOptIn
  );
}

export function isCommunityPublicMetric(metric: {
  isSensitive: boolean;
  publicLeaderboardEligible?: boolean;
  leaderboardEligible?: boolean;
}) {
  if (metric.isSensitive) return false;
  if (metric.publicLeaderboardEligible === false) return false;
  return true;
}
