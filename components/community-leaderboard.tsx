import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import type { LeaderboardEntry } from "@/lib/community/ranking";
import { cn } from "@/lib/utils";

export function CommunityLeaderboard({
  title,
  empty,
  rows,
  valuePrefix = "",
  hrefBase = "/p",
}: {
  title: string;
  empty: string;
  rows: LeaderboardEntry[];
  valuePrefix?: string;
  hrefBase?: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4 sm:p-5">
      <h2 className="font-heading text-lg font-bold tracking-tight text-white">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">{empty}</p>
      ) : (
        <ol className="mt-3 divide-y divide-white/8">
          {rows.map((row) => {
            const inner = (
              <>
                <span className="w-8 font-heading text-lg font-bold text-brand">
                  {row.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">
                    {row.displayName}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    {[row.sport, row.ageGroup, row.location].filter(Boolean).join(" • ")}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-heading font-bold text-white">
                    {valuePrefix}
                    {row.value} {row.unit}
                  </span>
                  {row.verified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-emerald-400 uppercase">
                      <CheckCircle2 className="size-3" /> Verified
                    </span>
                  ) : null}
                </span>
              </>
            );
            return (
              <li key={row.athleteProfileId} className="py-2.5">
                {row.slug ? (
                  <Link
                    href={`${hrefBase}/${row.slug}`}
                    className={cn("flex items-center gap-3 rounded-lg hover:bg-white/5")}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
