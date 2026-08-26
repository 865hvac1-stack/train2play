"use client";

import { useState } from "react";

import { SPORTS } from "@/lib/athletes";
import { Label } from "@/components/ui/label";

export function SportPicker({
  name = "sports",
  primaryName = "primarySport",
  defaultSports = [],
  defaultPrimary,
  tone = "light",
}: {
  name?: string;
  primaryName?: string;
  defaultSports?: string[];
  defaultPrimary?: string;
  tone?: "light" | "dark";
}) {
  const initial = defaultSports.length > 0 ? defaultSports : [];
  const [selected, setSelected] = useState<string[]>(initial);
  const [primary, setPrimary] = useState(
    defaultPrimary && initial.includes(defaultPrimary)
      ? defaultPrimary
      : (initial[0] ?? ""),
  );

  function toggleSport(sport: string, checked: boolean) {
    const next = checked
      ? [...selected, sport]
      : selected.filter((item) => item !== sport);
    setSelected(next);
    if (next.length === 0) {
      setPrimary("");
      return;
    }
    if (!next.includes(primary)) {
      setPrimary(next[0]!);
    }
  }

  const box =
    tone === "dark"
      ? "rounded-xl border border-white/15 bg-zinc-900 p-3"
      : "rounded-xl border border-slate-200 bg-white p-3";
  const labelClass =
    tone === "dark" ? "text-sm text-slate-200" : "text-sm text-slate-800";
  const hintClass =
    tone === "dark" ? "text-xs text-slate-500" : "text-xs text-slate-500";

  return (
    <div className="space-y-2">
      <Label>Sports</Label>
      <p className={hintClass}>
        Select every sport this athlete plays. Mark one as primary — that
        drives suggested drills and the default video category.
      </p>
      <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${box}`}>
        {SPORTS.map((sport) => {
          const checked = selected.includes(sport);
          return (
            <label
              key={sport}
              className="flex items-center justify-between gap-2 rounded-lg px-1 py-1"
            >
              <span className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  name={name}
                  value={sport}
                  checked={checked}
                  onChange={(event) => toggleSport(sport, event.target.checked)}
                />
                <span className={labelClass}>{sport}</span>
              </span>
              {checked ? (
                <label className="flex shrink-0 items-center gap-1 text-[11px] font-semibold tracking-wide uppercase text-brand">
                  <input
                    type="radio"
                    name={primaryName}
                    value={sport}
                    checked={primary === sport}
                    onChange={() => setPrimary(sport)}
                  />
                  Primary
                </label>
              ) : null}
            </label>
          );
        })}
      </div>
      {primary ? (
        <input type="hidden" name={primaryName} value={primary} />
      ) : null}
    </div>
  );
}
