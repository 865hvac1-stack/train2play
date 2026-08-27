"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { loginAction, signupAction, type AuthActionState } from "@/app/(auth)/actions";
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
import { SportPicker } from "@/components/sport-picker";
import { isMinor, parseDateOfBirth } from "@/lib/consent";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = {};

export function LoginForm({
  resetSuccess = false,
  callbackUrl,
}: {
  resetSuccess?: boolean;
  callbackUrl?: string;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <Card className="border-white/10 bg-white/95 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to Train2Play — your athlete development platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {callbackUrl ? (
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@team.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>
          {resetSuccess ? (
            <p className="text-sm text-primary">Password updated. Sign in with your new password.</p>
          ) : null}
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-600">
          New here?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);
  const [accountType, setAccountType] = useState<"COACH" | "ATHLETE">("ATHLETE");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const parsedBirthDate = dateOfBirth ? parseDateOfBirth(dateOfBirth) : null;
  const athleteIsMinor = parsedBirthDate ? isMinor(parsedBirthDate) : false;

  return (
    <Card className="border-white/10 bg-white/95 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Get started</CardTitle>
        <CardDescription>
          Create a player profile with a parent or guardian, or create a coach
          account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="accountType" value={accountType} />

          <div className="space-y-2">
            <Label>I am a…</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccountType("ATHLETE")}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition",
                  accountType === "ATHLETE"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <p className="text-sm font-bold text-slate-900">Athlete</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Train, log workouts, track progress
                </p>
              </button>
              <button
                type="button"
                onClick={() => setAccountType("COACH")}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition",
                  accountType === "COACH"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <p className="text-sm font-bold text-slate-900">Coach</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Manage athletes and assign training
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              {accountType === "ATHLETE" ? "Athlete's full name" : "Full name"}
            </Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              placeholder={
                accountType === "ATHLETE" ? "Athlete name" : "Jordan Smith"
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              {accountType === "ATHLETE"
                ? "Account email"
                : "Email"}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@team.com"
            />
            {accountType === "ATHLETE" ? (
              <p className="text-xs text-slate-500">
                For a minor, use an email the parent or guardian controls.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="At least 8 characters"
            />
            <p className="text-xs text-slate-500">
              Use 8+ characters with at least one letter and one number.
            </p>
          </div>

          {accountType === "ATHLETE" ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Athlete profile
              </p>
              <SportPicker />
              <div className="space-y-2">
                <Label htmlFor="position">Primary position (optional)</Label>
                <Input
                  id="position"
                  name="position"
                  placeholder="Pitcher, point guard, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Athlete date of birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                />
              </div>
            </div>
          ) : null}

          {accountType === "ATHLETE" && athleteIsMinor ? (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-amber-900 uppercase">
                  Parent or legal guardian
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  Required because this athlete is under 18. This contact does
                  not receive account access yet.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guardianFirstName">First name</Label>
                  <Input
                    id="guardianFirstName"
                    name="guardianFirstName"
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianLastName">Last name</Label>
                  <Input
                    id="guardianLastName"
                    name="guardianLastName"
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianRelationship">Relationship</Label>
                <select
                  id="guardianRelationship"
                  name="guardianRelationship"
                  required
                  defaultValue=""
                  className="border-input h-11 w-full rounded-md border bg-white px-3"
                >
                  <option value="" disabled>
                    Select relationship
                  </option>
                  <option value="Parent">Parent</option>
                  <option value="Legal guardian">Legal guardian</option>
                  <option value="Other authorized caregiver">
                    Other authorized caregiver
                  </option>
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guardianEmail">Email</Label>
                  <Input
                    id="guardianEmail"
                    name="guardianEmail"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianPhone">Phone (optional)</Label>
                  <Input
                    id="guardianPhone"
                    name="guardianPhone"
                    type="tel"
                    autoComplete="tel"
                  />
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-amber-300 bg-white px-4 py-3">
                <input
                  type="checkbox"
                  name="parentalConsent"
                  value="true"
                  required
                  className="mt-1"
                />
                <span className="text-sm text-slate-700">
                  I confirm I am this athlete&apos;s parent or legal guardian,
                  I am authorized to create this profile, and I consent to
                  Train2Play storing and using the child&apos;s information and
                  training videos to provide the service.
                </span>
              </label>
            </div>
          ) : null}

          {accountType === "ATHLETE" ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Optional public sharing
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Both choices are off by default and can be changed later.
                  Private coaching does not require either choice.
                </p>
              </div>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="publicVideoConsent"
                  value="true"
                  className="mt-1"
                />
                <span className="text-sm text-slate-700">
                  Allow this athlete&apos;s videos to be considered for future
                  public showcases. Nothing is public automatically.
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="publicLeaderboardConsent"
                  value="true"
                  className="mt-1"
                />
                <span className="text-sm text-slate-700">
                  Allow this athlete&apos;s results to be considered for future
                  public leaderboards. Leaderboards are not currently live.
                </span>
              </label>
            </div>
          ) : null}

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              name="acceptTerms"
              value="true"
              required
              className="mt-1"
            />
            <span className="text-sm text-slate-700">
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? "Creating account..."
              : accountType === "ATHLETE"
                ? "Create athlete account"
                : "Create coach account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
        {accountType === "ATHLETE" ? (
          <p className="mt-3 text-center text-xs text-slate-500">
            Already invited by a coach? Use your invite link or sign in after
            accepting the invite.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
