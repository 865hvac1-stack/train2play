import "dotenv/config";
import { createPrismaClient } from "../lib/db";

const prisma = createPrismaClient();

async function main() {
  const plan = await prisma.trainingPlan.findFirst({
    where: { title: { contains: "4-Week Baseball" }, status: "ACTIVE" },
    include: { workouts: { orderBy: { sortOrder: "asc" } } },
  });
  if (!plan?.workouts[0]) {
    console.log("No sample workout to reset");
    return;
  }
  const w = plan.workouts[0];
  await prisma.workoutSession.deleteMany({ where: { workoutId: w.id } });
  await prisma.workout.update({
    where: { id: w.id },
    data: { completed: false, completedAt: null },
  });
  console.log("Reset for demo:", w.title);
}

main()
  .finally(() => prisma.$disconnect());
