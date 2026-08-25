"use client";

import { useMemo, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";

import {
  completeExerciseAction,
  finishWorkoutAction,
  type SessionActionState,
} from "@/app/(athlete)/athlete/session-actions";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { cn } from "@/lib/utils";

export type RunnerExercise = {
  id: string;
  name: string;
  instructions: string | null;
  coachingCue: string | null;
  videoUrl: string | null;
  sets: number | null;
  reps: number | null;
  durationSec: number | null;
  restSec: number | null;
  equipment: string | null;
  resultRequired: boolean;
  resultKind: string;
  resultUnit: string | null;
  sortOrder: number;
};

export type RunnerResult = {
  workoutExerciseId: string;
  completed: boolean;
  isPersonalRecord: boolean;
  valuePrimary: number | null;
  valueSecondary: number | null;
};

type AthleteWorkoutRunnerProps = {
  sessionId: string;
  workoutTitle: string;
  programTitle: string;
  exercises: RunnerExercise[];
  results: RunnerResult[];
};

function CompleteButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-brand px-6 text-base font-bold tracking-wide text-black transition hover:bg-brand/90 active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function FinishButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-white px-6 text-base font-bold tracking-wide text-black transition hover:bg-zinc-100 disabled:opacity-60"
    >
      {pending ? "Finishing…" : "FINISH WORKOUT"}
    </button>
  );
}

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

function ResultFields({
  exercise,
  initialPrimary,
  initialSecondary,
}: {
  exercise: RunnerExercise;
  initialPrimary: number | null;
  initialSecondary: number | null;
}) {
  if (!exercise.resultRequired || exercise.resultKind === "NONE") {
    return <input type="hidden" name="resultKind" value="NONE" />;
  }

  const unit = exercise.resultUnit ?? "";
  const kind = exercise.resultKind;

  if (kind === "RATIO") {
    return (
      <div className="space-y-3">
        <input type="hidden" name="resultKind" value="RATIO" />
        <input type="hidden" name="unit" value={unit || "%"} />
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2">
            <span className="text-xs font-bold tracking-[0.14em] text-slate-400 uppercase">
              Makes
            </span>
            <input
              name="valuePrimary"
              type="number"
              inputMode="numeric"
              min={0}
              step="1"
              required
              defaultValue={initialPrimary ?? ""}
              className="min-h-14 w-full rounded-2xl border border-white/15 bg-black px-4 text-2xl font-bold text-white outline-none focus:border-brand"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold tracking-[0.14em] text-slate-400 uppercase">
              Attempts
            </span>
            <input
              name="valueSecondary"
              type="number"
              inputMode="numeric"
              min={1}
              step="1"
              required
              defaultValue={initialSecondary ?? ""}
              className="min-h-14 w-full rounded-2xl border border-white/15 bg-black px-4 text-2xl font-bold text-white outline-none focus:border-brand"
            />
          </label>
        </div>
      </div>
    );
  }

  const label =
    kind === "TIME"
      ? "Time"
      : kind === "WEIGHT"
        ? "Weight"
        : kind === "COUNT"
          ? "Count"
          : unit.toLowerCase().includes("mph")
            ? "Velocity"
            : "Result";

  return (
    <div className="space-y-2">
      <input type="hidden" name="resultKind" value={kind} />
      <input type="hidden" name="unit" value={unit} />
      <label className="block space-y-2">
        <span className="text-xs font-bold tracking-[0.14em] text-slate-400 uppercase">
          {label}
          {unit ? ` (${unit})` : ""}
        </span>
        <input
          name="valuePrimary"
          type="number"
          inputMode="decimal"
          step="any"
          required={exercise.resultRequired}
          defaultValue={initialPrimary ?? ""}
          className="min-h-14 w-full rounded-2xl border border-white/15 bg-black px-4 text-2xl font-bold text-white outline-none focus:border-brand"
          placeholder="0"
        />
      </label>
    </div>
  );
}

export function AthleteWorkoutRunner({
  sessionId,
  workoutTitle,
  programTitle,
  exercises,
  results,
}: AthleteWorkoutRunnerProps) {
  const router = useRouter();
  const ordered = useMemo(
    () => [...exercises].sort((a, b) => a.sortOrder - b.sortOrder),
    [exercises],
  );

  const resultMap = useMemo(() => {
    const map = new Map<string, RunnerResult>();
    for (const r of results) map.set(r.workoutExerciseId, r);
    return map;
  }, [results]);

  const firstIncomplete = ordered.findIndex(
    (e) => !resultMap.get(e.id)?.completed,
  );
  const autoIndex =
    firstIncomplete >= 0 ? firstIncomplete : Math.max(0, ordered.length - 1);

  // null = follow the next incomplete exercise after saves
  const [browseIndex, setBrowseIndex] = useState<number | null>(null);
  const index = browseIndex ?? autoIndex;

  const currentExerciseId = ordered[index]?.id ?? "";

  const [state, formAction] = useActionState(
    async (
      prev: SessionActionState,
      formData: FormData,
    ): Promise<SessionActionState> => {
      const result = await completeExerciseAction(
        sessionId,
        currentExerciseId,
        prev,
        formData,
      );
      if (result.ok) {
        // Return to auto-advance on next incomplete after RSC refresh
        setBrowseIndex(null);
        router.refresh();
      }
      return result;
    },
    {} as SessionActionState,
  );

  if (ordered.length === 0) {
    return (
      <div className="space-y-4 rounded-3xl border border-white/10 bg-zinc-900 p-5">
        <h1 className="font-heading text-2xl font-bold">{workoutTitle}</h1>
        <p className="text-sm text-slate-400">
          This workout has no exercises yet. Mark it complete when you finish
          the session as written by your coach.
        </p>
        <form action={finishWorkoutAction.bind(null, sessionId)}>
          <FinishButton />
        </form>
      </div>
    );
  }

  const exercise = ordered[index]!;
  const completedCount = ordered.filter(
    (e) => resultMap.get(e.id)?.completed,
  ).length;
  const progressPct = Math.round((completedCount / ordered.length) * 100);
  const allDone = completedCount >= ordered.length;
  const existing = resultMap.get(exercise.id);

  const prescription: string[] = [];
  if (exercise.sets != null) prescription.push(`${exercise.sets} SETS`);
  if (exercise.reps != null) prescription.push(`${exercise.reps} REPS`);
  if (exercise.durationSec != null)
    prescription.push(`${exercise.durationSec} SEC`);
  if (exercise.restSec != null)
    prescription.push(`${exercise.restSec} SEC REST`);

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
          {programTitle}
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {workoutTitle}
        </h1>
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            {completedCount} of {ordered.length} exercises
          </span>
          <span>{progressPct}%</span>
        </div>
        <ProgressBar value={progressPct} />
      </header>

      {state.ok && state.isPersonalRecord ? (
        <div className="flex items-center gap-2 rounded-2xl border border-brand/50 bg-brand/15 px-4 py-3 text-brand">
          <Trophy className="size-5" />
          <p className="text-sm font-bold tracking-wide uppercase">New PR</p>
        </div>
      ) : null}

      <section className="space-y-4 rounded-3xl border border-white/10 bg-zinc-900 p-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setBrowseIndex(Math.max(0, index - 1))}
            disabled={index === 0}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 disabled:opacity-30"
            aria-label="Previous exercise"
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="text-xs font-bold tracking-[0.14em] text-slate-400 uppercase">
            Exercise {index + 1} of {ordered.length}
          </p>
          <button
            type="button"
            onClick={() =>
              setBrowseIndex(Math.min(ordered.length - 1, index + 1))
            }
            disabled={index >= ordered.length - 1}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 disabled:opacity-30"
            aria-label="Next exercise"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <h2 className="font-heading text-2xl font-bold">{exercise.name}</h2>

        {exercise.videoUrl ? (
          <InstructionVideoPlayer
            src={exercise.videoUrl}
            title={exercise.name}
          />
        ) : null}

        {exercise.instructions ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {exercise.instructions}
          </p>
        ) : null}

        {exercise.coachingCue ? (
          <p className="rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-brand">
            Cue: {exercise.coachingCue}
          </p>
        ) : null}

        {prescription.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {prescription.map((item) => (
              <span
                key={item}
                className="rounded-lg bg-black/50 px-3 py-2 text-xs font-bold tracking-wide text-white"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}

        {exercise.equipment ? (
          <p className="text-xs text-slate-500">
            Equipment: {exercise.equipment}
          </p>
        ) : null}

        <form action={formAction} className="space-y-4 pt-2">
          {exercise.resultRequired ? (
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
                Result entry
              </p>
              <ResultFields
                key={exercise.id}
                exercise={exercise}
                initialPrimary={existing?.valuePrimary ?? null}
                initialSecondary={existing?.valueSecondary ?? null}
              />
            </div>
          ) : (
            <input type="hidden" name="resultKind" value="NONE" />
          )}

          {state.error ? (
            <p className="text-sm text-red-400">{state.error}</p>
          ) : null}

          <CompleteButton
            label={
              existing?.completed ? "UPDATE & CONTINUE" : "COMPLETE EXERCISE"
            }
          />
        </form>
      </section>

      {allDone ? (
        <form action={finishWorkoutAction.bind(null, sessionId)}>
          <FinishButton />
        </form>
      ) : (
        <p
          className={cn(
            "text-center text-xs text-slate-500",
            completedCount === 0 && "opacity-70",
          )}
        >
          Complete each exercise to finish the workout.
        </p>
      )}
    </div>
  );
}
