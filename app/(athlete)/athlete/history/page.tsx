import Link from "next/link";

import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { prisma } from "@/lib/db";
import { formatMetricDate, formatMetricValue } from "@/lib/progress";

export default async function AthleteHistoryPage() {
  const ctx = await requireAthleteContext();

  if (!ctx.athleteId) {
    return (
      <div className="space-y-3">
        <h1 className="font-heading text-3xl font-bold">Training history</h1>
        <p className="text-sm text-slate-400">
          Your athlete profile is not linked yet.
        </p>
      </div>
    );
  }

  const sessions = await prisma.workoutSession.findMany({
    where: { athleteId: ctx.athleteId },
    orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
    include: {
      workout: {
        include: { trainingPlan: { select: { title: true } } },
      },
      results: {
        where: { completed: true },
        include: { workoutExercise: { select: { name: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
          History
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Training history
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Chronological record of your completed and in-progress sessions.
        </p>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
          No sessions yet. Complete a workout from Today&apos;s Training to
          start your timeline.
        </p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => {
            const when = session.completedAt ?? session.startedAt;
            const results = session.results
              .filter((r) => r.valuePrimary != null)
              .map((r) => {
                const unit = r.unit ?? "";
                if (r.resultKind === "RATIO" && r.valueSecondary != null) {
                  return `${r.workoutExercise.name}: ${r.valuePrimary}/${r.valueSecondary}`;
                }
                return `${r.workoutExercise.name}: ${formatMetricValue(r.valuePrimary!, unit)}`;
              });

            return (
              <li
                key={session.id}
                className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">
                    {session.workout.title}
                  </p>
                  <span className="text-xs font-bold tracking-wide text-brand uppercase">
                    {session.status === "COMPLETED" ? "Complete" : "In progress"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {session.workout.trainingPlan.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatMetricDate(when)}
                  {session.durationMinutes
                    ? ` · ${session.durationMinutes} min`
                    : ""}
                  {` · ${session.results.filter((r) => r.completed).length} exercises`}
                </p>
                {results.length > 0 ? (
                  <p className="mt-2 text-sm text-slate-300">
                    {results.join(" · ")}
                  </p>
                ) : null}
                {session.status === "IN_PROGRESS" ? (
                  <Link
                    href={`/athlete/workout/${session.id}`}
                    className="mt-3 inline-flex text-sm font-semibold text-brand"
                  >
                    Continue →
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
