"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  requestDiscoverableCoachAction,
  type CoachRequestActionState,
} from "@/app/(athlete)/athlete/coaches/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function RequestCoachForm({
  coachUserId,
  specialty,
  status,
}: {
  coachUserId: string;
  specialty?: string;
  status: "none" | "pending" | "connected" | "not-accepting";
}) {
  const action = requestDiscoverableCoachAction.bind(null, coachUserId);
  const [state, formAction, pending] = useActionState(action, {} as CoachRequestActionState);

  if (status === "connected") {
    return (
      <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
        You&apos;re connected. Your coach can now assign training and review your development.
      </p>
    );
  }
  if (status === "pending") {
    return (
      <p className="rounded-2xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm font-semibold text-brand">
        Your request is pending. We&apos;ll let you know when the coach responds.
      </p>
    );
  }
  if (status === "not-accepting") {
    return (
      <p className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-400">
        This coach is not currently accepting new athletes.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-brand/40 bg-zinc-900 p-4">
      <h2 className="font-heading text-xl font-bold">Request this coach</h2>
      {specialty ? <input type="hidden" name="requestedSpecialty" value={specialty} /> : null}
      <Textarea
        name="athleteNote"
        placeholder="Looking for help with hitting and fielding."
        className="min-h-24 border-white/15 bg-black text-white"
      />
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-400">{state.success}</p> : null}
      <Button type="submit" disabled={pending} className="min-h-12 w-full bg-brand text-black">
        {pending ? "Sending…" : "Request this coach"}
      </Button>
      <p className="text-center text-xs text-zinc-500">
        Already know this coach?{" "}
        <Link href="/athlete/connect" className="font-semibold text-brand underline">
          Enter a coach code
        </Link>
      </p>
    </form>
  );
}
