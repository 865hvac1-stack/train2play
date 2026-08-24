import { auth } from "@/auth";
import { brand } from "@/lib/brand";
import {
  buildCsv,
  completionRate,
  csvResponse,
  formatCsvDate,
} from "@/lib/export";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const athlete = await prisma.athlete.findFirst({
    where: { id, coachId: session.user.id },
    include: {
      trainingPlans: {
        include: {
          workouts: { orderBy: { sortOrder: "asc" } },
        },
      },
      progressMetrics: { orderBy: { recordedAt: "asc" } },
    },
  });

  if (!athlete) {
    return new Response("Not found", { status: 404 });
  }

  const rows: Array<Array<string | number | null | undefined>> = [
    [`${brand.name} — Athlete Progress Report`],
    [],
    ["Athlete", `${athlete.firstName} ${athlete.lastName}`],
    ["Sport", athlete.sport],
    ["Position", athlete.position ?? ""],
    ["Date of birth", formatCsvDate(athlete.dateOfBirth)],
    [],
    ["Training Plans"],
    [
      "Plan",
      "Status",
      "Workout",
      "Scheduled",
      "Duration (min)",
      "Completed",
      "Completed At",
    ],
  ];

  for (const plan of athlete.trainingPlans) {
    if (plan.workouts.length === 0) {
      rows.push([plan.title, plan.status, "", "", "", "", ""]);
      continue;
    }

    for (const workout of plan.workouts) {
      rows.push([
        plan.title,
        plan.status,
        workout.title,
        formatCsvDate(workout.scheduledDate),
        workout.durationMinutes ?? "",
        workout.completed ? "Yes" : "No",
        formatCsvDate(workout.completedAt),
      ]);
    }
  }

  rows.push([]);
  rows.push(["Progress Metrics"]);
  rows.push(["Metric", "Value", "Unit", "Recorded", "Notes"]);

  for (const metric of athlete.progressMetrics) {
    rows.push([
      metric.label,
      metric.value,
      metric.unit,
      formatCsvDate(metric.recordedAt),
      metric.notes ?? "",
    ]);
  }

  const slug = `${athlete.firstName}-${athlete.lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  return csvResponse(`${slug}-progress-report.csv`, buildCsv(rows));
}
