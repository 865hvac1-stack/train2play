import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Trophy } from "lucide-react";

import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { prisma } from "@/lib/db";
import { formatMetricValue } from "@/lib/progress";
import { assertAthleteOwnsAthleteId } from "@/lib/workout-session";

export default async function WorkoutCompletePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const ctx = await requireAthleteContext();
  const { sessionId } = await params;

  if (!ctx.athleteId) redirect("/athlete/setup-required");

  const session = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      results: {
        include: {
          workoutExercise: true,
          metricEntry: { include: { metricDefinition: true } },
        },
      },
      workout: {
        include: {
          exercises: true,
          trainingPlan: { select: { title: true } },
        },
      },
    },
  });

  if (!session) notFound();
  const owns = await assertAthleteOwnsAthleteId(ctx.userId, session.athleteId);
  if (!owns) notFound();

  if (session.status !== "COMPLETED") {
    redirect(`/athlete/workout/${session.id}`);
  }

  const completedCount = session.results.filter((r) => r.completed).length;
  const total = session.workout.exercises.length || completedCount;
  const prs = session.results.filter((r) => r.isPersonalRecord);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-brand/40 bg-gradient-to-br from-brand via-brand to-[#c44f00] p-6 text-black">
        <p className="text-xs font-bold tracking-[0.18em] uppercase opacity-80">
          Workout complete
        </p>
        <h1 className="font-heading mt-2 text-4xl font-bold tracking-tight">
          Great work.
        </h1>
        <p className="mt-3 text-sm font-medium text-black/75">
          {completedCount} of {total} exercises completed
          {session.durationMinutes
            ? ` · ${session.durationMinutes} minutes`
            : ""}
        </p>
        <p className="mt-1 text-sm text-black/70">
          {session.workout.title} · {session.workout.trainingPlan.title}
        </p>
      </section>

      {prs.length > 0 ? (
        <section className="space-y-3 rounded-2xl border border-brand/40 bg-brand/10 p-4">
          <div className="flex items-center gap-2 text-brand">
            <Trophy className="size-5" />
            <p className="text-xs font-bold tracking-[0.16em] uppercase">
              Personal records
            </p>
          </div>
          {prs.map((r) => (
            <div key={r.id}>
              <p className="font-heading text-xl font-bold text-white">
                {r.metricEntry?.metricDefinition.name ??
                  r.workoutExercise.name}
              </p>
              <p className="text-lg font-semibold text-brand">
                {r.valuePrimary != null
                  ? formatMetricValue(
                      r.valuePrimary,
                      r.unit ?? r.metricEntry?.metricDefinition.unit ?? "",
                    )
                  : "Logged"}{" "}
                🏆
              </p>
            </div>
          ))}
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/athlete/progress"
          className="inline-flex min-h-14 flex-1 items-center justify-center rounded-2xl bg-brand px-6 text-base font-bold text-black"
        >
          VIEW PROGRESS
        </Link>
        <Link
          href="/athlete"
          className="inline-flex min-h-14 flex-1 items-center justify-center rounded-2xl border border-white/15 px-6 text-base font-bold text-white"
        >
          Return Home
        </Link>
      </div>

      <Link
        href="/athlete/history"
        className="block text-center text-sm text-slate-400 underline-offset-2 hover:underline"
      >
        View training history
      </Link>
    </div>
  );
}
