"use client";

import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  dismissInstallPrompt,
  getDeferredInstallPrompt,
  isInstallDismissed,
  isIosDevice,
  isStandaloneDisplay,
  subscribeInstallPrompt,
} from "@/lib/pwa-install";
import { cn } from "@/lib/utils";

const serverSnapshot = {
  standalone: false,
  dismissed: false,
  ios: false,
  canPrompt: false,
};

let clientSnapshot = serverSnapshot;

function getInstallSnapshot() {
  const next = {
    standalone: isStandaloneDisplay(),
    dismissed: isInstallDismissed(),
    ios: isIosDevice(),
    canPrompt: Boolean(getDeferredInstallPrompt()),
  };
  if (
    next.standalone === clientSnapshot.standalone &&
    next.dismissed === clientSnapshot.dismissed &&
    next.ios === clientSnapshot.ios &&
    next.canPrompt === clientSnapshot.canPrompt
  ) {
    return clientSnapshot;
  }
  clientSnapshot = next;
  return clientSnapshot;
}

export function InstallTrain2Play({
  variant = "prompt",
  tone = "dark",
}: {
  variant?: "prompt" | "settings";
  tone?: "dark" | "light";
}) {
  const { standalone, dismissed, ios, canPrompt } = useSyncExternalStore(
    subscribeInstallPrompt,
    getInstallSnapshot,
    () => serverSnapshot,
  );
  const [busy, setBusy] = useState(false);

  if (variant === "prompt" && !ios && !canPrompt) return null;

  if (standalone) {
    if (variant === "settings") {
      return (
        <section className={cardClass(tone)}>
          <h2 className={titleClass(tone)}>Train2Play is installed</h2>
          <p className={bodyClass(tone)}>
            You&apos;re using the Home Screen app. Open Train2Play from your icon anytime.
          </p>
        </section>
      );
    }
    return null;
  }

  if (variant === "prompt" && dismissed) return null;

  const showIosSteps = ios && !canPrompt;

  async function install() {
    const deferred = getDeferredInstallPrompt();
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      setBusy(false);
    }
  }

  function hide() {
    dismissInstallPrompt();
  }

  return (
    <section className={cardClass(tone)}>
      <p className="text-[10px] font-bold tracking-[0.18em] text-brand uppercase">
        Home Screen
      </p>
      <h2 className={titleClass(tone)}>Install Train2Play</h2>
      <p className={bodyClass(tone)}>
        Add Train2Play to your Home Screen for faster access and the best mobile
        experience.
      </p>

      {showIosSteps ? (
        <ol className={cn("mt-3 list-decimal space-y-1 pl-5 text-sm", tone === "dark" ? "text-zinc-300" : "text-slate-600")}>
          <li>Tap the Share button in Safari.</li>
          <li>Choose &ldquo;Add to Home Screen.&rdquo;</li>
          <li>Tap &ldquo;Add.&rdquo;</li>
        </ol>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {canPrompt ? (
          <Button
            type="button"
            onClick={() => void install()}
            disabled={busy}
            className="min-h-12 rounded-2xl bg-brand px-5 text-sm font-bold text-black hover:bg-brand-hover"
          >
            {busy ? "Installing…" : "Install App"}
          </Button>
        ) : null}
        {variant === "prompt" ? (
          <Button
            type="button"
            variant="outline"
            onClick={hide}
            className={cn(
              "min-h-12 rounded-2xl px-5 text-sm font-bold",
              tone === "dark"
                ? "border-white/20 bg-transparent text-white"
                : "border-slate-300 bg-white text-slate-800",
            )}
          >
            Not now
          </Button>
        ) : null}
      </div>

      {variant === "settings" && !canPrompt && !showIosSteps ? (
        <p className={cn("mt-3 text-xs", tone === "dark" ? "text-zinc-500" : "text-slate-500")}>
          On Android, open this site in Chrome and use Install App when it appears.
          On iPhone, open Train2Play in Safari and use Add to Home Screen.
        </p>
      ) : null}
    </section>
  );
}

function cardClass(tone: "dark" | "light") {
  return tone === "dark"
    ? "rounded-2xl border border-white/10 bg-zinc-900 p-5"
    : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
}

function titleClass(tone: "dark" | "light") {
  return cn(
    "font-heading mt-1 text-xl font-bold",
    tone === "dark" ? "text-white" : "text-slate-900",
  );
}

function bodyClass(tone: "dark" | "light") {
  return cn("mt-1 text-sm", tone === "dark" ? "text-zinc-400" : "text-slate-600");
}
