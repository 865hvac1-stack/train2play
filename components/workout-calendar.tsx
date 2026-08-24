"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  addMonths,
  dateKey,
  formatMonthLabel,
  formatMonthParam,
  getCalendarDays,
  isSameDay,
  parseMonthParam,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

export type CalendarWorkout = {
  id: string;
  title: string;
  completed: boolean;
  scheduledDate: string;
  planId: string;
  planTitle: string;
  athleteName: string | null;
};

type WorkoutCalendarProps = {
  monthParam?: string;
  workouts: CalendarWorkout[];
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WorkoutCalendar({ monthParam, workouts }: WorkoutCalendarProps) {
  const month = parseMonthParam(monthParam);
  const days = getCalendarDays(month);
  const today = new Date();

  const workoutsByDay = workouts.reduce<Record<string, CalendarWorkout[]>>(
    (acc, workout) => {
      const key = workout.scheduledDate.slice(0, 10);
      acc[key] = acc[key] ?? [];
      acc[key].push(workout);
      return acc;
    },
    {},
  );

  const prevMonth = formatMonthParam(addMonths(month, -1));
  const nextMonth = formatMonthParam(addMonths(month, 1));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle>{formatMonthLabel(month)}</CardTitle>
          <CardDescription>Scheduled workouts across all plans</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            render={
              <Link href={`/calendar?month=${prevMonth}`} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            }
          />
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/calendar">Today</Link>}
          />
          <Button
            variant="outline"
            size="icon"
            render={
              <Link href={`/calendar?month=${nextMonth}`} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Link>
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-2 grid grid-cols-7 gap-2">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="text-center text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map(({ date, inMonth }) => {
            const key = dateKey(date);
            const dayWorkouts = workoutsByDay[key] ?? [];
            const isToday = isSameDay(date, today);

            return (
              <div
                key={key}
                className={cn(
                  "min-h-28 rounded-lg border p-2",
                  inMonth ? "border-slate-200 bg-white" : "border-transparent bg-slate-50/80",
                  isToday && inMonth && "ring-2 ring-brand ring-offset-1",
                )}
              >
                <div
                  className={cn(
                    "mb-1 text-xs font-medium",
                    inMonth ? "text-slate-700" : "text-slate-400",
                    isToday && "text-primary",
                  )}
                >
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayWorkouts.slice(0, 3).map((workout) => (
                    <Link
                      key={workout.id}
                      href={`/training/${workout.planId}`}
                      className={cn(
                        "block truncate rounded px-1.5 py-0.5 text-[10px] leading-tight",
                        workout.completed
                          ? "bg-slate-100 text-slate-500 line-through"
                          : "bg-brand-light text-primary hover:bg-brand-muted",
                      )}
                      title={workout.title}
                    >
                      {workout.title}
                    </Link>
                  ))}
                  {dayWorkouts.length > 3 ? (
                    <p className="px-1 text-[10px] text-slate-500">
                      +{dayWorkouts.length - 3} more
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-brand-light" />
            Upcoming workout
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-slate-100" />
            Completed
          </span>
          <Badge variant="outline">{workouts.length} workouts this month</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
