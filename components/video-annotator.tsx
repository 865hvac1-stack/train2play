"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Circle,
  Pencil,
  Save,
  Trash2,
  Video,
} from "lucide-react";

import {
  deleteVideoAnnotationAction,
  saveVideoAnnotationAction,
} from "@/app/(dashboard)/videos/actions";
import {
  drawVideoStrokes,
  formatTimestamp,
  parseStrokes,
  type VideoStroke,
} from "@/lib/videos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  PendingVoiceDrawing,
  VoiceTimelineEventInput,
} from "@/lib/voice-timeline";

type Annotation = {
  id: string;
  timestampMs: number;
  label: string | null;
  note: string | null;
  strokes: string;
};

type VideoAnnotatorProps = {
  videoId: string;
  videoUrl: string;
  initialAnnotations: Annotation[];
  /** Athlete viewing coach notes — no draw/save/delete */
  readOnly?: boolean;
  /** Optional hook used by synchronized voice recording; normal reviews ignore it. */
  onTimelineEvent?: (
    event: VoiceTimelineEventInput,
    reviewTimeOverrideMs?: number,
  ) => void;
  getReviewTimeMs?: () => number | null;
  onVideoState?: (state: {
    videoTimeMs: number;
    paused: boolean;
    playbackRate: number;
  }) => void;
  onPendingDrawingChange?: (drawing: PendingVoiceDrawing | null) => void;
  forcePauseToken?: number;
};

const COLORS = ["#FF6600", "#dc2626", "#2563eb", "#eab308", "#ffffff"];

export function VideoAnnotator({
  videoId,
  videoUrl,
  initialAnnotations,
  readOnly = false,
  onTimelineEvent,
  onVideoState,
  onPendingDrawingChange,
  forcePauseToken = 0,
  getReviewTimeMs,
}: VideoAnnotatorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const annotationStartedAtRef = useRef<number | null>(null);

  const [tool, setTool] = useState<VideoStroke["tool"]>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [draftStrokes, setDraftStrokes] = useState<VideoStroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<VideoStroke | null>(null);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [isPaused, setIsPaused] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoStatus, setVideoStatus] = useState<"loading" | "ready" | "error">("loading");
  const router = useRouter();

  const canDraw = !readOnly && isPaused && isDrawing && videoStatus === "ready";

  const syncCanvasSize = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!video || !canvas || !container) return;

    const width = container.clientWidth;
    const height = (width * 9) / 16;
    canvas.width = width;
    canvas.height = height;
    redraw(canvas, draftStrokes);
  }, [draftStrokes]);

  useEffect(() => {
    syncCanvasSize();
    window.addEventListener("resize", syncCanvasSize);
    return () => window.removeEventListener("resize", syncCanvasSize);
  }, [syncCanvasSize]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setVideoStatus("ready");
    } else {
      setVideoStatus("loading");
    }
  }, [videoUrl]);

  useEffect(() => {
    if (forcePauseToken > 0) videoRef.current?.pause();
  }, [forcePauseToken]);

  function reportPendingDrawing(
    strokes: VideoStroke[],
    startedAtMs: number | null = annotationStartedAtRef.current,
    annotationId?: string | null,
  ) {
    const videoTimeMs = Math.floor(
      (videoRef.current?.currentTime ?? 0) * 1000,
    );
    onPendingDrawingChange?.(
      strokes.length > 0
        ? { strokes, videoTimeMs, startedAtMs, annotationId }
        : null,
    );
  }

  function reportVideoState() {
    const video = videoRef.current;
    if (!video) return;
    onVideoState?.({
      videoTimeMs: Math.floor(video.currentTime * 1000),
      paused: video.paused,
      playbackRate: video.playbackRate,
    });
  }

  function redraw(canvas: HTMLCanvasElement, strokes: VideoStroke[]) {
    drawVideoStrokes(canvas, strokes);
  }

  function getRelativePoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!canDraw) return;
    if (annotationStartedAtRef.current === null) {
      annotationStartedAtRef.current = getReviewTimeMs?.() ?? null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getRelativePoint(event);
    const stroke: VideoStroke = {
      tool,
      color,
      width: tool === "pen" ? 3 : 4,
      points: [point],
    };
    setActiveStroke(stroke);
    reportPendingDrawing([...draftStrokes, stroke]);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!activeStroke) return;
    const point = getRelativePoint(event);
    const updated: VideoStroke = {
      ...activeStroke,
      points:
        activeStroke.tool === "pen"
          ? [...activeStroke.points, point]
          : [activeStroke.points[0], point],
    };
    setActiveStroke(updated);
    const canvas = canvasRef.current;
    if (canvas) {
      redraw(canvas, [...draftStrokes, updated]);
    }
    reportPendingDrawing([...draftStrokes, updated]);
  }

  function handlePointerUp() {
    if (!activeStroke) return;
    setDraftStrokes((current) => {
      const next = [...current, activeStroke];
      reportPendingDrawing(next);
      return next;
    });
    setActiveStroke(null);
  }

  function clearDraft(options?: { emit?: boolean }) {
    setDraftStrokes([]);
    setActiveStroke(null);
    reportPendingDrawing([]);
    const canvas = canvasRef.current;
    if (canvas) redraw(canvas, []);
    if (options?.emit === false) return;
    const videoTimeMs = Math.floor(
      (videoRef.current?.currentTime ?? 0) * 1000,
    );
    onTimelineEvent?.({ type: "annotation_clear", videoTimeMs });
  }

  function seekTo(ms: number) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video) return;
    video.pause();
    setIsPaused(true);
    setIsDrawing(true);
    video.currentTime = ms / 1000;
    const annotation = initialAnnotations.find((item) => item.timestampMs === ms);
    if (annotation && canvas) {
      const strokes = parseStrokes(annotation.strokes);
      redraw(canvas, strokes);
      setDraftStrokes(strokes);
      reportPendingDrawing(strokes, getReviewTimeMs?.() ?? null, annotation.id);
      onTimelineEvent?.({
        type: "annotation_show",
        videoTimeMs: ms,
        annotationId: annotation.id,
        strokes: annotation.strokes,
      });
    }
  }

  function toggleDrawing() {
    if (!isPaused) {
      setMessage("Pause the video first, then draw on the frame.");
      return;
    }
    setIsDrawing((current) => !current);
    setMessage(null);
  }

  function handleVideoPlay() {
    setIsPaused(false);
    setIsDrawing(false);
    clearDraft();
    onTimelineEvent?.({
      type: "video_play",
      videoTimeMs: Math.floor((videoRef.current?.currentTime ?? 0) * 1000),
    });
    reportVideoState();
  }

  function handleVideoPause() {
    setIsPaused(true);
    onTimelineEvent?.({
      type: "video_pause",
      videoTimeMs: Math.floor((videoRef.current?.currentTime ?? 0) * 1000),
    });
    reportVideoState();
  }

  function handleSave() {
    const video = videoRef.current;
    if (!video || draftStrokes.length === 0) {
      setMessage("Draw on the video before saving an annotation.");
      return;
    }

    startTransition(async () => {
      const result = await saveVideoAnnotationAction(videoId, {
        timestampMs: Math.floor(video.currentTime * 1000),
        label: label || undefined,
        note: note || undefined,
        strokes: JSON.stringify(draftStrokes),
      });

      if (result.error) {
        setMessage(result.error);
        return;
      }

      setMessage("Coaching note saved at this timestamp.");
      setLabel("");
      setNote("");
      setIsDrawing(false);
      if (result.annotationId) {
        reportPendingDrawing(
          draftStrokes,
          annotationStartedAtRef.current,
          result.annotationId,
        );
        onTimelineEvent?.(
          {
            type: "annotation_show",
            videoTimeMs: Math.floor(video.currentTime * 1000),
            annotationId: result.annotationId,
            strokes: JSON.stringify(draftStrokes),
          },
          annotationStartedAtRef.current ?? undefined,
        );
      }
      annotationStartedAtRef.current = null;
      // Refreshing during a live voice recording remounts this workspace and
      // can drop the in-progress timeline. The saved drawing is already on
      // the canvas and in the timeline.
      if (getReviewTimeMs?.() == null) {
        router.refresh();
      }
    });
  }

  function handleDeleteAnnotation(annotationId: string) {
    startTransition(async () => {
      await deleteVideoAnnotationAction(videoId, annotationId);
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-6 overflow-x-hidden">
      <div
        ref={containerRef}
        className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-xl bg-black shadow-lg"
      >
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          preload="metadata"
          className="aspect-video h-auto w-full max-w-full bg-black"
          playsInline
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          onSeeked={() => {
            onTimelineEvent?.({
              type: "video_seek",
              videoTimeMs: Math.floor(
                (videoRef.current?.currentTime ?? 0) * 1000,
              ),
            });
            reportVideoState();
          }}
          onRateChange={() => {
            setPlaybackRate(videoRef.current?.playbackRate ?? 1);
            onTimelineEvent?.({
              type: "playback_rate_change",
              videoTimeMs: Math.floor(
                (videoRef.current?.currentTime ?? 0) * 1000,
              ),
              playbackRate: videoRef.current?.playbackRate ?? 1,
            });
            reportVideoState();
          }}
          onLoadedData={() => setVideoStatus("ready")}
          onCanPlay={() => {
            setVideoStatus("ready");
            reportVideoState();
          }}
          onError={() => setVideoStatus("error")}
        />
        <canvas
          ref={canvasRef}
          className={cn(
            "absolute inset-0 h-full w-full touch-none",
            canDraw ? "cursor-crosshair" : "pointer-events-none",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {videoStatus === "loading" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center text-white">
              <Video className="mx-auto mb-2 size-8 animate-pulse opacity-80" />
              <p className="text-sm">Loading video…</p>
            </div>
          </div>
        ) : null}

        {videoStatus === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center">
            <div className="max-w-sm text-white">
              <p className="font-medium">This video link couldn&apos;t be loaded</p>
              <p className="mt-2 text-sm text-white/80">
                Upload the file directly from the Add video page — that works best for coaching
                clips.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {!readOnly ? (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <Button
          type="button"
          size="sm"
          variant={isDrawing ? "default" : "outline"}
          className={isDrawing ? "" : undefined}
          disabled={videoStatus !== "ready" || !isPaused}
          onClick={toggleDrawing}
        >
          <Pencil className="h-4 w-4" />
          {isDrawing ? "Drawing on frame" : "Draw on frame"}
        </Button>
        <div className="flex items-center gap-1">
          {[0.5, 0.75, 1].map((rate) => (
            <Button
              key={rate}
              type="button"
              size="sm"
              variant={playbackRate === rate ? "default" : "outline"}
              onClick={() => {
                if (videoRef.current) videoRef.current.playbackRate = rate;
                setPlaybackRate(rate);
              }}
            >
              {rate}×
            </Button>
          ))}
        </div>
        <span className="text-slate-600">
          {videoStatus === "loading"
            ? "Waiting for video to load…"
            : !isPaused
              ? "Playing — use the video controls. Pause when you want to annotate."
              : isDrawing
                ? "Paused — draw on the video, add direction below, then save."
                : "Paused — click Draw on frame to start annotating."}
        </span>
      </div>
      ) : (
        <p className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-slate-400">
          Tap a coaching note timestamp below to see your coach&apos;s drawings
          on that frame.
        </p>
      )}

      {!readOnly ? (
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-900">Drawing tools</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={tool === "pen" ? "default" : "outline"}
                size="sm"
                disabled={!canDraw}
                onClick={() => setTool("pen")}
              >
                <Pencil className="h-4 w-4" />
                Pen
              </Button>
              <Button
                type="button"
                variant={tool === "arrow" ? "default" : "outline"}
                size="sm"
                disabled={!canDraw}
                onClick={() => setTool("arrow")}
              >
                <ArrowUpRight className="h-4 w-4" />
                Arrow
              </Button>
              <Button
                type="button"
                variant={tool === "circle" ? "default" : "outline"}
                size="sm"
                disabled={!canDraw}
                onClick={() => setTool("circle")}
              >
                <Circle className="h-4 w-4" />
                Circle
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={!canDraw} onClick={() => clearDraft()}>
                Clear drawing
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-900">Color</p>
            <div className="flex gap-2">
              {COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Color ${option}`}
                  onClick={() => setColor(option)}
                  className={`h-8 w-8 rounded-full border-2 ${
                    color === option ? "border-slate-900" : "border-transparent"
                  }`}
                  style={{ backgroundColor: option }}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="annotationLabel">Label (optional)</Label>
              <Input
                id="annotationLabel"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Foot placement"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annotationNote">Coaching direction</Label>
              <Input
                id="annotationNote"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Drive knee over toe on landing"
              />
            </div>
          </div>

          <Button
            type="button"
           
            disabled={pending}
            onClick={handleSave}
          >
            <Save className="h-4 w-4" />
            {pending ? "Saving..." : "Save coaching note at current time"}
          </Button>

          {message ? <p className="text-sm text-slate-600">{message}</p> : null}

          <p className="text-xs text-slate-500">
            Pause the video, draw arrows or circles to show form corrections, add
            written direction, then save. Athletes see your notes when they jump
            to each timestamp. Use direct MP4 links or uploaded files — YouTube
            links cannot be drawn on.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-900">
            Saved coaching notes
          </p>
          {initialAnnotations.length > 0 ? (
            <ul className="space-y-3">
              {initialAnnotations.map((annotation) => (
                <li
                  key={annotation.id}
                  className="rounded-lg border border-slate-200 p-3 text-sm"
                >
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => seekTo(annotation.timestampMs)}
                  >
                    {formatTimestamp(annotation.timestampMs)}
                    {annotation.label ? ` · ${annotation.label}` : ""}
                  </button>
                  {annotation.note ? (
                    <p className="mt-1 text-slate-600">{annotation.note}</p>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    disabled={pending}
                    onClick={() => handleDeleteAnnotation(annotation.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              No coaching notes yet. Pause the video and add your first annotation.
            </p>
          )}
        </div>
      </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <p className="mb-3 text-sm font-semibold text-white">
            Coach annotations
          </p>
          {initialAnnotations.length > 0 ? (
            <ul className="space-y-3">
              {initialAnnotations.map((annotation) => (
                <li
                  key={annotation.id}
                  className="rounded-xl border border-white/10 p-3 text-sm"
                >
                  <button
                    type="button"
                    className="font-medium text-brand hover:underline"
                    onClick={() => seekTo(annotation.timestampMs)}
                  >
                    {formatTimestamp(annotation.timestampMs)}
                    {annotation.label ? ` · ${annotation.label}` : ""}
                  </button>
                  {annotation.note ? (
                    <p className="mt-1 text-slate-400">{annotation.note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              No drawings saved yet. Check back after your coach reviews.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
