import { Clock3, Dumbbell, Lightbulb } from "lucide-react";

import { sendSuggestedDrillToAthleteAction } from "@/app/(dashboard)/athletes/drill-push-actions";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSuggestedDrills, type AgeBandId } from "@/lib/catalog-drills";
import { prisma } from "@/lib/db";

type SuggestedDrillsProps = {
  sport: string;
  dateOfBirth?: Date | null;
  ageBandId?: AgeBandId;
  athleteFirstName?: string;
  compact?: boolean;
  /** When set, the coach can push a drill straight to this player. */
  sendTo?: { athleteProfileId: string; athleteFirstName: string };
};

export async function SuggestedDrills({
  sport,
  dateOfBirth,
  ageBandId,
  athleteFirstName,
  compact = false,
  sendTo,
}: SuggestedDrillsProps) {
  const { band, drills, sportLabel } = await getSuggestedDrills({
    sport,
    dateOfBirth,
    ageBandId,
    limit: compact ? 2 : 3,
    audience: "coaches",
  });

  if (drills.length === 0) return null;

  const alreadySent = sendTo
    ? await prisma.catalogDrillPush.findMany({
        where: {
          athleteProfileId: sendTo.athleteProfileId,
          catalogDrillId: { in: drills.map((drill) => drill.id) },
        },
        select: { catalogDrillId: true, createdAt: true },
      })
    : [];
  const sentAtByDrill = new Map(
    alreadySent.map((push) => [push.catalogDrillId, push.createdAt]),
  );

  const who = athleteFirstName ? `${athleteFirstName}'s` : "Suggested";

  return (
    <Card className="overflow-hidden border-brand/25 bg-gradient-to-br from-white via-white to-brand-light/60">
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="size-5 text-brand" />
              {who} drills
            </CardTitle>
            <CardDescription className="mt-1">
              Curated for {sportLabel} · {band.label} — not AI guesses
            </CardDescription>
          </div>
          <Badge variant="secondary">{band.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {drills.map((drill) => (
          <div
            key={drill.id}
            className="rounded-xl border border-slate-200/80 bg-white/90 p-4 transition-shadow hover:shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{drill.title}</p>
                <p className="mt-0.5 text-sm text-brand">{drill.focus}</p>
              </div>
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <Clock3 className="size-3.5" />
                {drill.durationMin} min
              </span>
            </div>
            {!compact ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {drill.howTo}
                </p>
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-800">
                  <Dumbbell className="mt-0.5 size-3.5 shrink-0 text-brand" />
                  <span>
                    <span className="font-medium">Cue: </span>
                    {drill.coachingCue}
                  </span>
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  Equipment: {drill.equipment}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">{drill.coachingCue}</p>
            )}
            {drill.videoUrl ? (
              <InstructionVideoPlayer
                src={drill.videoUrl}
                title={`${drill.title} demo`}
                className="mt-3"
              />
            ) : null}
            {sendTo ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <form
                  action={sendSuggestedDrillToAthleteAction.bind(
                    null,
                    drill.id,
                    sendTo.athleteProfileId,
                  )}
                >
                  <Button type="submit" size="sm" variant="outline">
                    {sentAtByDrill.has(drill.id)
                      ? `Send to ${sendTo.athleteFirstName} again`
                      : `Send to ${sendTo.athleteFirstName}`}
                  </Button>
                </form>
                {sentAtByDrill.get(drill.id) ? (
                  <span className="text-muted-foreground text-xs">
                    Sent{" "}
                    {sentAtByDrill.get(drill.id)!.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
