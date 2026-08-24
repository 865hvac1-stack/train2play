import Link from "next/link";
import { Calendar, ChevronRight, ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPlanStatus, planStatusVariant } from "@/lib/training";

type TrainingPlanCardProps = {
  plan: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    athlete: { firstName: string; lastName: string } | null;
    workouts: { completed: boolean }[];
  };
};

function formatDateRange(start: Date | null, end: Date | null) {
  if (!start && !end) return "No dates set";
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (start && end) {
    return `${formatter.format(start)} – ${formatter.format(end)}`;
  }
  if (start) return `Starts ${formatter.format(start)}`;
  return `Ends ${formatter.format(end!)}`;
}

export function TrainingPlanCard({ plan }: TrainingPlanCardProps) {
  const completedCount = plan.workouts.filter((w) => w.completed).length;
  const totalWorkouts = plan.workouts.length;

  return (
    <Link href={`/training/${plan.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={planStatusVariant(plan.status)}>
                  {formatPlanStatus(plan.status)}
                </Badge>
                {plan.athlete ? (
                  <Badge variant="outline">
                    {plan.athlete.firstName} {plan.athlete.lastName}
                  </Badge>
                ) : (
                  <Badge variant="outline">Team template</Badge>
                )}
              </div>
              <CardTitle className="text-lg">{plan.title}</CardTitle>
              {plan.description ? (
                <CardDescription className="line-clamp-2">
                  {plan.description}
                </CardDescription>
              ) : null}
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {formatDateRange(plan.startDate, plan.endDate)}
          </div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            {totalWorkouts > 0
              ? `${completedCount}/${totalWorkouts} workouts complete`
              : "No workouts yet"}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function EmptyTrainingPlansState() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>No training plans yet</CardTitle>
        <CardDescription>
          Create a plan to schedule workouts and track completion for your
          athletes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href="/training/new"
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          Create your first plan →
        </Link>
      </CardContent>
    </Card>
  );
}
