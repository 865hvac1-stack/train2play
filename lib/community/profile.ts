import { prisma } from "@/lib/db";
import { ageFromDateOfBirth } from "@/lib/drills";
import { isMinor } from "@/lib/consent";
import { ageGroupFromAge } from "@/lib/community/age-groups";
import {
  allocateUniqueSlug,
  isReservedProfileSlug,
  isValidProfileSlug,
  suggestedProfileSlug,
} from "@/lib/community/slugs";
import { collectSocialLinks, publicSocialLinks } from "@/lib/community/privacy";
import { buildSafeIdentity, profileVisibleToViewer, type ProfileViewer } from "@/lib/community/privacy";

export async function ensurePublicSlug(profile: {
  id: string;
  publicSlug: string | null;
  firstName: string;
  lastName: string;
}) {
  if (profile.publicSlug) return profile.publicSlug;
  const slug = await allocateUniqueSlug(
    suggestedProfileSlug(profile.firstName, profile.lastName),
    async (candidate) => {
      if (isReservedProfileSlug(candidate) || !isValidProfileSlug(candidate)) return true;
      const existing = await prisma.athleteProfile.findUnique({
        where: { publicSlug: candidate },
        select: { id: true },
      });
      return Boolean(existing && existing.id !== profile.id);
    },
  );
  await prisma.athleteProfile.update({
    where: { id: profile.id },
    data: { publicSlug: slug, slugUpdatedAt: new Date() },
  });
  return slug;
}

export function profileCompletion(profile: {
  avatarUrl: string | null;
  coverImageUrl: string | null;
  bio: string | null;
  featuredVideoReviewId: string | null;
  instagramUrl: string | null;
  xUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  sports: { position: string | null }[];
  metricCount: number;
}) {
  const items = [
    { id: "photo", label: "Add profile photo", done: Boolean(profile.avatarUrl) },
    { id: "position", label: "Add position", done: profile.sports.some((row) => row.position) },
    { id: "video", label: "Add featured video", done: Boolean(profile.featuredVideoReviewId) },
    {
      id: "social",
      label: "Add a social profile",
      done: Boolean(
        profile.instagramUrl || profile.xUrl || profile.tiktokUrl || profile.youtubeUrl,
      ),
    },
    { id: "metric", label: "Record first performance metric", done: profile.metricCount > 0 },
    { id: "bio", label: "Write a short bio", done: Boolean(profile.bio?.trim()) },
    { id: "cover", label: "Add a cover image", done: Boolean(profile.coverImageUrl) },
  ];
  const done = items.filter((item) => item.done).length;
  const percent = Math.round((done / items.length) * 100);
  return { percent, items, missing: items.filter((item) => !item.done) };
}

const publicProfileInclude = {
  sports: { orderBy: [{ isPrimary: "desc" as const }, { sport: "asc" as const }] },
  memberships: {
    where: { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
    include: {
      organization: { select: { name: true } },
      team: { select: { name: true } },
    },
    take: 2,
  },
  featuredVideoReview: {
    include: { trainingVideo: { select: { id: true, videoUrl: true, title: true } } },
  },
  showcaseVideos: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      videoReview: {
        include: { trainingVideo: { select: { id: true, videoUrl: true, title: true } } },
      },
    },
  },
  achievements: { orderBy: { earnedAt: "desc" as const }, take: 12 },
  playerOfTheWeekWins: {
    where: { published: true },
    orderBy: { startDate: "desc" as const },
    take: 6,
  },
};

export async function getShareablePlayerProfile(
  slug: string,
  viewer: ProfileViewer,
) {
  const profile = await prisma.athleteProfile.findUnique({
    where: { publicSlug: slug },
    include: publicProfileInclude,
  });
  if (!profile) return { status: "not_found" as const };

  const orgIds = profile.memberships.map((row) => row.organizationId).filter(Boolean);
  if (!profileVisibleToViewer(profile.profileVisibility, viewer, orgIds)) {
    if (profile.profileVisibility === "AUTHENTICATED" && viewer.kind === "public") {
      return { status: "login_required" as const };
    }
    return { status: "not_found" as const };
  }

  const identity = buildSafeIdentity(profile);
  const socials = publicSocialLinks({
    links: collectSocialLinks(profile),
    dateOfBirth: profile.dateOfBirth,
    profileVisibility: profile.profileVisibility,
  });

  const canShowVideo =
    profile.publicVideoSharingEnabled &&
    Boolean(profile.featuredVideoReview) &&
    (profile.dateOfBirth ? !isMinor(profile.dateOfBirth) || profile.publicVideoSharingEnabled : false);

  const featuredMetricIds = profile.featuredMetricIds;
  const metricWhere = {
    athleteProfileId: profile.id,
    resultStatus: "ACTIVE" as const,
    metricDefinition: { isSensitive: false },
    ...(featuredMetricIds.length > 0
      ? { metricDefinitionId: { in: featuredMetricIds } }
      : {}),
  };

  const metricEntries = await prisma.metricEntry.findMany({
    where: metricWhere,
    include: { metricDefinition: true },
    orderBy: { recordedAt: "asc" },
    take: 200,
  });

  const byMetric = new Map<string, typeof metricEntries>();
  for (const entry of metricEntries) {
    const list = byMetric.get(entry.metricDefinitionId) ?? [];
    list.push(entry);
    byMetric.set(entry.metricDefinitionId, list);
  }

  const performance = [...byMetric.values()].slice(0, 6).map((list) => {
    const latest = list[list.length - 1]!;
    const first = list[0]!;
    const history = list.map((row) => row.value);
    const improved =
      latest.metricDefinition.direction === "LOWER_IS_BETTER"
        ? first.value - latest.value
        : latest.value - first.value;
    return {
      id: latest.metricDefinitionId,
      name: latest.metricDefinition.name,
      unit: latest.metricDefinition.unit,
      value: latest.value,
      delta: list.length > 1 ? improved : null,
      history,
      verificationType: latest.verificationType,
      verified: latest.verificationType === "COACH" || latest.verificationType === "TRAIN2PLAY",
    };
  });

  const showcase = canShowVideo
    ? profile.showcaseVideos.map((row) => ({
        id: row.videoReviewId,
        title: row.videoReview.title,
        url: row.videoReview.trainingVideo.videoUrl,
      }))
    : [];

  const featuredVideo =
    canShowVideo && profile.featuredVideoReview
      ? {
          id: profile.featuredVideoReview.id,
          title: profile.featuredVideoReview.title,
          url: profile.featuredVideoReview.trainingVideo.videoUrl,
        }
      : null;

  return {
    status: "ok" as const,
    profile: {
      id: profile.id,
      slug: profile.publicSlug!,
      identity,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      coverImageUrl: profile.coverImageUrl,
      socials,
      featuredVideo,
      showcase,
      performance,
      achievements: profile.achievements,
      playerOfTheWeek: profile.playerOfTheWeekWins[0] ?? null,
      visibility: profile.profileVisibility,
      age: profile.dateOfBirth ? ageFromDateOfBirth(profile.dateOfBirth) : null,
      ageGroup: ageGroupFromAge(ageFromDateOfBirth(profile.dateOfBirth)),
    },
  };
}

export async function getAthleteTrainingStats(athleteProfileId: string, legacyAthleteId: string | null) {
  if (!legacyAthleteId) {
    return {
      workoutsCompleted: 0,
      programsCompleted: 0,
      currentProgram: null as string | null,
      streak: 0,
      trainingDays: 0,
      courseCompletion: 0,
    };
  }

  const [sessions, plans, courseProgress, courseTotal] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { athleteId: legacyAthleteId, status: "COMPLETED" },
      select: { completedAt: true },
    }),
    prisma.trainingPlan.findMany({
      where: { athleteId: legacyAthleteId },
      include: { workouts: { select: { completed: true } } },
    }),
    prisma.courseItemProgress.count({
      where: { athleteProfileId, completedAt: { not: null } },
    }),
    prisma.courseItemProgress.count({ where: { athleteProfileId } }),
  ]);

  const dates = sessions
    .map((session) => session.completedAt)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime());

  const daySet = new Set(
    dates.map((date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }),
  );

  let streak = 0;
  if (daySet.size > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let cursor =
      daySet.has(today.getTime())
        ? today.getTime()
        : daySet.has(yesterday.getTime())
          ? yesterday.getTime()
          : null;
    while (cursor && daySet.has(cursor)) {
      streak += 1;
      const prev = new Date(cursor);
      prev.setDate(prev.getDate() - 1);
      cursor = prev.getTime();
    }
  }

  const current = plans.find((plan) => plan.status === "ACTIVE") ?? null;
  const programsCompleted = plans.filter(
    (plan) => plan.workouts.length > 0 && plan.workouts.every((workout) => workout.completed),
  ).length;

  return {
    workoutsCompleted: dates.length,
    programsCompleted,
    currentProgram: current?.title ?? null,
    streak,
    trainingDays: daySet.size,
    courseCompletion:
      courseTotal > 0 ? Math.round((courseProgress / courseTotal) * 100) : 0,
  };
}
