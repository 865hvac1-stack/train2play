"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  inviteAthleteLoginAction,
  type InviteActionState,
} from "@/app/(dashboard)/athletes/invite-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Sending invite…" : "Send invite email"}
    </Button>
  );
}

export function AthleteInvitePanel({
  athleteId,
  hasLogin,
  linkedEmail,
}: {
  athleteId: string;
  hasLogin: boolean;
  linkedEmail: string | null;
}) {
  const [state, formAction] = useActionState(
    inviteAthleteLoginAction.bind(null, athleteId),
    {} as InviteActionState,
  );

  if (hasLogin) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Athlete login linked
        {linkedEmail ? (
          <>
            {" "}
            as <strong>{linkedEmail}</strong>
          </>
        ) : null}
        . They can sign in at the athlete portal.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Send an email invite so this athlete can create their own password and
        register. If email is not configured yet, you&apos;ll get a copyable
        link.
      </p>
      <form action={formAction} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Athlete email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="athlete@family.com"
          />
        </div>
        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        {state.emailSent ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Invite email sent. They can open the link to register.
          </p>
        ) : null}
        {state.inviteUrl && !state.emailSent ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            {state.emailReason ? (
              <p className="mb-2 text-slate-600">{state.emailReason}</p>
            ) : null}
            <p className="font-medium text-slate-900">Invite link (copy now)</p>
            <p className="mt-1 break-all text-primary">{state.inviteUrl}</p>
          </div>
        ) : null}
        <SubmitButton />
      </form>
    </div>
  );
}
