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
          Sign in with the email used at signup. Youth accounts use the parent
          or guardian email.
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

type SignupRole = "PLAYER" | "PARENT" | "COACH";

function RoleCard({
  selected,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-xl border px-3 py-3 text-left transition",
        selected
          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
          : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
    </button>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);
  const [signupRole, setSignupRole] = useState<SignupRole>("PARENT");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const parsedBirthDate = dateOfBirth ? parseDateOfBirth(dateOfBirth) : null;
  const athleteIsMinor = parsedBirthDate ? isMinor(parsedBirthDate) : false;
  const isCoach = signupRole === "COACH";
  const isParent = signupRole === "PARENT";
  const isPlayer = signupRole === "PLAYER";
  const accountType = isCoach ? "COACH" : "ATHLETE";
  const parentNeedsAdultAthlete =
    isParent && Boolean(parsedBirthDate) && !athleteIsMinor;

  return (
    <Card className="border-white/10 bg-white/95 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Get started</CardTitle>
        <CardDescription>
          Parents create the player account for anyone under 18. Players 18+ and
          coaches can create their own.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="accountType" value={accountType} />
          <input type="hidden" name="signupRole" value={signupRole} />

          <div className="space-y-2">
            <Label>I am a…</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <RoleCard
                selected={isParent}
                title="Parent / Guardian"
                description="Sign up my player"
                onSelect={() => setSignupRole("PARENT")}
              />
              <RoleCard
                selected={isPlayer}
                title="Athlete"
                description="I'm 18+ and training"
                onSelect={() => setSignupRole("PLAYER")}
              />
              <RoleCard
                selected={isCoach}
                title="Coach"
                description="Assign training and review film"
                onSelect={() => setSignupRole("COACH")}
              />
            </div>
          </div>

          {isParent ? (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold tracking-wide text-amber-900 uppercase">
                Parent or legal guardian
              </p>
              <p className="text-xs text-amber-800">
                Your email and password are the login. The player profile is
                created in the same step.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guardianFirstName">Your first name</Label>
                  <Input
                    id="guardianFirstName"
                    name="guardianFirstName"
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianLastName">Your last name</Label>
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
                  defaultValue="Parent"
                  className="border-input h-11 w-full rounded-md border bg-white px-3"
                >
                  <option value="Parent">Parent</option>
                  <option value="Legal guardian">Legal guardian</option>
                  <option value="Other authorized caregiver">
                    Other authorized caregiver
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Your email (login)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={parentEmail}
                  onChange={(event) => setParentEmail(event.target.value)}
                  placeholder="parent@email.com"
                />
                <input type="hidden" name="guardianEmail" value={parentEmail} />
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
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">{isPlayer ? "Your full name" : "Full name"}</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  required={!isParent}
                  placeholder={isPlayer ? "Your name" : "Jordan Smith"}
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
                {isPlayer ? (
                  <p className="text-xs text-slate-500">
                    Under 18? Choose Parent / Guardian above. The parent email
                    should be the login.
                  </p>
                ) : null}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">{isParent ? "Create a password" : "Password"}</Label>
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

          {isParent ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Player
              </p>
              <div className="space-y-2">
                <Label htmlFor="name">Player&apos;s full name</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="off"
                  required
                  placeholder="Player name"
                />
              </div>
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
                <Label htmlFor="dateOfBirth">Player date of birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                />
                {parsedBirthDate && !athleteIsMinor ? (
                  <p className="text-sm text-destructive">
                    This player is 18 or older. They should sign up as an Athlete.
                  </p>
                ) : null}
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
                  I confirm I am this player&apos;s parent or legal guardian,
                  I am authorized to create this profile, and I consent to
                  Train2Play storing and using the child&apos;s information and
                  training videos to provide the service.
                </span>
              </label>
            </div>
          ) : null}

          {isPlayer ? (
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
                <Label htmlFor="dateOfBirth">Date of birth</Label>
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

          {isPlayer && athleteIsMinor ? (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-amber-900 uppercase">
                  Parent or legal guardian
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  Players under 18 need a parent to create the account. You can
                  go back and choose Parent / Guardian, or enter guardian
                  details here.
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
                  Allow this {isParent ? "player" : "athlete"}&apos;s videos to
                  be considered for future public showcases. Nothing is public
                  automatically.
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
                  Allow this {isParent ? "player" : "athlete"}&apos;s results to
                  be considered for future public leaderboards. Leaderboards are
                  not currently live.
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
          <Button
            type="submit"
            className="w-full"
            disabled={pending || parentNeedsAdultAthlete}
          >
            {pending
              ? "Creating account..."
              : isCoach
                ? "Create coach account"
                : isParent
                  ? "Create player account"
                  : "Create athlete account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
        {isParent ? (
          <p className="mt-3 text-center text-xs text-slate-500">
            You sign in with your email. The player profile is created in this
            step — there is no separate parent app yet.
          </p>
        ) : accountType === "ATHLETE" ? (
          <p className="mt-3 text-center text-xs text-slate-500">
            Already invited by a coach? Use your invite link or sign in after
            accepting the invite.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
