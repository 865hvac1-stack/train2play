import { randomBytes } from "node:crypto";

import { getVideoStorageProvider } from "@/lib/storage";
import { MAX_VIDEO_UPLOAD_LABEL } from "@/lib/video-upload-limits";

type UploadFailureContext = {
  surface: string;
  userId: string;
  file?: File | null;
};

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    const candidate = error as Error & {
      http_code?: number;
      status?: number;
      code?: string | number;
    };
    return {
      name: error.name,
      message: error.message,
      code: candidate.code,
      status: candidate.http_code ?? candidate.status,
      stack: error.stack,
    };
  }
  return { value: String(error) };
}

function publicMessage(error: unknown, incidentId: string) {
  const details = errorDetails(error);
  const message =
    "message" in details && typeof details.message === "string"
      ? details.message.toLowerCase()
      : "";
  const status = "status" in details ? details.status : undefined;

  if (
    status === 413 ||
    message.includes("file size too large") ||
    message.includes("too large")
  ) {
    return `This video is too large for the current storage plan. Keep it under ${MAX_VIDEO_UPLOAD_LABEL} and try again. Reference: ${incidentId}`;
  }
  if (
    status === 401 ||
    status === 403 ||
    message.includes("invalid signature") ||
    message.includes("unknown api key")
  ) {
    return `Video storage needs administrator attention. Please try again later. Reference: ${incidentId}`;
  }
  if (
    status === 429 ||
    message.includes("quota") ||
    message.includes("usage limit") ||
    message.includes("rate limit")
  ) {
    return `The video storage limit has been reached. Please try again later. Reference: ${incidentId}`;
  }
  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("network") ||
    message.includes("fetch failed")
  ) {
    return `The upload was interrupted. Keep this screen open, use Wi-Fi if available, and try again. Reference: ${incidentId}`;
  }
  return `We couldn't upload this video. Please try again. Reference: ${incidentId}`;
}

/**
 * Gives the user a searchable reference while preserving the provider's full
 * error in Railway logs. Never include the file contents or storage secrets.
 */
export function reportVideoUploadFailure(
  error: unknown,
  context: UploadFailureContext,
) {
  const incidentId = `VID-${randomBytes(4).toString("hex").toUpperCase()}`;
  console.error("[train2play:video-upload]", {
    incidentId,
    surface: context.surface,
    userId: context.userId,
    provider: getVideoStorageProvider(),
    file: context.file
      ? {
          name: context.file.name,
          size: context.file.size,
          type: context.file.type,
        }
      : null,
    error: errorDetails(error),
  });
  return publicMessage(error, incidentId);
}
