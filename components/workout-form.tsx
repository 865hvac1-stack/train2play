"use client";

import { useActionState } from "react";

import {
  createWorkoutAction,
  type TrainingActionState,
} from "@/app/(dashboard)/training/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: TrainingActionState = {};

type WorkoutFormProps = {
  planId: string;
};

export function WorkoutForm({ planId }: WorkoutFormProps) {
  const [state, formAction, pending] = useActionState(
    createWorkoutAction.bind(null, planId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Workout title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Speed and agility session"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Instructions</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Drills, sets, reps, rest periods..."
          className="flex min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="scheduledDate">Scheduled date</Label>
          <Input id="scheduledDate" name="scheduledDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationMinutes">Duration (minutes)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            placeholder="45"
          />
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button
        type="submit"
        className="bg-emerald-600 hover:bg-emerald-700"
        disabled={pending}
      >
        {pending ? "Adding..." : "Add workout"}
      </Button>
    </form>
  );
}
