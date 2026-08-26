import { z } from "zod";

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
