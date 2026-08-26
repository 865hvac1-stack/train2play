import { z } from "zod";

export const VIDEO_SOURCE_TYPES = ["URL", "UPLOAD"] as const;

export const videoUrlSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  athleteId: z.string().optional(),
  videoUrl: z.string().url("Enter a valid video URL (direct .mp4 link)"),
});

export const annotationSchema = z.object({
  timestampMs: z.number().int().min(0),
  label: z.string().optional(),
  note: z.string().optional(),
  strokes: z.string().min(2, "Add at least one drawing"),
});

export type VideoStroke = {
  tool: "pen" | "arrow" | "circle";
  color: string;
  width: number;
  points: { x: number; y: number }[];
};

export function formatTimestamp(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function parseStrokes(raw: string): VideoStroke[] {
  try {
    const parsed = JSON.parse(raw) as VideoStroke[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Shared renderer used by coach drawing and synchronized athlete playback. */
export function drawVideoStrokes(
  canvas: HTMLCanvasElement,
  strokes: VideoStroke[],
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const stroke of strokes) {
    const points = stroke.points.map((point) => ({
      x: point.x * canvas.width,
      y: point.y * canvas.height,
    }));
    if (points.length === 0) continue;

    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "pen") {
      ctx.beginPath();
      ctx.moveTo(points[0]!.x, points[0]!.y);
      for (let index = 1; index < points.length; index += 1) {
        ctx.lineTo(points[index]!.x, points[index]!.y);
      }
      ctx.stroke();
    } else if (stroke.tool === "arrow" && points.length >= 2) {
      const start = points[0]!;
      const end = points[points.length - 1]!;
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
    } else if (stroke.tool === "circle" && points.length >= 2) {
      const center = points[0]!;
      const edge = points[points.length - 1]!;
      ctx.beginPath();
      ctx.arc(
        center.x,
        center.y,
        Math.hypot(edge.x - center.x, edge.y - center.y),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  }
}

export const DEMO_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
