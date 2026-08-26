import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPrivateAudioResponse } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const review = await prisma.videoReview.findUnique({
    where: { id },
    select: {
      status: true,
      coachUserId: true,
      athleteProfile: { select: { userId: true } },
      voiceReview: {
        select: {
          audioStorageKey: true,
          storageProvider: true,
          audioMimeType: true,
          status: true,
        },
      },
    },
  });

  if (
    !review ||
    (review.coachUserId !== session.user.id &&
      review.athleteProfile.userId !== session.user.id)
  ) {
    return new Response("Not found", { status: 404 });
  }
  const isAthlete = review.athleteProfile.userId === session.user.id;
  if (isAthlete && review.status !== "REVIEWED") {
    return new Response("Not found", { status: 404 });
  }
  if (!review.voiceReview || review.voiceReview.status !== "READY") {
    return new Response("Voice review not found", { status: 404 });
  }

  try {
    return await getPrivateAudioResponse({
      provider: review.voiceReview.storageProvider,
      storageKey: review.voiceReview.audioStorageKey,
      contentType: review.voiceReview.audioMimeType,
      range: request.headers.get("range"),
    });
  } catch {
    return new Response("Voice review unavailable", { status: 502 });
  }
}
