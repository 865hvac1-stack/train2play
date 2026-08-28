"use client";

import { useActionState } from "react";

import {
  updatePlayerProfileAction,
  type AthleteProfileActionState,
} from "@/app/(athlete)/athlete/profile-actions";
import { SportPicker } from "@/components/sport-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { US_STATES } from "@/lib/community/age-groups";

type VideoOption = { id: string; title: string };
type MetricOption = { id: string; name: string; unit: string };

export function PlayerProfileCustomizeForm({
  profile,
  videos,
  metrics,
  sports,
  primarySport,
  position,
  secondaryPosition,
  showcaseIds,
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
}) {
  const [state, action, pending] = useActionState(
    updatePlayerProfileAction,
    {} as AthleteProfileActionState,
  );

  return (
    <form action={action} className="space-y-6">
      <section className="space-y-3">
        <h3 className="font-heading text-lg font-bold">Look and identity</h3>
        <Field label="Display name" name="displayName" defaultValue={profile.displayName ?? ""} />
        <Field label="Profile photo URL" name="avatarUrl" defaultValue={profile.avatarUrl ?? ""} />
        <Field label="Cover image URL" name="coverImageUrl" defaultValue={profile.coverImageUrl ?? ""} />
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-slate-300">
            Bio
          </Label>
          <Textarea
            id="bio"
            name="bio"
            defaultValue={profile.bio ?? ""}
            maxLength={600}
            className="min-h-24 border-white/15 bg-black/30 text-white"
          />
        </div>
        <Field
          label="Profile URL"
          name="publicSlug"
          defaultValue={profile.publicSlug ?? ""}
          hint="train2play.com/p/your-slug"
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-heading text-lg font-bold">Athletic info</h3>
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
        />
        <div className="space-y-2">
          <Label htmlFor="locationState" className="text-slate-300">
            State
          </Label>
          <select
            id="locationState"
            name="locationState"
            defaultValue={profile.locationState ?? ""}
            className="h-10 w-full rounded-lg border border-white/15 bg-black/30 px-2 text-white"
          >
            <option value="">Prefer not to show</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-heading text-lg font-bold">Social links</h3>
        <p className="text-xs text-zinc-400">
          Optional. Public display is off unless you check the box. Minors stay hidden unless
          explicitly enabled.
        </p>
        <SocialRow
          label="Instagram"
          name="instagramUrl"
          publicName="instagramPublic"
          defaultUrl={profile.instagramUrl}
          defaultPublic={profile.instagramPublic}
        />
        <SocialRow
          label="X"
          name="xUrl"
          publicName="xPublic"
          defaultUrl={profile.xUrl}
          defaultPublic={profile.xPublic}
        />
        <SocialRow
          label="TikTok"
          name="tiktokUrl"
          publicName="tiktokPublic"
          defaultUrl={profile.tiktokUrl}
          defaultPublic={profile.tiktokPublic}
        />
        <SocialRow
          label="YouTube"
          name="youtubeUrl"
          publicName="youtubePublic"
          defaultUrl={profile.youtubeUrl}
          defaultPublic={profile.youtubePublic}
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-heading text-lg font-bold">Videos on my profile</h3>
        <p className="text-xs text-zinc-400">
          Private coaching film stays private until you feature it or add it to highlights.
        </p>
        <div className="space-y-2">
          <Label htmlFor="featuredVideoReviewId" className="text-slate-300">
            Featured video
          </Label>
          <select
            id="featuredVideoReviewId"
            name="featuredVideoReviewId"
            defaultValue={profile.featuredVideoReviewId ?? ""}
            className="h-10 w-full rounded-lg border border-white/15 bg-black/30 px-2 text-white"
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
          <p className="text-sm text-zinc-500">Upload a video first to feature it.</p>
        ) : (
          <ul className="space-y-2">
            {videos.map((video) => (
              <li key={video.id} className="flex items-center gap-2 text-sm">
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
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-heading text-lg font-bold">Performance shown</h3>
        {metrics.length === 0 ? (
          <p className="text-sm text-zinc-500">Log metrics to choose what appears.</p>
        ) : (
          <ul className="space-y-2">
            {metrics.map((metric) => (
              <li key={metric.id} className="flex items-center gap-2 text-sm">
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
      </section>

      <section className="space-y-3">
        <h3 className="font-heading text-lg font-bold">Profile visibility</h3>
        <select
          name="profileVisibility"
          defaultValue={profile.profileVisibility}
          className="h-10 w-full rounded-lg border border-white/15 bg-black/30 px-2 text-white"
        >
          <option value="PRIVATE">Private — only me and authorized coaches</option>
          <option value="AUTHENTICATED">Train2Play — signed-in users</option>
          <option value="ORGANIZATION">Organization — my org only</option>
          <option value="PUBLIC">Public — shareable player profile</option>
        </select>
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="publicVideoSharingEnabled"
            defaultChecked={profile.publicVideoSharingEnabled}
            className="mt-1 size-4 accent-brand"
          />
          Allow featured/highlight videos on my shareable profile
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="publicLeaderboardOptIn"
            defaultChecked={profile.publicLeaderboardOptIn}
            className="mt-1 size-4 accent-brand"
          />
          Include me on public leaderboards
        </label>
      </section>

      <section className="space-y-3">
        <h3 className="font-heading text-lg font-bold">Recruiting readiness</h3>
        <p className="text-xs text-zinc-500">
          Saved on this same Player Profile for later. Not shown publicly in V1.
        </p>
        <Field
          label="Recruiting status"
          name="recruitingStatus"
          defaultValue={profile.recruitingStatus ?? ""}
        />
        <Field
          label="College interest"
          name="collegeInterest"
          defaultValue={profile.collegeInterest ?? ""}
        />
      </section>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-400">{state.success}</p> : null}
      <Button type="submit" disabled={pending} className="bg-brand text-black">
        {pending ? "Saving…" : "Save player profile"}
      </Button>
    </form>
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
        className="border-white/15 bg-black/30 text-white"
      />
      {hint ? <p className="text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function SocialRow({
  label,
  name,
  publicName,
  defaultUrl,
  defaultPublic,
}: {
  label: string;
  name: string;
  publicName: string;
  defaultUrl: string | null;
  defaultPublic: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
      <Field label={label} name={name} defaultValue={defaultUrl ?? ""} />
      <label className="mb-1 flex items-center gap-2 text-xs text-zinc-300">
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
