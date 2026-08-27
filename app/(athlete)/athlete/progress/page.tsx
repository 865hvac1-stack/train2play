import Link from "next/link";

import {
  getAthleteDashboardData,
  requireAthleteContext,
} from "@/lib/athlete-dashboard";
import { formatMetricValue } from "@/lib/progress";
import { cn } from "@/lib/utils";

export default async function AthleteProgressPage() {
  const ctx = await requireAthleteContext();
  const data = await getAthleteDashboardData(ctx);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
          Progress
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Your development
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {data.metricCards.length > 0 ? (
          data.metricCards.map((card) => {
            const improved =
              card.delta != null &&
              ((card.direction === "HIGHER" && card.delta > 0) ||
                (card.direction === "LOWER" && card.delta < 0));
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-white/10 bg-zinc-900 p-4"
              >
                <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                  {card.shortLabel}
                </p>
                <p className="font-heading mt-1 text-2xl font-bold">
                  {card.value != null
                    ? formatMetricValue(card.value, card.unit)
                    : "—"}
                </p>
                {card.delta != null ? (
                  <p
                    className={cn(
                      "mt-1 text-xs font-semibold",
                      improved ? "text-brand" : "text-slate-400",
                    )}
                  >
                    {card.delta > 0 ? "↑" : "↓"}{" "}
                    {formatMetricValue(Math.abs(card.delta), card.unit)}
                  </p>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="col-span-2 text-sm text-slate-400">
            No metrics yet — your coach will log them as you train.
          </p>
        )}
      </div>

      {data.goalView ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
            Goal
          </p>
          <h2 className="font-heading mt-2 text-2xl font-bold">
            {data.goalView.label}
          </h2>
          <p className="text-slate-400">
            Target {formatMetricValue(data.goalView.target, data.goalView.unit)}
            {data.goalView.current != null
              ? ` · Now ${formatMetricValue(data.goalView.current, data.goalView.unit)}`
              : ""}
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${data.goalView.percent}%` }}
            />
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-heading text-xl font-bold">Activity</h2>
        {data.activity.map((item) => (
          item.href ? (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 transition hover:border-brand/50 hover:bg-zinc-800"
            >
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-slate-400">{item.detail}</p>
              <p className="mt-2 text-xs font-semibold text-brand">Watch video →</p>
            </Link>
          ) : (
            <div
              key={item.id}
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3"
            >
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-slate-400">{item.detail}</p>
            </div>
          )
        ))}
      </section>
    </div>
  );
}
