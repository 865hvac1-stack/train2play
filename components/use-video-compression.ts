"use client";

import { useCallback, useRef, useState } from "react";

import {
  canCompressVideo,
  compressVideo,
  type CompressionProgress,
} from "@/lib/video-compression";
import { uploadVideoDirectly } from "@/lib/direct-video-upload";
import {
  COMPRESS_ABOVE_BYTES,
  formatBytes,
  videoFileSizeError,
} from "@/lib/video-upload-limits";

export type CompressionState = {
  status: "idle" | "working" | "ready" | "error";
  percent: number;
  message: string | null;
  sizeError: string | null;
  uploadError: string | null;
  fileName: string | null;
  finalBytes: number | null;
  mediaId: string | null;
};

const idleState: CompressionState = {
  status: "idle",
  percent: 0,
  message: null,
  sizeError: null,
  uploadError: null,
  fileName: null,
  finalBytes: null,
  mediaId: null,
};

function assignToInput(file: File, input: HTMLInputElement | null) {
  if (!input) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
}

function progressLabel(progress: CompressionProgress, originalBytes: number) {
  if (progress.phase === "reading") return "Reading video…";
  if (progress.phase === "finishing") return "Finishing up…";
  return `Compressing ${formatBytes(originalBytes)} video — ${progress.percent}%`;
}

/**
 * Compresses a chosen clip and writes the result into the form's file input, so
 * the upload carries the smaller file. Never blocks on failure: the original
 * file stays selected and the server still enforces the size limit.
 */
export function useVideoCompression() {
  const [state, setState] = useState<CompressionState>(idleState);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(idleState);
  }, []);

  const prepare = useCallback(
    async (
      file: File,
      input: HTMLInputElement | null,
      options: { optimize?: boolean } = {},
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      assignToInput(file, input);

      const finish = async (
        prepared: File,
        compressionMessage: string | null,
      ) => {
        assignToInput(prepared, input);

        setState({
          status: "working",
          percent: 0,
          message: `${compressionMessage ? `${compressionMessage} · ` : ""}Starting secure upload…`,
          sizeError: null,
          uploadError: null,
          fileName: prepared.name,
          finalBytes: prepared.size,
          mediaId: null,
        });
        try {
          const direct = await uploadVideoDirectly(prepared, {
            signal: controller.signal,
            onProgress: (progress) =>
              setState((current) => ({
                ...current,
                percent: progress.percent,
                message: `${compressionMessage ? `${compressionMessage} · ` : ""}Uploading securely — ${progress.percent}%`,
              })),
          });
          if (direct) {
            // R2 already has the bytes; leave only the small media id in the form.
            if (input) input.files = new DataTransfer().files;
            setState({
              status: "ready",
              percent: 100,
              message: `${compressionMessage ? `${compressionMessage} · ` : ""}Uploaded securely · ready to save`,
              sizeError: null,
              uploadError: null,
              fileName: prepared.name,
              finalBytes: prepared.size,
              mediaId: direct.mediaId,
            });
            return prepared;
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return prepared;
          }
          setState({
            status: "error",
            percent: 0,
            message: null,
            sizeError: null,
            uploadError:
              error instanceof Error
                ? error.message
                : "The secure upload failed. Choose the file and try again.",
            fileName: prepared.name,
            finalBytes: prepared.size,
            mediaId: null,
          });
          return prepared;
        }

        // No R2 yet: preserve today's server/Cloudinary path and its 100 MB cap.
        const sizeError = videoFileSizeError(prepared);
        setState({
          status: sizeError ? "error" : "ready",
          percent: 100,
          message: sizeError
            ? null
            : compressionMessage
              ? `${compressionMessage} · ready to upload`
              : `${formatBytes(prepared.size)} · ready`,
          sizeError,
          uploadError: null,
          fileName: prepared.name,
          finalBytes: prepared.size,
          mediaId: null,
        });
        return prepared;
      };

      const shouldCompress =
        options.optimize !== false &&
        file.size > COMPRESS_ABOVE_BYTES &&
        canCompressVideo();

      if (!shouldCompress) {
        return finish(file, `${formatBytes(file.size)} · ready to upload`);
      }

      setState({
        status: "working",
        percent: 0,
        message: `Compressing ${formatBytes(file.size)} video — 0%`,
        sizeError: null,
        uploadError: null,
        fileName: file.name,
        finalBytes: null,
        mediaId: null,
      });

      try {
        const result = await compressVideo(file, {
          signal: controller.signal,
          onProgress: (progress) =>
            setState((current) =>
              current.status === "working"
                ? {
                    ...current,
                    percent: progress.percent,
                    message: progressLabel(progress, file.size),
                  }
                : current,
            ),
        });

        if (controller.signal.aborted) return file;

        return finish(
          result.file,
          result.compressed
            ? `Compressed ${formatBytes(result.originalBytes)} → ${formatBytes(result.finalBytes)}`
            : `${formatBytes(result.finalBytes)} · ready to upload`,
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return file;
        }
        const sizeError = videoFileSizeError(file);
        setState({
          status: sizeError ? "error" : "ready",
          percent: 100,
          message: sizeError ? null : `${formatBytes(file.size)} · ready`,
          sizeError,
          uploadError: null,
          fileName: file.name,
          finalBytes: file.size,
          mediaId: null,
        });
        return file;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [],
  );

  return { state, prepare, reset };
}
