import { prisma } from "@/lib/db";
import { privateVideoPath } from "@/lib/r2-video";

export type ResolvedVideoMedia = {
  url: string;
  storageKey: string;
};

/**
 * Resolves a completed direct upload without trusting URL/key fields from the
 * browser. Only the user who initiated the R2 upload can attach it to a record.
 */
export async function resolveDirectVideoMedia(
  formData: FormData,
  userId: string,
): Promise<
  | { ok: true; media: ResolvedVideoMedia | null }
  | { ok: false; error: string }
> {
  const mediaId = String(formData.get("directVideoMediaId") ?? "").trim();
  if (!mediaId) return { ok: true, media: null };
  const media = await prisma.mediaUpload.findFirst({
    where: {
      id: mediaId,
      ownerUserId: userId,
      provider: "s3",
      status: "READY",
    },
    select: { id: true, storageKey: true },
  });
  if (!media) {
    return {
      ok: false,
      error: "The secure video upload is missing or incomplete. Choose the file and try again.",
    };
  }
  return {
    ok: true,
    media: {
      url: privateVideoPath(media.id),
      storageKey: media.storageKey,
    },
  };
}
