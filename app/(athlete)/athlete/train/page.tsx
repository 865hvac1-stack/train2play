import Link from "next/link";
import { Play } from "lucide-react";

import { startWorkoutAction } from "@/app/(athlete)/athlete/session-actions";
import {
  getAthleteDashboardData,
  requireAthleteContext,
} from "@/lib/athlete-dashboard";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { prisma } from "@/lib/db";

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

  let inProgressSessionId: string | null = null;
  if (workout && ctx.athleteId) {
    const open = await prisma.workoutSession.findFirst({
      where: {
        workoutId: workout.id,
        athleteId: ctx.athleteId,
        status: "IN_PROGRESS",
      },
      select: { id: true },
    });
    inProgressSessionId = open?.id ?? null;
  }

  const exerciseCount =
    workout && "exercises" in workout
      ? (workout as { exercises?: { id: string }[] }).exercises?.length ??
        data.exerciseCountHint
      : data.exerciseCountHint;

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
            {workout.completed ? "Already completed" : "Focus session"}
          </p>
          <h2 className="font-heading text-2xl font-bold">{workout.title}</h2>
          {data.activePlan ? (
            <p className="text-sm text-slate-400">{data.activePlan.title}</p>
          ) : null}
          <p className="text-sm text-slate-300">
            {[
              workout.durationMinutes
                ? `${workout.durationMinutes} minutes`
                : null,
              exerciseCount ? `${exerciseCount} exercises` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
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

          {workout.completed ? (
            <p className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-slate-400">
              You already completed this workout. Pick another session below or
              check your history.
            </p>
          ) : inProgressSessionId ? (
            <Link
              href={`/athlete/workout/${inProgressSessionId}`}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-base font-bold text-black"
            >
              <Play className="size-5 fill-current" />
              CONTINUE WORKOUT
            </Link>
          ) : (
            <form action={startWorkoutAction.bind(null, workout.id)}>
              <button
                type="submit"
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-base font-bold text-black"
              >
                <Play className="size-5 fill-current" />
                START WORKOUT
              </button>
            </form>
          )}
        </section>
      ) : (
        <div className="space-y-3">
          <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
            No workouts assigned yet. Connect with a coach so they can assign a
            program — or keep training on your own when self-guided programs
            arrive.
          </p>
          <Link
            href="/athlete/connect"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-black"
          >
            Connect with a coach
          </Link>
        </div>
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

      <Link
        href="/athlete/history"
        className="block text-center text-sm text-slate-400 underline-offset-2 hover:underline"
      >
        Training history
      </Link>
    </div>
  );
}
