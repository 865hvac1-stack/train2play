"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import {
  saveCoachProfileAction,
  submitCoachProfileFormAction,
  uploadCoachProfileVideoAction,
  type CoachProfileActionState,
} from "@/app/(dashboard)/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COACH_EDIT_SECTIONS, COACH_VIDEO_KIND, type CoachEditSectionId } from "@/lib/coaching/status";
import { allCoachingSports, COACHING_AGE_GROUPS, specialtiesForSport } from "@/lib/coaching/specialties";
import { US_STATES } from "@/lib/community/age-groups";
import { cn } from "@/lib/utils";

type SportRow = {
  sport: string;
  isPrimary: boolean;
  specialties: string[];
  positions: string[];
  ageGroups: string[];
};

type VideoRow = {
  id: string;
  title: string | null;
  kind: string;
  publicEligible: boolean;
  trainingVideo: { title: string; videoUrl: string };
};

export function CoachProfileEditForm({
  profile,
  initialSection,
  completion,
}: {
  profile: {
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverImageUrl: string | null;
    organizationName: string | null;
    locationLabel: string | null;
    locationCity: string | null;
    locationState: string | null;
    serviceArea: string | null;
    yearsCoaching: number | null;
    experienceText: string | null;
    certifications: string | null;
    inPersonCoaching: boolean;
    remoteCoaching: boolean;
    acceptingAthletes: boolean;
    appearInFindACoach: boolean;
    maxActiveAthletes: number | null;
    websiteUrl: string | null;
    websitePublic: boolean;
    instagramUrl: string | null;
    instagramPublic: boolean;
    xUrl: string | null;
    xPublic: boolean;
    tiktokUrl: string | null;
    tiktokPublic: boolean;
    youtubeUrl: string | null;
    youtubePublic: boolean;
    discoveryStatus: string;
    sports: SportRow[];
    videos: VideoRow[];
  };
  initialSection: CoachEditSectionId;
  completion: { percent: number; missing: { id: string; label: string; href: string }[]; canSubmit: boolean };
}) {
  const [section, setSection] = useState<CoachEditSectionId>(initialSection);
  const [state, action, pending] = useActionState(saveCoachProfileAction, {} as CoachProfileActionState);
  const [submitState, submitAction, submitting] = useActionState(
    submitCoachProfileFormAction,
    {} as CoachProfileActionState,
  );
  const selectedSports = profile.sports.map((row) => row.sport);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {COACH_EDIT_SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={cn(
              "min-h-10 shrink-0 rounded-full px-3 text-xs font-bold",
              section === item.id ? "bg-brand text-black" : "border border-white/15 text-zinc-300",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form action={action} className="space-y-5" encType="multipart/form-data">
        <section className={section === "profile" ? "space-y-4" : "hidden"}>
          <Field label="Display name" name="displayName" defaultValue={profile.displayName ?? ""} />
          <FileField name="avatarFile" label="Profile photo" />
          <FileField name="coverFile" label="Cover image" />
          <div className="space-y-2">
            <Label className="text-slate-300">Bio</Label>
            <Textarea name="bio" defaultValue={profile.bio ?? ""} className="min-h-28 border-white/15 bg-black/30 text-white" />
          </div>
          <Field label="Organization" name="organizationName" defaultValue={profile.organizationName ?? ""} />
          <Field
            label="Years coaching"
            name="yearsCoaching"
            defaultValue={profile.yearsCoaching != null ? String(profile.yearsCoaching) : ""}
            type="number"
          />
        </section>

        <section className={section === "coaching" ? "space-y-4" : "hidden"}>
          <div className="space-y-2">
            <Label className="text-slate-300">Coaching experience</Label>
            <Textarea
              name="experienceText"
              defaultValue={profile.experienceText ?? ""}
              className="min-h-28 border-white/15 bg-black/30 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Certifications</Label>
            <Textarea
              name="certifications"
              defaultValue={profile.certifications ?? ""}
              className="min-h-20 border-white/15 bg-black/30 text-white"
            />
          </div>
        </section>

        <section className={section === "sports" ? "space-y-4" : "hidden"}>
          <p className="text-sm text-zinc-400">Select every sport you coach. Specialties are stored per sport.</p>
          <div className="flex flex-wrap gap-2">
            {allCoachingSports().map((sport) => (
              <label key={sport} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm">
                <input
                  type="checkbox"
                  name="sports"
                  value={sport}
                  defaultChecked={selectedSports.includes(sport)}
                  className="accent-brand"
                />
                {sport}
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Primary sport</Label>
            <select
              name="primarySport"
              defaultValue={profile.sports.find((row) => row.isPrimary)?.sport ?? ""}
              className="h-11 w-full rounded-lg border border-white/15 bg-black px-2 text-white"
            >
              <option value="">Select</option>
              {allCoachingSports().map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
          </div>
          {allCoachingSports().map((sport) => {
            const row = profile.sports.find((item) => item.sport === sport);
            return (
              <SportDetails key={sport} sport={sport} row={row} />
            );
          })}
        </section>

        <section className={section === "location" ? "space-y-4" : "hidden"}>
          <p className="text-sm text-zinc-400">
            Use a general area only — never a private home address. Example: Knoxville Area, Tennessee.
          </p>
          <Field label="Public location label" name="locationLabel" defaultValue={profile.locationLabel ?? ""} />
          <Field label="City (optional)" name="locationCity" defaultValue={profile.locationCity ?? ""} />
          <div className="space-y-2">
            <Label className="text-slate-300">State</Label>
            <select
              name="locationState"
              defaultValue={profile.locationState ?? ""}
              className="h-11 w-full rounded-lg border border-white/15 bg-black px-2 text-white"
            >
              <option value="">Select</option>
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
          <Field label="Service area" name="serviceArea" defaultValue={profile.serviceArea ?? ""} placeholder="East Tennessee / Remote" />
        </section>

        <section className={section === "social" ? "space-y-4" : "hidden"}>
          <SocialField network="instagram" defaultUrl={profile.instagramUrl} defaultPublic={profile.instagramPublic} />
          <SocialField network="x" defaultUrl={profile.xUrl} defaultPublic={profile.xPublic} />
          <SocialField network="tiktok" defaultUrl={profile.tiktokUrl} defaultPublic={profile.tiktokPublic} />
          <SocialField network="youtube" defaultUrl={profile.youtubeUrl} defaultPublic={profile.youtubePublic} />
          <Field label="Website" name="websiteUrl" defaultValue={profile.websiteUrl ?? ""} />
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="websitePublic" defaultChecked={profile.websitePublic} className="accent-brand" />
            Show website publicly
          </label>
        </section>

        <section className={section === "availability" ? "space-y-4" : "hidden"}>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="inPersonCoaching" defaultChecked={profile.inPersonCoaching} className="accent-brand" />
            In-person coaching
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="remoteCoaching" defaultChecked={profile.remoteCoaching} className="accent-brand" />
            Remote coaching
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="acceptingAthletes" defaultChecked={profile.acceptingAthletes} className="accent-brand" />
            Accepting new athletes
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="appearInFindACoach"
              defaultChecked={profile.appearInFindACoach}
              className="accent-brand"
            />
            Appear in Find a Coach (only if Train2Play Approved)
          </label>
          <Field
            label="Max active athletes (optional)"
            name="maxActiveAthletes"
            type="number"
            defaultValue={profile.maxActiveAthletes != null ? String(profile.maxActiveAthletes) : ""}
          />
        </section>

        <section className={section === "verification" ? "space-y-3" : "hidden"}>
          <p className="text-sm text-zinc-400">
            Completing this profile does not make you publicly discoverable. Train2Play Admin must approve
            your Coach Profile. Background-check status is a separate layer — approval is not a background check.
          </p>
          <p className="text-sm font-semibold">Profile {completion.percent}% complete</p>
          {completion.missing.length > 0 ? (
            <ul className="text-sm text-zinc-400">
              {completion.missing.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-400">Required application fields look complete.</p>
          )}
        </section>

        <section className={section === "videos" ? "space-y-2" : "hidden"}>
          <p className="text-sm text-zinc-400">
            Upload coaching videos below. Public display is opt-in — private training film stays private.
          </p>
          {profile.videos.length === 0 ? (
            <p className="text-sm text-zinc-500">No showcase videos yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {profile.videos.map((video) => (
                <li key={video.id} className="rounded-xl border border-white/10 px-3 py-2">
                  {video.title || video.trainingVideo.title} · {video.kind}
                  {video.publicEligible ? " · public" : " · private"}
                </li>
              ))}
            </ul>
          )}
        </section>

        {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-400">{state.success}</p> : null}
        <Button type="submit" disabled={pending} className="min-h-12 w-full bg-brand text-black">
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>

      {section === "videos" ? <CoachVideoUploadForm /> : null}

      {section === "verification" ? (
        <form action={submitAction} className="space-y-2">
          {submitState.error ? <p className="text-sm text-red-400">{submitState.error}</p> : null}
          {submitState.success ? <p className="text-sm text-emerald-400">{submitState.success}</p> : null}
          <Button type="submit" disabled={submitting} className="min-h-12 w-full bg-brand text-black">
            {submitting ? "Submitting…" : "Submit profile for approval"}
          </Button>
          <Link href="/dashboard/profile" className="block text-center text-sm text-zinc-400">
            Back to My Coach Profile
          </Link>
        </form>
      ) : null}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-slate-300">{label}</Label>
      <Input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 border-white/15 bg-black/30 text-white"
      />
    </div>
  );
}

function FileField({ name, label }: { name: string; label: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-slate-300">{label}</Label>
      <input
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp"
        className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:font-semibold file:text-black"
      />
    </div>
  );
}

function SocialField({
  network,
  defaultUrl,
  defaultPublic,
}: {
  network: string;
  defaultUrl: string | null;
  defaultPublic: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-slate-300 capitalize">{network}</Label>
      <Input
        name={`${network}Url`}
        defaultValue={defaultUrl ?? ""}
        className="h-11 border-white/15 bg-black/30 text-white"
      />
      <label className="flex min-h-10 items-center gap-2 text-sm">
        <input type="checkbox" name={`${network}Public`} defaultChecked={defaultPublic} className="accent-brand" />
        Show publicly
      </label>
    </div>
  );
}

function SportDetails({ sport, row }: { sport: string; row?: SportRow }) {
  return (
    <div className="rounded-2xl border border-white/10 p-3">
      <p className="text-sm font-semibold">{sport} specialties</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {specialtiesForSport(sport).map((item) => (
          <label key={item} className="inline-flex min-h-9 items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              name={`specialties:${sport}`}
              value={item}
              defaultChecked={row?.specialties.includes(item)}
              className="accent-brand"
            />
            {item}
          </label>
        ))}
      </div>
      <Field
        label="Positions trained"
        name={`positions:${sport}`}
        defaultValue={row?.positions.join(", ") ?? ""}
        placeholder="Catcher, Infield"
      />
      <p className="mt-2 text-xs text-zinc-500">Age groups</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {COACHING_AGE_GROUPS.map((group) => (
          <label key={group} className="inline-flex min-h-9 items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              name={`ageGroups:${sport}`}
              value={group}
              defaultChecked={row?.ageGroups.includes(group)}
              className="accent-brand"
            />
            {group}
          </label>
        ))}
      </div>
    </div>
  );
}

function CoachVideoUploadForm() {
  const [state, action, pending] = useActionState(
    uploadCoachProfileVideoAction,
    {} as CoachProfileActionState,
  );
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-white/10 p-4" encType="multipart/form-data">
      <p className="font-semibold">Upload a coaching video</p>
      <input type="file" name="videoFile" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" required />
      <Input name="title" placeholder="Title" className="h-11 border-white/15 bg-black/30 text-white" />
      <select name="kind" className="h-11 w-full rounded-lg border border-white/15 bg-black px-2">
        {Object.values(COACH_VIDEO_KIND).map((kind) => (
          <option key={kind} value={kind}>
            {kind}
          </option>
        ))}
      </select>
      <label className="flex min-h-10 items-center gap-2 text-sm">
        <input type="checkbox" name="publicEligible" className="accent-brand" />
        Eligible for public Coach Profile
      </label>
      <label className="flex min-h-10 items-center gap-2 text-sm">
        <input type="checkbox" name="featured" className="accent-brand" />
        Make featured
      </label>
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-400">{state.success}</p> : null}
      <Button type="submit" disabled={pending} className="min-h-11 bg-brand text-black">
        {pending ? "Uploading…" : "Upload video"}
      </Button>
    </form>
  );
}
