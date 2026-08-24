"use client";

import { useActionState } from "react";
import { Target } from "lucide-react";

import {
  createProgressGoalAction,
  deleteProgressGoalAction,
  type GoalActionState,
} from "@/app/(dashboard)/athletes/goal-actions";
import {
  evaluateGoalProgress,
  formatGoalDirection,
  GOAL_DIRECTIONS,
  type GoalDirection,
} from "@/lib/goals";
import { formatMetricValue, METRIC_PRESETS } from "@/lib/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: GoalActionState = {};

type GoalWithProgress = {
  id: string;
  label: string;
  targetValue: number;
  unit: string;
  direction: string;
  dueDate: Date | string | null;
  currentValue: number | null;
};

type ProgressGoalsPanelProps = {
  athleteId: string;
  goals: GoalWithProgress[];
};

export function ProgressGoalForm({ athleteId }: { athleteId: string }) {
  const [state, formAction, pending] = useActionState(
    createProgressGoalAction.bind(null, athleteId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="goalLabel">Metric</Label>
        <Input
          id="goalLabel"
          name="label"
          list="goal-metric-presets"
          required
          placeholder="40-yard dash"
        />
        <datalist id="goal-metric-presets">
          {METRIC_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.label} />
          ))}
        </datalist>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="targetValue">Target value</Label>
          <Input
            id="targetValue"
            name="targetValue"
            type="number"
            step="any"
            min="0"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goalUnit">Unit</Label>
          <Input id="goalUnit" name="unit" required placeholder="sec" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="direction">Goal type</Label>
        <select
          id="direction"
          name="direction"
          defaultValue="LOWER"
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {GOAL_DIRECTIONS.map((direction) => (
            <option key={direction} value={direction}>
              {formatGoalDirection(direction)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="goalDueDate">Target date (optional)</Label>
        <Input id="goalDueDate" name="dueDate" type="date" />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700">Goal added.</p>
      ) : null}
      <Button
        type="submit"
        className="bg-emerald-600 hover:bg-emerald-700"
        disabled={pending}
      >
        {pending ? "Saving..." : "Set goal"}
      </Button>
    </form>
  );
}

export function ProgressGoalsList({
  athleteId,
  goals,
}: ProgressGoalsPanelProps) {
  if (goals.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No goals set yet. Add a target to track progress toward a specific
        metric.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {goals.map((goal) => {
        const evaluation = evaluateGoalProgress({
          current: goal.currentValue,
          target: goal.targetValue,
          direction: goal.direction as GoalDirection,
        });

        return (
          <li
            key={goal.id}
            className="rounded-lg border border-slate-200 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-600" />
                  <p className="font-medium text-slate-900">{goal.label}</p>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Target: {formatMetricValue(goal.targetValue, goal.unit)}
                  {goal.currentValue != null
                    ? ` · Current: ${formatMetricValue(goal.currentValue, goal.unit)}`
                    : " · No measurements yet"}
                </p>
              </div>
              <Badge variant={evaluation.met ? "default" : "secondary"}>
                {evaluation.met ? "Met" : `${evaluation.progressPercent}%`}
              </Badge>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  evaluation.met ? "bg-emerald-600" : "bg-emerald-400"
                }`}
                style={{ width: `${evaluation.progressPercent}%` }}
              />
            </div>
            <form
              action={deleteProgressGoalAction.bind(null, athleteId, goal.id)}
              className="mt-3"
            >
              <Button type="submit" variant="ghost" size="sm">
                Remove goal
              </Button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
