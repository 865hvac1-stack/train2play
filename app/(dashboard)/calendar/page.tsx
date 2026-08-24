import { DashboardShell } from "@/components/dashboard-shell";
import {
  WorkoutCalendar,
  type CalendarWorkout,
} from "@/components/workout-calendar";
import { getMonthBounds, parseMonthParam } from "@/lib/calendar";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const month = parseMonthParam(params.month);
  const { start, end } = getMonthBounds(month);

  const workouts = await prisma.workout.findMany({
    where: {
      scheduledDate: { gte: start, lte: end },
      trainingPlan: { coachId: user.id },
    },
    include: {
      trainingPlan: {
        select: {
          id: true,
          title: true,
          athlete: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: [{ scheduledDate: "asc" }, { sortOrder: "asc" }],
  });

  const calendarWorkouts: CalendarWorkout[] = workouts
    .filter((workout) => workout.scheduledDate)
    .map((workout) => ({
      id: workout.id,
      title: workout.title,
      completed: workout.completed,
      scheduledDate: workout.scheduledDate!.toISOString(),
      planId: workout.trainingPlan.id,
      planTitle: workout.trainingPlan.title,
      athleteName: workout.trainingPlan.athlete
        ? `${workout.trainingPlan.athlete.firstName} ${workout.trainingPlan.athlete.lastName}`
        : null,
    }));

  return (
    <DashboardShell
      title="Calendar"
      description="See scheduled workouts across your training plans."
    >
      <WorkoutCalendar monthParam={params.month} workouts={calendarWorkouts} />
    </DashboardShell>
  );
}
