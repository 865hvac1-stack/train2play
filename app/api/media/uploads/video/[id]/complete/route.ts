import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { completeR2VideoUpload, privateVideoPath, R2_PART_BYTES } from "@/lib/r2-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1).max(10_000),
        etag: z.string().min(1).max(256),
      }),
    )
    .min(1)
    .max(10_000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid upload parts" }, { status: 400 });
  }

  const media = await prisma.mediaUpload.findFirst({
    where: {
      id,
      ownerUserId: session.user.id,
      expiresAt: { gt: new Date() },
    },
  });
  if (media?.status === "READY") {
    return Response.json({
      mediaId: media.id,
      videoUrl: privateVideoPath(media.id),
      storageKey: media.storageKey,
    });
  }
  if (!media?.multipartId) {
    return Response.json({ error: "Upload not found or expired" }, { status: 404 });
  }
  const expectedParts = Math.ceil(Number(media.sizeBytes) / R2_PART_BYTES);
  const partNumbers = parsed.data.parts
    .map((part) => part.partNumber)
    .sort((a, b) => a - b);
  if (
    parsed.data.parts.length !== expectedParts ||
    partNumbers.some((partNumber, index) => partNumber !== index + 1)
  ) {
    return Response.json({ error: "Some video chunks are missing" }, { status: 400 });
  }

  try {
    const object = await completeR2VideoUpload({
      storageKey: media.storageKey,
      multipartId: media.multipartId,
      parts: parsed.data.parts,
    });
    if (Number(object.ContentLength ?? -1) !== Number(media.sizeBytes)) {
      await prisma.mediaUpload.update({
        where: { id: media.id },
        data: { status: "FAILED" },
      });
      throw new Error("Completed object size does not match the selected file");
    }
    await prisma.mediaUpload.update({
      where: { id: media.id },
      data: {
        status: "READY",
        multipartId: null,
        completedAt: new Date(),
      },
    });
    return Response.json({
      mediaId: media.id,
      videoUrl: privateVideoPath(media.id),
      storageKey: media.storageKey,
    });
  } catch (error) {
    console.error("[train2play:r2-upload-complete]", {
      mediaId: media.id,
      userId: session.user.id,
      error,
    });
    return Response.json(
      { error: "Could not finish the video upload. Please retry." },
      { status: 502 },
    );
  }
}
