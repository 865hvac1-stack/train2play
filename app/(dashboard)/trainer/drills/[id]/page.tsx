import Link from "next/link";
import { notFound } from "next/navigation";

import { pushCatalogDrillAction } from "@/app/(dashboard)/trainer/drill-actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDrillDeliveryReport } from "@/lib/catalog-drill-delivery";
import { formatAgeBandLabel } from "@/lib/courses";
import { requireLibraryEditor } from "@/lib/session";

function formatWhen(value: Date | null) {
  if (!value) return "—";
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default async function DrillDeliveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  await requireLibraryEditor();
  const { id } = await params;
  const { sent } = await searchParams;
  const report = await getDrillDeliveryReport(id);
  if (!report) notFound();

  const { drill, players, coaches, totals } = report;
  const sentCount = Number(sent);
  const audienceLabel =
    drill.athleteAudience === "ALL_SPORT"
      ? `Everyone signed up under ${drill.sport}`
      : drill.athleteAudience === "SELECTED"
        ? `${drill.athleteRecipients.length} selected player${
            drill.athleteRecipients.length === 1 ? "" : "s"
          }`
        : "No players yet";

  return (
    <DashboardShell
      title={drill.title}
      description={`Who has this drill and which coaches passed it along.`}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={`/trainer/drills?sport=${encodeURIComponent(drill.sport)}`}
            >
              Back to suggested drills
            </Link>
          }
        />
        <form action={pushCatalogDrillAction.bind(null, drill.id)}>
          <Button type="submit" size="sm">
            Send again to the audience
          </Button>
        </form>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={`/trainer/drills?sport=${encodeURIComponent(drill.sport)}&edit=${drill.id}`}
            >
              Edit drill
            </Link>
          }
        />
      </div>

      {Number.isFinite(sentCount) && sent !== undefined ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {sentCount > 0
            ? `Sent to ${sentCount} player${sentCount === 1 ? "" : "s"}.`
            : "Nothing sent — no players are set to receive this drill yet."}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Badge>{drill.sport}</Badge>
        <Badge variant="outline">{formatAgeBandLabel(drill.ageBand)}</Badge>
        <Badge variant="secondary">{drill.durationMin} min</Badge>
        <Badge variant={drill.shareWithCoaches ? "default" : "outline"}>
          {drill.shareWithCoaches
            ? "Coaches can see it"
            : "Hidden from coaches"}
        </Badge>
        <Badge variant="outline">Players: {audienceLabel}</Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "In audience", value: `${totals.audiencePlayers}` },
          { label: "Actually sent", value: `${totals.sentPlayers}` },
          { label: "Opened it", value: `${totals.viewedPlayers}` },
          { label: "Coaches with access", value: `${totals.coachesWithAccess}` },
          { label: "Coaches passing it on", value: `${totals.coachesSending}` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <dt className="text-xs text-slate-500">{stat.label}</dt>
            <dd className="font-heading text-2xl font-bold text-slate-900">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-6">
        <h2 className="font-heading text-lg font-bold">Players</h2>
        {players.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed p-6 text-sm text-slate-500">
            No players are set to receive this drill. Pick an audience on the
            drill card, then save and send.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="p-3">Player</th>
                  <th className="p-3">How they got it</th>
                  <th className="p-3">Sent</th>
                  <th className="p-3">Opened</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-t border-slate-100">
                    <td className="p-3 font-medium text-slate-900">
                      {player.name}
                      {!player.hasLogin ? (
                        <span className="ml-2 text-xs text-amber-700">
                          no login yet
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3 text-slate-600">
                      {[
                        player.directorSentAt ? "You sent it" : null,
                        ...player.coachPushes.map(
                          (push) => `${push.coachName} sent it`,
                        ),
                        player.inAudience && !player.directorSentAt
                          ? "In audience, not sent yet"
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Removed from audience"}
                    </td>
                    <td className="p-3 text-slate-600">
                      {formatWhen(
                        player.directorSentAt ??
                          player.coachPushes[0]?.sentAt ??
                          null,
                      )}
                    </td>
                    <td className="p-3">
                      {player.viewedAt ? (
                        <Badge variant="secondary">
                          {formatWhen(player.viewedAt)}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">Not yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-heading text-lg font-bold">Coaches</h2>
        {coaches.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed p-6 text-sm text-slate-500">
            No coaches are connected to {drill.sport} players yet.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="p-3">Coach</th>
                  <th className="p-3">Can see it</th>
                  <th className="p-3">Sent to</th>
                  <th className="p-3">Last hand-off</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((coach) => (
                  <tr key={coach.id} className="border-t border-slate-100">
                    <td className="p-3 font-medium text-slate-900">
                      {coach.name}
                      <span className="block text-xs text-slate-500">
                        {coach.email}
                      </span>
                    </td>
                    <td className="p-3">
                      {coach.canSee ? (
                        <Badge variant="secondary">Yes</Badge>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      {coach.sentToPlayers === 0
                        ? "—"
                        : `${coach.sentToPlayers} player${
                            coach.sentToPlayers === 1 ? "" : "s"
                          }: ${coach.playerNames.join(", ")}`}
                    </td>
                    <td className="p-3 text-slate-600">
                      {formatWhen(coach.lastSentAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
