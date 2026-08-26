"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, RotateCcw } from "lucide-react";

import { drawVideoStrokes, parseStrokes } from "@/lib/videos";
import type { VoiceTimelineEvent } from "@/lib/voice-timeline";

type Annotation = {
  id: string;
  strokes: string;
};

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function SynchronizedVoiceReviewPlayer({
  videoUrl,
  audioUrl,
  durationMs,
  timeline,
  annotations,
  dark = true,
}: {
  videoUrl: string;
  audioUrl: string;
  durationMs: number;
  timeline: VoiceTimelineEvent[];
  annotations: Annotation[];
  dark?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventIndexRef = useRef(0);
  const desiredPlayingRef = useRef(false);
  const playbackAnchorRef = useRef({
    reviewTimeMs: 0,
    videoTimeMs: 0,
    playbackRate: 1,
  });
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    canvas.width = container.clientWidth;
    canvas.height = (container.clientWidth * 9) / 16;
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const applyEvent = useCallback(
    (event: VoiceTimelineEvent) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video) return;

      if (event.type === "video_play") {
        video.currentTime = event.videoTimeMs / 1000;
        desiredPlayingRef.current = true;
        playbackAnchorRef.current = {
          reviewTimeMs: event.reviewTimeMs,
          videoTimeMs: event.videoTimeMs,
          playbackRate: video.playbackRate,
        };
        if (!audioRef.current?.paused) void video.play().catch(() => undefined);
      } else if (event.type === "video_pause") {
        desiredPlayingRef.current = false;
        video.pause();
        video.currentTime = event.videoTimeMs / 1000;
      } else if (event.type === "video_seek") {
        video.currentTime = event.videoTimeMs / 1000;
        playbackAnchorRef.current = {
          reviewTimeMs: event.reviewTimeMs,
          videoTimeMs: event.videoTimeMs,
          playbackRate: video.playbackRate,
        };
      } else if (event.type === "playback_rate_change") {
        video.playbackRate = event.playbackRate ?? 1;
        playbackAnchorRef.current = {
          reviewTimeMs: event.reviewTimeMs,
          videoTimeMs: event.videoTimeMs,
          playbackRate: event.playbackRate ?? 1,
        };
      } else if (event.type === "annotation_clear" && canvas) {
        drawVideoStrokes(canvas, []);
      } else if (
        event.type === "annotation_show" &&
        event.annotationId &&
        canvas
      ) {
        const annotation = annotations.find(
          (item) => item.id === event.annotationId,
        );
        if (annotation) {
          drawVideoStrokes(canvas, parseStrokes(annotation.strokes));
        }
      }
    },
    [annotations],
  );

  const synchronizeTo = useCallback(
    (reviewTimeMs: number) => {
      const audio = audioRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!audio || !video) return;

      eventIndexRef.current = 0;
      desiredPlayingRef.current = false;
      video.pause();
      video.playbackRate = 1;
      if (canvas) drawVideoStrokes(canvas, []);

      while (
        eventIndexRef.current < timeline.length &&
        timeline[eventIndexRef.current]!.reviewTimeMs <= reviewTimeMs
      ) {
        applyEvent(timeline[eventIndexRef.current]!);
        eventIndexRef.current += 1;
      }

      if (!audio.paused && desiredPlayingRef.current) {
        void video.play().catch(() => undefined);
      }
    },
    [applyEvent, timeline],
  );

  const handleAudioTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const nowMs = Math.floor(audio.currentTime * 1000);
    setPositionMs(nowMs);

    while (
      eventIndexRef.current < timeline.length &&
      timeline[eventIndexRef.current]!.reviewTimeMs <= nowMs + 60
    ) {
      applyEvent(timeline[eventIndexRef.current]!);
      eventIndexRef.current += 1;
    }

    const video = videoRef.current;
    if (video && desiredPlayingRef.current) {
      const anchor = playbackAnchorRef.current;
      const expectedVideoMs =
        anchor.videoTimeMs +
        Math.max(0, nowMs - anchor.reviewTimeMs) * anchor.playbackRate;
      if (Math.abs(video.currentTime * 1000 - expectedVideoMs) > 350) {
        video.currentTime = expectedVideoMs / 1000;
      }
    }
  }, [applyEvent, timeline]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      handleAudioTimeUpdate();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [handleAudioTimeUpdate, playing]);

  async function togglePlayback() {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio || !video) return;
    if (audio.paused) {
      await audio.play();
      if (desiredPlayingRef.current) {
        await video.play().catch(() => undefined);
      }
      setPlaying(true);
    } else {
      audio.pause();
      video.pause();
      setPlaying(false);
    }
  }

  function replay() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPositionMs(0);
    setPlaying(false);
    synchronizeTo(0);
  }

  return (
    <div
      className={
        dark
          ? "space-y-3 rounded-2xl border border-white/10 bg-zinc-900 p-3"
          : "space-y-3 rounded-xl border border-slate-200 bg-white p-3"
      }
    >
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl bg-black"
      >
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          preload="metadata"
          className="aspect-video h-auto w-full bg-black"
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={handleAudioTimeUpdate}
        onSeeked={() =>
          synchronizeTo(Math.floor((audioRef.current?.currentTime ?? 0) * 1000))
        }
        onPlay={() => setPlaying(true)}
        onError={() =>
          setPlaybackError(
            "This voice review could not be loaded. Refresh and try again.",
          )
        }
        onPause={() => {
          videoRef.current?.pause();
          setPlaying(false);
        }}
        onEnded={() => {
          videoRef.current?.pause();
          setPlaying(false);
        }}
      />

      {playbackError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {playbackError}
        </p>
      ) : null}

      <input
        type="range"
        min={0}
        max={Math.max(durationMs, 1)}
        value={Math.min(positionMs, durationMs)}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (audioRef.current) audioRef.current.currentTime = next / 1000;
          setPositionMs(next);
          synchronizeTo(next);
        }}
        className="w-full accent-orange-500"
        aria-label="Coach review progress"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlayback}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-black"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {playing ? "Pause" : "Play review"}
          </button>
          <button
            type="button"
            onClick={replay}
            className={
              dark
                ? "inline-flex min-h-11 items-center rounded-xl border border-white/15 px-3 text-white"
                : "inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-3 text-slate-700"
            }
            aria-label="Replay review"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-xs">
            <span className={dark ? "text-slate-400" : "text-slate-500"}>
              Volume
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={(event) => {
                const next = Number(event.target.value);
                setVolume(next);
                if (audioRef.current) audioRef.current.volume = next;
              }}
              className="w-16 accent-orange-500"
              aria-label="Voice review volume"
            />
          </label>
          <span
            className={dark ? "text-xs text-slate-400" : "text-xs text-slate-500"}
          >
            {formatDuration(positionMs)} / {formatDuration(durationMs)}
          </span>
          <button
            type="button"
            onClick={() => containerRef.current?.requestFullscreen?.()}
            className={dark ? "text-slate-300" : "text-slate-600"}
            aria-label="Fullscreen"
          >
            <Maximize className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
