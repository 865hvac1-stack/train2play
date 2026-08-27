import Link from "next/link";
import { notFound } from "next/navigation";

import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { SuggestedDrillSeenBeacon } from "@/components/suggested-drill-seen-beacon";
import { Button } from "@/components/ui/button";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { getCatalogDrillForAthlete } from "@/lib/catalog-drills";
import { formatAgeBandLabel } from "@/lib/courses";

export default async function AthleteRecommendedDrillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAthleteContext();
  const { id } = await params;
  const drill = await getCatalogDrillForAthlete({
    drillId: id,
    athleteProfileId: ctx.profileId,
    sports: ctx.sports,
  });
  if (!drill) notFound();

  return (
    <div className="space-y-5 pb-6">
      {drill.sentByName ? (
        <SuggestedDrillSeenBeacon drillIds={[drill.id]} />
      ) : null}
      <Button
        size="sm"
        variant="outline"
        nativeButton={false}
        render={<Link href="/athlete">← Back to home</Link>}
      />

      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
          {[drill.sport, formatAgeBandLabel(drill.ageBand)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <h1 className="font-heading mt-1 text-3xl font-bold tracking-tight text-white">
          {drill.title}
        </h1>
        <p className="mt-1 text-sm text-brand">
          {drill.focus} · {drill.durationMin} min
        </p>
        {drill.sentByName ? (
          <p className="mt-2 text-xs font-semibold tracking-wide text-brand uppercase">
            Sent by {drill.sentByName}
          </p>
        ) : null}
      </div>

      {drill.videoUrl ? (
        <InstructionVideoPlayer
          src={drill.videoUrl}
          title={`${drill.title} demo`}
          tone="dark"
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4">
          <p className="text-sm text-slate-400">
            This drill does not have a demo video yet. Follow the steps below.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
        <h2 className="text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">
          How to run it
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-200">
          {drill.howTo}
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
        <h2 className="text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">
          Coaching cue
        </h2>
        <p className="mt-2 text-sm text-slate-200">{drill.coachingCue}</p>
        <p className="mt-3 text-xs text-slate-500">
          Equipment: {drill.equipment}
        </p>
      </section>
    </div>
  );
}
