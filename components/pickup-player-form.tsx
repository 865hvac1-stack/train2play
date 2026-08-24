"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createPickupPlayerAction,
  type PickupPlayerActionState,
} from "@/app/(dashboard)/pickup-players/actions";
import { SPORTS } from "@/lib/athletes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: PickupPlayerActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="bg-emerald-600 hover:bg-emerald-700"
      disabled={pending}
    >
      {pending ? "Adding…" : "Add pickup player"}
    </Button>
  );
}

export function PickupPlayerForm() {
  const [state, formAction] = useActionState(createPickupPlayerAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required placeholder="Jordan" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required placeholder="Lee" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sport">Sport</Label>
          <select
            id="sport"
            name="sport"
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
          <Label htmlFor="position">Position</Label>
          <Input id="position" name="position" placeholder="Pitcher / OF" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="throws">Throws (optional)</Label>
          <select
            id="throws"
            name="throws"
            defaultValue=""
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="">Not set</option>
            <option value="R">Right</option>
            <option value="L">Left</option>
            <option value="S">Switch</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bats">Bats (optional)</Label>
          <select
            id="bats"
            name="bats"
            defaultValue=""
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="">Not set</option>
            <option value="R">Right</option>
            <option value="L">Left</option>
            <option value="S">Switch</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-4 text-sm font-medium text-slate-900">
          Log velo now (optional)
        </p>
        <p className="text-muted-foreground mb-4 text-sm">
          Add radar numbers at signup so the profile compares to system averages right away.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="throwingVelo">Throwing velo (mph)</Label>
            <Input id="throwingVelo" name="throwingVelo" type="number" step="0.1" min="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="batSpeed">Bat speed (mph)</Label>
            <Input id="batSpeed" name="batSpeed" type="number" step="0.1" min="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exitVelo">Exit velo (mph)</Label>
            <Input id="exitVelo" name="exitVelo" type="number" step="0.1" min="0" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" placeholder="Guest from Saturday scrimmage, college showcase…" />
      </div>

      <SubmitButton />
    </form>
  );
}
