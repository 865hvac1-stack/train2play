import Link from "next/link";

import { ProgressCharts } from "@/components/progress-charts";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { getAthleteProgressStory } from "@/lib/athlete-progress";
import { cn } from "@/lib/utils";

export default async function AthleteProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const ctx = await requireAthleteContext();
  const query = await searchParams;
  const data = await getAthleteProgressStory(ctx, query.sport);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
          Progress
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Your development
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Am I getting better? Starting numbers, current results, and personal
          bests from real training.
        </p>
      </div>

      {data.sports.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {data.sports.map((sport) => {
            const selected = sport === data.selectedSport;
            return (
              <Link
                key={sport}
                href={`/athlete/progress?sport=${encodeURIComponent(sport)}`}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold tracking-wide uppercase",
                  selected
                    ? "bg-brand text-black"
                    : "border border-white/15 bg-zinc-900 text-zinc-300",
                )}
              >
                {sport}
              </Link>
            );
          })}
        </div>
      ) : null}

      <section>
        <h2 className="font-heading text-lg font-bold">Development overview</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <OverviewCard
            value={data.overview.workoutsCompleted}
            label="Workouts completed"
          />
          <OverviewCard
            value={data.overview.trainingDays}
            label="Training days"
          />
          <OverviewCard
            value={data.overview.streak}
            label="Current streak"
          />
          <OverviewCard
            value={data.overview.personalRecords}
            label="Personal records"
          />
        </div>
      </section>

      {data.programConnection ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <p className="text-[10px] font-bold tracking-[0.18em] text-zinc-500 uppercase">
            Current program
          </p>
          <h2 className="font-heading mt-1 text-xl font-bold">
            {data.programConnection.title}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {data.programConnection.completed} / {data.programConnection.total}{" "}
            workouts completed
          </p>
          {data.programConnection.lines.length > 0 ? (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Recorded during this program
              </p>
              {data.programConnection.lines.map((line) => (
                <p key={line.name} className="text-sm text-white">
                  {line.name}: {line.from} → {line.to}
                </p>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-2xl font-bold">Performance metrics</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Track your results over time and see how your training is translating
            into performance.
          </p>
        </div>

        {data.metricCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-950 p-5">
            <h3 className="font-heading text-xl font-bold">
              Start your development story
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Record your first performance result to begin tracking your
              improvement over time. Complete a workout to log results, or have
              your coach log one during training.
            </p>
            {data.hasCoach ? (
              <p className="mt-2 text-sm text-zinc-500">
                Your coach can also record and verify results.
              </p>
            ) : null}
            <Link
              href={data.recordMetricHref}
              className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-brand px-4 text-sm font-bold text-black"
            >
              Record a metric →
            </Link>
          </div>
        ) : (
          data.metricCards.map((card) => (
            <article
              key={card.id}
              id={`metric-${card.id}`}
              className="scroll-mt-24 rounded-2xl border border-white/10 bg-zinc-900 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-heading text-xl font-bold uppercase">
                  {card.name}
                </h3>
                {card.latestVerification ? (
                  <span className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                    {card.latestCoachContext ?? card.latestVerification}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Starting" value={card.startingLabel} />
                <Stat label="Current" value={card.currentLabel} />
                <Stat
                  label="Change"
                  value={card.changeLabel ?? "—"}
                  emphasize={card.improved}
                />
                <Stat label="Personal best" value={card.personalBestLabel} />
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                {card.resultCount} result{card.resultCount === 1 ? "" : "s"}
              </p>
              {card.improved ? (
                <div className="mt-4 rounded-xl border border-brand/30 bg-brand/10 p-3">
                  <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    Your recorded development
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {card.startingLabel}
                    <span className="mx-2 text-brand">↓</span>
                    {card.currentLabel}
                  </p>
                  {card.changeLabel ? (
                    <p className="font-heading mt-1 text-lg font-bold text-brand">
                      {card.changeLabel} development
                      {card.percentLabel ? ` · ${card.percentLabel}` : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <p className="mt-3 font-heading text-sm font-semibold text-white">
                {card.historyLabel}
              </p>
              {card.chartPoints.length >= 2 ? (
                <div className="mt-4">
                  <ProgressCharts
                    metrics={card.chartPoints}
                    tone="dark"
                    showTitle={false}
                    heightClassName="h-40 sm:h-48"
                  />
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>

      <section>
        <h2 className="font-heading text-xl font-bold">Personal records</h2>
        {data.personalRecords.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-white/15 p-5">
            <p className="text-sm leading-relaxed text-zinc-400">
              Your personal records will appear here as you record performance
              results.
            </p>
            <Link
              href={data.recordMetricHref}
              className="mt-3 inline-flex min-h-11 items-center text-sm font-bold tracking-wide text-brand uppercase"
            >
              Record a metric →
            </Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.personalRecords.map((record) => (
              <li
                key={record.id}
                className="rounded-2xl border border-white/10 bg-zinc-900 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-wide text-zinc-500 uppercase">
                      {record.name}
                    </p>
                    <p className="font-heading mt-1 text-2xl font-bold">
                      {record.valueLabel}
                    </p>
                  </div>
                  {record.isNew ? (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold tracking-wide text-black uppercase">
                      New PR
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {record.dateLabel}
                  {record.coachContext
                    ? ` · ${record.coachContext}`
                    : record.verification
                      ? ` · ${record.verification}`
                      : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-heading text-xl font-bold">Development activity</h2>
        {data.activity.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-white/15 p-5 text-sm text-zinc-400">
            Workouts, results, coach feedback, and achievements will show here as
            you train.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.activity.map((item) => (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="block rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 transition hover:border-brand/50 hover:bg-zinc-800"
                  >
                    <ActivityBody item={item} />
                  </Link>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3">
                    <ActivityBody item={item} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function OverviewCard({
  value,
  label,
  suffix,
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
      <p className="font-heading text-3xl font-bold">
        {value}
        {suffix && value !== 0 ? (
          <span className="ml-1 text-base font-semibold text-zinc-400">
            {suffix}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-[10px] font-bold tracking-[0.14em] text-zinc-500 uppercase">
        {label}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-500 uppercase">
        {label}
      </p>
      <p
        className={cn(
          "font-heading mt-1 text-lg font-bold",
          emphasize ? "text-brand" : "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ActivityBody({
  item,
}: {
  item: {
    title: string;
    detail: string;
    when: string;
    cta: string | null;
  };
}) {
  return (
    <>
      <p className="text-[10px] font-bold tracking-[0.16em] text-brand uppercase">
        {item.title}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{item.detail}</p>
      <p className="mt-1 text-xs text-zinc-500">{item.when}</p>
      {item.cta ? (
        <p className="mt-2 text-xs font-bold tracking-wide text-brand uppercase">
          {item.cta} →
        </p>
      ) : null}
    </>
  );
}
