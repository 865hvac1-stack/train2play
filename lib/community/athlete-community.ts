import { ageGroupFromAge, AGE_GROUPS } from "@/lib/community/age-groups";
import { ageFromDateOfBirth } from "@/lib/drills";

export type CommunityFilterQuery = {
  sport?: string;
  ageGroup?: string;
  organizationId?: string;
  state?: string;
};

export type ResolvedCommunityFilters = {
  sport: string | null;
  metricSport: string;
  ageGroup: string | null;
  organizationId: string | null;
  state: string | null;
  sportAll: boolean;
  ageAll: boolean;
};

export function resolveAthleteCommunityFilters(input: {
  query: CommunityFilterQuery;
  sports: string[];
  primarySport: string;
  ageGroup: string | null;
  organizations: { id: string; name: string }[];
  locationState: string | null;
}): ResolvedCommunityFilters {
  const sports = input.sports.filter(Boolean);
  const sportRaw = input.query.sport?.trim() ?? "";
  const sportAll = sportRaw.toLowerCase() === "all";
  const matchedSport = sports.find(
    (sport) => sport.toLowerCase() === sportRaw.toLowerCase(),
  );
  const sport = sportAll ? null : (matchedSport ?? input.primarySport);

  const ageRaw = input.query.ageGroup?.trim() ?? "";
  const ageAll = ageRaw.toLowerCase() === "all";
  const knownAge = AGE_GROUPS.some((group) => group.id === ageRaw);
  const ageGroup = ageAll ? null : knownAge ? ageRaw : input.ageGroup;

  const orgRaw = input.query.organizationId?.trim() ?? "";
  const organizationId =
    orgRaw && orgRaw !== "all" && input.organizations.some((org) => org.id === orgRaw)
      ? orgRaw
      : null;

  const stateRaw = input.query.state?.trim().toUpperCase() ?? "";
  const location = input.locationState?.toUpperCase() ?? null;
  const state =
    stateRaw && stateRaw !== "ALL" && location && stateRaw === location
      ? location
      : null;

  return {
    sport,
    metricSport: sport ?? input.primarySport,
    ageGroup,
    organizationId,
    state,
    sportAll,
    ageAll,
  };
}

export function athleteAgeGroup(dateOfBirth: Date | null | undefined) {
  return ageGroupFromAge(ageFromDateOfBirth(dateOfBirth ?? null));
}

export function mostImprovedEmptyCopy(metricEntryCount: number) {
  if (metricEntryCount > 0) {
    return "Nice start. Record another result over time to begin building your development story.";
  }
  return "Record performance results over time and Train2Play will track how you're improving.";
}

export function topPerformancesEmptyCopy(sport: string | null) {
  return sport
    ? `Verified performances from athletes in ${sport} will appear here.`
    : "Verified performances from athletes in your sport will appear here.";
}

export function challengeCtaHref(scoringType: string) {
  if (
    scoringType === "PR_ACHIEVEMENT" ||
    scoringType === "METRIC_IMPROVEMENT"
  ) {
    return "/athlete/progress";
  }
  return "/athlete/train";
}
