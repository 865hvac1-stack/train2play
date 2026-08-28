import { AdminShell } from "@/components/admin-shell";
import { CommunityLeaderboard } from "@/components/community-leaderboard";
import { requirePlatformAdmin } from "@/lib/session";
import {
  listLeaderboardMetrics,
  rankMetricResults,
  rankMostImproved,
  rankTrainingLeaders,
} from "@/lib/community/ranking";

export default async function AdminLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string; sport?: string; period?: string; verification?: string }>;
}) {
  await requirePlatformAdmin();
  const query = await searchParams;
  const metrics = await listLeaderboardMetrics(query.sport);
  const metricId = query.metric || metrics[0]?.id;
  const period = query.period || "30d";
  const verification = query.verification === "ALL" ? "ALL" : "VERIFIED";

  const [top, improved, training] = metricId
    ? await Promise.all([
        rankMetricResults({
          metricDefinitionId: metricId,
          sport: query.sport,
          period,
          verification,
          take: 25,
        }),
        rankMostImproved({
          metricDefinitionId: metricId,
          sport: query.sport,
          period: "90d",
          take: 25,
        }),
        rankTrainingLeaders({
          sport: query.sport,
          period: "7d",
          rankingType: "TRAINING_DAYS",
          take: 25,
        }),
      ])
    : [[], [], []];

  return (
    <AdminShell
      title="Leaderboards"
      description="Same ranking engine used by athletes, coaches, directors, and the homepage. Ties stay tied."
    >
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="metric" defaultValue={metricId} className="h-10 rounded-lg border px-2">
          {metrics.map((metric) => (
            <option key={metric.id} value={metric.id}>
              {metric.sport} · {metric.name}
            </option>
          ))}
        </select>
        <select name="period" defaultValue={period} className="h-10 rounded-lg border px-2">
          <option value="7d">7 days</option>
          <option value="30d">30 days</option>
          <option value="90d">90 days</option>
          <option value="year">Year</option>
          <option value="all">All time</option>
        </select>
        <select name="verification" defaultValue={verification} className="h-10 rounded-lg border px-2">
          <option value="VERIFIED">Verified only</option>
          <option value="ALL">All eligible</option>
        </select>
        <button className="h-10 rounded-lg bg-black px-4 text-sm font-semibold text-white" type="submit">
          Apply
        </button>
      </form>
      <div className="space-y-4 [&_section]:border-slate-200 [&_section]:bg-white [&_h2]:text-black [&_span]:text-slate-800">
        <CommunityLeaderboard title="Top performances" empty="No eligible results." rows={top} />
        <CommunityLeaderboard title="Most improved" empty="Need two results in-window." rows={improved} valuePrefix="+" />
        <CommunityLeaderboard title="Training leaders" empty="No completed training days." rows={training} />
      </div>
    </AdminShell>
  );
}
