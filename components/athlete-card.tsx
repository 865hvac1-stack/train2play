import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AthleteCardProps = {
  athlete: {
    id: string;
    firstName: string;
    lastName: string;
    sport: string;
    position: string | null;
    dateOfBirth: Date | null;
    activeProgram?: string | null;
    completionPercent?: number | null;
    lastWorkoutTitle?: string | null;
    lastActivityAt?: Date | string | null;
  };
};

function formatDate(date: Date | null) {
  if (!date) return "Birthday not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatActivity(date: Date | string | null | undefined) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}

export function AthleteCard({ athlete }: AthleteCardProps) {
  return (
    <Link href={`/athletes/${athlete.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">
                {athlete.firstName} {athlete.lastName}
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2">
                <Badge variant="secondary">{athlete.sport}</Badge>
                {athlete.position ? (
                  <span className="text-slate-500">{athlete.position}</span>
                ) : null}
              </CardDescription>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="h-4 w-4" />
            {formatDate(athlete.dateOfBirth)}
          </div>
          {athlete.activeProgram ? (
            <p className="text-sm text-slate-700">
              <span className="font-medium">{athlete.activeProgram}</span>
              {athlete.completionPercent != null
                ? ` · ${athlete.completionPercent}%`
                : ""}
            </p>
          ) : (
            <p className="text-sm text-slate-400">No active program</p>
          )}
          {athlete.lastWorkoutTitle ? (
            <p className="text-xs text-slate-500">
              Last: {athlete.lastWorkoutTitle}
              {athlete.lastActivityAt
                ? ` · ${formatActivity(athlete.lastActivityAt)}`
                : ""}
            </p>
          ) : (
            <p className="text-xs text-slate-400">No workouts completed yet</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function EmptyAthletesState() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>No athletes yet</CardTitle>
        <CardDescription>
          Add your first athlete to start building rosters and tracking progress.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href="/athletes/new"
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          Add your first athlete →
        </Link>
      </CardContent>
    </Card>
  );
}
