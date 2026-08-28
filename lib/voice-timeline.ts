import { z } from "zod";

import { parseStrokes, type VideoStroke } from "@/lib/videos";

export const voiceTimelineEventSchema = z.object({
  reviewTimeMs: z.number().int().min(0).max(30 * 60 * 1000),
  videoTimeMs: z.number().int().min(0).max(24 * 60 * 60 * 1000),
  type: z.enum([
    "video_play",
    "video_pause",
    "video_seek",
    "playback_rate_change",
    "annotation_show",
    "annotation_clear",
  ]),
  playbackRate: z.number().min(0.1).max(4).optional(),
  annotationId: z.string().max(200).optional(),
  /** Normalized drawing JSON so playback does not depend on a later annotation lookup. */
  strokes: z.string().min(2).max(400_000).optional(),
});

export const voiceTimelineSchema = z
  .array(voiceTimelineEventSchema)
  .min(1)
  .max(5000)
  .superRefine((events, ctx) => {
    for (let index = 1; index < events.length; index += 1) {
      if (events[index]!.reviewTimeMs < events[index - 1]!.reviewTimeMs) {
        ctx.addIssue({
          code: "custom",
          message: "Timeline events must be ordered",
          path: [index, "reviewTimeMs"],
        });
      }
    }
  });

export type VoiceTimelineEvent = z.infer<typeof voiceTimelineEventSchema>;
export type VoiceTimelineEventInput = Omit<
  VoiceTimelineEvent,
  "reviewTimeMs"
>;

export type PendingVoiceDrawing = {
  strokes: VideoStroke[];
  videoTimeMs: number;
  startedAtMs: number | null;
  annotationId?: string | null;
};

/** Prefer strokes saved on the timeline so drawings survive even if the annotation row is missing. */
export function strokesFromTimelineEvent(
  event: Pick<VoiceTimelineEvent, "type" | "annotationId" | "strokes">,
  annotations: { id: string; strokes: string }[],
): VideoStroke[] {
  if (event.type === "annotation_clear") return [];
  if (event.type !== "annotation_show") return [];
  if (event.strokes) return parseStrokes(event.strokes);
  const match = annotations.find((item) => item.id === event.annotationId);
  return match ? parseStrokes(match.strokes) : [];
}

export function pickSupportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

/**
 * Reasons a browser refuses to record before we ever reach getUserMedia.
 * Returning the specific one keeps coaches from guessing at phone settings.
 */
export function findMicrophoneBlocker(): string | null {
  if (typeof window === "undefined") return null;

  if (!window.isSecureContext) {
    return "Voice recording needs a secure https connection. Open train2play.com directly in Safari or Chrome.";
  }

  if (
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === "undefined"
  ) {
    return "This browser cannot record audio. Open the review in Safari on iPhone, or Chrome on Android or desktop — in-app browsers inside Instagram, Facebook, or Gmail block the microphone.";
  }

  const policy = (
    document as Document & {
      permissionsPolicy?: { allowsFeature: (name: string) => boolean };
      featurePolicy?: { allowsFeature: (name: string) => boolean };
    }
  ).permissionsPolicy;

  if (policy && !policy.allowsFeature("microphone")) {
    return "This page is blocking microphone access. Reload the page — if it keeps failing, the site needs a redeploy of its microphone permission policy.";
  }

  return null;
}

export function describeMicrophoneError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone permission was denied. On iPhone: Settings › Safari › Microphone › Allow, or tap the address bar and allow the mic, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No microphone was found on this device.";
    case "NotReadableError":
    case "AbortError":
      return "Another app is using the microphone. Close it — phone calls and video apps hold the mic — then try again.";
    default:
      return "Could not start the microphone. Check your browser permissions and try again.";
  }
}
