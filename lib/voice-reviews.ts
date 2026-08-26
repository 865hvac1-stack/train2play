import { prisma } from "@/lib/db";
import {
  deletePrivateAudioFile,
  getVideoStorageProvider,
  storePrivateAudioFile,
} from "@/lib/storage";
import { voiceTimelineSchema } from "@/lib/voice-timeline";

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/ogg",
  "audio/ogg;codecs=opus",
]);

export function validateAudioMimeType(value: string) {
  const normalized = value.toLowerCase();
  return (
    ALLOWED_AUDIO_TYPES.has(normalized) ||
    normalized.startsWith("audio/webm") ||
    normalized.startsWith("audio/mp4") ||
    normalized.startsWith("audio/ogg")
  );
}

export async function saveVoiceReview(options: {
  videoReviewId: string;
  coachUserId: string;
  audio: Buffer;
  audioMimeType: string;
  durationMs: number;
  timeline: unknown;
}) {
  const review = await prisma.videoReview.findFirst({
    where: {
      id: options.videoReviewId,
      coachUserId: options.coachUserId,
    },
    select: { id: true },
  });
  if (!review) throw new Error("Video review not found");

  if (!validateAudioMimeType(options.audioMimeType)) {
    throw new Error("Unsupported audio recording format");
  }
  if (
    !Number.isSafeInteger(options.durationMs) ||
    options.durationMs < 250 ||
    options.durationMs > 30 * 60 * 1000
  ) {
    throw new Error("Voice review duration is invalid");
  }

  const timeline = voiceTimelineSchema.parse(options.timeline);
  const previous = await prisma.voiceReview.findUnique({
    where: { videoReviewId: options.videoReviewId },
    select: { audioStorageKey: true, storageProvider: true },
  });
  const extension = options.audioMimeType.includes("mp4")
    ? "m4a"
    : options.audioMimeType.includes("ogg")
      ? "ogg"
      : "webm";
  const filename = `${crypto.randomUUID()}.${extension}`;
  const stored = await storePrivateAudioFile(
    options.audio,
    filename,
    options.audioMimeType,
  );

  const saved = await prisma.voiceReview.upsert({
    where: { videoReviewId: options.videoReviewId },
    create: {
      videoReviewId: options.videoReviewId,
      coachUserId: options.coachUserId,
      audioStorageKey: stored.storageKey,
      storageProvider: stored.provider,
      audioMimeType: options.audioMimeType,
      durationMs: options.durationMs,
      timelineJson: timeline,
      status: "READY",
      completedAt: new Date(),
    },
    update: {
      coachUserId: options.coachUserId,
      audioStorageKey: stored.storageKey,
      storageProvider: stored.provider,
      audioMimeType: options.audioMimeType,
      durationMs: options.durationMs,
      timelineJson: timeline,
      status: "READY",
      transcriptText: null,
      transcriptStatus: null,
      completedAt: new Date(),
    },
  });
  if (
    previous &&
    (previous.audioStorageKey !== saved.audioStorageKey ||
      previous.storageProvider !== saved.storageProvider)
  ) {
    await deletePrivateAudioFile({
      provider: previous.storageProvider,
      storageKey: previous.audioStorageKey,
    }).catch(() => undefined);
  }
  return saved;
}

export function currentAudioStorageProvider() {
  return getVideoStorageProvider();
}
