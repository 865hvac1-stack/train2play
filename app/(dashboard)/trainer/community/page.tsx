import { CommunityLeaderboard } from "@/components/community-leaderboard";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlayerOfTheWeekCard } from "@/components/player-of-the-week-card";
import { getDirectorCommunity } from "@/lib/community/feed";
import { requireLibraryEditor } from "@/lib/session";

export default async function DirectorCommunityPage() {
  const user = await requireLibraryEditor();
  const data = await getDirectorCommunity(user.id);

  return (
    <DashboardShell
      title="Program community"
      description="Authorized sport and organization data only — top performers, improvement, training, and recognition."
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Sports: {data.sports.join(", ") || "None assigned"}
          {data.organizations.length
            ? ` · Orgs: ${data.organizations.map((org) => org.name).join(", ")}`
            : ""}
        </p>
        {data.potw ? <PlayerOfTheWeekCard potw={data.potw} tone="light" /> : null}
        <CommunityLeaderboard
          title="Top performers"
          empty="No verified results in your authorized sports yet."
          rows={data.top}
        />
        <CommunityLeaderboard
          title="Most improved"
          empty="Improvement boards need two in-window results."
          rows={data.improved}
          valuePrefix="+"
        />
        <CommunityLeaderboard
          title="Training leaders"
          empty="No credited training days yet."
          rows={data.training}
        />
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-heading text-lg font-bold">Challenge participation</h2>
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
