"use client";

import { useTransition } from "react";
import { Copy } from "lucide-react";

import { duplicateTrainingPlanAction } from "@/app/(dashboard)/training/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type DuplicatePlanFormProps = {
  planId: string;
  athletes: { id: string; firstName: string; lastName: string }[];
  currentAthleteId: string | null;
};

export function DuplicatePlanForm({
  planId,
  athletes,
  currentAthleteId,
}: DuplicatePlanFormProps) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await duplicateTrainingPlanAction(planId, formData);
        });
      }}
      className="space-y-3"
    >
      <div className="space-y-2">
        <Label htmlFor="duplicateAthleteId">Assign copy to</Label>
        <select
          id="duplicateAthleteId"
          name="athleteId"
          defaultValue={currentAthleteId ?? ""}
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Team template (unassigned)</option>
          {athletes.map((athlete) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.firstName} {athlete.lastName}
            </option>
          ))}
        </select>
      </div>
      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={pending}
      >
        <Copy className="h-4 w-4" />
        {pending ? "Duplicating..." : "Duplicate plan"}
      </Button>
      <p className="text-xs text-slate-500">
        Creates a fresh copy with the same workouts. Dates and completion
        status reset.
      </p>
    </form>
  );
}
