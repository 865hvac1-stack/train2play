import { notFound } from "next/navigation";

import { PrintToolbar } from "@/components/print-toolbar";
import { brand } from "@/lib/brand";
import { completionRate } from "@/lib/export";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function AthletePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;

  const athlete = await prisma.athlete.findFirst({
    where: { id, coachId: user.id },
    include: {
      coach: { select: { name: true } },
      trainingPlans: {
        include: { workouts: { orderBy: { sortOrder: "asc" } } },
      },
      progressMetrics: { orderBy: { recordedAt: "asc" } },
      progressGoals: true,
    },
  });

  if (!athlete) {
    notFound();
  }

  const generated = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  function getLatestMetricValue(label: string) {
    const matching = athlete!.progressMetrics
      .filter((metric) => metric.label.toLowerCase() === label.toLowerCase())
      .sort(
        (a, b) =>
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
      );
    return matching[0]?.value ?? null;
  }

  return (
    <div className="min-h-full bg-white px-8 py-10 text-slate-900 print:p-0">
      <div className="mx-auto max-w-3xl print:max-w-none">
        <PrintToolbar
          backHref={`/athletes/${athlete.id}`}
          autoPrint={query.auto === "1"}
        />

        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            {brand.name}
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {athlete.firstName} {athlete.lastName}
          </h1>
          <p className="mt-1 text-slate-600">
            {athlete.sport}
            {athlete.position ? ` · ${athlete.position}` : ""} · Coach{" "}
            {athlete.coach.name}
          </p>
          <p className="mt-1 text-xs text-slate-500">Generated {generated}</p>
        </header>

        {athlete.progressGoals.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">Goals</h2>
            <ul className="space-y-2 text-sm">
              {athlete.progressGoals.map((goal) => {
                const current = getLatestMetricValue(goal.label);
                return (
                  <li key={goal.id}>
                    {goal.label}: target {goal.targetValue} {goal.unit}
                    {current != null ? ` · current ${current} ${goal.unit}` : ""}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Training plans</h2>
          {athlete.trainingPlans.map((plan) => {
            const completed = plan.workouts.filter((w) => w.completed).length;
            return (
              <div key={plan.id} className="mb-4 break-inside-avoid">
                <h3 className="font-medium">
                  {plan.title} ({completed}/{plan.workouts.length} complete)
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {plan.workouts.map((workout) => (
                    <li key={workout.id}>
                      {workout.completed ? "✓" : "○"} {workout.title}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Progress metrics</h2>
          {athlete.progressMetrics.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {athlete.progressMetrics.map((metric) => (
                <li key={metric.id}>
                  {metric.label}: {metric.value} {metric.unit}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No metrics recorded.</p>
          )}
        </section>
      </div>
    </div>
  );
}
