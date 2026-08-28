import { AdminShell } from "@/components/admin-shell";
import { saveHomepageWeekForm } from "@/app/(admin)/admin/community-actions";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/session";
import { startOfWeekMonday } from "@/lib/community/age-groups";
import { getPublishedHomepageWeek } from "@/lib/community/homepage";

const KINDS = [
  ["PLAYER_OF_THE_WEEK", "Player of the Week"],
  ["TOP_PERFORMANCE", "Top verified performance"],
  ["MOST_IMPROVED", "Most improved"],
  ["TRAINING_LEADER", "Training leader"],
  ["CURRENT_CHALLENGE", "Current challenge"],
  ["CUSTOM", "Custom editorial"],
] as const;

export default async function AdminHomepageWeekPage() {
  await requirePlatformAdmin();
  const weekOf = startOfWeekMonday();
  const [current, potws, challenges, metrics, sports] = await Promise.all([
    getPublishedHomepageWeek(),
    prisma.playerOfTheWeek.findMany({
      where: { published: true },
      include: { athleteProfile: { select: { firstName: true, lastName: true } } },
      orderBy: { startDate: "desc" },
      take: 12,
    }),
    prisma.challenge.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { endAt: "asc" },
    }),
    prisma.metricDefinition.findMany({
      where: { isActive: true, leaderboardEligible: true, isSensitive: false },
      orderBy: { name: "asc" },
    }),
    prisma.platformSport.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <AdminShell
      title="Weekly homepage"
      description="Choose exactly what Train2Play pushes to the public homepage this week. Empty or unpublished modules stay hidden. No fake athletes."
    >
      <form action={saveHomepageWeekForm} className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <label className="text-sm font-semibold">
            Week of
            <input
              type="date"
              name="weekOf"
              defaultValue={weekOf.toISOString().slice(0, 10)}
              className="mt-1 h-10 w-full rounded-lg border px-2"
            />
          </label>
          <input
            name="headline"
            defaultValue={current?.headline ?? "What's happening on Train2Play"}
            className="mt-3 h-10 w-full rounded-lg border px-2"
          />
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="published" defaultChecked={current?.published ?? false} />
            Publish this week to the public homepage
          </label>
        </div>

        {[1, 2, 3, 4, 5, 6].map((slot) => {
          const existing = current?.modules.find((module) => module.slot === slot);
          return (
            <div key={slot} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Slot {slot}
              </p>
              <select
                name={`slot${slot}Kind`}
                defaultValue={existing?.kind ?? ""}
                className="mt-2 h-10 w-full rounded-lg border px-2"
              >
                <option value="">Hidden</option>
                {KINDS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                name={`slot${slot}Title`}
                defaultValue={existing?.title ?? ""}
                placeholder="Override title"
                className="mt-2 h-10 w-full rounded-lg border px-2"
              />
              <input
                name={`slot${slot}Subtitle`}
                defaultValue={existing?.subtitle ?? ""}
                placeholder="Subtitle"
                className="mt-2 h-10 w-full rounded-lg border px-2"
              />
              <textarea
                name={`slot${slot}Body`}
                defaultValue={existing?.body ?? ""}
                placeholder="Body copy"
                className="mt-2 min-h-16 w-full rounded-lg border px-2 py-2"
              />
              <select
                name={`slot${slot}Potw`}
                defaultValue={existing?.playerOfTheWeekId ?? ""}
                className="mt-2 h-10 w-full rounded-lg border px-2"
              >
                <option value="">Player of the Week (optional)</option>
                {potws.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.athleteProfile.firstName} {row.athleteProfile.lastName}
                  </option>
                ))}
              </select>
              <select
                name={`slot${slot}Challenge`}
                defaultValue={existing?.challengeId ?? ""}
                className="mt-2 h-10 w-full rounded-lg border px-2"
              >
                <option value="">Challenge (optional)</option>
                {challenges.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
              <select
                name={`slot${slot}Metric`}
                defaultValue={existing?.metricDefinitionId ?? ""}
                className="mt-2 h-10 w-full rounded-lg border px-2"
              >
                <option value="">Metric (optional)</option>
                {metrics.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.sport} · {row.name}
                  </option>
                ))}
              </select>
              <select
                name={`slot${slot}Sport`}
                defaultValue={existing?.sport ?? ""}
                className="mt-2 h-10 w-full rounded-lg border px-2"
              >
                <option value="">All sports</option>
                {sports.map((row) => (
                  <option key={row.id} value={row.name}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}

        <Button type="submit">Save weekly homepage</Button>
      </form>
    </AdminShell>
  );
}
