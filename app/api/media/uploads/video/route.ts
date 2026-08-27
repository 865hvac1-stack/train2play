import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  beginR2VideoUpload,
  MAX_DIRECT_VIDEO_BYTES,
  R2_PART_BYTES,
  signR2UploadParts,
} from "@/lib/r2-video";
import {
  abortR2VideoUpload,
} from "@/lib/r2-video";
import { isDirectVideoUploadConfigured } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inputSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^video\//),
  sizeBytes: z.number().int().positive().max(MAX_DIRECT_VIDEO_BYTES),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ enabled: false }, { status: 401 });
  return Response.json({
    enabled: isDirectVideoUploadConfigured(),
    partBytes: R2_PART_BYTES,
    maxBytes: MAX_DIRECT_VIDEO_BYTES,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDirectVideoUploadConfigured()) {
    return Response.json({ enabled: false }, { status: 409 });
  }
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid video" },
      { status: 400 },
    );
  }

  let started: Awaited<ReturnType<typeof beginR2VideoUpload>> | null = null;
  try {
    started = await beginR2VideoUpload({
      ownerUserId: session.user.id,
      ...parsed.data,
    });
    const media = await prisma.mediaUpload.create({
      data: {
        ownerUserId: session.user.id,
        provider: "s3",
        storageKey: started.storageKey,
        multipartId: started.multipartId,
        originalName: parsed.data.filename,
        contentType: parsed.data.contentType,
        sizeBytes: BigInt(parsed.data.sizeBytes),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      select: { id: true },
    });
    const parts = await signR2UploadParts({
      ...started,
      sizeBytes: parsed.data.sizeBytes,
    });
    return Response.json({
      enabled: true,
      mediaId: media.id,
      partBytes: R2_PART_BYTES,
      parts,
    });
  } catch (error) {
    if (started) {
      await abortR2VideoUpload(started).catch(() => {});
    }
    console.error("[train2play:r2-upload-start]", {
      userId: session.user.id,
      sizeBytes: parsed.data.sizeBytes,
      error,
    });
    return Response.json(
      { error: "Could not start the video upload. Please try again." },
      { status: 502 },
    );
  }
}
