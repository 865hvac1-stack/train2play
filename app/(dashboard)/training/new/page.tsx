import Link from "next/link";

import { TrainingPlanForm } from "@/components/training-plan-form";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { coachAccessibleAthleteWhere } from "@/lib/authz/coach-athletes";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function NewTrainingPlanPage() {
  const user = await requireUser();

  const athletes = await prisma.athlete.findMany({
    where: {
      ...coachAccessibleAthleteWhere(user.id),
      rosterStatus: "ROSTER",
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <DashboardShell
      title="New training plan"
      description="Define a workout program for an athlete or as a reusable template."
      action={
        <Button variant="outline" render={<Link href="/training">Cancel</Link>} />
      }
    >
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Plan details</CardTitle>
          <CardDescription>
            You can add individual workouts after creating the plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingPlanForm athletes={athletes} />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
