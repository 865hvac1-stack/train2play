import Link from "next/link";
import { Pencil, Eye } from "lucide-react";

import { AchievementBadges } from "@/components/achievement-badges";
import {
  PerformanceMetricCards,
  ProfileEmptyState,
  TrainingStatsGrid,
} from "@/components/player-profile-view";
import { ShareProfileControls } from "@/components/share-profile-controls";
import { AlertPreferences } from "@/components/alert-preferences";
import { InstallTrain2Play } from "@/components/install-train2play";
import { SignOutButton } from "@/components/sign-out-button";
import { SocialLinkIcons } from "@/components/social-link-icons";
import { ProfileVideoWorkspace } from "@/components/profile-video-workspace";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { getAppBaseUrl } from "@/lib/app-url";
import { brand } from "@/lib/brand";
import { CONNECTION_STATUS } from "@/lib/coach-connections";
import { collectSocialLinks } from "@/lib/community/social";
import { buildSafeIdentity } from "@/lib/community/privacy";
import { isMinor } from "@/lib/consent";
import {
  ensurePublicSlug,
  getAthleteTrainingStats,
  profileCompletion,
} from "@/lib/community/profile";
import {
  mapProfileMetricOptions,
  mapProfileVideos,
} from "@/lib/community/profile-video-map";
import { getAthleteRank, listLeaderboardMetrics } from "@/lib/community/ranking";
import { listAthleteAchievements, syncTrainingAchievements } from "@/lib/community/achievements";
import { prisma } from "@/lib/db";

export default async function AthleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; upload?: string; choose?: string }>;
}) {
  const ctx = await requireAthleteContext();
  const { saved, upload, choose } = await searchParams;
  const alertUser = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { phoneE164: true, smsAlertsEnabled: true },
  });
  await syncTrainingAchievements(ctx.profileId);

  const profile = await prisma.athleteProfile.findUnique({
    where: { id: ctx.profileId },
    include: {
      sports: { orderBy: [{ isPrimary: "desc" }, { sport: "asc" }] },
      memberships: {
        include: {
          organization: { select: { name: true } },
          team: { select: { name: true } },
        },
        take: 2,
      },
      featuredVideoReview: {
        include: { trainingVideo: { select: { videoUrl: true, title: true } } },
      },
      showcaseVideos: {
        orderBy: { sortOrder: "asc" },
        include: {
          videoReview: {
            include: { trainingVideo: { select: { videoUrl: true, title: true } } },
          },
        },
      },
      metricEntries: {
        include: { metricDefinition: true },
        orderBy: { recordedAt: "asc" },
        take: 200,
      },
    },
  });
  if (!profile) return null;

  const slug = await ensurePublicSlug(profile);
  const identity = buildSafeIdentity(profile);
  const shareUrl = `${getAppBaseUrl()}/p/${slug}`;
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
  const completion = profileCompletion({
    ...profile,
    metricCount: profile.metricEntries.length,
    videoCount: reviews.length,
  });
  const socials = collectSocialLinks(profile);
  const publicSocials = socials.filter((link) => link.public);
  const training = await getAthleteTrainingStats(profile.id, profile.legacyAthleteId);
  const achievements = await listAthleteAchievements(profile.id);
  const headlineMetrics = await listLeaderboardMetrics(identity.sport);
  const yourRank = headlineMetrics[0]
    ? await getAthleteRank({
        athleteProfileId: profile.id,
        scope: {
          metricDefinitionId: headlineMetrics[0].id,
          sport: identity.sport,
          period: "30d",
        },
      })
    : null;

  const byMetric = new Map<string, typeof profile.metricEntries>();
  for (const entry of profile.metricEntries) {
    if (entry.metricDefinition.isSensitive) continue;
    const list = byMetric.get(entry.metricDefinitionId) ?? [];
    list.push(entry);
    byMetric.set(entry.metricDefinitionId, list);
  }
  const performance = [...byMetric.values()].slice(0, 6).map((list) => {
    const latest = list[list.length - 1]!;
    const first = list[0]!;
    const delta =
      list.length > 1
        ? latest.metricDefinition.direction === "LOWER_IS_BETTER"
          ? first.value - latest.value
          : latest.value - first.value
        : null;
    return {
      name: latest.metricDefinition.name,
      unit: latest.metricDefinition.unit,
      value: latest.value,
      delta,
      history: list.map((row) => row.value),
      verified:
        latest.verificationType === "COACH" || latest.verificationType === "TRAIN2PLAY",
      verificationType: latest.verificationType,
    };
  });

  const connections = await prisma.coachAthleteConnection.findMany({
    where: {
      athleteProfileId: ctx.profileId,
      status: { in: [CONNECTION_STATUS.APPROVED, CONNECTION_STATUS.PENDING] },
    },
    include: {
      coachUser: {
        select: {
          name: true,
          lookingForSport: true,
          organizationMemberships: {
            take: 1,
            include: { organization: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  });

  const headerMeta = [
    identity.sport,
    identity.position,
    profile.graduationYear ? `Class of ${profile.graduationYear}` : identity.ageGroup,
  ]
    .filter(Boolean)
    .join(" • ");

  const mappedVideos = mapProfileVideos({
    reviews,
    featuredId: profile.featuredVideoReviewId,
    highlightIds: profile.showcaseVideos.map((row) => row.videoReviewId),
    metricHistory: profile.metricEntries,
  });
  const featuredVideo = mappedVideos.find((video) => video.featured) ?? null;
  const metricOptions = mapProfileMetricOptions(profile.metricEntries);
  const athleteIsMinor = profile.dateOfBirth ? isMinor(profile.dateOfBirth) : true;

  return (
    <div className="space-y-6">
      {saved ? (
        <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
          Saved successfully. This is your athlete profile.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
        <div
          className="h-28 bg-gradient-to-r from-brand/70 via-black to-zinc-900 sm:h-36"
          style={
            profile.coverImageUrl
              ? {
                  backgroundImage: `linear-gradient(to top, rgba(0,0,0,.75), rgba(0,0,0,.2)), url(${profile.coverImageUrl})`,
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
                {ctx.firstName.charAt(0)}
                {ctx.lastName.charAt(0)}
              </div>
            )}
            <div className="min-w-0 pb-1">
              <p className="text-[10px] font-bold tracking-[0.18em] text-brand uppercase">
                Train2Play Player Profile
              </p>
              <h1 className="font-heading truncate text-3xl font-bold tracking-tight">
                {identity.displayName}
              </h1>
              <p className="truncate text-sm text-zinc-400">{headerMeta || "Athlete"}</p>
              {identity.organizationName ? (
                <p className="truncate text-sm text-zinc-300">{identity.organizationName}</p>
              ) : null}
            </div>
          </div>
          {profile.bio ? (
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">{profile.bio}</p>
          ) : null}
          {publicSocials.length > 0 ? (
            <div className="mt-4">
              <SocialLinkIcons links={publicSocials} />
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/p/${slug}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/20 bg-black/40 px-4 text-sm font-semibold text-white hover:bg-white/10"
            >
              <Eye className="size-4" />
              View public profile
            </Link>
            <Link
              href="/athlete/profile/edit"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-black hover:bg-brand/90"
            >
              <Pencil className="size-4" />
              Edit profile
            </Link>
            <ShareProfileControls
              url={shareUrl}
              title={`${identity.displayName} | ${brand.name}`}
              text={`Check out my Train2Play player profile.`}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Profile {completion.percent}% complete</p>
          <span className="text-xs text-zinc-500">{completion.missing.length} suggested</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${completion.percent}%` }}
          />
        </div>
        {completion.missing.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {completion.missing.slice(0, 4).map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="relative z-10 inline-flex min-h-10 items-center rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-brand uppercase hover:bg-brand hover:text-black"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {yourRank ? (
        <section className="rounded-2xl border border-brand/30 bg-black p-4">
          <p className="text-[10px] font-bold tracking-[0.18em] text-brand uppercase">
            Your ranking
          </p>
          <p className="font-heading mt-1 text-2xl font-bold">#{yourRank.rank} National</p>
          <p className="text-sm text-zinc-400">
            {identity.ageGroup} {identity.sport} · {headlineMetrics[0]?.name}
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="font-heading text-xl font-bold">Performance</h2>
        <div className="mt-3">
          {performance.length === 0 ? (
            <ProfileEmptyState
              title="No performance metrics yet."
              body="Record a result to start your development story."
              href="/athlete/progress"
              cta="Record a metric"
            />
          ) : (
            <PerformanceMetricCards cards={performance} />
          )}
        </div>
      </section>

      <ProfileVideoWorkspace
        videos={mappedVideos}
        featured={featuredVideo}
        metrics={metricOptions}
        defaultSport={ctx.sport}
        sports={ctx.sports}
        isMinor={athleteIsMinor}
        autoOpenUpload={upload === "1"}
        autoOpenChoose={choose === "1"}
      />

      <section>
        <h2 className="font-heading text-xl font-bold">Training</h2>
        <div className="mt-3">
          <TrainingStatsGrid training={training} />
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl font-bold">Achievements</h2>
        <div className="mt-3">
          <AchievementBadges achievements={achievements} />
        </div>
      </section>

      {socials.length === 0 ? (
        <section>
          <h2 className="font-heading text-xl font-bold">Social links</h2>
          <div className="mt-3">
            <ProfileEmptyState
              title="Add your social profiles."
              body="Instagram, X, TikTok, and YouTube can appear when you enable them."
              href="/athlete/profile/edit?section=social"
              cta="Edit profile"
            />
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-bold">My coaches</h2>
          <Link
            href="/athlete/connect"
            className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
          >
            Connect
          </Link>
        </div>
        {connections.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
            No coaches connected yet. You can use Train2Play on your own.
          </p>
        ) : (
          <ul className="space-y-2">
            {connections.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{c.coachUser.name}</p>
                    <p className="text-xs text-slate-400">
                      {[
                        c.coachUser.lookingForSport,
                        c.coachUser.organizationMemberships[0]?.organization.name,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Coach"}
                    </p>
                  </div>
                  <span className="text-xs font-bold tracking-wide text-brand uppercase">
                    {c.status === "APPROVED" ? "Connected" : "Pending"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-zinc-500">
        {brand.name} · {brand.subtagline}
      </p>
      <InstallTrain2Play variant="settings" tone="dark" />
      <AlertPreferences
        phoneE164={alertUser?.phoneE164 ?? null}
        smsEnabled={alertUser?.smsAlertsEnabled ?? false}
        tone="dark"
      />
      <SignOutButton />
    </div>
  );
}
