"use client";

import { useActionState, useState, type ReactNode } from "react";

import {
  updatePlayerProfileAction,
  type AthleteProfileActionState,
} from "@/app/(athlete)/athlete/profile-actions";
import { ProfilePhotoPicker } from "@/components/profile-photo-picker";
import { SportPicker } from "@/components/sport-picker";
import { SOCIAL_NETWORK_ICONS } from "@/components/social-link-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { US_STATES } from "@/lib/community/age-groups";
import {
  isProfileEditSection,
  PROFILE_EDIT_SECTIONS,
  type ProfileEditSectionId,
} from "@/lib/community/profile-edit-sections";
import type { SocialNetwork } from "@/lib/community/social";
import { cn } from "@/lib/utils";

type VideoOption = { id: string; title: string };
type MetricOption = { id: string; name: string; unit: string };

const RECRUITING_STATUSES = [
  "Not recruiting yet",
  "Exploring options",
  "Open to college contact",
  "Committed",
];

export function PlayerProfileCustomizeForm({
  profile,
  videos,
  metrics,
  sports,
  primarySport,
  position,
  secondaryPosition,
  showcaseIds,
  initialSection = "profile",
  videoWorkspace,
}: {
  profile: {
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverImageUrl: string | null;
    publicSlug: string | null;
    graduationYear: number | null;
    locationState: string | null;
    profileVisibility: string;
    instagramUrl: string | null;
    instagramPublic: boolean;
    xUrl: string | null;
    xPublic: boolean;
    tiktokUrl: string | null;
    tiktokPublic: boolean;
    youtubeUrl: string | null;
    youtubePublic: boolean;
    featuredVideoReviewId: string | null;
    featuredMetricIds: string[];
    publicVideoSharingEnabled: boolean;
    publicLeaderboardOptIn: boolean;
    recruitingStatus: string | null;
    collegeInterest: string | null;
  };
  videos: VideoOption[];
  metrics: MetricOption[];
  sports: string[];
  primarySport: string;
  position: string | null;
  secondaryPosition: string | null;
  showcaseIds: string[];
  initialSection?: string;
  videoWorkspace?: ReactNode;
}) {
  const [state, action, pending] = useActionState(
    updatePlayerProfileAction,
    {} as AthleteProfileActionState,
  );
  const [section, setSection] = useState<ProfileEditSectionId>(
    isProfileEditSection(initialSection) ? initialSection : "profile",
  );

  function goToSection(next: ProfileEditSectionId) {
    setSection(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  const recruitingOptions = profile.recruitingStatus &&
    !RECRUITING_STATUSES.includes(profile.recruitingStatus)
    ? [profile.recruitingStatus, ...RECRUITING_STATUSES]
    : RECRUITING_STATUSES;

  return (
    <form action={action} className="space-y-5" encType="multipart/form-data">
      <div className="md:hidden">
        <Label htmlFor="edit-section" className="text-slate-300">
          Section
        </Label>
        <select
          id="edit-section"
          value={section}
          onChange={(event) => goToSection(event.target.value as ProfileEditSectionId)}
          className="mt-2 h-11 w-full rounded-lg border border-white/15 bg-black/40 px-3 text-white"
        >
          {PROFILE_EDIT_SECTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:items-start md:gap-6">
        <nav className="hidden md:sticky md:top-24 md:block">
          <p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-brand uppercase">
            Build my identity
          </p>
          <ul className="space-y-1">
            {PROFILE_EDIT_SECTIONS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goToSection(item.id)}
                  className={cn(
                    "flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold transition",
                    section === item.id
                      ? "bg-brand text-black"
                      : "text-zinc-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-4">
          <section className={section === "profile" ? "space-y-4" : "hidden"} aria-hidden={section !== "profile"}>
            <SectionIntro
              title="Profile"
              body="This is how athletes, coaches, and recruiters recognize you."
            />
            <Field
              label="Display name"
              name="displayName"
              defaultValue={profile.displayName ?? ""}
              hint="Adults can use a nickname. Minors still appear as First Last-initial on public pages."
            />
            <ProfilePhotoPicker
              name="avatarFile"
              label="Profile photo"
              currentUrl={profile.avatarUrl}
              preview="avatar"
              capture="user"
            />
            <ProfilePhotoPicker
              name="coverFile"
              label="Cover image"
              currentUrl={profile.coverImageUrl}
              preview="cover"
              capture="environment"
            />
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-slate-300">
                Bio
              </Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={profile.bio ?? ""}
                maxLength={600}
                className="min-h-28 border-white/15 bg-black/30 text-white"
                placeholder="Who you are as an athlete — sport, goals, and how you train."
              />
            </div>
            <Field
              label="Profile URL"
              name="publicSlug"
              defaultValue={profile.publicSlug ?? ""}
              hint="train2play.com/p/your-slug"
            />
          </section>

          <section className={section === "athletic" ? "space-y-4" : "hidden"} aria-hidden={section !== "athletic"}>
            <SectionIntro
              title="Athletic info"
              body="Sport, position, and class details shown on your Player Profile."
            />
            <SportPicker defaultSports={sports} defaultPrimary={primarySport} tone="dark" />
            <Field label="Position" name="position" defaultValue={position ?? ""} />
            <Field
              label="Secondary position"
              name="secondaryPosition"
              defaultValue={secondaryPosition ?? ""}
            />
            <Field
              label="Graduation year"
              name="graduationYear"
              defaultValue={profile.graduationYear ? String(profile.graduationYear) : ""}
              hint="Class year, for example 2028."
            />
            <div className="space-y-2">
              <Label htmlFor="locationState" className="text-slate-300">
                State
              </Label>
              <select
                id="locationState"
                name="locationState"
                defaultValue={profile.locationState ?? ""}
                className="h-11 w-full rounded-lg border border-white/15 bg-black/30 px-2 text-white"
              >
                <option value="">Prefer not to show</option>
                {US_STATES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <h3 className="font-heading text-base font-bold">Metrics shown on profile</h3>
              <p className="text-xs text-zinc-400">
                Choose which performance results appear. Sensitive measurements stay private.
              </p>
              {metrics.length === 0 ? (
                <p className="text-sm text-zinc-500">Log metrics on Progress to choose what appears.</p>
              ) : (
                <ul className="space-y-2">
                  {metrics.map((metric) => (
                    <li key={metric.id} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="featuredMetricIds"
                        value={metric.id}
                        defaultChecked={
                          profile.featuredMetricIds.length === 0 ||
                          profile.featuredMetricIds.includes(metric.id)
                        }
                        className="size-4 accent-brand"
                      />
                      <span>
                        {metric.name} ({metric.unit})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className={section === "social" ? "space-y-4" : "hidden"} aria-hidden={section !== "social"}>
            <SectionIntro
              title="Social"
              body="Optional. Public display stays off unless you turn it on. Minors stay hidden unless you explicitly enable each network."
            />
            <SocialRow
              network="instagram"
              name="instagramUrl"
              publicName="instagramPublic"
              defaultUrl={profile.instagramUrl}
              defaultPublic={profile.instagramPublic}
            />
            <SocialRow
              network="x"
              name="xUrl"
              publicName="xPublic"
              defaultUrl={profile.xUrl}
              defaultPublic={profile.xPublic}
            />
            <SocialRow
              network="tiktok"
              name="tiktokUrl"
              publicName="tiktokPublic"
              defaultUrl={profile.tiktokUrl}
              defaultPublic={profile.tiktokPublic}
            />
            <SocialRow
              network="youtube"
              name="youtubeUrl"
              publicName="youtubePublic"
              defaultUrl={profile.youtubeUrl}
              defaultPublic={profile.youtubePublic}
            />
          </section>

          <section className={section === "videos" ? "space-y-4" : "hidden"} aria-hidden={section !== "videos"}>
            <SectionIntro
              title="Videos"
              body="Upload from here or choose Featured / Highlights. Featured Video is the main clip. Highlights are extra clips. Private coaching film stays private unless you explicitly select it and enable public video sharing in Privacy."
            />
            {videoWorkspace}
            <div className="space-y-2">
              <Label htmlFor="featuredVideoReviewId" className="text-slate-300">
                Featured video
              </Label>
              <select
                id="featuredVideoReviewId"
                name="featuredVideoReviewId"
                defaultValue={profile.featuredVideoReviewId ?? ""}
                className="h-11 w-full rounded-lg border border-white/15 bg-black/30 px-2 text-white"
              >
                <option value="">None</option>
                {videos.map((video) => (
                  <option key={video.id} value={video.id}>
                    {video.title}
                  </option>
                ))}
              </select>
            </div>
            {videos.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Upload a video above, then save if you also change Featured or Highlights here.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-200">Highlights</p>
                <ul className="space-y-1">
                  {videos.map((video) => (
                    <li key={video.id} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="showcaseVideoIds"
                        value={video.id}
                        defaultChecked={showcaseIds.includes(video.id)}
                        className="size-4 accent-brand"
                      />
                      <span>Show {video.title} in highlights</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className={section === "privacy" ? "space-y-4" : "hidden"} aria-hidden={section !== "privacy"}>
            <SectionIntro
              title="Privacy"
              body="Control who can open your shareable profile. Email, phone, date of birth, and private coaching film never go public. Minor names stay First Last-initial."
            />
            <div className="space-y-2">
              <Label htmlFor="profileVisibility" className="text-slate-300">
                Profile visibility
              </Label>
              <select
                id="profileVisibility"
                name="profileVisibility"
                defaultValue={profile.profileVisibility}
                className="h-11 w-full rounded-lg border border-white/15 bg-black/30 px-2 text-white"
              >
                <option value="PRIVATE">Private — only me and authorized coaches</option>
                <option value="AUTHENTICATED">Train2Play — signed-in users</option>
                <option value="ORGANIZATION">Organization — my org only</option>
                <option value="PUBLIC">Public — shareable player profile</option>
              </select>
            </div>
            <label className="flex min-h-11 items-start gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="publicVideoSharingEnabled"
                defaultChecked={profile.publicVideoSharingEnabled}
                className="mt-1 size-4 accent-brand"
              />
              Allow featured/highlight videos on my shareable profile
            </label>
            <label className="flex min-h-11 items-start gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="publicLeaderboardOptIn"
                defaultChecked={profile.publicLeaderboardOptIn}
                className="mt-1 size-4 accent-brand"
              />
              Include me on public leaderboards
            </label>
            <p className="text-xs leading-relaxed text-zinc-500">
              Social icons only appear when a network is filled in and its Show publicly toggle is on.
              You can still preview a private profile yourself — that does not publish it.
            </p>
          </section>

          <section className={section === "recruiting" ? "space-y-4" : "hidden"} aria-hidden={section !== "recruiting"}>
            <SectionIntro
              title="Recruiting"
              body="Saved on this Player Profile for later recruiting use. Not shown on the public profile in V1, and not a recruiting marketplace."
            />
            <p className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-400">
              Graduation year is edited under Athletic info
              {profile.graduationYear ? ` · Class of ${profile.graduationYear}` : ""}.
            </p>
            <div className="space-y-2">
              <Label htmlFor="recruitingStatus" className="text-slate-300">
                Recruiting status
              </Label>
              <select
                id="recruitingStatus"
                name="recruitingStatus"
                defaultValue={profile.recruitingStatus ?? ""}
                className="h-11 w-full rounded-lg border border-white/15 bg-black/30 px-2 text-white"
              >
                <option value="">Not set</option>
                {recruitingOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="collegeInterest" className="text-slate-300">
                College interest
              </Label>
              <Textarea
                id="collegeInterest"
                name="collegeInterest"
                defaultValue={profile.collegeInterest ?? ""}
                className="min-h-24 border-white/15 bg-black/30 text-white"
                placeholder="Schools, level, or timeline you want saved on this profile."
              />
            </div>
          </section>
        </div>
      </div>

      <div className="sticky bottom-20 z-20 rounded-2xl border border-white/10 bg-zinc-950/95 p-3 shadow-xl backdrop-blur md:bottom-4">
        {state.error ? <p className="mb-2 text-sm text-red-400">{state.error}</p> : null}
        {state.success ? (
          <p className="mb-2 text-sm text-emerald-400">
            {state.success}{" "}
            <a href="/athlete/profile" className="font-semibold underline-offset-2 hover:underline">
              View profile
            </a>
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full bg-brand text-black hover:bg-brand/90 md:w-auto md:px-6"
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function SectionIntro({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-heading text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  defaultValue: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-slate-300">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="h-11 border-white/15 bg-black/30 text-white"
      />
      {hint ? <p className="text-[11px] leading-relaxed text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function SocialRow({
  network,
  name,
  publicName,
  defaultUrl,
  defaultPublic,
}: {
  network: SocialNetwork;
  name: string;
  publicName: string;
  defaultUrl: string | null;
  defaultPublic: boolean;
}) {
  const Icon = SOCIAL_NETWORK_ICONS[network];
  const labels: Record<SocialNetwork, string> = {
    instagram: "Instagram",
    x: "X",
    tiktok: "TikTok",
    youtube: "YouTube",
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-white">
          <Icon className="size-4" />
        </span>
        <p className="text-sm font-semibold">{labels[network]}</p>
      </div>
      <Field label={`${labels[network]} URL or handle`} name={name} defaultValue={defaultUrl ?? ""} />
      <label className="mt-2 flex min-h-11 items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          name={publicName}
          defaultChecked={defaultPublic}
          className="size-4 accent-brand"
        />
        Show publicly
      </label>
    </div>
  );
}
