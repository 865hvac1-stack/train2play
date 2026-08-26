"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Mic, Pause, RotateCcw, Square } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  saveVoiceReviewAction,
  type VoiceReviewActionState,
} from "@/app/(dashboard)/videos/voice-review-actions";
import { SynchronizedVoiceReviewPlayer } from "@/components/synchronized-voice-review-player";
import { VideoAnnotator } from "@/components/video-annotator";
import { Button } from "@/components/ui/button";
import {
  describeMicrophoneError,
  findMicrophoneBlocker,
  pickSupportedAudioMimeType,
  type VoiceTimelineEvent,
  type VoiceTimelineEventInput,
} from "@/lib/voice-timeline";

type Annotation = {
  id: string;
  timestampMs: number;
  label: string | null;
  note: string | null;
  strokes: string;
};

type RecordingPhase =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "recorded"
  | "saved";

type DraftRecord = {
  blob: Blob;
  durationMs: number;
  timeline: VoiceTimelineEvent[];
};

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
}

function openDraftDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("train2play-voice-review-drafts", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("drafts");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function persistDraft(key: string, draft: DraftRecord | null) {
  if (typeof indexedDB === "undefined") return;
  const db = await openDraftDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    const store = tx.objectStore("drafts");
    if (draft) store.put(draft, key);
    else store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadDraft(key: string): Promise<DraftRecord | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDraftDb();
  const value = await new Promise<DraftRecord | undefined>((resolve, reject) => {
    const tx = db.transaction("drafts", "readonly");
    const request = tx.objectStore("drafts").get(key);
    request.onsuccess = () => resolve(request.result as DraftRecord | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value ?? null;
}

export function VoiceReviewWorkspace({
  reviewId,
  videoId,
  videoUrl,
  annotations,
  existingVoiceReview,
}: {
  reviewId: string;
  videoId: string;
  videoUrl: string;
  annotations: Annotation[];
  existingVoiceReview:
    | {
        durationMs: number;
        timeline: VoiceTimelineEvent[];
      }
    | null;
}) {
  const draftKey = `voice-review:${reviewId}`;
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timelineRef = useRef<VoiceTimelineEvent[]>([]);
  const phaseRef = useRef<RecordingPhase>("idle");
  const startedAtRef = useRef(0);
  const pausedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const currentVideoStateRef = useRef({
    videoTimeMs: 0,
    paused: true,
    playbackRate: 1,
  });

  const [phase, setPhaseState] = useState<RecordingPhase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [draft, setDraft] = useState<DraftRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [forcePauseToken, setForcePauseToken] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [actionState, setActionState] = useState<VoiceReviewActionState>({});
  const [saving, startSaving] = useTransition();
  const router = useRouter();

  function setPhase(next: RecordingPhase) {
    phaseRef.current = next;
    setPhaseState(next);
  }

  useEffect(() => {
    void loadDraft(draftKey)
      .then((stored) => {
        if (!stored) return;
        setDraft(stored);
        setPreviewUrl(URL.createObjectURL(stored.blob));
        setElapsedMs(stored.durationMs);
        setPhase("recorded");
        setMessage("Recovered your unsaved voice review from this device.");
      })
      .catch(() => undefined);
  }, [draftKey]);

  useEffect(() => {
    if (phase !== "recording") return;
    const timer = window.setInterval(() => {
      setElapsedMs(
        Math.max(
          0,
          performance.now() - startedAtRef.current - pausedTotalRef.current,
        ),
      );
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const getReviewElapsedMs = useCallback(() => {
    if (phaseRef.current !== "recording") return null;
    return Math.max(
      0,
      Math.round(
        performance.now() - startedAtRef.current - pausedTotalRef.current,
      ),
    );
  }, []);

  const handleTimelineEvent = useCallback(
    (
      event: VoiceTimelineEventInput,
      reviewTimeOverrideMs?: number,
    ) => {
      const currentTime = getReviewElapsedMs();
      if (currentTime === null) return;
      timelineRef.current.push({
        ...event,
        reviewTimeMs: reviewTimeOverrideMs ?? currentTime,
      });
      timelineRef.current.sort(
        (left, right) => left.reviewTimeMs - right.reviewTimeMs,
      );
    },
    [getReviewElapsedMs],
  );

  async function startRecording() {
    setMessage(null);
    setActionState({});

    const blocker = findMicrophoneBlocker();
    if (blocker) {
      setMessage(blocker);
      return;
    }

    const mimeType = pickSupportedAudioMimeType();
    if (mimeType === null) {
      setMessage("Voice recording is not supported in this browser.");
      return;
    }

    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      timelineRef.current = [];
      pausedTotalRef.current = 0;
      setElapsedMs(0);
      setForcePauseToken((value) => value + 1);

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setMessage("Recording was interrupted. Your last completed draft is still available.");
      };
      recorder.onstop = () => {
        const finalDuration = Math.max(
          250,
          Math.round(
            performance.now() -
              startedAtRef.current -
              pausedTotalRef.current,
          ),
        );
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        const completedDraft = {
          blob,
          durationMs: finalDuration,
          timeline: [...timelineRef.current],
        };
        setDraft(completedDraft);
        setElapsedMs(finalDuration);
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        setPhase("recorded");
        void persistDraft(draftKey, completedDraft).catch(() => undefined);
        stream.getTracks().forEach((track) => track.stop());
      };

      startedAtRef.current = performance.now();
      timelineRef.current.push({
        reviewTimeMs: 0,
        videoTimeMs: currentVideoStateRef.current.videoTimeMs,
        type: "video_pause",
      });
      if (currentVideoStateRef.current.playbackRate !== 1) {
        timelineRef.current.push({
          reviewTimeMs: 0,
          videoTimeMs: currentVideoStateRef.current.videoTimeMs,
          type: "playback_rate_change",
          playbackRate: currentVideoStateRef.current.playbackRate,
        });
      }
      // Safari's MP4 recorder only produces a playable file as a single blob,
      // so timeslicing is limited to the WebM path.
      if (recorder.mimeType.includes("webm")) recorder.start(1000);
      else recorder.start();
      setPhase("recording");
    } catch (error) {
      setPhase("idle");
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setMessage(describeMicrophoneError(error));
    }
  }

  function pauseOrResume() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (phaseRef.current === "recording") {
      setForcePauseToken((value) => value + 1);
      recorder.pause();
      pausedAtRef.current = performance.now();
      setPhase("paused");
    } else if (phaseRef.current === "paused") {
      pausedTotalRef.current += performance.now() - pausedAtRef.current;
      recorder.resume();
      setPhase("recording");
    }
  }

  function finishRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setForcePauseToken((value) => value + 1);
    if (phaseRef.current === "paused") {
      pausedTotalRef.current += performance.now() - pausedAtRef.current;
    }
    recorder.stop();
  }

  function discardDraft() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDraft(null);
    setElapsedMs(0);
    setActionState({});
    setMessage(null);
    setPhase("idle");
    void persistDraft(draftKey, null).catch(() => undefined);
  }

  function saveDraft() {
    if (!draft) return;
    startSaving(async () => {
      const formData = new FormData();
      const extension = draft.blob.type.includes("mp4")
        ? "m4a"
        : draft.blob.type.includes("ogg")
          ? "ogg"
          : "webm";
      formData.set("audio", draft.blob, `voice-review.${extension}`);
      formData.set("durationMs", String(draft.durationMs));
      formData.set("timeline", JSON.stringify(draft.timeline));
      const result = await saveVoiceReviewAction(reviewId, {}, formData);
      setActionState(result);
      if (result.success) {
        setPhase("saved");
        await persistDraft(draftKey, null).catch(() => undefined);
        router.refresh();
      }
    });
  }

  const isRecording = phase === "recording" || phase === "paused";

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-brand/25 bg-orange-50/40 p-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-slate-900">
            Record voice review
          </h2>
          <p className="text-sm text-slate-600">
            Talk through the athlete&apos;s video while you play, pause, rewind,
            change speed, and use the existing annotation tools.
          </p>
        </div>

        {phase === "idle" || phase === "requesting" ? (
          <Button
            type="button"
            onClick={startRecording}
            disabled={phase === "requesting"}
          >
            <Mic className="size-4" />
            {phase === "requesting"
              ? "Requesting microphone…"
              : existingVoiceReview
                ? "Record again"
                : "Record voice review"}
          </Button>
        ) : null}

        {isRecording ? (
          <div className="space-y-3 rounded-xl border border-red-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-bold text-red-700">
                <span
                  className={`size-3 rounded-full bg-red-600 ${
                    phase === "recording" ? "animate-pulse" : ""
                  }`}
                />
                {phase === "recording" ? "RECORDING" : "REVIEW PAUSED"}
              </span>
              <span className="font-mono text-lg font-bold text-slate-900">
                {formatDuration(elapsedMs)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={pauseOrResume}>
                <Pause className="size-4" />
                {phase === "recording" ? "Pause review" : "Resume review"}
              </Button>
              <Button type="button" onClick={finishRecording}>
                <Square className="size-4" />
                Finish review
              </Button>
            </div>
          </div>
        ) : null}

        {message ? <p className="text-sm text-slate-600">{message}</p> : null}

        {(phase === "recorded" || phase === "saved") &&
        draft &&
        previewUrl ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900">Preview review</h3>
              <p className="text-sm text-slate-600">
                This replays the same synchronized session the athlete will see.
              </p>
            </div>
            <SynchronizedVoiceReviewPlayer
              videoUrl={videoUrl}
              audioUrl={previewUrl}
              durationMs={draft.durationMs}
              timeline={draft.timeline}
              annotations={annotations}
              dark={false}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={saveDraft}
                disabled={saving || phase === "saved"}
              >
                {saving
                  ? "Uploading…"
                  : phase === "saved"
                    ? "Voice review saved ✓"
                    : "Save review"}
              </Button>
              <Button type="button" variant="outline" onClick={discardDraft}>
                <RotateCcw className="size-4" />
                Discard & record again
              </Button>
            </div>
            {actionState.error ? (
              <p className="text-sm text-destructive">{actionState.error}</p>
            ) : null}
            {actionState.success ? (
              <p className="text-sm text-primary">{actionState.success}</p>
            ) : null}
            {phase !== "saved" ? (
              <p className="text-xs text-slate-500">
                Your recording stays on this device until upload succeeds,
                including after an accidental refresh.
              </p>
            ) : null}
          </div>
        ) : null}

        {existingVoiceReview && phase === "idle" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">
              Voice review saved ✓ ·{" "}
              {formatDuration(existingVoiceReview.durationMs)}
            </p>
            <SynchronizedVoiceReviewPlayer
              videoUrl={videoUrl}
              audioUrl={`/api/video-reviews/${reviewId}/voice`}
              durationMs={existingVoiceReview.durationMs}
              timeline={existingVoiceReview.timeline}
              annotations={annotations}
              dark={false}
            />
          </div>
        ) : null}
      </section>

      <VideoAnnotator
        videoId={videoId}
        videoUrl={videoUrl}
        initialAnnotations={annotations}
        onTimelineEvent={handleTimelineEvent}
        getReviewTimeMs={getReviewElapsedMs}
        onVideoState={(state) => {
          currentVideoStateRef.current = state;
        }}
        forcePauseToken={forcePauseToken}
      />
    </div>
  );
}
