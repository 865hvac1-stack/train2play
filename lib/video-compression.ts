/**
 * Shrinks phone film in the browser before it is uploaded.
 *
 * Camera video runs around 10 Mbps, so a 45-second clip is ~55 MB and a
 * three-minute drill would exceed any upload limit we can offer. Re-encoding to
 * 720p at ~1.8 Mbps keeps a coachable picture at roughly a tenth of the size,
 * and it happens on the coach's device so nothing large crosses the network.
 *
 * Compression plays the clip through a canvas, so it takes about as long as the
 * clip itself. Every failure path returns the original file — a slightly slow
 * upload is always better than a blocked one.
 */
const TARGET_MAX_DIMENSION = 1280;
const TARGET_VIDEO_BITRATE = 1_800_000;
const TARGET_AUDIO_BITRATE = 96_000;
const TARGET_FRAME_RATE = 30;

/** Guards against runaway jobs on clips we cannot meaningfully help. */
const MAX_SOURCE_DURATION_SECONDS = 20 * 60;

export type CompressionProgress = {
  phase: "reading" | "compressing" | "finishing";
  percent: number;
};

export type CompressionResult = {
  file: File;
  originalBytes: number;
  finalBytes: number;
  compressed: boolean;
  reason?: string;
};

type CompressOptions = {
  onProgress?: (progress: CompressionProgress) => void;
  signal?: AbortSignal;
};

function candidateMimeTypes() {
  return [
    // MP4/H.264 first: it is the only format that plays everywhere, including
    // iPhone, which matters because athletes watch these clips back.
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    'video/mp4;codecs="avc1.4D401F,mp4a.40.2"',
    "video/mp4;codecs=avc1",
    "video/mp4",
    'video/webm;codecs="vp9,opus"',
    'video/webm;codecs="vp8,opus"',
    "video/webm",
  ];
}

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of candidateMimeTypes()) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

export function canCompressVideo() {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    pickMimeType() !== null
  );
}

function extensionFor(mimeType: string) {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "") || "video";
}

function evenDimension(value: number) {
  const rounded = Math.round(value);
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function targetSize(width: number, height: number) {
  const longest = Math.max(width, height);
  if (longest <= TARGET_MAX_DIMENSION) {
    return { width: evenDimension(width), height: evenDimension(height) };
  }
  const scale = TARGET_MAX_DIMENSION / longest;
  return {
    width: Math.max(2, evenDimension(width * scale)),
    height: Math.max(2, evenDimension(height * scale)),
  };
}

function loadVideoElement(file: File) {
  return new Promise<{ video: HTMLVideoElement; revoke: () => void }>(
    (resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      const revoke = () => URL.revokeObjectURL(url);

      video.preload = "auto";
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.src = url;

      const onLoaded = () => {
        cleanup();
        resolve({ video, revoke });
      };
      const onError = () => {
        cleanup();
        revoke();
        reject(new Error("This file could not be read as video"));
      };
      function cleanup() {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
      }

      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("error", onError);
    },
  );
}

/** Routes decoded audio into the recording without playing it out loud. */
function attachSilentAudio(video: HTMLVideoElement, stream: MediaStream) {
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextCtor) return null;

  try {
    const context = new AudioContextCtor();
    const source = context.createMediaElementSource(video);
    const destination = context.createMediaStreamDestination();
    source.connect(destination);
    for (const track of destination.stream.getAudioTracks()) {
      stream.addTrack(track);
    }
    return context;
  } catch {
    return null;
  }
}

function original(file: File, reason: string): CompressionResult {
  return {
    file,
    originalBytes: file.size,
    finalBytes: file.size,
    compressed: false,
    reason,
  };
}

export async function compressVideo(
  file: File,
  { onProgress, signal }: CompressOptions = {},
): Promise<CompressionResult> {
  if (!canCompressVideo()) {
    return original(file, "This browser cannot compress video");
  }
  const mimeType = pickMimeType();
  if (!mimeType) return original(file, "This browser cannot compress video");

  onProgress?.({ phase: "reading", percent: 0 });

  let loaded: { video: HTMLVideoElement; revoke: () => void };
  try {
    loaded = await loadVideoElement(file);
  } catch {
    return original(file, "This file could not be read as video");
  }

  const { video, revoke } = loaded;
  const duration = video.duration;
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > MAX_SOURCE_DURATION_SECONDS ||
    width === 0 ||
    height === 0
  ) {
    revoke();
    return original(file, "This clip is too long to compress here");
  }

  const size = targetSize(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    revoke();
    return original(file, "This browser cannot compress video");
  }

  const stream = canvas.captureStream(TARGET_FRAME_RATE);
  const audioContext = attachSilentAudio(video, stream);

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: TARGET_VIDEO_BITRATE,
      audioBitsPerSecond: TARGET_AUDIO_BITRATE,
    });
  } catch {
    revoke();
    await audioContext?.close().catch(() => {});
    return original(file, "This browser cannot compress video");
  }

  const chunks: BlobPart[] = [];
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });

  // Some hardware H.264 encoders fail mid-recording rather than up front, so
  // surface that as a rejection instead of waiting for playback that never ends.
  let onEncoderError: (() => void) | null = null;
  const encoderFailed = new Promise<never>((_resolve, reject) => {
    onEncoderError = () => reject(new Error("The video encoder failed"));
    recorder.addEventListener("error", onEncoderError);
  });
  encoderFailed.catch(() => {});

  const recorderStopped = new Promise<void>((resolve) => {
    recorder.addEventListener("stop", () => resolve());
  });

  const stopEverything = () => {
    if (recorder.state !== "inactive") recorder.stop();
    video.pause();
    for (const track of stream.getTracks()) track.stop();
  };

  const onAbort = () => stopEverything();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    recorder.start(1000);

    // Prefer real audio, but a muted pass still beats a failed upload if the
    // browser refuses to play sound without a direct user gesture.
    try {
      await video.play();
    } catch {
      video.muted = true;
      await video.play();
    }

    onProgress?.({ phase: "compressing", percent: 0 });

    const playedThrough = new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      video.addEventListener("ended", finish, { once: true });
      video.addEventListener(
        "error",
        () => {
          if (settled) return;
          settled = true;
          reject(new Error("Playback failed while compressing"));
        },
        { once: true },
      );

      // Playback runs in real time; a stalled clip must not hang the form.
      const watchdog = setTimeout(
        () => {
          if (settled) return;
          settled = true;
          reject(new Error("Compression stalled"));
        },
        (duration + 60) * 1000 * 2,
      );

      const drawFrame = () => {
        if (settled || video.ended) {
          clearTimeout(watchdog);
          finish();
          return;
        }
        if (signal?.aborted) {
          settled = true;
          clearTimeout(watchdog);
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        onProgress?.({
          phase: "compressing",
          percent: Math.min(99, Math.round((video.currentTime / duration) * 100)),
        });
        schedule();
      };

      const withFrameCallback = video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
      };
      const schedule = () => {
        if (typeof withFrameCallback.requestVideoFrameCallback === "function") {
          withFrameCallback.requestVideoFrameCallback(drawFrame);
        } else {
          requestAnimationFrame(drawFrame);
        }
      };

      schedule();
    });

    await Promise.race([playedThrough, encoderFailed]);

    onProgress?.({ phase: "finishing", percent: 99 });
    stopEverything();
    await recorderStopped;

    const blob = new Blob(chunks, { type: mimeType });
    if (blob.size === 0) return original(file, "Compression produced no video");

    // Already-efficient clips can grow when re-encoded; keep the smaller file.
    if (blob.size >= file.size) {
      return original(file, "The original file was already smaller");
    }

    const compressedFile = new File(
      [blob],
      `${baseName(file.name)}-compressed.${extensionFor(mimeType)}`,
      { type: mimeType, lastModified: Date.now() },
    );

    onProgress?.({ phase: "finishing", percent: 100 });
    return {
      file: compressedFile,
      originalBytes: file.size,
      finalBytes: compressedFile.size,
      compressed: true,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return original(file, "This video could not be compressed");
  } finally {
    signal?.removeEventListener("abort", onAbort);
    if (onEncoderError) recorder.removeEventListener("error", onEncoderError);
    stopEverything();
    await audioContext?.close().catch(() => {});
    revoke();
  }
}
