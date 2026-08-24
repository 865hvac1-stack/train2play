import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, ClipboardList, Download, Trash2, TrendingUp } from "lucide-react";

import { deleteAthleteAction } from "@/app/(dashboard)/athletes/actions";
import { deleteProgressMetricAction } from "@/app/(dashboard)/athletes/progress-actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentSharePanel } from "@/components/parent-share-panel";
import { ProgressCharts } from "@/components/progress-charts";
import { ProgressMetricForm } from "@/components/progress-metric-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPlanStatus } from "@/lib/training";
import {
  formatMetricDate,
  formatMetricValue,
} from "@/lib/progress";
import { isEmailConfigured } from "@/lib/settings";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

function formatBirthDate(date: Date | null) {
  if (!date) return "Not provided";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const athlete = await prisma.athlete.findFirst({
    where: { id, coachId: user.id },
    include: {
      coach: { select: { name: true } },
      trainingPlans: {
        where: { status: "ACTIVE" },
        include: {
          workouts: { select: { completed: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      progressMetrics: {
        orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
        take: 20,
      },
      shareLinks: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!athlete) {
    notFound();
  }

  const chartMetrics = athlete.progressMetrics.map((metric) => ({
    id: metric.id,
    label: metric.label,
    value: metric.value,
    unit: metric.unit,
    recordedAt: metric.recordedAt.toISOString(),
  }));

  return (
    <DashboardShell
      title={`${athlete.firstName} ${athlete.lastName}`}
      description="Athlete profile, training plans, and progress"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            render={
              <a href={`/api/export/athlete/${athlete.id}`}>
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            }
          />
          <Button variant="outline" render={<Link href="/athletes">Back to roster</Link>} />
        </div>
      }
    >
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{athlete.sport}</Badge>
                {athlete.position ? (
                  <Badge variant="outline">{athlete.position}</Badge>
                ) : null}
              </div>
              <CardTitle className="text-2xl">
                {athlete.firstName} {athlete.lastName}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Born {formatBirthDate(athlete.dateOfBirth)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Notes</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                {athlete.notes || "No notes added yet."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Training plans
              </CardTitle>
              <CardDescription>
                Active programs assigned to this athlete.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {athlete.trainingPlans.length > 0 ? (
                athlete.trainingPlans.map((plan) => {
                  const completed = plan.workouts.filter((w) => w.completed).length;
                  const total = plan.workouts.length;

                  return (
                    <Link
                      key={plan.id}
                      href={`/training/${plan.id}`}
                      className="block rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{plan.title}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {total > 0
                              ? `${completed}/${total} workouts complete`
                              : "No workouts yet"}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {formatPlanStatus(plan.status)}
                        </Badge>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No plans assigned yet.{" "}
                  <Link
                    href="/training/new"
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    Create a plan
                  </Link>{" "}
                  and assign it to this athlete.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress history
              </CardTitle>
              <CardDescription>
                Performance metrics logged over time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProgressCharts metrics={chartMetrics} />

              {athlete.progressMetrics.length > 0 ? (
                athlete.progressMetrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{metric.label}</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-700">
                        {formatMetricValue(metric.value, metric.unit)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatMetricDate(metric.recordedAt)}
                        {metric.notes ? ` · ${metric.notes}` : ""}
                      </p>
                    </div>
                    <form
                      action={deleteProgressMetricAction.bind(
                        null,
                        athlete.id,
                        metric.id,
                      )}
                    >
                      <Button type="submit" variant="ghost" size="sm">
                        Remove
                      </Button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No metrics logged yet. Use the form to record a baseline measurement.
                </p>
              )}
            </CardContent>
          </Card>

          <form action={deleteAthleteAction.bind(null, athlete.id)}>
            <Button type="submit" variant="destructive">
              <Trash2 className="h-4 w-4" />
              Remove athlete
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Log progress</CardTitle>
              <CardDescription>
                Record times, weights, jumps, and other measurable results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressMetricForm athleteId={athlete.id} />
            </CardContent>
          </Card>

          <ParentSharePanel
            athleteId={athlete.id}
            athleteName={`${athlete.firstName} ${athlete.lastName}`}
            coachName={athlete.coach.name}
            emailEnabled={isEmailConfigured()}
            links={athlete.shareLinks}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
