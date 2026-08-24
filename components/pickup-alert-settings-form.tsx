"use client";

import { useActionState } from "react";

import {
  updatePickupAlertSettingsAction,
  type SettingsActionState,
} from "@/app/(dashboard)/settings/actions";
import { RADIUS_OPTIONS } from "@/lib/pickup-matching";
import { SPORTS } from "@/lib/athletes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SettingsActionState = {};

type PickupAlertSettingsFormProps = {
  defaults: {
    zipCode: string;
    searchRadiusMiles: number;
    pickupAlertsEnabled: boolean;
    lookingForSport: string;
    lookingForPositions: string;
    minThrowingVelo: string;
  };
};

export function PickupAlertSettingsForm({ defaults }: PickupAlertSettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    updatePickupAlertSettingsAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pickup player alerts</CardTitle>
        <CardDescription>
          Get emailed when a pickup player is added within your radius. Used for the
          &ldquo;Players near me&rdquo; feed too.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zipCode">Your zip code</Label>
              <Input
                id="zipCode"
                name="zipCode"
                defaultValue={defaults.zipCode}
                placeholder="90210"
                required
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="searchRadiusMiles">Search radius</Label>
              <select
                id="searchRadiusMiles"
                name="searchRadiusMiles"
                defaultValue={String(defaults.searchRadiusMiles)}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                {RADIUS_OPTIONS.map((miles) => (
                  <option key={miles} value={miles}>
                    {miles} miles
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="pickupAlertsEnabled"
              name="pickupAlertsEnabled"
              type="checkbox"
              defaultChecked={defaults.pickupAlertsEnabled}
              value="true"
              className="size-4 rounded border-slate-300"
            />
            <Label htmlFor="pickupAlertsEnabled" className="font-normal">
              Email me when matching pickup players are added nearby
            </Label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lookingForSport">Sport filter (optional)</Label>
              <select
                id="lookingForSport"
                name="lookingForSport"
                defaultValue={defaults.lookingForSport}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="">Any sport</option>
                {SPORTS.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lookingForPositions">Positions (optional)</Label>
              <Input
                id="lookingForPositions"
                name="lookingForPositions"
                defaultValue={defaults.lookingForPositions}
                placeholder="RHP, SS, OF"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minThrowingVelo">Min throwing velo (optional)</Label>
            <Input
              id="minThrowingVelo"
              name="minThrowingVelo"
              type="number"
              step="0.1"
              min="0"
              defaultValue={defaults.minThrowingVelo}
              placeholder="72"
            />
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

          <Button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={pending}
          >
            {pending ? "Saving..." : "Save pickup alerts"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
