import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import type { LeaderboardEntry } from "@/lib/community/ranking";
import { verificationLabel } from "@/lib/community/verification";
import { formatMetricValue } from "@/lib/progress";
import { cn } from "@/lib/utils";

export function CommunityLeaderboard({
  title,
  empty,
  rows,
  valuePrefix = "",
  hrefBase = "/p",
  cta,
  showDevelopment = false,
}: {
  title: string;
  empty: string;
  rows: LeaderboardEntry[];
  valuePrefix?: string;
  hrefBase?: string;
  cta?: { href: string; label: string };
  showDevelopment?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4 sm:p-5">
      <h2 className="font-heading text-lg font-bold tracking-tight text-white">
        {title}
      </h2>
      {rows.length === 0 ? (
        <div className="mt-3">
          <p className="text-sm leading-relaxed text-zinc-400">{empty}</p>
          {cta ? (
            <Link
              href={cta.href}
              className="mt-3 inline-flex min-h-11 items-center text-sm font-bold tracking-wide text-brand uppercase"
            >
              {cta.label} →
            </Link>
          ) : null}
        </div>
      ) : (
        <ol className="mt-3 divide-y divide-white/8">
          {rows.map((row) => {
            const label =
              verificationLabel(row.verificationType) ??
              (row.verified ? "Verified" : null);
            const latest =
              row.latest != null && row.unit
                ? formatMetricValue(row.latest, row.unit)
                : null;
            const previous =
              row.previous != null && row.unit
                ? formatMetricValue(row.previous, row.unit)
                : null;
            const inner = (
              <>
                <span className="w-8 shrink-0 font-heading text-lg font-bold text-brand">
                  {row.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-white">
                    {row.displayName}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    {[row.sport, row.ageGroup, row.location]
                      .filter(Boolean)
                      .join(" • ")}
                  </span>
                  {showDevelopment && previous && latest ? (
                    <span className="mt-0.5 block text-xs text-zinc-400">
                      {previous} → {latest}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-heading font-bold text-white">
                    {valuePrefix}
                    {row.unit
                      ? formatMetricValue(row.value, row.unit)
                      : row.value}
                  </span>
                  {label ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase",
                        row.verified ||
                          row.verificationType === "COACH" ||
                          row.verificationType === "TRAIN2PLAY"
                          ? "text-emerald-400"
                          : "text-zinc-500",
                      )}
                    >
                      {row.verified ||
                      row.verificationType === "COACH" ||
                      row.verificationType === "TRAIN2PLAY" ? (
                        <CheckCircle2 className="size-3" />
                      ) : null}
                      {label}
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
                    className={cn(
                      "flex items-center gap-3 rounded-lg hover:bg-white/5",
                    )}
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
