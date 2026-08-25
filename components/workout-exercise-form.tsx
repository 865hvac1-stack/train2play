"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  assignPlanToAthleteAction,
  createWorkoutExerciseAction,
  type ExerciseActionState,
} from "@/app/(dashboard)/training/exercise-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Saving…" : label}
    </Button>
  );
}

type MetricOption = { id: string; name: string; unit: string };

export function WorkoutExerciseForm({
  planId,
  workoutId,
  metrics,
}: {
  planId: string;
  workoutId: string;
  metrics: MetricOption[];
}) {
  const [state, formAction] = useActionState(
    createWorkoutExerciseAction.bind(null, planId, workoutId),
    {} as ExerciseActionState,
  );

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Add exercise
      </p>
      <div className="space-y-2">
        <Label htmlFor={`name-${workoutId}`}>Name</Label>
        <Input
          id={`name-${workoutId}`}
          name="name"
          required
          placeholder="Intent Throw Series"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`instructions-${workoutId}`}>Instructions</Label>
        <textarea
          id={`instructions-${workoutId}`}
          name="instructions"
          rows={2}
          className="flex min-h-16 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="How to perform the drill"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`cue-${workoutId}`}>Coaching cue</Label>
        <Input
          id={`cue-${workoutId}`}
          name="coachingCue"
          placeholder="Stay tall through release"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor={`sets-${workoutId}`}>Sets</Label>
          <Input id={`sets-${workoutId}`} name="sets" type="number" min={1} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`reps-${workoutId}`}>Reps</Label>
          <Input id={`reps-${workoutId}`} name="reps" type="number" min={1} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`dur-${workoutId}`}>Duration (sec)</Label>
          <Input
            id={`dur-${workoutId}`}
            name="durationSec"
            type="number"
            min={1}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`rest-${workoutId}`}>Rest (sec)</Label>
          <Input
            id={`rest-${workoutId}`}
            name="restSec"
            type="number"
            min={1}
          />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`kind-${workoutId}`}>Result type</Label>
          <select
            id={`kind-${workoutId}`}
            name="resultKind"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            defaultValue="NONE"
          >
            <option value="NONE">None</option>
            <option value="NUMBER">Number</option>
            <option value="TIME">Time</option>
            <option value="COUNT">Count</option>
            <option value="WEIGHT">Weight</option>
            <option value="RATIO">Makes / Attempts</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`unit-${workoutId}`}>Result unit</Label>
          <Input
            id={`unit-${workoutId}`}
            name="resultUnit"
            placeholder="mph, sec, lbs…"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`metric-${workoutId}`}>Track metric (optional)</Label>
        <select
          id={`metric-${workoutId}`}
          name="metricDefinitionId"
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          defaultValue=""
        >
          <option value="">No metric link</option>
          {metrics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.unit})
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="resultRequired" className="size-4" />
        Require result entry to complete
      </label>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <SubmitButton label="Add exercise" />
    </form>
  );
}

export function AssignPlanForm({
  planId,
  athletes,
  currentAthleteId,
}: {
  planId: string;
  athletes: { id: string; firstName: string; lastName: string }[];
  currentAthleteId: string | null;
}) {
  return (
    <form
      action={assignPlanToAthleteAction.bind(null, planId)}
      className="space-y-3"
    >
      <div className="space-y-2">
        <Label htmlFor="athleteId">Assign to athlete</Label>
        <select
          id="athleteId"
          name="athleteId"
          defaultValue={currentAthleteId ?? ""}
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">Unassigned template</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.firstName} {a.lastName}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" className="w-full">
        Save assignment
      </Button>
    </form>
  );
}
