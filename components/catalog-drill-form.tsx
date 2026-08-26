"use client";

import { useActionState } from "react";

import {
  createCatalogDrillAction,
  updateCatalogDrillAction,
  type DrillActionState,
} from "@/app/(dashboard)/trainer/drill-actions";
import { InstructionVideoFields } from "@/components/instruction-video-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SPORTS } from "@/lib/athletes";
import { AGE_BANDS } from "@/lib/drills";

export function CatalogDrillForm({
  mode = "create",
  drillId,
  defaults,
}: {
  mode?: "create" | "edit";
  drillId?: string;
  defaults?: {
    sport?: string;
    ageBand?: string;
    title?: string;
    focus?: string;
    durationMin?: number;
    equipment?: string;
    howTo?: string;
    coachingCue?: string;
    videoUrl?: string | null;
    shareWithCoaches?: boolean;
    shareWithAthletes?: boolean;
  };
}) {
  const action =
    mode === "edit" && drillId
      ? updateCatalogDrillAction.bind(null, drillId)
      : createCatalogDrillAction;
  const [state, formAction, pending] = useActionState(
    action,
    {} as DrillActionState,
  );

  return (
    <form
      action={formAction}
      className="space-y-3"
      encType="multipart/form-data"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="sport">Sport</Label>
          <select
            id="sport"
            name="sport"
            required
            defaultValue={defaults?.sport ?? ""}
            className="border-input h-11 w-full rounded-md border bg-background px-3"
          >
            <option value="" disabled>
              Sport
            </option>
            {SPORTS.filter((sport) => sport !== "Other").map((sport) => (
              <option key={sport} value={sport}>
                {sport}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ageBand">Age band</Label>
          <select
            id="ageBand"
            name="ageBand"
            required
            defaultValue={defaults?.ageBand ?? ""}
            className="border-input h-11 w-full rounded-md border bg-background px-3"
          >
            <option value="" disabled>
              Ages
            </option>
            {AGE_BANDS.map((band) => (
              <option key={band.id} value={band.id}>
                {band.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={defaults?.title} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="focus">Focus</Label>
          <Input id="focus" name="focus" required defaultValue={defaults?.focus} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="durationMin">Minutes</Label>
          <Input
            id="durationMin"
            name="durationMin"
            type="number"
            min={1}
            required
            defaultValue={defaults?.durationMin ?? 10}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="equipment">Equipment</Label>
        <Input
          id="equipment"
          name="equipment"
          required
          defaultValue={defaults?.equipment}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="howTo">How to run it</Label>
        <textarea
          id="howTo"
          name="howTo"
          required
          rows={3}
          defaultValue={defaults?.howTo}
          className="w-full rounded-lg border border-input px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="coachingCue">Coaching cue</Label>
        <Input
          id="coachingCue"
          name="coachingCue"
          required
          defaultValue={defaults?.coachingCue}
        />
      </div>
      <InstructionVideoFields
        idPrefix={drillId ? `catalog-drill-${drillId}` : "catalog-drill-new"}
        defaultUrl={defaults?.videoUrl}
        title="Suggested drill video (optional)"
        description="Record with either phone camera, choose from your gallery, or paste a video link."
      />
      <div className="space-y-2 rounded-xl border border-brand/20 bg-orange-50/50 p-3">
        <p className="text-sm font-semibold text-slate-900">Push this drill to</p>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="shareWithCoaches"
            defaultChecked={defaults?.shareWithCoaches ?? true}
            className="size-4"
          />
          Coaches set up under this sport
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="shareWithAthletes"
            defaultChecked={defaults?.shareWithAthletes ?? true}
            className="size-4"
          />
          Players with this sport on their profile
        </label>
        <p className="text-xs text-slate-500">
          Checked audiences receive it as soon as you save.
        </p>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-primary">{state.success}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : mode === "edit" ? "Save drill" : "Add drill"}
      </Button>
    </form>
  );
}
