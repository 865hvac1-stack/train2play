"use client";

import { useCallback, useRef, useState } from "react";

import {
  canCompressVideo,
  compressVideo,
  type CompressionProgress,
} from "@/lib/video-compression";
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
  fileName: string | null;
  finalBytes: number | null;
};

const idleState: CompressionState = {
  status: "idle",
  percent: 0,
  message: null,
  sizeError: null,
  fileName: null,
  finalBytes: null,
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
    async (file: File, input: HTMLInputElement | null) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      assignToInput(file, input);

      const shouldCompress =
        file.size > COMPRESS_ABOVE_BYTES && canCompressVideo();

      if (!shouldCompress) {
        const sizeError = videoFileSizeError(file);
        setState({
          status: sizeError ? "error" : "ready",
          percent: 100,
          message: sizeError ? null : `${formatBytes(file.size)} · ready`,
          sizeError,
          fileName: file.name,
          finalBytes: file.size,
        });
        return file;
      }

      setState({
        status: "working",
        percent: 0,
        message: `Compressing ${formatBytes(file.size)} video — 0%`,
        sizeError: null,
        fileName: file.name,
        finalBytes: null,
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

        assignToInput(result.file, input);
        const sizeError = videoFileSizeError(result.file);
        setState({
          status: sizeError ? "error" : "ready",
          percent: 100,
          message: sizeError
            ? null
            : result.compressed
              ? `Compressed ${formatBytes(result.originalBytes)} → ${formatBytes(result.finalBytes)} · ready to upload`
              : `${formatBytes(result.finalBytes)} · ready to upload`,
          sizeError,
          fileName: result.file.name,
          finalBytes: result.finalBytes,
        });
        return result.file;
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
          fileName: file.name,
          finalBytes: file.size,
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
