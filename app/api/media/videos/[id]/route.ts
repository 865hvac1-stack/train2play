import { auth } from "@/auth";
import { canViewAthlete } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getPrivateVideoPlaybackUrl, privateVideoPath } from "@/lib/r2-video";
import { isCoachPortalRole, isLibraryEditor } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function validFamilyShare(url: string, token: string | null) {
  if (!token) return false;
  const link = await prisma.parentShareLink.findFirst({
    where: {
      token,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      athlete: {
        trainingPlans: {
          some: { workouts: { some: { instructionVideoUrl: url } } },
        },
      },
    },
    select: { id: true },
  });
  return Boolean(link);
}

async function authenticatedAccess(url: string, userId: string) {
  const [user, trainingVideo, workouts, courseItems, drill] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        athleteProfile: {
          select: {
            id: true,
            primarySport: true,
            sports: { select: { sport: true } },
          },
        },
      },
    }),
    prisma.trainingVideo.findFirst({
      where: { videoUrl: url },
      select: {
        coachId: true,
        athleteId: true,
        videoReviews: {
          select: {
            coachUserId: true,
            athleteProfile: { select: { userId: true } },
          },
        },
      },
    }),
    prisma.workout.findMany({
      where: { instructionVideoUrl: url },
      select: {
        trainingPlan: { select: { coachId: true, athleteId: true } },
      },
    }),
    prisma.courseItem.findMany({
      where: { videoUrl: url },
      select: {
        course: {
          select: {
            coachId: true,
            origin: true,
            published: true,
            shareWithCoaches: true,
            shareWithAthletes: true,
            sport: true,
          },
        },
      },
    }),
    prisma.catalogDrill.findFirst({
      where: { videoUrl: url, isActive: true },
      select: {
        sport: true,
        shareWithCoaches: true,
        shareWithAthletes: true,
        athleteAudience: true,
        athleteRecipients: {
          where: { athleteProfile: { userId } },
          select: { id: true },
          take: 1,
        },
        pushes: {
          where: { athleteProfile: { userId } },
          select: { id: true },
          take: 1,
        },
      },
    }),
  ]);
  if (!user) return false;
  if (user.role === "PLATFORM_ADMIN") return true;

  if (trainingVideo) {
    if (trainingVideo.coachId === userId) return true;
    if (
      trainingVideo.videoReviews.some(
        (review) =>
          review.coachUserId === userId ||
          review.athleteProfile.userId === userId,
      )
    ) {
      return true;
    }
    if (
      trainingVideo.athleteId &&
      (await canViewAthlete(prisma, userId, trainingVideo.athleteId))
    ) {
      return true;
    }
  }

  for (const workout of workouts) {
    if (workout.trainingPlan.coachId === userId) return true;
    if (workout.trainingPlan.athleteId) {
      if (await canViewAthlete(prisma, userId, workout.trainingPlan.athleteId)) {
        return true;
      }
    }
  }

  const athleteSports = new Set(
    [
      user.athleteProfile?.primarySport,
      ...(user.athleteProfile?.sports.map((row) => row.sport) ?? []),
    ].filter(Boolean),
  );

  for (const courseItem of courseItems) {
    const course = courseItem.course;
    if (course.coachId === userId) return true;
    if (
      course.origin === "PLATFORM" &&
      course.published &&
      isLibraryEditor(user.role)
    ) {
      return true;
    }
    if (
      course.origin === "PLATFORM" &&
      course.published &&
      course.shareWithCoaches &&
      isCoachPortalRole(user.role)
    ) {
      return true;
    }
    if (
      course.origin === "PLATFORM" &&
      course.published &&
      course.shareWithAthletes &&
      athleteSports.has(course.sport)
    ) {
      return true;
    }
  }

  if (drill) {
    if (isLibraryEditor(user.role)) return true;
    if (drill.shareWithCoaches && isCoachPortalRole(user.role)) return true;
    if (!drill.shareWithAthletes || !user.athleteProfile) return false;
    if (drill.pushes.length > 0 || drill.athleteRecipients.length > 0) return true;
    if (drill.athleteAudience === "ALL_SPORT" && athleteSports.has(drill.sport)) {
      return true;
    }
  }

  return false;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const media = await prisma.mediaUpload.findFirst({
    where: { id, status: "READY", provider: "s3" },
    select: {
      id: true,
      ownerUserId: true,
      storageKey: true,
      contentType: true,
    },
  });
  if (!media) return new Response("Not found", { status: 404 });
  const url = privateVideoPath(media.id);
  const requestUrl = new URL(request.url);
  const session = await auth();
  const allowed =
    (session?.user?.id &&
      (session.user.id === media.ownerUserId ||
        (await authenticatedAccess(url, session.user.id)))) ||
    (await validFamilyShare(url, requestUrl.searchParams.get("shareToken")));
  if (!allowed) return new Response("Not found", { status: 404 });

  try {
    const signed = await getPrivateVideoPlaybackUrl({
      storageKey: media.storageKey,
      contentType: media.contentType,
    });
    return new Response(null, {
      status: 307,
      headers: {
        Location: signed,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    console.error("[train2play:r2-playback]", { mediaId: media.id, error });
    return new Response("Video unavailable", { status: 502 });
  }
}
