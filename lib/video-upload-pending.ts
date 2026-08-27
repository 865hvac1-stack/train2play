export const COMPRESSION_PENDING_FIELD = "videoCompressionPending";

export const COMPRESSION_PENDING_MESSAGE =
  "This video is still compressing on your device. Wait for it to finish, then save again.";

/** True while the browser is still shrinking the clip the form would send. */
export function isCompressionPending(formData: FormData) {
  return formData.get(COMPRESSION_PENDING_FIELD) === "1";
}
