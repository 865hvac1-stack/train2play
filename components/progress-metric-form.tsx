"use client";

import { useActionState } from "react";

import {
  createProgressMetricAction,
  type ProgressActionState,
} from "@/app/(dashboard)/athletes/progress-actions";
import { METRIC_PRESETS } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ProgressActionState = {};

type ProgressMetricFormProps = {
  athleteId: string;
};

export function ProgressMetricForm({ athleteId }: ProgressMetricFormProps) {
  const [state, formAction, pending] = useActionState(
    createProgressMetricAction.bind(null, athleteId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Metric</Label>
        <Input
          id="label"
          name="label"
          list="metric-presets"
          required
          placeholder="40-yard dash"
        />
        <datalist id="metric-presets">
          {METRIC_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.label} />
          ))}
        </datalist>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="value">Value</Label>
          <Input
            id="value"
            name="value"
            type="number"
            step="any"
            min="0"
            required
            placeholder="5.2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Input
            id="unit"
            name="unit"
            required
            placeholder="sec"
            defaultValue="sec"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="recordedAt">Date recorded</Label>
        <Input
          id="recordedAt"
          name="recordedAt"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Conditions, context..." />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700">Metric logged successfully.</p>
      ) : null}

      <Button
        type="submit"
        className="bg-emerald-600 hover:bg-emerald-700"
        disabled={pending}
      >
        {pending ? "Saving..." : "Log metric"}
      </Button>
    </form>
  );
}
