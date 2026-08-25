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
  formatTimestamp,
  parseStrokes,
  type VideoStroke,
} from "@/lib/videos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
};

const COLORS = ["#FF6600", "#dc2626", "#2563eb", "#eab308", "#ffffff"];

export function VideoAnnotator({
  videoId,
  videoUrl,
  initialAnnotations,
  readOnly = false,
}: VideoAnnotatorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  function redraw(canvas: HTMLCanvasElement, strokes: VideoStroke[]) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) {
      drawStroke(ctx, stroke, canvas.width, canvas.height);
    }
  }

  function drawStroke(
    ctx: CanvasRenderingContext2D,
    stroke: VideoStroke,
    width: number,
    height: number,
  ) {
    const points = stroke.points.map((point) => ({
      x: point.x * width,
      y: point.y * height,
    }));

    if (points.length === 0) return;

    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "pen") {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      return;
    }

    if (stroke.tool === "arrow" && points.length >= 2) {
      const start = points[0];
      const end = points[points.length - 1];
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const head = 12;
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - head * Math.cos(angle - Math.PI / 6),
        end.y - head * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        end.x - head * Math.cos(angle + Math.PI / 6),
        end.y - head * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (stroke.tool === "circle" && points.length >= 2) {
      const center = points[0];
      const edge = points[points.length - 1];
      const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
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
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getRelativePoint(event);
    const stroke: VideoStroke = {
      tool,
      color,
      width: tool === "pen" ? 3 : 4,
      points: [point],
    };
    setActiveStroke(stroke);
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
  }

  function handlePointerUp() {
    if (!activeStroke) return;
    setDraftStrokes((current) => [...current, activeStroke]);
    setActiveStroke(null);
  }

  function clearDraft() {
    setDraftStrokes([]);
    setActiveStroke(null);
    const canvas = canvasRef.current;
    if (canvas) redraw(canvas, []);
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
  }

  function handleVideoPause() {
    setIsPaused(true);
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
      clearDraft();
      router.refresh();
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
          onLoadedData={() => setVideoStatus("ready")}
          onCanPlay={() => setVideoStatus("ready")}
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
              <Button type="button" variant="ghost" size="sm" disabled={!canDraw} onClick={clearDraft}>
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
