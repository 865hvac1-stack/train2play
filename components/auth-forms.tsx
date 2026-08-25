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
import { SPORTS } from "@/lib/athletes";
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

  return (
    <Card className="border-white/10 bg-white/95 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Get started</CardTitle>
        <CardDescription>
          Create your Train2Play account as an athlete or a coach.
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
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              placeholder="Jordan Smith"
            />
          </div>
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
              <div className="space-y-2">
                <Label htmlFor="sport">Sport</Label>
                <select
                  id="sport"
                  name="sport"
                  required
                  defaultValue=""
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="" disabled>
                    Select a sport
                  </option>
                  {SPORTS.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position (optional)</Label>
                <Input
                  id="position"
                  name="position"
                  placeholder="Pitcher, point guard, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of birth (optional)</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" />
              </div>
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
