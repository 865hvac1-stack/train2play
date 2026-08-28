import Link from "next/link";

import { PlayerProfileCustomizeForm } from "@/components/player-profile-customize-form";
import { ProfileVideoWorkspace } from "@/components/profile-video-workspace";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { ensurePublicSlug } from "@/lib/community/profile";
import {
  mapProfileMetricOptions,
  mapProfileVideos,
} from "@/lib/community/profile-video-map";
import { isProfileEditSection } from "@/lib/community/profile-edit-sections";
import { isMinor } from "@/lib/consent";
import { prisma } from "@/lib/db";

export default async function EditPlayerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const ctx = await requireAthleteContext();
  const { section } = await searchParams;
  const initialSection = isProfileEditSection(section) ? section : "profile";

  const profile = await prisma.athleteProfile.findUnique({
    where: { id: ctx.profileId },
    include: {
      sports: { orderBy: [{ isPrimary: "desc" }, { sport: "asc" }] },
      showcaseVideos: { select: { videoReviewId: true } },
      metricEntries: {
        include: { metricDefinition: true },
        orderBy: { recordedAt: "asc" },
        take: 200,
      },
    },
  });
  if (!profile) return null;

  const slug = await ensurePublicSlug(profile);
  const reviews = await prisma.videoReview.findMany({
    where: {
      athleteProfileId: profile.id,
      status: { not: "ARCHIVED" },
    },
    include: {
      trainingVideo: { select: { videoUrl: true } },
      metricEntry: { include: { metricDefinition: true } },
      contentSubmissions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 40,
  });
  const mappedVideos = mapProfileVideos({
    reviews,
    featuredId: profile.featuredVideoReviewId,
    highlightIds: profile.showcaseVideos.map((row) => row.videoReviewId),
    metricHistory: profile.metricEntries,
  });
  const videos = reviews.map((row) => ({ id: row.id, title: row.title }));
  const metricOptions = [
    ...new Map(
      profile.metricEntries.map((entry) => [
        entry.metricDefinitionId,
        {
          id: entry.metricDefinitionId,
          name: entry.metricDefinition.name,
          unit: entry.metricDefinition.unit,
        },
      ]),
    ).values(),
  ];
  const primary = profile.sports.find((row) => row.isPrimary) ?? profile.sports[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-brand uppercase">
            Build my sports identity
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Edit profile</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-400">
            Update identity, athletic info, socials, videos, privacy, and recruiting readiness.
            Unsaved fields stay in place when you switch sections.
          </p>
        </div>
        <Link
          href="/athlete/profile"
          className="inline-flex min-h-11 items-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-white"
        >
          Back to profile
        </Link>
      </div>

      <PlayerProfileCustomizeForm
        profile={{ ...profile, publicSlug: slug }}
        videos={videos}
        metrics={metricOptions}
        sports={ctx.sports}
        primarySport={ctx.sport}
        position={primary?.position ?? ctx.position}
        secondaryPosition={primary?.secondaryPosition ?? null}
        showcaseIds={profile.showcaseVideos.map((row) => row.videoReviewId)}
        initialSection={initialSection}
        videoWorkspace={
          <ProfileVideoWorkspace
            videos={mappedVideos}
            featured={mappedVideos.find((video) => video.featured) ?? null}
            metrics={mapProfileMetricOptions(profile.metricEntries)}
            defaultSport={ctx.sport}
            sports={ctx.sports}
            isMinor={profile.dateOfBirth ? isMinor(profile.dateOfBirth) : true}
          />
        }
      />
    </div>
  );
}
