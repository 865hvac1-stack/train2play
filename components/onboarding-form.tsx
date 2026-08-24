"use client";

import { useActionState } from "react";

import {
  completeOnboardingAction,
  type OnboardingActionState,
} from "@/app/onboarding/actions";
import { SPORTS } from "@/lib/athletes";
import { RADIUS_OPTIONS } from "@/lib/pickup-matching";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: OnboardingActionState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="zipCode">Your zip code</Label>
        <Input
          id="zipCode"
          name="zipCode"
          inputMode="numeric"
          placeholder="90210"
          maxLength={5}
          required
        />
        <p className="text-xs text-slate-500">
          Used for pickup player alerts and finding players near you.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lookingForSport">Primary sport</Label>
        <select
          id="lookingForSport"
          name="lookingForSport"
          required
          defaultValue="Baseball"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          {SPORTS.map((sport) => (
            <option key={sport} value={sport}>
              {sport}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lookingForPositions">Positions you coach (optional)</Label>
        <Input
          id="lookingForPositions"
          name="lookingForPositions"
          placeholder="RHP, SS, OF"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="searchRadiusMiles">Pickup search radius</Label>
        <select
          id="searchRadiusMiles"
          name="searchRadiusMiles"
          defaultValue="25"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          {RADIUS_OPTIONS.map((miles) => (
            <option key={miles} value={miles}>
              {miles} miles
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          type="checkbox"
          name="pickupAlertsEnabled"
          value="true"
          defaultChecked
          className="mt-1"
        />
        <span className="text-sm text-slate-700">
          Email me when a matching pickup player is added near me
        </span>
      </label>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Continue to dashboard"}
      </Button>
    </form>
  );
}
