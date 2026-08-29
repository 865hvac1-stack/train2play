"use client";

import { useState } from "react";

import { isStandaloneDisplay } from "@/lib/pwa-install";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function EnablePushAlerts({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setMessage("This browser cannot receive app notifications.");
        return;
      }
      const config = await fetch("/api/push/config").then((response) => response.json());
      if (!config.enabled || !config.publicKey) {
        setMessage(
          "Phone lock-screen alerts are not configured on this server yet. You can still turn on text alerts below.",
        );
        return;
      }
      if (isIosSafari() && !isStandaloneDisplay()) {
        setMessage(
          "On iPhone, add Train2Play to your Home Screen first, open it from the icon, then tap Enable Notifications.",
        );
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notifications were not allowed. You can enable them later in your phone settings.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });
      const saved = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!saved.ok) {
        setMessage("Could not save this device. Try again.");
        return;
      }
      setMessage("This device will get a lock-screen alert when a coach reviews your video.");
    } catch {
      setMessage("Could not enable notifications on this device.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={() => void enable()}
        disabled={busy}
        className="min-h-12 w-full rounded-2xl bg-brand px-5 text-sm font-bold text-black hover:bg-brand-hover sm:w-auto"
      >
        {busy ? "Enabling…" : "Enable Notifications"}
      </Button>
      {message ? (
        <p className={cn("text-sm", tone === "dark" ? "text-zinc-400" : "text-slate-600")}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
