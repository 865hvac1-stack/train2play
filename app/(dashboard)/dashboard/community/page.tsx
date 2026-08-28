import { CommunityLeaderboard } from "@/components/community-leaderboard";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlayerOfTheWeekCard } from "@/components/player-of-the-week-card";
import { getCoachCommunity } from "@/lib/community/feed";
import { requireCoach } from "@/lib/session";

export default async function CoachCommunityPage() {
  const user = await requireCoach();
  const data = await getCoachCommunity(user.id);

  return (
    <DashboardShell
      title="Community"
      description="Rankings, improvement, and recognition for the athletes you coach."
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Showing {data.athleteCount} athletes you are authorized to develop.
        </p>
        {data.potw ? <PlayerOfTheWeekCard potw={data.potw} tone="light" /> : null}
        <CommunityLeaderboard
          title="Your athletes — rankings"
          empty="No ranked results yet for your athletes."
          rows={data.top}
        />
        <CommunityLeaderboard
          title="Most improved"
          empty="Improvement appears after two results in the window."
          rows={data.improved}
          valuePrefix="+"
        />
        <CommunityLeaderboard
          title="Training leaders"
          empty="No completed training days in this window."
          rows={data.training}
        />
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-heading text-lg font-bold">Recent PRs</h2>
          {data.prs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No new PRs yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.prs.map((row) => (
                <li key={row.id}>
                  {row.athleteProfile.firstName} {row.athleteProfile.lastName.charAt(0)}. ·{" "}
                  {row.title}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-heading text-lg font-bold">Challenges</h2>
          {data.challenges.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No live challenges.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.challenges.map((challenge) => (
                <li key={challenge.id}>
                  <p className="font-semibold">{challenge.name}</p>
                  <p className="text-slate-500">{challenge.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
