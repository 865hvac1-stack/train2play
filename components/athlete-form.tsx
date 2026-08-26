"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createAthleteAction,
  type AthleteActionState,
} from "@/app/(dashboard)/athletes/actions";
import { SportPicker } from "@/components/sport-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AthleteActionState = {};

export function AthleteForm() {
  const [state, formAction, pending] = useActionState(
    createAthleteAction,
    initialState,
  );

  if (state.inviteUrl && state.athleteId) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <p className="font-semibold text-slate-900">Athlete saved</p>
          <p className="mt-1 text-sm text-slate-600">
            {state.emailSent
              ? "Invite email sent. They can register with the link in their inbox."
              : state.emailReason ??
                "Invite created. Copy the link below and send it to the athlete so they can register."}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <p className="font-medium text-slate-900">Invite link (copy now)</p>
          <p className="mt-1 break-all text-primary">{state.inviteUrl}</p>
        </div>
        <Button nativeButton={false} render={<Link href={`/athletes/${state.athleteId}`} />}>
          Open athlete profile
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required placeholder="Alex" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required placeholder="Johnson" />
        </div>
      </div>

      <SportPicker />

      <div className="space-y-2">
        <Label htmlFor="position">Primary position</Label>
        <Input
          id="position"
          name="position"
          placeholder="Point guard, pitcher, etc."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">Date of birth</Label>
        <Input id="dateOfBirth" name="dateOfBirth" type="date" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="Injury history, goals, parent contact info..."
          className="flex min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Invite athlete to register (optional)
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Enter their email and we&apos;ll send an invite so they can create
            their own password and open Today&apos;s Training on their phone.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="inviteEmail">Athlete email</Label>
          <Input
            id="inviteEmail"
            name="inviteEmail"
            type="email"
            placeholder="athlete@family.com"
            autoComplete="email"
          />
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Add athlete"}
        </Button>
      </div>
    </form>
  );
}
