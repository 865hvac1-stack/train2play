import Link from "next/link";
import { Plus } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import {
  EmptyTrainingPlansState,
  TrainingPlanCard,
} from "@/components/training-plan-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function TrainingPlansPage() {
  const user = await requireUser();

  const plans = await prisma.trainingPlan.findMany({
    where: { coachId: user.id },
    include: {
      athlete: { select: { firstName: true, lastName: true } },
      workouts: { select: { completed: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <DashboardShell
      title="Training plans"
      description="Build workout schedules, attach videos kids can watch, and track completion."
      action={
        <Button
         
          render={
            <Link href="/training/new">
              <Plus className="h-4 w-4" />
              New plan
            </Link>
          }
        />
      }
    >
      {plans.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <TrainingPlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      ) : (
        <EmptyTrainingPlansState />
      )}
    </DashboardShell>
  );
}
