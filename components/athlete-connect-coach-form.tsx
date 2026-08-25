"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  previewCoachCodeAction,
  requestCoachConnectionAction,
  type ConnectionActionState,
} from "@/app/(dashboard)/connections/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LookupButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-black disabled:opacity-60"
    >
      {pending ? "Looking up…" : "Find coach"}
    </button>
  );
}

function RequestButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-black disabled:opacity-60"
    >
      {pending ? "Sending…" : "REQUEST TO CONNECT"}
    </button>
  );
}

async function requestFromForm(
  _prev: ConnectionActionState,
  formData: FormData,
): Promise<ConnectionActionState> {
  const coachUserId = String(formData.get("coachUserId") ?? "");
  if (!coachUserId) {
    return { error: "Look up a coach first" };
  }
  return requestCoachConnectionAction(coachUserId, {}, formData);
}

export function AthleteConnectCoachForm({
  initialCode = "",
  source = "COACH_CODE",
}: {
  initialCode?: string;
  source?: "COACH_CODE" | "QR_CODE";
}) {
  const [lookupState, lookupAction] = useActionState(
    previewCoachCodeAction,
    {} as ConnectionActionState,
  );
  const [requestState, requestAction] = useActionState(
    requestFromForm,
    {} as ConnectionActionState,
  );

  const preview = lookupState.preview;

  return (
    <div className="space-y-5">
      <form action={lookupAction} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="code" className="text-slate-300">
            Coach connection code
          </Label>
          <Input
            id="code"
            name="code"
            required
            defaultValue={initialCode || preview?.code || ""}
            placeholder="LESTER4821"
            className="min-h-12 border-white/15 bg-black text-lg font-bold tracking-wide text-white uppercase"
            autoCapitalize="characters"
            autoCorrect="off"
          />
        </div>
        {lookupState.error ? (
          <p className="text-sm text-red-400">{lookupState.error}</p>
        ) : null}
        <LookupButton />
      </form>

      {preview ? (
        <section className="space-y-4 rounded-3xl border border-brand/30 bg-zinc-900 p-5">
          <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
            Is this your coach?
          </p>
          <h2 className="font-heading text-2xl font-bold text-white">
            {preview.name}
          </h2>
          <p className="text-sm text-slate-400">
            {[preview.sport, preview.organizationName]
              .filter(Boolean)
              .join(" · ") || "Train2Play coach"}
          </p>
          <form action={requestAction} className="space-y-3">
            <input type="hidden" name="coachUserId" value={preview.id} />
            <input type="hidden" name="source" value={source} />
            {requestState.error ? (
              <p className="text-sm text-red-400">{requestState.error}</p>
            ) : null}
            {requestState.success ? (
              <p className="rounded-xl border border-brand/40 bg-brand/10 px-3 py-2 text-sm text-brand">
                {requestState.success}
              </p>
            ) : (
              <RequestButton />
            )}
          </form>
        </section>
      ) : null}
    </div>
  );
}
