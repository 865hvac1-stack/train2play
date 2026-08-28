import Link from "next/link";
import { Trophy } from "lucide-react";

import { AchievementBadges } from "@/components/achievement-badges";
import { CommunityEmptyState } from "@/components/community-empty-state";
import { CommunityFilters } from "@/components/community-filters";
import { CommunityLeaderboard } from "@/components/community-leaderboard";
import { PlayerOfTheWeekCard } from "@/components/player-of-the-week-card";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import {
  challengeCtaHref,
  mostImprovedEmptyCopy,
  topPerformancesEmptyCopy,
} from "@/lib/community/athlete-community";
import { getAthleteCommunity } from "@/lib/community/feed";
import { safeDisplayName } from "@/lib/community/privacy";

export default async function AthleteCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{
    sport?: string;
    ageGroup?: string;
    organizationId?: string;
    state?: string;
  }>;
}) {
  const ctx = await requireAthleteContext();
  const query = await searchParams;
  const data = await getAthleteCommunity({
    athleteProfileId: ctx.profileId,
    sport: ctx.sport,
    sports: ctx.sports,
    dateOfBirth: ctx.dateOfBirth,
    query,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
          Community
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          This week on Train2Play
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Real athletes. Real work. Real progress.
        </p>
      </div>

      <CommunityFilters
        sports={data.sports}
        primarySport={data.primarySport}
        selectedSport={data.filters.sport}
        myAgeGroup={data.myAgeGroup}
        selectedAgeGroup={data.filters.ageGroup}
        organizations={data.organizations}
        selectedOrganizationId={data.filters.organizationId}
        locationState={data.locationState}
        selectedState={data.filters.state}
      />

      {data.potw ? (
        <PlayerOfTheWeekCard potw={data.potw} />
      ) : (
        <CommunityEmptyState
          title="Player of the Week"
          body="No featured athlete yet. Keep training, improving, and recording your progress for a chance to be recognized."
        />
      )}

      {(data.yourNational || data.yourState) && data.headlineMetric ? (
        <section className="rounded-2xl border border-brand/40 bg-black p-4">
          <p className="text-[10px] font-bold tracking-[0.18em] text-brand uppercase">
            Your rankings
          </p>
          <h2 className="font-heading mt-1 text-xl font-bold">
            {data.headlineMetric.name}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {data.yourNational ? (
              <div>
                <p className="font-heading text-3xl font-bold">
                  #{data.yourNational.rank}
                </p>
                <p className="text-xs text-zinc-400">National</p>
              </div>
            ) : null}
            {data.yourState ? (
              <div>
                <p className="font-heading text-3xl font-bold">
                  #{data.yourState.rank}
                </p>
                <p className="text-xs text-zinc-400">State</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <CommunityLeaderboard
        title="Most improved"
        empty={mostImprovedEmptyCopy(data.metricEntryCount)}
        rows={data.improved}
        valuePrefix="+"
        showDevelopment
        cta={{ href: "/athlete/progress", label: "Record a metric" }}
      />
      <CommunityLeaderboard
        title="Top performances"
        empty={topPerformancesEmptyCopy(data.filters.metricSport)}
        rows={data.top}
        cta={{ href: "/athlete/progress", label: "View my progress" }}
      />
      <CommunityLeaderboard
        title="Training leaders"
        empty="Complete your training consistently to compete on the weekly training leaderboard."
        rows={data.trainingLeaders}
        cta={{ href: "/athlete/train", label: "Start training" }}
      />

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
        <h2 className="font-heading text-lg font-bold">Current challenge</h2>
        {data.challengeCards.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            No live challenge this week. Check back for the next Train2Play
            challenge.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.challengeCards.map(({ challenge, entry }) => (
              <li
                key={challenge.id}
                className="rounded-xl border border-white/10 p-3"
              >
                <p className="font-heading font-bold">{challenge.name}</p>
                <p className="text-sm text-zinc-400">{challenge.description}</p>
                <p className="mt-2 text-sm font-semibold text-brand">
                  Your progress {entry?.progressValue ?? 0} /{" "}
                  {challenge.targetValue ?? 1}
                </p>
                <Link
                  href={challengeCtaHref(challenge.scoringType)}
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-bold tracking-wide text-brand uppercase"
                >
                  {challengeCtaHref(challenge.scoringType) === "/athlete/progress"
                    ? "Record my result →"
                    : "Start training →"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
        <h2 className="font-heading text-lg font-bold">Recent PRs</h2>
        {data.recentPrs.length === 0 ? (
          <div className="mt-2">
            <p className="text-sm leading-relaxed text-zinc-400">
              New personal records from the Train2Play community will appear
              here.
            </p>
            <Link
              href="/athlete/progress"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-bold tracking-wide text-brand uppercase"
            >
              Record my result →
            </Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.recentPrs.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-white/10 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {row.displayName}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {[row.sport, row.metricName].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold tracking-wide text-black uppercase">
                    New PR
                  </span>
                </div>
                <p className="font-heading mt-2 text-lg font-bold text-white">
                  {row.previousLabel ? `${row.previousLabel} → ` : null}
                  {row.valueLabel}
                </p>
                <p className="text-xs text-zinc-500">
                  {row.dateLabel}
                  {row.verificationLabel ? ` • ${row.verificationLabel}` : ""}
                </p>
                {row.slug ? (
                  <Link
                    href={`/p/${row.slug}`}
                    className="mt-2 inline-flex min-h-11 items-center text-sm font-bold tracking-wide text-brand uppercase"
                  >
                    View profile →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.history.length > 0 ? (
        <section>
          <h2 className="font-heading text-lg font-bold">
            Past Players of the Week
          </h2>
          <ul className="mt-3 space-y-2">
            {data.history.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm"
              >
                <Trophy className="mr-2 inline size-4 text-brand" />
                {safeDisplayName({
                  firstName: row.athleteProfile.firstName,
                  lastName: row.athleteProfile.lastName,
                  displayName: row.athleteProfile.displayName,
                  dateOfBirth: row.athleteProfile.dateOfBirth,
                })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-bold">Your badges</h2>
          <Link
            href="/athlete/profile"
            className="text-sm font-semibold text-brand"
          >
            View profile →
          </Link>
        </div>
        <div className="mt-3">
          <AchievementBadges achievements={data.achievements} />
        </div>
        {data.achievements.length === 0 ? (
          <Link
            href="/athlete/train"
            className="mt-2 inline-flex min-h-11 items-center text-sm font-bold tracking-wide text-brand uppercase"
          >
            Start training →
          </Link>
        ) : null}
      </section>
    </div>
  );
}
