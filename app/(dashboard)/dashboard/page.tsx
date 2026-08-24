import Link from "next/link";
import { ClipboardList, Plus, Users } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { AthleteCard } from "@/components/athlete-card";
import { TrainingPlanCard } from "@/components/training-plan-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const user = await requireUser();

  const [athleteCount, planCount, recentAthletes, recentPlans, sportsBreakdown] =
    await Promise.all([
      prisma.athlete.count({ where: { coachId: user.id } }),
      prisma.trainingPlan.count({
        where: { coachId: user.id, status: "ACTIVE" },
      }),
      prisma.athlete.findMany({
        where: { coachId: user.id },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.trainingPlan.findMany({
        where: { coachId: user.id },
        include: {
          athlete: { select: { firstName: true, lastName: true } },
          workouts: { select: { completed: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
      }),
      prisma.athlete.groupBy({
        by: ["sport"],
        where: { coachId: user.id },
        _count: { sport: true },
        orderBy: { _count: { sport: "desc" } },
        take: 4,
      }),
    ]);

  return (
    <DashboardShell
      title={`Welcome back${user.name ? `, ${user.name.split(" ")[0]}` : ""}`}
      description="Here's an overview of your athletes and training plans."
      action={
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          render={
            <Link href="/athletes/new">
              <Plus className="h-4 w-4" />
              Add athlete
            </Link>
          }
        />
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total athletes</CardDescription>
              <CardTitle className="text-3xl">{athleteCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Users className="h-4 w-4" />
                On your roster
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active plans</CardDescription>
              <CardTitle className="text-3xl">{planCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ClipboardList className="h-4 w-4" />
                Training programs in progress
              </div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardDescription>Sports covered</CardDescription>
              <CardTitle className="text-3xl">{sportsBreakdown.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                {sportsBreakdown.length > 0
                  ? sportsBreakdown.map((s) => s.sport).join(", ")
                  : "Add athletes to see sport breakdown"}
              </p>
            </CardContent>
          </Card>
        </div>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent training plans
            </h2>
            <Link
              href="/training"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              View all
            </Link>
          </div>

          {recentPlans.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recentPlans.map((plan) => (
                <TrainingPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Create a training plan</CardTitle>
                <CardDescription>
                  Schedule workouts and track completion for your athletes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  render={
                    <Link href="/training/new">
                      <Plus className="h-4 w-4" />
                      New plan
                    </Link>
                  }
                />
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent athletes
            </h2>
            <Link
              href="/athletes"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              View all
            </Link>
          </div>

          {recentAthletes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recentAthletes.map((athlete) => (
                <AthleteCard key={athlete.id} athlete={athlete} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Add your first athlete</CardTitle>
                <CardDescription>
                  Your dashboard will show roster stats once you start adding
                  athletes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  render={
                    <Link href="/athletes/new">
                      <Plus className="h-4 w-4" />
                      Add athlete
                    </Link>
                  }
                />
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
