import { PrintToolbar } from "@/components/print-toolbar";
import { brand } from "@/lib/brand";
import { completionRate } from "@/lib/export";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function TeamPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ auto?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;

  const athletes = await prisma.athlete.findMany({
    where: { coachId: user.id },
    include: {
      trainingPlans: {
        where: { status: "ACTIVE" },
        include: { workouts: true },
      },
      _count: { select: { progressMetrics: true, progressGoals: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const totalWorkouts = athletes.reduce(
    (sum, athlete) =>
      sum +
      athlete.trainingPlans.reduce(
        (planSum, plan) => planSum + plan.workouts.length,
        0,
      ),
    0,
  );

  const completedWorkouts = athletes.reduce(
    (sum, athlete) =>
      sum +
      athlete.trainingPlans.reduce(
        (planSum, plan) =>
          planSum + plan.workouts.filter((workout) => workout.completed).length,
        0,
      ),
    0,
  );

  const generated = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  return (
    <div className="min-h-full bg-white px-8 py-10 text-slate-900 print:p-0">
      <div className="mx-auto max-w-3xl print:max-w-none">
        <PrintToolbar backHref="/reports" autoPrint={query.auto === "1"} />

        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            {brand.name}
          </p>
          <h1 className="mt-2 text-3xl font-bold">Team progress report</h1>
          <p className="mt-1 text-slate-600">
            {athletes.length} athletes · {completionRate(completedWorkouts, totalWorkouts)}%
            workout completion
          </p>
          <p className="mt-1 text-xs text-slate-500">Generated {generated}</p>
        </header>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2 pr-4">Athlete</th>
              <th className="py-2 pr-4">Sport</th>
              <th className="py-2 pr-4">Plans</th>
              <th className="py-2 pr-4">Completion</th>
              <th className="py-2">Metrics</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map((athlete) => {
              const workouts = athlete.trainingPlans.flatMap(
                (plan) => plan.workouts,
              );
              const completed = workouts.filter(
                (workout) => workout.completed,
              ).length;

              return (
                <tr key={athlete.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">
                    {athlete.firstName} {athlete.lastName}
                  </td>
                  <td className="py-2 pr-4">{athlete.sport}</td>
                  <td className="py-2 pr-4">{athlete.trainingPlans.length}</td>
                  <td className="py-2 pr-4">
                    {completionRate(completed, workouts.length)}% ({completed}/
                    {workouts.length})
                  </td>
                  <td className="py-2">{athlete._count.progressMetrics}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
