import Link from "next/link";
import { Play } from "lucide-react";

import {
  getAthleteDashboardData,
  requireAthleteContext,
} from "@/lib/athlete-dashboard";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";

export default async function AthleteTrainPage({
  searchParams,
}: {
  searchParams: Promise<{ workout?: string }>;
}) {
  const ctx = await requireAthleteContext();
  const { workout: workoutId } = await searchParams;
  const data = await getAthleteDashboardData(ctx);

  const workout =
    data.activePlan?.workouts.find((w) => w.id === workoutId) ??
    data.todaysWorkout ??
    data.activePlan?.workouts.find((w) => !w.completed) ??
    null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
          Train
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Your workouts
        </h1>
      </div>

      {workout ? (
        <section className="space-y-4 rounded-3xl border border-brand/30 bg-zinc-900 p-5">
          <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
            Focus session
          </p>
          <h2 className="font-heading text-2xl font-bold">{workout.title}</h2>
          {data.activePlan ? (
            <p className="text-sm text-slate-400">{data.activePlan.title}</p>
          ) : null}
          {workout.durationMinutes ? (
            <p className="text-sm text-slate-300">{workout.durationMinutes} minutes</p>
          ) : null}
          {workout.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {workout.description}
            </p>
          ) : null}
          {workout.instructionVideoUrl ? (
            <InstructionVideoPlayer
              src={workout.instructionVideoUrl}
              title="Watch how to do it"
            />
          ) : null}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-slate-400">
            Mark complete from your coach&apos;s plan for now — athlete
            self-complete is coming next.
          </div>
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
          No workouts assigned yet. Your coach will add a training plan and it
          will show up here.
        </p>
      )}

      {data.activePlan && data.activePlan.workouts.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold">All sessions</h2>
          <ul className="space-y-2">
            {data.activePlan.workouts.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/athlete/train?workout=${w.id}`}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 active:bg-zinc-800"
                >
                  <div className="min-w-0">
                    <p
                      className={
                        w.completed
                          ? "truncate text-slate-500 line-through"
                          : "truncate font-semibold text-white"
                      }
                    >
                      {w.title}
                    </p>
                    {w.durationMinutes ? (
                      <p className="text-xs text-slate-500">
                        {w.durationMinutes} min
                      </p>
                    ) : null}
                  </div>
                  <Play className="size-4 shrink-0 text-brand" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold">Recommended</h2>
        {data.recommended.drills.map((drill) => (
          <div
            key={drill.id}
            className="rounded-2xl border border-white/10 bg-zinc-900 p-4"
          >
            <p className="font-semibold">{drill.title}</p>
            <p className="text-sm text-brand">
              {drill.durationMin} min · {drill.focus}
            </p>
            <p className="mt-2 text-sm text-slate-400">{drill.howTo}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
