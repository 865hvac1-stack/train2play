"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  attachWorkoutInstructionVideoAction,
  createWorkoutAction,
  type TrainingActionState,
} from "@/app/(dashboard)/training/actions";
import { InstructionVideoFields } from "@/components/instruction-video-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: TrainingActionState = {};

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? pendingLabel : label}
    </Button>
  );
}

type WorkoutFormProps = {
  planId: string;
};

export function WorkoutForm({ planId }: WorkoutFormProps) {
  const [state, formAction] = useActionState(
    createWorkoutAction.bind(null, planId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4" encType="multipart/form-data">
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

      <InstructionVideoFields
        idPrefix="new-workout"
        title="Video for kids to watch (optional)"
        description="Upload a clip, or paste a YouTube / Vimeo / MP4 link. Shows on the family share page."
      />

      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton
        label="Add workout"
        pendingLabel="Saving… keep this screen open"
      />
    </form>
  );
}

type AttachVideoFormProps = {
  planId: string;
  workoutId: string;
};

export function AttachWorkoutVideoForm({
  planId,
  workoutId,
}: AttachVideoFormProps) {
  const [state, formAction] = useActionState(
    attachWorkoutInstructionVideoAction.bind(null, planId, workoutId),
    initialState,
  );

  return (
    <form
      action={formAction}
      className="mt-3 space-y-3"
      encType="multipart/form-data"
    >
      <InstructionVideoFields
        idPrefix={`workout-${workoutId}`}
        required
        title="Video for kids to watch"
        description="Upload a clip, or paste a YouTube / Vimeo / MP4 link."
      />
      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <SubmitButton
        label="Save video for kids"
        pendingLabel="Uploading… keep this screen open"
      />
    </form>
  );
}
