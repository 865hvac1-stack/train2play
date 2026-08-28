import Link from "next/link";
import { Trophy } from "lucide-react";

import { AchievementBadges } from "@/components/achievement-badges";
import { CommunityLeaderboard } from "@/components/community-leaderboard";
import { PlayerOfTheWeekCard } from "@/components/player-of-the-week-card";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { getAthleteCommunity } from "@/lib/community/feed";
import { prisma } from "@/lib/db";

export default async function AthleteCommunityPage() {
  const ctx = await requireAthleteContext();
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: ctx.profileId },
    select: { locationState: true, primarySport: true },
  });
  const data = await getAthleteCommunity({
    athleteProfileId: ctx.profileId,
    sport: ctx.sport,
    locationState: profile?.locationState,
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

      {data.potw ? (
        <PlayerOfTheWeekCard potw={data.potw} />
      ) : (
        <Empty title="Player of the Week" body="The next featured athlete will appear here when published." />
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
                <p className="font-heading text-3xl font-bold">#{data.yourNational.rank}</p>
                <p className="text-xs text-zinc-400">National</p>
              </div>
            ) : null}
            {data.yourState ? (
              <div>
                <p className="font-heading text-3xl font-bold">#{data.yourState.rank}</p>
                <p className="text-xs text-zinc-400">State</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <CommunityLeaderboard
        title="Most improved"
        empty="Improvement boards appear when athletes have at least two results in the window."
        rows={data.improved}
        valuePrefix="+"
      />
      <CommunityLeaderboard
        title="Top performances"
        empty="Verified results will rank here. Nothing is invented."
        rows={data.top}
      />
      <CommunityLeaderboard
        title="Training leaders"
        empty="Leaders are based on unique training days, not duplicate sessions."
        rows={data.trainingLeaders}
      />

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
        <h2 className="font-heading text-lg font-bold">Current challenge</h2>
        {data.challengeCards.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">No live challenge this week.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.challengeCards.map(({ challenge, entry }) => (
              <li key={challenge.id} className="rounded-xl border border-white/10 p-3">
                <p className="font-heading font-bold">{challenge.name}</p>
                <p className="text-sm text-zinc-400">{challenge.description}</p>
                <p className="mt-2 text-sm font-semibold text-brand">
                  Your progress {entry?.progressValue ?? 0} / {challenge.targetValue ?? 1}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
        <h2 className="font-heading text-lg font-bold">Recent PRs</h2>
        {data.recentPrs.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">New personal records will show here.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.recentPrs.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">
                  {row.athleteProfile.displayName || row.athleteProfile.firstName} ·{" "}
                  {row.metricDefinition.name}
                </span>
                <span className="font-heading font-bold text-brand">
                  {row.value} {row.metricDefinition.unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.history.length > 0 ? (
        <section>
          <h2 className="font-heading text-lg font-bold">Past Players of the Week</h2>
          <ul className="mt-3 space-y-2">
            {data.history.map((row) => (
              <li key={row.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
                <Trophy className="mr-2 inline size-4 text-brand" />
                {row.athleteProfile.displayName ||
                  `${row.athleteProfile.firstName} ${row.athleteProfile.lastName.charAt(0)}.`}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Your badges</h2>
          <Link href="/athlete/profile" className="text-sm font-semibold text-brand">
            Profile
          </Link>
        </div>
        <div className="mt-3">
          <AchievementBadges achievements={data.achievements} />
        </div>
      </section>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-white/15 p-5">
      <h2 className="font-heading font-bold">{title}</h2>
      <p className="mt-1 text-sm text-zinc-400">{body}</p>
    </section>
  );
}
