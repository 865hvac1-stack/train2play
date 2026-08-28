import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { SocialLinkIcons } from "@/components/social-link-icons";
import { ShareProfileControls } from "@/components/share-profile-controls";
import type { SocialLink } from "@/lib/community/social";

export function CoachBadge({
  children,
  tone = "brand",
}: {
  children: ReactNode;
  tone?: "brand" | "muted";
}) {
  return (
    <span
      className={
        tone === "brand"
          ? "inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-brand uppercase"
          : "inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold tracking-wide text-zinc-300 uppercase"
      }
    >
      {children}
    </span>
  );
}

export function CoachProfileHero({
  displayName,
  sport,
  specialties,
  organizationName,
  locationLabel,
  avatarUrl,
  coverImageUrl,
  approved,
  backgroundCheckCompleted,
  remote,
  inPerson,
  accepting,
  actions,
}: {
  displayName: string;
  sport: string | null;
  specialties: string[];
  organizationName: string | null;
  locationLabel: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  approved: boolean;
  backgroundCheckCompleted: boolean;
  remote: boolean;
  inPerson: boolean;
  accepting: boolean;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
      <div
        className="h-28 bg-gradient-to-r from-brand/70 via-black to-zinc-900 sm:h-36"
        style={
          coverImageUrl
            ? {
                backgroundImage: `linear-gradient(to top, rgba(0,0,0,.75), rgba(0,0,0,.2)), url(${coverImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      />
      <div className="px-5 pb-5">
        <div className="-mt-10 flex items-end gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="size-20 rounded-2xl border-2 border-black object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-2xl border-2 border-black bg-brand font-heading text-2xl font-bold text-black">
              {displayName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 pb-1">
            <p className="text-[10px] font-bold tracking-[0.18em] text-brand uppercase">
              Train2Play Coach
            </p>
            <h1 className="font-heading truncate text-3xl font-bold tracking-tight">
              {displayName}
            </h1>
            <p className="truncate text-sm text-zinc-400">{sport || "Coach"}</p>
            {specialties.length > 0 ? (
              <p className="truncate text-sm text-zinc-300">{specialties.join(" • ")}</p>
            ) : null}
            {organizationName ? (
              <p className="truncate text-sm text-zinc-300">{organizationName}</p>
            ) : null}
            {locationLabel ? (
              <p className="truncate text-sm text-zinc-400">{locationLabel}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {approved ? (
            <CoachBadge>
              <CheckCircle2 className="size-3.5" />
              Train2Play Approved
            </CoachBadge>
          ) : null}
          {backgroundCheckCompleted ? (
            <CoachBadge>
              <CheckCircle2 className="size-3.5" />
              Background check completed
            </CoachBadge>
          ) : null}
          {remote ? <CoachBadge tone="muted">Remote coaching</CoachBadge> : null}
          {inPerson ? <CoachBadge tone="muted">In-person coaching</CoachBadge> : null}
          {accepting ? (
            <CoachBadge>Accepting athletes</CoachBadge>
          ) : (
            <CoachBadge tone="muted">Not currently accepting new athletes</CoachBadge>
          )}
        </div>
        {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function CoachSearchCard({
  href,
  name,
  avatarUrl,
  sport,
  specialties,
  organizationName,
  locationLabel,
  inPerson,
  remote,
  accepting,
  approved,
}: {
  href: string;
  name: string;
  avatarUrl: string | null;
  sport: string | null;
  specialties: string[];
  organizationName: string | null;
  locationLabel: string | null;
  inPerson: boolean;
  remote: boolean;
  accepting: boolean;
  approved: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-3 transition hover:border-brand/40"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-brand font-heading text-xl font-bold text-black">
          {name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{name}</p>
        {approved ? (
          <p className="text-[11px] font-semibold text-brand">Train2Play Approved</p>
        ) : null}
        <p className="truncate text-sm text-zinc-400">
          {[sport, specialties.slice(0, 3).join(" • ")].filter(Boolean).join(" · ")}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {[organizationName, locationLabel].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-1 text-[11px] text-zinc-400">
          {[inPerson ? "In person" : null, remote ? "Remote" : null, accepting ? "Accepting athletes" : "Not accepting"]
            .filter(Boolean)
            .join(" • ")}
        </p>
      </div>
      <span className="self-center text-xs font-bold tracking-wide text-brand uppercase">
        View
      </span>
    </Link>
  );
}

export function CoachPublicBody({
  bio,
  experienceText,
  certifications,
  yearsCoaching,
  sports,
  positions,
  ageGroups,
  featuredVideo,
  videos,
  socials,
  website,
  shareUrl,
  displayName,
}: {
  bio: string | null;
  experienceText: string | null;
  certifications: string | null;
  yearsCoaching: number | null;
  sports: string[];
  positions: string[];
  ageGroups: string[];
  featuredVideo: { title: string; url: string } | null;
  videos: { id: string; title: string; url: string }[];
  socials: SocialLink[];
  website: { label: string; url: string } | null;
  shareUrl: string;
  displayName: string;
}) {
  return (
    <div className="space-y-6">
      {bio ? (
        <section>
          <h2 className="font-heading text-xl font-bold">About</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{bio}</p>
        </section>
      ) : null}
      <section className="grid gap-3 sm:grid-cols-2">
        {yearsCoaching != null ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
            <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-500 uppercase">
              Years coaching
            </p>
            <p className="font-heading mt-1 text-2xl font-bold">{yearsCoaching}</p>
          </div>
        ) : null}
        {sports.length > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
            <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-500 uppercase">Sports</p>
            <p className="mt-1 text-sm text-zinc-200">{sports.join(" • ")}</p>
          </div>
        ) : null}
      </section>
      {experienceText ? (
        <section>
          <h2 className="font-heading text-xl font-bold">Experience</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {experienceText}
          </p>
        </section>
      ) : null}
      {certifications ? (
        <section>
          <h2 className="font-heading text-xl font-bold">Certifications</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {certifications}
          </p>
        </section>
      ) : null}
      {positions.length > 0 || ageGroups.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-300">
          {positions.length > 0 ? <p>Positions trained: {positions.join(", ")}</p> : null}
          {ageGroups.length > 0 ? <p>Age groups: {ageGroups.join(", ")}</p> : null}
        </section>
      ) : null}
      {featuredVideo ? (
        <section>
          <h2 className="font-heading text-xl font-bold">Featured coaching video</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-brand/40 bg-black p-3">
            <InstructionVideoPlayer src={featuredVideo.url} title={featuredVideo.title} tone="dark" />
          </div>
        </section>
      ) : null}
      {videos.length > 0 ? (
        <section>
          <h2 className="font-heading text-xl font-bold">Training videos</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {videos.map((video) => (
              <li key={video.id} className="rounded-2xl border border-white/10 bg-zinc-900 p-3">
                <InstructionVideoPlayer src={video.url} title={video.title} tone="dark" />
                <p className="mt-2 text-sm font-semibold">{video.title}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {socials.length > 0 || website ? (
        <section>
          <h2 className="font-heading text-xl font-bold">Connect</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {socials.length > 0 ? <SocialLinkIcons links={socials} /> : null}
            {website ? (
              <a href={website.url} className="text-sm font-semibold text-brand underline">
                {website.label}
              </a>
            ) : null}
          </div>
        </section>
      ) : null}
      <ShareProfileControls
        url={shareUrl}
        title={`${displayName} | Train2Play Coach`}
        text={`Check out this Train2Play Coach Profile.`}
      />
    </div>
  );
}
