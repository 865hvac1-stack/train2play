import { prisma } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/app-url";
import { collectSocialLinks, parseSocialInput } from "@/lib/community/social";
import { stateName } from "@/lib/community/age-groups";
import {
  allocateUniqueSlug,
  isReservedProfileSlug,
  isValidProfileSlug,
  slugifyProfileName,
} from "@/lib/community/slugs";
import {
  BACKGROUND_CHECK_STATUS,
  COACH_DISCOVERY_STATUS,
  isBackgroundCheckPublicBadge,
  isTrain2PlayApproved,
} from "@/lib/coaching/status";
import { isCoachAcceptingAthletes } from "@/lib/coaching/discovery";
import { isTrainer, isCoachPortalRole } from "@/lib/roles";

export async function ensureCoachProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, lookingForSport: true },
  });
  if (!user) throw new Error("Coach not found.");
  if (!isCoachPortalRole(user.role) || isTrainer(user.role)) {
    throw new Error("Only coaches can have a Coach Profile.");
  }

  const existing = await prisma.coachProfile.findUnique({
    where: { userId },
  });
  if (existing) return existing;

  const org = await prisma.organizationMembership.findFirst({
    where: { userId },
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return prisma.coachProfile.create({
    data: {
      userId,
      displayName: user.name,
      organizationName: org?.organization.name ?? null,
    },
  });
}

export async function ensureCoachPublicSlug(profile: {
  id: string;
  publicSlug: string | null;
  displayName: string | null;
  user?: { name: string };
}) {
  if (profile.publicSlug) return profile.publicSlug;
  const desired = slugifyProfileName(profile.displayName || profile.user?.name || "coach");
  const slug = await allocateUniqueSlug(desired || "coach", async (candidate) => {
    if (isReservedProfileSlug(candidate) || !isValidProfileSlug(candidate)) return true;
    const taken = await prisma.coachProfile.findUnique({
      where: { publicSlug: candidate },
      select: { id: true },
    });
    return Boolean(taken && taken.id !== profile.id);
  });
  await prisma.coachProfile.update({
    where: { id: profile.id },
    data: { publicSlug: slug, slugUpdatedAt: new Date() },
  });
  return slug;
}

export function parseWebsiteUrl(raw: string | null | undefined) {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { error: "Enter a valid website URL." };
    }
    return { url: url.toString() };
  } catch {
    return { error: "Enter a valid website URL." };
  }
}

export function coachProfileCompletion(profile: {
  avatarUrl: string | null;
  bio: string | null;
  locationLabel: string | null;
  locationState: string | null;
  featuredVideoId: string | null;
  instagramUrl: string | null;
  xUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  websiteUrl: string | null;
  sports: { specialties: string[] }[];
  discoveryStatus: string;
}) {
  const items = [
    {
      id: "photo",
      label: "Add profile photo",
      done: Boolean(profile.avatarUrl),
      href: "/dashboard/profile/edit?section=profile",
    },
    {
      id: "bio",
      label: "Add bio",
      done: Boolean(profile.bio?.trim()),
      href: "/dashboard/profile/edit?section=profile",
    },
    {
      id: "specialties",
      label: "Add specialties",
      done: profile.sports.some((row) => row.specialties.length > 0),
      href: "/dashboard/profile/edit?section=sports",
    },
    {
      id: "location",
      label: "Add location",
      done: Boolean(profile.locationLabel || profile.locationState),
      href: "/dashboard/profile/edit?section=location",
    },
    {
      id: "video",
      label: "Add coaching video",
      done: Boolean(profile.featuredVideoId),
      href: "/dashboard/profile/edit?section=videos",
    },
    {
      id: "social",
      label: "Add a social profile",
      done: Boolean(
        profile.instagramUrl ||
          profile.xUrl ||
          profile.tiktokUrl ||
          profile.youtubeUrl ||
          profile.websiteUrl,
      ),
      href: "/dashboard/profile/edit?section=social",
    },
    {
      id: "submit",
      label: "Complete approval application",
      done:
        profile.discoveryStatus === COACH_DISCOVERY_STATUS.SUBMITTED ||
        profile.discoveryStatus === COACH_DISCOVERY_STATUS.UNDER_REVIEW ||
        profile.discoveryStatus === COACH_DISCOVERY_STATUS.APPROVED,
      href: "/dashboard/profile/edit?section=verification",
    },
  ];
  const done = items.filter((item) => item.done).length;
  return {
    percent: Math.round((done / items.length) * 100),
    items,
    missing: items.filter((item) => !item.done),
    canSubmit:
      Boolean(profile.bio?.trim()) &&
      profile.sports.length > 0 &&
      profile.sports.some((row) => row.specialties.length > 0) &&
      Boolean(profile.avatarUrl) &&
      Boolean(profile.locationLabel || profile.locationState) &&
      profile.discoveryStatus !== COACH_DISCOVERY_STATUS.APPROVED &&
      profile.discoveryStatus !== COACH_DISCOVERY_STATUS.SUBMITTED &&
      profile.discoveryStatus !== COACH_DISCOVERY_STATUS.UNDER_REVIEW &&
      profile.discoveryStatus !== COACH_DISCOVERY_STATUS.SUSPENDED,
  };
}

const profileInclude = {
  sports: { orderBy: [{ isPrimary: "desc" as const }, { sport: "asc" as const }] },
  videos: {
    orderBy: { sortOrder: "asc" as const },
    include: { trainingVideo: { select: { id: true, videoUrl: true, title: true } } },
  },
  featuredVideo: { select: { id: true, videoUrl: true, title: true } },
  user: {
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
      lookingForSport: true,
    },
  },
} as const;

export async function getCoachProfileByUserId(userId: string) {
  await ensureCoachProfile(userId);
  return prisma.coachProfile.findUniqueOrThrow({
    where: { userId },
    include: profileInclude,
  });
}

export async function getPublicCoachProfile(slug: string) {
  const profile = await prisma.coachProfile.findUnique({
    where: { publicSlug: slug },
    include: profileInclude,
  });
  if (!profile) return { status: "not_found" as const };
  if (profile.discoveryStatus !== COACH_DISCOVERY_STATUS.APPROVED) {
    return { status: "not_found" as const };
  }
  if (!profile.user.isActive) return { status: "not_found" as const };

  const accepting = await isCoachAcceptingAthletes(profile);
  const socials = collectSocialLinks(profile).filter((link) => link.public);
  const website =
    profile.websitePublic && profile.websiteUrl
      ? { label: "Website", url: profile.websiteUrl }
      : null;
  const primary = profile.sports.find((row) => row.isPrimary) ?? profile.sports[0];
  const specialties = [...new Set(profile.sports.flatMap((row) => row.specialties))];
  const positions = [...new Set(profile.sports.flatMap((row) => row.positions))];
  const ageGroups = [...new Set(profile.sports.flatMap((row) => row.ageGroups))];
  const publicVideos = profile.videos
    .filter((row) => row.publicEligible)
    .map((row) => ({
      id: row.id,
      title: row.title || row.trainingVideo.title,
      url: row.trainingVideo.videoUrl,
      kind: row.kind,
    }));
  const featured =
    profile.featuredVideo && profile.featuredVideoPublic
      ? {
          id: profile.featuredVideo.id,
          title: profile.featuredVideo.title,
          url: profile.featuredVideo.videoUrl,
        }
      : null;

  return {
    status: "ok" as const,
    profile: {
      id: profile.id,
      userId: profile.userId,
      slug: profile.publicSlug!,
      displayName: profile.displayName?.trim() || profile.user.name,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      coverImageUrl: profile.coverImageUrl,
      organizationName: profile.organizationName,
      locationLabel:
        profile.locationLabel ||
        [profile.locationCity, stateName(profile.locationState)].filter(Boolean).join(", ") ||
        profile.serviceArea,
      yearsCoaching: profile.yearsCoaching,
      experienceText: profile.experienceText,
      certifications: profile.certifications,
      inPerson: profile.inPersonCoaching,
      remote: profile.remoteCoaching,
      accepting,
      sport: primary?.sport ?? null,
      specialties,
      positions,
      ageGroups,
      sports: profile.sports,
      socials,
      website,
      featuredVideo: featured,
      videos: publicVideos.filter((video) => video.url !== featured?.url),
      approved: isTrain2PlayApproved(profile.discoveryStatus),
      backgroundCheckCompleted: isBackgroundCheckPublicBadge({
        status: profile.backgroundCheckStatus,
        expiresAt: profile.backgroundCheckExpiresAt,
      }),
      shareUrl: `${getAppBaseUrl()}/coach/${profile.publicSlug}`,
    },
  };
}

export function applyCoachSocialsFromForm(formData: FormData) {
  const networks = ["instagram", "x", "tiktok", "youtube"] as const;
  const result: Record<string, string | boolean | null> = {};
  for (const network of networks) {
    const parsed = parseSocialInput(network, String(formData.get(`${network}Url`) ?? ""));
    if (parsed && "error" in parsed) {
      return { error: parsed.error };
    }
    result[`${network}Handle`] = parsed?.handle ?? null;
    result[`${network}Url`] = parsed?.url ?? null;
    result[`${network}Public`] = formData.get(`${network}Public`) === "on";
  }
  const website = parseWebsiteUrl(String(formData.get("websiteUrl") ?? ""));
  if (website && "error" in website) return { error: website.error };
  result.websiteUrl = website?.url ?? null;
  result.websitePublic = formData.get("websitePublic") === "on";
  return { data: result };
}

export { BACKGROUND_CHECK_STATUS };
