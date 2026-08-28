import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { AchievementBadges } from "@/components/achievement-badges";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { PlayerProfileCustomizeForm } from "@/components/player-profile-customize-form";
import { ShareProfileControls } from "@/components/share-profile-controls";
import { SignOutButton } from "@/components/sign-out-button";
import { SocialLinkIcons } from "@/components/social-link-icons";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { getAppBaseUrl } from "@/lib/app-url";
import { brand } from "@/lib/brand";
import { CONNECTION_STATUS } from "@/lib/coach-connections";
import { collectSocialLinks } from "@/lib/community/social";
import { buildSafeIdentity } from "@/lib/community/privacy";
import {
  ensurePublicSlug,
  getAthleteTrainingStats,
  profileCompletion,
} from "@/lib/community/profile";
import { getAthleteRank, listLeaderboardMetrics } from "@/lib/community/ranking";
import { listAthleteAchievements, syncTrainingAchievements } from "@/lib/community/achievements";
import { prisma } from "@/lib/db";
import { formatMetricValue } from "@/lib/progress";

export default async function AthleteProfilePage() {
  const ctx = await requireAthleteContext();
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
  const identity = buildSafeIdentity(profile);
  const shareUrl = `${getAppBaseUrl()}/p/${slug}`;
  const completion = profileCompletion({
    ...profile,
    metricCount: profile.metricEntries.length,
  });
  const socials = collectSocialLinks(profile);
  const videos = await prisma.videoReview.findMany({
    where: { athleteProfileId: profile.id },
    select: { id: true, title: true },
    orderBy: { submittedAt: "desc" },
    take: 40,
  });
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

  const primary = profile.sports.find((row) => row.isPrimary) ?? profile.sports[0];

  return (
    <div className="space-y-6">
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
              <p className="truncate text-sm text-zinc-400">
                {[identity.sport, identity.position, identity.ageGroup, identity.location]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SocialLinkIcons links={socials} />
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
              <li
                key={item.id}
                className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-zinc-400"
              >
                {item.label}
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
          <p className="font-heading mt-1 text-2xl font-bold">
            #{yourRank.rank} National
          </p>
          <p className="text-sm text-zinc-400">
            {identity.ageGroup} {identity.sport} · {headlineMetrics[0]?.name}
          </p>
        </section>
      ) : null}

      {profile.featuredVideoReview ? (
        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold">Featured video</h2>
          <InstructionVideoPlayer
            src={profile.featuredVideoReview.trainingVideo.videoUrl}
            title={profile.featuredVideoReview.title}
            tone="dark"
          />
        </section>
      ) : null}

      <section>
        <h2 className="font-heading text-xl font-bold">Performance</h2>
        {performance.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">
            Record metrics to show your development story.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {performance.map((card) => (
              <div key={card.name} className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
                <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-500 uppercase">
                  {card.name}
                </p>
                <p className="font-heading mt-1 text-3xl font-bold">
                  {formatMetricValue(card.value, card.unit)}
                </p>
                {card.delta != null ? (
                  <p className="text-sm font-semibold text-brand">
                    {card.delta > 0 ? "+" : ""}
                    {formatMetricValue(card.delta, card.unit)}
                  </p>
                ) : null}
                {card.verified ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    {card.verificationType === "TRAIN2PLAY"
                      ? "Train2Play verified"
                      : "Coach verified"}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-zinc-500">Self reported</p>
                )}
                {card.history.length > 1 ? (
                  <p className="mt-2 text-xs tracking-wide text-zinc-400">
                    {card.history.map((value) => value).join(" → ")} {card.unit}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-heading text-xl font-bold">Training</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="Workouts completed" value={String(training.workoutsCompleted)} />
          <Stat label="Training days" value={String(training.trainingDays)} />
          <Stat label="Training streak" value={`${training.streak} days`} />
          <Stat
            label="Current program"
            value={training.currentProgram ?? "—"}
          />
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl font-bold">Achievements</h2>
        <div className="mt-3">
          <AchievementBadges achievements={achievements} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
        <h2 className="font-heading text-xl font-bold">Customize profile</h2>
        <p className="mt-1 mb-4 text-sm text-zinc-400">
          Control what your shareable Player Profile looks like. Sensitive details never go public.
        </p>
        <PlayerProfileCustomizeForm
          profile={{ ...profile, publicSlug: slug }}
          videos={videos}
          metrics={metricOptions}
          sports={ctx.sports}
          primarySport={ctx.sport}
          position={primary?.position ?? ctx.position}
          secondaryPosition={primary?.secondaryPosition ?? null}
          showcaseIds={profile.showcaseVideos.map((row) => row.videoReviewId)}
        />
      </section>

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
      <SignOutButton />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
      <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-500 uppercase">{label}</p>
      <p className="font-heading mt-1 truncate text-xl font-bold">{value}</p>
    </div>
  );
}
