"use client";

import { useActionState } from "react";

import {
  createTrainingPlanAction,
  type TrainingActionState,
} from "@/app/(dashboard)/training/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: TrainingActionState = {};

type TrainingPlanFormProps = {
  athletes: { id: string; firstName: string; lastName: string }[];
};

export function TrainingPlanForm({ athletes }: TrainingPlanFormProps) {
  const [state, formAction, pending] = useActionState(
    createTrainingPlanAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Plan title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Pre-season conditioning"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Goals, focus areas, or season context..."
          className="flex min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="athleteId">Assign to athlete (optional)</Label>
        <select
          id="athleteId"
          name="athleteId"
          defaultValue=""
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Team template (not assigned)</option>
          {athletes.map((athlete) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.firstName} {athlete.lastName}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
         
          disabled={pending}
        >
          {pending ? "Creating..." : "Create plan"}
        </Button>
      </div>
    </form>
  );
}
