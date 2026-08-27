export const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_VIDEO_UPLOAD_LABEL = "100 MB";

/** Phone film runs ~10 Mbps, so anything above this is worth compressing. */
export const COMPRESS_ABOVE_BYTES = 8 * 1024 * 1024;

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function videoFileSizeError(file: File) {
  return file.size > MAX_VIDEO_UPLOAD_BYTES
    ? `This clip is still ${formatBytes(file.size)} after compressing, over the ${MAX_VIDEO_UPLOAD_LABEL} limit. Record a shorter clip, or set your phone camera to 1080p instead of 4K.`
    : null;
}
