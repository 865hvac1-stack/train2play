export const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_VIDEO_UPLOAD_LABEL = "100 MB";

export function videoFileSizeError(file: File) {
  return file.size > MAX_VIDEO_UPLOAD_BYTES
    ? `Video must be ${MAX_VIDEO_UPLOAD_LABEL} or smaller`
    : null;
}
