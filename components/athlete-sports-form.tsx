"use client";

import { useActionState } from "react";

import {
  updateAthleteSportsAction,
  type AthleteProfileActionState,
} from "@/app/(athlete)/athlete/profile-actions";
import { SportPicker } from "@/components/sport-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AthleteSportsForm({
  sports,
  primarySport,
  position,
}: {
  sports: string[];
  primarySport: string;
  position: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateAthleteSportsAction,
    {} as AthleteProfileActionState,
  );

  return (
    <form action={action} className="space-y-4">
      <SportPicker
        defaultSports={sports}
        defaultPrimary={primarySport}
        tone="dark"
      />
      <div className="space-y-2">
        <Label htmlFor="position" className="text-slate-300">
          Primary position
        </Label>
        <Input
          id="position"
          name="position"
          defaultValue={position ?? ""}
          placeholder="Pitcher, point guard, setter…"
          className="border-white/15 bg-zinc-950 text-white"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-400">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-brand">{state.success}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save sports"}
      </Button>
    </form>
  );
}
