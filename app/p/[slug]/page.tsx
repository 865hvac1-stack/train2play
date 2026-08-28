import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { AchievementBadges } from "@/components/achievement-badges";
import { BrandLogo } from "@/components/brand-logo";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { PlayerOfTheWeekCard } from "@/components/player-of-the-week-card";
import { ShareProfileControls } from "@/components/share-profile-controls";
import { SocialLinkIcons } from "@/components/social-link-icons";
import { auth } from "@/auth";
import { getAppBaseUrl } from "@/lib/app-url";
import { brand } from "@/lib/brand";
import { getShareablePlayerProfile } from "@/lib/community/profile";
import { playerOfTheWeekCard } from "@/lib/community/player-of-the-week";
import { prisma } from "@/lib/db";
import { formatMetricValue } from "@/lib/progress";
import type { ProfileViewer } from "@/lib/community/privacy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getShareablePlayerProfile(slug, { kind: "public" });
  if (result.status !== "ok") {
    return { title: `Player Profile | ${brand.name}` };
  }
  return {
    title: `${result.profile.identity.displayName} | ${brand.name} Player Profile`,
    description: [
      result.profile.identity.sport,
      result.profile.identity.ageGroup,
      result.profile.identity.location,
    ]
      .filter(Boolean)
      .join(" • "),
  };
}

export default async function PublicPlayerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  let viewer: ProfileViewer = { kind: "public" };
  if (session?.user?.id) {
    const me = await prisma.athleteProfile.findUnique({
      where: { userId: session.user.id },
      select: { publicSlug: true, id: true },
    });
    if (me?.publicSlug === slug) viewer = { kind: "self", userId: session.user.id };
    else if (session.user.role === "PLATFORM_ADMIN") viewer = { kind: "admin" };
    else {
      const orgs = await prisma.organizationMembership.findMany({
        where: { userId: session.user.id },
        select: { organizationId: true },
      });
      viewer =
        orgs.length > 0
          ? {
              kind: "organization",
              userId: session.user.id,
              organizationIds: orgs.map((row) => row.organizationId),
            }
          : { kind: "authenticated", userId: session.user.id, role: session.user.role };
    }
  }

  const result = await getShareablePlayerProfile(slug, viewer);
  if (result.status === "login_required") {
    redirect(`/login?callbackUrl=/p/${slug}`);
  }
  if (result.status !== "ok") notFound();
  const profile = result.profile;
  const shareUrl = `${getAppBaseUrl()}/p/${profile.slug}`;
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
    <div className="min-h-full bg-black text-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/">
          <BrandLogo size="sm" variant="dark" subtitle={brand.tagline} />
        </Link>
        <Link href="/signup" className="text-sm font-semibold text-brand">
          Join Train2Play
        </Link>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-16">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
          <div
            className="h-32 bg-gradient-to-r from-brand/80 via-black to-zinc-900"
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
                <p className="text-sm text-zinc-400">
                  {[
                    profile.identity.sport,
                    profile.identity.position,
                    profile.identity.secondaryPosition,
                    profile.identity.ageGroup,
                    profile.identity.location,
                    profile.identity.organizationName,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
            </div>
            {profile.bio ? (
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">{profile.bio}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <SocialLinkIcons links={profile.socials} />
              <ShareProfileControls
                url={shareUrl}
                title={`${profile.identity.displayName} | ${brand.name}`}
                text={`Player profile on ${brand.name}`}
              />
            </div>
          </div>
        </section>

        {potw ? <PlayerOfTheWeekCard potw={playerOfTheWeekCardLike(potw)} /> : null}

        {profile.featuredVideo ? (
          <section>
            <h2 className="font-heading text-xl font-bold">Featured video</h2>
            <div className="mt-3 overflow-hidden rounded-2xl">
              <InstructionVideoPlayer
                src={profile.featuredVideo.url}
                title={profile.featuredVideo.title}
                tone="dark"
              />
            </div>
          </section>
        ) : null}

        {profile.showcase.length > 0 ? (
          <section>
            <h2 className="font-heading text-xl font-bold">Videos / Highlights</h2>
            <div className="mt-3 space-y-4">
              {profile.showcase
                .filter((video: { id: string }) => video.id !== profile.featuredVideo?.id)
                .map((video: { id: string; title: string; url: string }) => (
                  <InstructionVideoPlayer
                    key={video.id}
                    src={video.url}
                    title={video.title}
                    tone="dark"
                  />
                ))}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="font-heading text-xl font-bold">Performance</h2>
          {profile.performance.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-400">No public performance metrics yet.</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {profile.performance.map((card) => (
                <div key={card.id} className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
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
                    <p className="mt-2 text-xs text-zinc-400">
                      {card.history.join(" → ")} {card.unit}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold">Achievements</h2>
          <div className="mt-3">
            <AchievementBadges achievements={profile.achievements} />
          </div>
        </section>
      </main>
    </div>
  );
}

function playerOfTheWeekCardLike(potw: {
  id: string;
  identity: {
    displayName: string;
    sport: string | null;
    ageGroup: string | null;
    location: string | null;
  };
  slug: string | null;
  description: string;
  highlight: string | null;
  videoUrl: string | null;
  videoTitle: string | null;
}) {
  return potw;
}

void playerOfTheWeekCard;
