"use client";

import { useState, useTransition } from "react";
import { Check, Circle, PlayCircle } from "lucide-react";

import {
  markCourseItemViewedAction,
  setCourseItemCompletedAction,
} from "@/app/(athlete)/athlete/library/actions";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { Button } from "@/components/ui/button";

export function AthleteCourseProgressControls({
  itemId,
  title,
  videoUrl,
  initiallyViewed,
  initiallyCompleted,
}: {
  itemId: string;
  title: string;
  videoUrl?: string | null;
  initiallyViewed: boolean;
  initiallyCompleted: boolean;
}) {
  const [viewed, setViewed] = useState(initiallyViewed);
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function startVideo() {
    if (!videoUrl) return;
    setViewed(true);
    setError("");
    startTransition(async () => {
      try {
        await markCourseItemViewedAction(itemId);
      } catch {
        setViewed(false);
        setError("Could not record this view. Please try again.");
      }
    });
  }

  function toggleComplete() {
    const next = !completed;
    setCompleted(next);
    setError("");
    startTransition(async () => {
      try {
        await setCourseItemCompletedAction(itemId, next);
      } catch {
        setCompleted(!next);
        setError("Could not update progress. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {videoUrl ? (
        viewed ? (
          <InstructionVideoPlayer src={videoUrl} title={title} />
        ) : (
          <button
            type="button"
            onClick={startVideo}
            disabled={pending}
            className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-white/15 bg-black text-white transition hover:border-brand/60 hover:bg-zinc-950 disabled:opacity-60"
          >
            <PlayCircle className="size-12 text-brand" />
            <span className="font-semibold">Watch video</span>
            <span className="text-xs text-slate-400">
              Your program progress updates when you start
            </span>
          </button>
        )
      ) : null}

      <Button
        type="button"
        variant={completed ? "default" : "outline"}
        size="sm"
        disabled={pending}
        onClick={toggleComplete}
        className={
          completed
            ? ""
            : "border-white/20 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white"
        }
      >
        {completed ? <Check className="size-4" /> : <Circle className="size-4" />}
        {completed ? "Completed" : "Mark complete"}
      </Button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
