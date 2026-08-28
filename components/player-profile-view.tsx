import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { formatMetricValue } from "@/lib/progress";

export type ProfilePerformanceCard = {
  id?: string;
  name: string;
  unit: string;
  value: number;
  delta: number | null;
  history: number[];
  verified: boolean;
  verificationType: string;
};

export function ProfileEmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/70 px-4 py-5">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{body}</p>
      {href && cta ? (
        <Link
          href={href}
          className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-black"
        >
          {cta}
        </Link>
      ) : null}
    </div>
  );
}

export function PerformanceMetricCards({
  cards,
}: {
  cards: ProfilePerformanceCard[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map((card) => (
        <div
          key={card.id ?? card.name}
          className="rounded-2xl border border-white/10 bg-zinc-900 p-4"
        >
          <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-500 uppercase">
            {card.name}
          </p>
          <p className="font-heading mt-1 text-3xl font-bold">
            {formatMetricValue(card.value, card.unit)}
          </p>
          {card.delta != null ? (
            <p className="text-sm font-semibold text-brand">
              {card.delta > 0 ? "+" : ""}
              {formatMetricValue(card.delta, card.unit)}
            </p>
          ) : null}
          {card.verified ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              {card.verificationType === "TRAIN2PLAY"
                ? "Train2Play verified"
                : "Coach verified"}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-zinc-500">Self reported</p>
          )}
          {card.history.length > 1 ? (
            <p className="mt-2 text-xs tracking-wide text-zinc-400">
              Development {card.history.join(" → ")} {card.unit}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function TrainingStatsGrid({
  training,
}: {
  training: {
    workoutsCompleted: number;
    trainingDays: number;
    streak: number;
    currentProgram: string | null;
  };
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat label="Workouts completed" value={String(training.workoutsCompleted)} />
      <Stat label="Training days" value={String(training.trainingDays)} />
      <Stat label="Training streak" value={`${training.streak} days`} />
      <Stat label="Current program" value={training.currentProgram ?? "—"} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
      <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-500 uppercase">{label}</p>
      <p className="font-heading mt-1 truncate text-xl font-bold">{value}</p>
    </div>
  );
}

export function FeaturedVideoShowcase({
  src,
  title,
  actions,
}: {
  src: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-brand/40 bg-black">
      <div className="px-4 pt-4">
        <p className="text-[10px] font-bold tracking-[0.18em] text-brand uppercase">Showcase</p>
        <h2 className="font-heading text-xl font-bold">Featured video</h2>
        <p className="mt-1 text-sm text-zinc-400">{title}</p>
      </div>
      <div className="p-4 pt-3">
        <InstructionVideoPlayer src={src} title={title} tone="dark" />
        {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function HighlightVideos({
  videos,
}: {
  videos: { id: string; title: string; url: string }[];
}) {
  if (videos.length === 0) return null;
  return (
    <section>
      <h2 className="font-heading text-xl font-bold">Highlights</h2>
      <div className="mt-3 space-y-4">
        {videos.map((video) => (
          <div key={video.id} className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-3">
            <InstructionVideoPlayer src={video.url} title={video.title} tone="dark" />
          </div>
        ))}
      </div>
    </section>
  );
}
