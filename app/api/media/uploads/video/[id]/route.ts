import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { abortR2VideoUpload } from "@/lib/r2-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const media = await prisma.mediaUpload.findFirst({
    where: { id, ownerUserId: session.user.id, status: "PENDING" },
  });
  if (!media) return new Response(null, { status: 204 });

  if (media.multipartId) {
    await abortR2VideoUpload({
      storageKey: media.storageKey,
      multipartId: media.multipartId,
    }).catch((error) => {
      console.error("[train2play:r2-upload-abort]", {
        mediaId: media.id,
        userId: session.user.id,
        error,
      });
    });
  }
  await prisma.mediaUpload.update({
    where: { id: media.id },
    data: { status: "ABORTED", multipartId: null },
  });
  return new Response(null, { status: 204 });
}
