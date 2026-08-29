"use client";

import { useEffect } from "react";

import {
  setDeferredInstallPrompt,
  type BeforeInstallPromptLike,
} from "@/lib/pwa-install";

export function PwaRuntime() {
  useEffect(() => {
    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptLike);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => setDeferredInstallPrompt(null));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* registration is best-effort */
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  return null;
}
