import { auth } from "@/auth";
import { brand } from "@/lib/brand";
import {
  buildCsv,
  completionRate,
  csvResponse,
} from "@/lib/export";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const athletes = await prisma.athlete.findMany({
    where: { coachId: session.user.id },
    include: {
      trainingPlans: {
        where: { status: "ACTIVE" },
        include: { workouts: true },
      },
      progressMetrics: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const rows: Array<Array<string | number | null | undefined>> = [
    [`${brand.name} — Team Report`],
    [],
    [
      "Athlete",
      "Sport",
      "Position",
      "Active Plans",
      "Total Workouts",
      "Completed Workouts",
      "Completion %",
      "Metrics Logged",
    ],
  ];

  for (const athlete of athletes) {
    const workouts = athlete.trainingPlans.flatMap((plan) => plan.workouts);
    const completed = workouts.filter((workout) => workout.completed).length;

    rows.push([
      `${athlete.firstName} ${athlete.lastName}`,
      athlete.sport,
      athlete.position ?? "",
      athlete.trainingPlans.length,
      workouts.length,
      completed,
      `${completionRate(completed, workouts.length)}%`,
      athlete.progressMetrics.length,
    ]);
  }

  return csvResponse("team-report.csv", buildCsv(rows));
}
