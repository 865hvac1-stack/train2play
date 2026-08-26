import Link from "next/link";
import {
  Flame,
  Play,
  Trophy,
  Target,
  Sparkles,
  Activity,
  Medal,
} from "lucide-react";

import {
  getAthleteDashboardData,
  requireAthleteContext,
} from "@/lib/athlete-dashboard";
import { NotificationFeed } from "@/components/notification-feed";
import { formatMetricValue } from "@/lib/progress";
import { cn } from "@/lib/utils";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-brand transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default async function AthleteHomePage() {
  const ctx = await requireAthleteContext();
  const data = await getAthleteDashboardData(ctx);

  const sportLine = [ctx.sports.join(" · "), ctx.position]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Welcome back
        </p>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {ctx.firstName.toUpperCase()}
        </h1>
        <p className="text-slate-400">{sportLine}</p>
      </section>

      <NotificationFeed userId={ctx.userId} variant="athlete" />

      <Link
        href="/athlete/library"
        className="block rounded-2xl border border-white/10 bg-zinc-900 p-5 transition hover:border-brand/40"
      >
        <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
          Train2Play library
        </p>
        <h2 className="font-heading mt-1 text-2xl font-bold">
          Courses for {ctx.sports.join(" & ") || ctx.sport}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Drills and teaching videos pushed out for the sports you play.
        </p>
      </Link>

      {/* TODAY'S TRAINING — primary */}
      <section className="relative overflow-hidden rounded-3xl border border-brand/40 bg-gradient-to-br from-brand via-brand to-[#c44f00] p-5 text-black shadow-[0_20px_50px_-24px_rgba(255,102,0,0.8)] sm:p-6">
        <p className="text-xs font-bold tracking-[0.18em] uppercase opacity-80">
          Today&apos;s training
        </p>
        {data.todaysWorkout && data.activePlan ? (
          <>
            <h2 className="font-heading mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {data.activePlan.title}
            </h2>
            <p className="mt-1 text-sm font-medium text-black/75">
              {data.todaysWorkout.title}
              {data.todaysWorkout.durationMinutes
                ? ` · ${data.todaysWorkout.durationMinutes} MIN`
                : ""}
              {data.exerciseCountHint
                ? ` · ${data.exerciseCountHint} exercises`
                : ""}
            </p>
            {data.todaysWorkout.description ? (
              <p className="mt-3 line-clamp-3 text-sm text-black/70">
                {data.todaysWorkout.description}
              </p>
            ) : null}
            <Link
              href={`/athlete/train${data.todaysWorkout.id ? `?workout=${data.todaysWorkout.id}` : ""}`}
              className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black px-6 text-base font-bold tracking-wide text-white transition hover:bg-zinc-900 active:scale-[0.99] sm:w-auto sm:min-w-[220px]"
            >
              <Play className="size-5 fill-current" />
              START WORKOUT
            </Link>
          </>
        ) : (
          <>
            <h2 className="font-heading mt-2 text-3xl font-bold tracking-tight">
              No workout scheduled
            </h2>
            <p className="mt-2 text-sm text-black/75">
              When your coach assigns a plan, it shows up here first.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/athlete/train"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-black px-5 text-sm font-bold text-white"
              >
                Browse training
              </Link>
              <Link
                href="/athlete/connect"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-black/20 bg-black/10 px-5 text-sm font-bold text-black"
              >
                Connect with a coach
              </Link>
            </div>
          </>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-brand">
            <Flame className="size-5" />
            <p className="text-xs font-bold tracking-[0.16em] uppercase">
              Training streak
            </p>
          </div>
          <p className="font-heading mt-2 text-4xl font-bold">
            {data.streak} DAY{data.streak === 1 ? "" : "S"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Consistency wins. Rest days in your plan keep the streak healthy.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
            Current program
          </p>
          {data.activePlan ? (
            <>
              <h3 className="font-heading mt-2 text-xl font-bold leading-tight">
                {data.activePlan.title}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {data.completedCount} of {data.totalWorkouts} workouts ·{" "}
                {data.programProgress}%
              </p>
              <div className="mt-3">
                <ProgressBar value={data.programProgress} />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No active program yet.</p>
          )}
        </section>
      </div>

      {/* Progress metrics */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-brand" />
          <h2 className="font-heading text-xl font-bold">Progress</h2>
        </div>
        {data.metricCards.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {data.metricCards.map((card) => {
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
                  <p className="font-heading mt-1 text-2xl font-bold text-white">
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
                      {card.delta > 0 ? "↑" : card.delta < 0 ? "↓" : "→"}{" "}
                      {formatMetricValue(Math.abs(card.delta), card.unit)}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">Baseline</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
            Metrics will appear here when your coach logs throwing velo, times,
            jumps, and more for your sport.
          </p>
        )}
      </section>

      {data.personalRecord ? (
        <section className="rounded-2xl border border-brand/40 bg-brand/10 p-4">
          <div className="flex items-center gap-2 text-brand">
            <Trophy className="size-5" />
            <p className="text-xs font-bold tracking-[0.16em] uppercase">
              New PR
            </p>
          </div>
          <h3 className="font-heading mt-2 text-2xl font-bold">
            {data.personalRecord.label}
          </h3>
          <p className="mt-1 text-lg font-semibold text-white">
            {formatMetricValue(
              data.personalRecord.value,
              data.personalRecord.unit,
            )}
          </p>
          {data.personalRecord.previousBest != null ? (
            <p className="text-sm text-slate-400">
              Previous:{" "}
              {formatMetricValue(
                data.personalRecord.previousBest,
                data.personalRecord.unit,
              )}
            </p>
          ) : null}
        </section>
      ) : null}

      {data.goalView ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-brand">
            <Target className="size-4" />
            <p className="text-xs font-bold tracking-[0.16em] uppercase">
              Next goal
            </p>
          </div>
          <h3 className="font-heading mt-2 text-xl font-bold">
            {formatMetricValue(data.goalView.target, data.goalView.unit)}{" "}
            {data.goalView.label}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Current:{" "}
            {data.goalView.current != null
              ? formatMetricValue(data.goalView.current, data.goalView.unit)
              : "Not logged yet"}
          </p>
          <div className="mt-3">
            <ProgressBar value={data.goalView.percent} />
            <p className="mt-1 text-xs text-slate-500">{data.goalView.percent}%</p>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand" />
          <h2 className="font-heading text-xl font-bold">Recommended for you</h2>
        </div>
        <div className="space-y-3">
          {data.recommended.drills.map((drill) => (
            <div
              key={drill.id}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-4"
            >
              <p className="font-semibold text-white">{drill.title}</p>
              <p className="mt-0.5 text-sm text-brand">
                {drill.focus} · {drill.durationMin} min
              </p>
              <p className="mt-2 text-sm text-slate-400">{drill.coachingCue}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Medal className="size-4 text-brand" />
          <h2 className="font-heading text-xl font-bold">Achievements</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data.achievements.map((a) => (
            <div
              key={a.id}
              className={cn(
                "rounded-xl border px-3 py-3 text-center text-xs font-semibold",
                a.earned
                  ? "border-brand/40 bg-brand/15 text-white"
                  : "border-white/10 bg-white/5 text-slate-500",
              )}
            >
              {a.label}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 pb-4">
        <h2 className="font-heading text-xl font-bold">Recent activity</h2>
        {data.activity.length > 0 ? (
          <ul className="space-y-2">
            {data.activity.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3"
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-slate-400">{item.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">
            Complete a workout or log a metric to start your timeline.
          </p>
        )}
      </section>
    </div>
  );
}
