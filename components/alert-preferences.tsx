"use client";

import { useActionState } from "react";

import {
  updateSmsAlertsAction,
  type AlertPreferenceState,
} from "@/app/alert-preferences/actions";
import { EnablePushAlerts } from "@/components/enable-push-alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneDisplay } from "@/lib/phone";
import { cn } from "@/lib/utils";

export function AlertPreferences({
  phoneE164,
  smsEnabled,
  tone = "dark",
}: {
  phoneE164: string | null;
  smsEnabled: boolean;
  tone?: "dark" | "light";
}) {
  const [state, action, pending] = useActionState(
    updateSmsAlertsAction,
    {} as AlertPreferenceState,
  );

  return (
    <section
      className={
        tone === "dark"
          ? "space-y-4 rounded-2xl border border-white/10 bg-zinc-900 p-5"
          : "space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-brand uppercase">
          Alerts
        </p>
        <h2
          className={cn(
            "font-heading mt-1 text-xl font-bold",
            tone === "dark" ? "text-white" : "text-slate-900",
          )}
        >
          Get notified
        </h2>
        <p className={cn("mt-1 text-sm", tone === "dark" ? "text-zinc-400" : "text-slate-600")}>
          When a coach reviews your video or assigns training, Train2Play can
          alert this device and text the mobile number you choose. We never
          show your number on a public profile.
        </p>
      </div>

      <div className="space-y-2">
        <p className={cn("text-sm font-semibold", tone === "dark" ? "text-white" : "text-slate-900")}>
          Lock-screen notifications
        </p>
        <EnablePushAlerts tone={tone} />
      </div>

      <form action={action} className="space-y-3">
        <p className={cn("text-sm font-semibold", tone === "dark" ? "text-white" : "text-slate-900")}>
          Text alerts
        </p>
        <div className="space-y-2">
          <Label htmlFor="alert-phone" className={tone === "dark" ? "text-zinc-300" : undefined}>
            Mobile number
          </Label>
          <Input
            id="alert-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={formatPhoneDisplay(phoneE164)}
            placeholder="(865) 555-1212"
            className={
              tone === "dark"
                ? "min-h-12 border-white/15 bg-black text-white"
                : "min-h-12"
            }
          />
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="smsEnabled"
            defaultChecked={smsEnabled}
            className="mt-1"
          />
          <span className={tone === "dark" ? "text-zinc-300" : "text-slate-700"}>
            Text me when a coach reviews my video or assigns training. Message
            and data rates may apply. Reply STOP by contacting support to turn
            this off.
          </span>
        </label>
        {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
        {state.success ? (
          <p className="text-sm text-brand">{state.success}</p>
        ) : null}
        <Button
          type="submit"
          disabled={pending}
          variant="outline"
          className={cn(
            "min-h-12 rounded-2xl px-5 text-sm font-bold",
            tone === "dark"
              ? "border-white/20 bg-transparent text-white"
              : "border-slate-300 bg-white text-slate-800",
          )}
        >
          {pending ? "Saving…" : "Save text alerts"}
        </Button>
      </form>
    </section>
  );
}
