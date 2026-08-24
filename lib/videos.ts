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

export const DEMO_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
