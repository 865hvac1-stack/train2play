import Link from "next/link";

import {
  deleteCatalogDrillAction,
  pushCatalogDrillAction,
  updateCatalogDrillAudienceAction,
} from "@/app/(dashboard)/trainer/drill-actions";
import { CatalogDrillAudienceFields } from "@/components/catalog-drill-audience-fields";
import { CatalogDrillForm } from "@/components/catalog-drill-form";
import { DashboardShell } from "@/components/dashboard-shell";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDrillDeliveryCounts } from "@/lib/catalog-drill-delivery";
import {
  CATALOG_SPORTS,
  listCatalogDrills,
  listCatalogRecipientAthletes,
} from "@/lib/catalog-drills";
import { formatAgeBandLabel } from "@/lib/courses";
import { requireLibraryEditor } from "@/lib/session";

export default async function TrainerDrillsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; ageBand?: string; edit?: string }>;
}) {
  await requireLibraryEditor();
  const { sport, ageBand, edit } = await searchParams;
  const [drills, athletes] = await Promise.all([
    listCatalogDrills({
      sport: sport || undefined,
      ageBand: ageBand || undefined,
    }),
    listCatalogRecipientAthletes(sport || undefined),
  ]);
  const editing = edit ? drills.find((row) => row.id === edit) : null;
  const deliveryCounts = await getDrillDeliveryCounts(drills);

  return (
    <DashboardShell
      title="Suggested drills"
      description="This is the complete suggested-drill library. Only drills published here can appear for players or coaches. Saving delivers a drill to its selected audience right away."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!sport ? "default" : "outline"}
          nativeButton={false}
          render={<Link href="/trainer/drills">All sports</Link>}
        />
        {CATALOG_SPORTS.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={sport === item ? "default" : "outline"}
            nativeButton={false}
            render={
              <Link href={`/trainer/drills?sport=${encodeURIComponent(item)}`}>
                {item}
              </Link>
            }
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          {drills.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
              No drills in this filter yet. Add and publish one using the form
              on the right.
            </p>
          ) : (
            drills.map((drill) => (
              <div
                key={drill.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                {editing?.id === drill.id ? (
                  <CatalogDrillForm
                    mode="edit"
                    drillId={drill.id}
                    defaults={{
                      sport: drill.sport,
                      ageBand: drill.ageBand,
                      title: drill.title,
                      focus: drill.focus,
                      durationMin: drill.durationMin,
                      equipment: drill.equipment,
                      howTo: drill.howTo,
                      coachingCue: drill.coachingCue,
                      videoUrl: drill.videoUrl,
                      shareWithCoaches: drill.shareWithCoaches,
                      shareWithAthletes: drill.shareWithAthletes,
                      athleteAudience: drill.athleteAudience,
                      athleteProfileIds: drill.athleteRecipients.map(
                        (recipient) => recipient.athleteProfileId,
                      ),
                    }}
                    athletes={athletes}
                  />
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{drill.sport}</Badge>
                      <Badge variant="outline">{formatAgeBandLabel(drill.ageBand)}</Badge>
                      <Badge variant="secondary">{drill.durationMin} min</Badge>
                      <Badge
                        variant={drill.shareWithCoaches ? "default" : "outline"}
                      >
                        {drill.shareWithCoaches
                          ? "Live for coaches"
                          : "Not sent to coaches"}
                      </Badge>
                      <Badge
                        variant={drill.shareWithAthletes ? "default" : "outline"}
                      >
                        {drill.athleteAudience === "ALL_SPORT"
                          ? `Live for all ${drill.sport} players`
                          : drill.athleteAudience === "SELECTED"
                            ? `Live for ${drill.athleteRecipients.length} selected`
                            : "Not sent to players"}
                      </Badge>
                    </div>
                    <h2 className="mt-2 font-heading text-xl font-bold">
                      {drill.title}
                    </h2>
                    <p className="text-sm text-brand">{drill.focus}</p>
                    <p className="mt-2 text-sm text-slate-600">{drill.howTo}</p>
                    <p className="mt-1 text-sm text-slate-800">
                      Cue: {drill.coachingCue}
                    </p>
                    {drill.videoUrl ? (
                      <InstructionVideoPlayer
                        src={drill.videoUrl}
                        title={`${drill.title} demo`}
                        className="mt-3"
                      />
                    ) : null}
                    <form
                      action={updateCatalogDrillAudienceAction.bind(
                        null,
                        drill.id,
                      )}
                      className="mt-3 space-y-2 rounded-xl border border-brand/20 bg-orange-50/50 p-3"
                    >
                      <CatalogDrillAudienceFields
                        sport={drill.sport}
                        athletes={athletes}
                        defaultShareWithCoaches={drill.shareWithCoaches}
                        defaultAthleteAudience={drill.athleteAudience}
                        defaultAthleteProfileIds={drill.athleteRecipients.map(
                          (recipient) => recipient.athleteProfileId,
                        )}
                      />
                      <Button type="submit" size="sm">
                        Save and send
                      </Button>
                    </form>
                    <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-xs text-slate-500">In audience</dt>
                        <dd className="font-semibold text-slate-900">
                          {deliveryCounts.get(drill.id)?.audiencePlayers ?? 0}{" "}
                          players
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Sent</dt>
                        <dd className="font-semibold text-slate-900">
                          {deliveryCounts.get(drill.id)?.sentPlayers ?? 0}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Opened it</dt>
                        <dd className="font-semibold text-slate-900">
                          {deliveryCounts.get(drill.id)?.viewedPlayers ?? 0}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">
                          Coach hand-offs
                        </dt>
                        <dd className="font-semibold text-slate-900">
                          {deliveryCounts.get(drill.id)?.coachSentPlayers ?? 0}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={pushCatalogDrillAction.bind(null, drill.id)}>
                        <Button type="submit" size="sm">
                          Send now
                        </Button>
                      </form>
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={
                          <Link href={`/trainer/drills/${drill.id}`}>
                            Who has it
                          </Link>
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={
                          <Link
                            href={`/trainer/drills?sport=${encodeURIComponent(drill.sport)}&edit=${drill.id}`}
                          >
                            Edit
                          </Link>
                        }
                      />
                      <form action={deleteCatalogDrillAction.bind(null, drill.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          Remove
                        </Button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        <div className="rounded-xl border border-brand/20 bg-white p-4">
          <h2 className="font-heading text-lg font-bold">Add a drill</h2>
          <p className="mb-3 text-sm text-slate-600">
            Keep it specific to one sport and age band, then choose exactly who
            receives it.
          </p>
          <CatalogDrillForm
            athletes={athletes}
            defaults={{
              sport: sport || undefined,
              ageBand: ageBand || undefined,
            }}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
