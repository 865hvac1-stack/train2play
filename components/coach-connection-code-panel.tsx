"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import {
  regenerateMyConnectionCodeAction,
  type ConnectionActionState,
} from "@/app/(dashboard)/connections/actions";
import { Button } from "@/components/ui/button";

function RegenerateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Regenerating…" : "Regenerate code"}
    </Button>
  );
}

export function CoachConnectionCodePanel({
  code,
  connectPath,
}: {
  code: string;
  connectPath: string;
}) {
  const [state, formAction] = useActionState(
    regenerateMyConnectionCodeAction,
    {} as ConnectionActionState,
  );
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [, startCopy] = useTransition();

  function copyText(value: string, kind: "code" | "link") {
    startCopy(() => {
      void (async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(kind);
          window.setTimeout(() => setCopied(null), 2000);
        } catch {
          // Clipboard may be blocked; ignore
        }
      })();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
          Your Train2Play code
        </p>
        <p className="font-heading mt-2 text-3xl font-bold tracking-wide text-slate-900">
          {code}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Athletes can enter this code to request to connect with you on
          Train2Play. It does not let anyone into your account.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => copyText(code, "code")}>
          {copied === "code" ? "Copied" : "Copy code"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            copyText(`${window.location.origin}${connectPath}`, "link")
          }
        >
          {copied === "link" ? "Copied" : "Copy connect link"}
        </Button>
        <Button type="button" variant="outline" disabled title="Coming soon">
          Show QR code
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        Future QR codes can open:{" "}
        <code className="text-slate-700">{connectPath}</code>
      </p>

      <form
        action={formAction}
        className="space-y-2 border-t border-slate-200 pt-4"
      >
        <p className="text-sm text-slate-600">
          Regenerating stops new requests with the old code. Existing athlete
          connections stay connected.
        </p>
        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-primary">{state.success}</p>
        ) : null}
        <RegenerateButton />
      </form>
    </div>
  );
}
