import { isProductionRuntime } from "@/lib/env";
import { isValidInstructionVideoUrl } from "@/lib/media-url";
import { isObjectStorageConfigured, storeVideoFile } from "@/lib/storage";
import { reportVideoUploadFailure } from "@/lib/video-upload-errors";
import { MAX_VIDEO_UPLOAD_BYTES } from "@/lib/video-upload-limits";
import {
  COMPRESSION_PENDING_MESSAGE,
  isCompressionPending,
} from "@/lib/video-upload-pending";

export async function resolveOptionalInstructionVideo(
  formData: FormData,
  context: { surface: string; userId: string },
): Promise<
  | { ok: true; url: string | null; storageKey: string | null }
  | { ok: false; error: string }
> {
  const mode = String(formData.get("instructionVideoMode") ?? "url").trim();
  const urlRaw = String(
    formData.get("instructionVideoUrl") ?? formData.get("videoUrl") ?? "",
  ).trim();
  const file = formData.get("instructionVideoFile") ?? formData.get("videoFile");

  if (mode === "upload") {
    if (isCompressionPending(formData)) {
      return { ok: false, error: COMPRESSION_PENDING_MESSAGE };
    }
    if (!(file instanceof File) || file.size === 0) {
      return { ok: true, url: null, storageKey: null };
    }
  } else if (mode === "url" || urlRaw) {
    if (!urlRaw) return { ok: true, url: null, storageKey: null };
    if (!isValidInstructionVideoUrl(urlRaw)) {
      return {
        ok: false,
        error: "Use a YouTube, Vimeo, or direct MP4/MOV link",
      };
    }
    return { ok: true, url: urlRaw, storageKey: null };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: true, url: null, storageKey: null };
  }

  const nameLower = file.name.toLowerCase();
  const looksLikeVideoExt = /\.(mp4|mov|webm|m4v|mpeg|mpg|avi)$/i.test(nameLower);
  const hasVideoMime =
    file.type.startsWith("video/") ||
    file.type === "application/octet-stream" ||
    file.type === "";

  if (!file.type.startsWith("video/") && !(hasVideoMime && looksLikeVideoExt)) {
    return { ok: false, error: "File must be a video (mp4, mov, webm)" };
  }
  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    return { ok: false, error: "Video must be 100 MB or smaller" };
  }
  if (isProductionRuntime() && !isObjectStorageConfigured()) {
    return {
      ok: false,
      error:
        "Phone uploads need object storage. Configure Cloudinary or S3, or paste a link instead.",
    };
  }

  try {
    const ext =
      file.name.split(".").pop()?.toLowerCase() ||
      (file.type === "video/quicktime" ? "mov" : "mp4");
    const filename = `${crypto.randomUUID()}.${ext}`;
    const contentType =
      file.type && file.type !== "application/octet-stream"
        ? file.type
        : ext === "mov"
          ? "video/quicktime"
          : ext === "webm"
            ? "video/webm"
            : "video/mp4";
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeVideoFile(buffer, filename, contentType);
    return { ok: true, url: stored.videoUrl, storageKey: stored.storageKey };
  } catch (error) {
    return {
      ok: false,
      error: reportVideoUploadFailure(error, { ...context, file }),
    };
  }
}
