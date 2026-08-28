import Link from "next/link";

import { AchievementBadges } from "@/components/achievement-badges";
import { PlayerOfTheWeekCard } from "@/components/player-of-the-week-card";
import {
  FeaturedVideoShowcase,
  HighlightVideos,
  PerformanceMetricCards,
  ProfileEmptyState,
  TrainingStatsGrid,
  type ProfilePerformanceCard,
} from "@/components/player-profile-view";
import { ShareProfileControls } from "@/components/share-profile-controls";
import { SocialLinkIcons } from "@/components/social-link-icons";
import { brand } from "@/lib/brand";
import type { SafePublicIdentity } from "@/lib/community/privacy";
import type { SocialLink } from "@/lib/community/social";
import type { ProfileVisibility } from "@/lib/generated/prisma/client";

export type ShareablePlayerProfileViewModel = {
  slug: string;
  identity: SafePublicIdentity;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  socials: SocialLink[];
  featuredVideo: { id: string; title: string; url: string } | null;
  showcase: { id: string; title: string; url: string }[];
  performance: ProfilePerformanceCard[];
  training: {
    workoutsCompleted: number;
    trainingDays: number;
    streak: number;
    currentProgram: string | null;
  };
  achievements: { id: string; key: string; title: string; description?: string | null }[];
  playerOfTheWeek: {
    id: string;
    description: string;
    highlight: string | null;
  } | null;
  visibility: ProfileVisibility;
  ownerPreview?: boolean;
};

function visibilityCopy(visibility: ProfileVisibility) {
  switch (visibility) {
    case "PRIVATE":
      return "This is a private preview. Visitors with this link cannot see your profile until you change Privacy.";
    case "AUTHENTICATED":
      return "Signed-in Train2Play users can see this profile. You are previewing the shareable version.";
    case "ORGANIZATION":
      return "Only your organization can see this profile. You are previewing the shareable version.";
    default:
      return "This is how your public Player Profile appears to someone with your link.";
  }
}

export function ShareablePlayerProfile({
  profile,
  shareUrl,
}: {
  profile: ShareablePlayerProfileViewModel;
  shareUrl: string;
}) {
  const meta = [
    profile.identity.sport,
    profile.identity.position,
    profile.identity.secondaryPosition,
    profile.identity.graduationYear
      ? `Class of ${profile.identity.graduationYear}`
      : profile.identity.ageGroup,
    profile.identity.location,
  ]
    .filter(Boolean)
    .join(" • ");

  const highlights = profile.showcase.filter(
    (video) => video.id !== profile.featuredVideo?.id,
  );

  const potw = profile.playerOfTheWeek
    ? {
        id: profile.playerOfTheWeek.id,
        identity: profile.identity,
        slug: profile.slug,
        description: profile.playerOfTheWeek.description,
        highlight: profile.playerOfTheWeek.highlight,
        videoUrl: profile.featuredVideo?.url ?? null,
        videoTitle: profile.featuredVideo?.title ?? null,
      }
    : null;

  return (
    <div className="space-y-6">
      {profile.ownerPreview ? (
        <div className="rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-brand">
          <p className="font-semibold">You’re viewing your shareable profile</p>
          <p className="mt-1 text-zinc-200">{visibilityCopy(profile.visibility)}</p>
          {profile.visibility === "PRIVATE" ? (
            <Link
              href="/athlete/profile/edit?section=privacy"
              className="mt-2 inline-flex min-h-10 items-center font-semibold underline-offset-2 hover:underline"
            >
              Change privacy
            </Link>
          ) : null}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
        <div
          className="h-32 bg-gradient-to-r from-brand/80 via-black to-zinc-900 sm:h-40"
          style={
            profile.coverImageUrl
              ? {
                  backgroundImage: `linear-gradient(to top, rgba(0,0,0,.8), rgba(0,0,0,.15)), url(${profile.coverImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end gap-4">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt=""
                className="size-20 rounded-2xl border-2 border-black object-cover"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-2xl border-2 border-black bg-brand font-heading text-2xl font-bold text-black">
                {profile.identity.displayName.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0 pb-1">
              <p className="text-[10px] font-bold tracking-[0.18em] text-brand uppercase">
                Train2Play Player Profile
              </p>
              <h1 className="font-heading text-3xl font-bold tracking-tight">
                {profile.identity.displayName}
              </h1>
              <p className="text-sm text-zinc-400">{meta || "Athlete"}</p>
              {profile.identity.organizationName ? (
                <p className="truncate text-sm text-zinc-300">{profile.identity.organizationName}</p>
              ) : null}
            </div>
          </div>
          {profile.bio ? (
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">{profile.bio}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {profile.socials.length > 0 ? <SocialLinkIcons links={profile.socials} /> : null}
            <ShareProfileControls
              url={shareUrl}
              title={`${profile.identity.displayName} | ${brand.name}`}
              text={`Player profile on ${brand.name}`}
            />
          </div>
        </div>
      </section>

      {potw ? <PlayerOfTheWeekCard potw={potw} /> : null}

      {profile.featuredVideo ? (
        <FeaturedVideoShowcase
          src={profile.featuredVideo.url}
          title={profile.featuredVideo.title}
        />
      ) : null}

      <section>
        <h2 className="font-heading text-xl font-bold">Performance</h2>
        <p className="mt-1 text-sm text-zinc-400">Current result, improvement, and verification.</p>
        <div className="mt-3">
          {profile.performance.length === 0 ? (
            <ProfileEmptyState
              title="No public performance metrics yet"
              body="When this athlete records and shares results, they will show here."
            />
          ) : (
            <PerformanceMetricCards cards={profile.performance} />
          )}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl font-bold">Training</h2>
        <div className="mt-3">
          <TrainingStatsGrid training={profile.training} />
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl font-bold">Achievements</h2>
        <div className="mt-3">
          <AchievementBadges
            achievements={profile.achievements}
            emptyMessage="No public achievements yet."
          />
        </div>
      </section>

      <HighlightVideos videos={highlights} />
    </div>
  );
}
