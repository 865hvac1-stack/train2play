import { Plus, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";

import { updateMetricAction } from "@/app/(admin)/admin/actions";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";

export default async function AdminMetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; status?: string }>;
}) {
  const query = await searchParams;
  const [metrics, sports] = await Promise.all([
    prisma.metricDefinition.findMany({
      where: {
        ...(query.sport ? { sport: query.sport } : {}),
        ...(query.status === "active"
          ? { isActive: true }
          : query.status === "inactive"
            ? { isActive: false }
            : {}),
      },
      include: { _count: { select: { entries: true } } },
      orderBy: [{ sport: "asc" }, { category: "asc" }, { name: "asc" }],
    }),
    prisma.platformSport.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <AdminShell
      title="Metrics"
      description="Govern the Train2Play performance metric library."
      action={
        <Button
          nativeButton={false}
          render={
            <Link href="/admin/metrics/new">
              <Plus className="size-4" />
              Add metric
            </Link>
          }
        />
      }
    >
      <div className="rounded-2xl bg-black p-5 text-white">
        <div className="flex items-start gap-3">
          <ShieldCheck className="size-6 text-brand" />
          <div>
            <h2 className="font-heading text-xl font-bold">
              Privacy before leaderboards
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-zinc-400">
              A metric must be leaderboard eligible before it can be public.
              Sensitive metrics can never be made public here. Verification rules
              are stored now so the Community ranking engine can enforce them later.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!query.sport ? "default" : "outline"}
          nativeButton={false}
          render={<Link href="/admin/metrics">All sports</Link>}
        />
        {sports.map((sport) => (
          <Button
            key={sport.id}
            size="sm"
            variant={query.sport === sport.name ? "default" : "outline"}
            nativeButton={false}
            render={
              <Link href={`/admin/metrics?sport=${encodeURIComponent(sport.name)}`}>
                {sport.name}
              </Link>
            }
          />
        ))}
      </div>

      {metrics.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed bg-white p-10 text-center">
          <Trophy className="mx-auto size-8 text-slate-300" />
          <p className="mt-3 font-bold">No metrics match this filter.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {metrics.map((metric) => (
            <form
              key={metric.id}
              action={updateMetricAction.bind(null, metric.id)}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_140px_180px_180px_auto]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{metric.sport}</Badge>
                    <Badge variant="outline">{metric.category}</Badge>
                    {metric.isSensitive ? (
                      <Badge variant="outline">Sensitive</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 font-heading text-lg font-bold">
                    {metric.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {metric.unit} ·{" "}
                    {metric.direction === "HIGHER_IS_BETTER"
                      ? "Higher is better"
                      : "Lower is better"}{" "}
                    · {metric._count.entries} entries
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={metric.isActive}
                    className="size-4"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="leaderboardEligible"
                    defaultChecked={metric.leaderboardEligible}
                    className="size-4"
                  />
                  Leaderboard eligible
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="publicLeaderboardEligible"
                      defaultChecked={metric.publicLeaderboardEligible}
                      disabled={metric.isSensitive}
                      className="size-4"
                    />
                    Public eligible
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="isSensitive"
                      defaultChecked={metric.isSensitive}
                      className="size-4"
                    />
                    Sensitive/private
                  </label>
                </div>
                <div className="space-y-2">
                  <select
                    name="verificationRequirement"
                    defaultValue={metric.verificationRequirement}
                    className="h-9 w-full rounded-lg border bg-white px-2 text-xs"
                  >
                    <option value="NONE">No verification</option>
                    <option value="COACH">Coach verified</option>
                    <option value="VIDEO">Video evidence</option>
                    <option value="EVENT">Verified event</option>
                  </select>
                  <Button type="submit" size="sm" variant="outline" className="w-full">
                    Save
                  </Button>
                </div>
              </div>
            </form>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
