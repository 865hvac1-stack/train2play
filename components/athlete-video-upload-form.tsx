"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  submitAthleteVideoReviewAction,
  type AthleteVideoActionState,
} from "@/app/(athlete)/athlete/videos/actions";
import { getVideoCategoriesForSport } from "@/lib/video-categories";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CoachOption = {
  id: string;
  name: string;
  sport: string | null;
  organizationName: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-brand px-6 text-base font-bold text-black disabled:opacity-60"
    >
      {pending ? "Sending…" : "SEND FOR REVIEW"}
    </button>
  );
}

export function AthleteVideoUploadForm({
  defaultSport,
  coaches,
}: {
  defaultSport: string;
  coaches: CoachOption[];
}) {
  const [sport, setSport] = useState(defaultSport || "Basketball");
  const [state, action] = useActionState(
    submitAthleteVideoReviewAction,
    {} as AthleteVideoActionState,
  );

  const categories = useMemo(
    () => getVideoCategoriesForSport(sport),
    [sport],
  );

  if (coaches.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
        <p>
          Connect with a coach before sending video for review. Only approved
          coaches can receive your film.
        </p>
        <a
          href="/athlete/connect"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-black"
        >
          Connect with a coach
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" encType="multipart/form-data">
      <div className="space-y-2">
        <Label htmlFor="videoFile" className="text-slate-300">
          Video
        </Label>
        <Input
          id="videoFile"
          name="videoFile"
          type="file"
          accept="video/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm"
          required
          className="min-h-12 border-white/15 bg-black text-white file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-bold file:text-black"
        />
        <p className="text-xs text-slate-500">
          Choose a video from your camera roll / files (up to 100 MB). You can
          also record a new one if your phone offers that option.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title" className="text-slate-300">
          Title
        </Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Shooting Form"
          className="min-h-12 border-white/15 bg-black text-white"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sport" className="text-slate-300">
            Sport
          </Label>
          <Input
            id="sport"
            name="sport"
            required
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="min-h-12 border-white/15 bg-black text-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category" className="text-slate-300">
            Category
          </Label>
          <select
            id="category"
            name="category"
            required
            defaultValue={categories[0]}
            className="flex min-h-12 w-full rounded-lg border border-white/15 bg-black px-3 text-white"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="athleteNote" className="text-slate-300">
          What do you want your coach to look at?
        </Label>
        <textarea
          id="athleteNote"
          name="athleteNote"
          rows={3}
          placeholder="I'm missing everything left. Can you check my feet?"
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-3 text-sm text-white placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300">Send to</Label>
        <div className="space-y-2">
          {coaches.map((coach, index) => (
            <label
              key={coach.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3"
            >
              <input
                type="radio"
                name="coachUserId"
                value={coach.id}
                required
                defaultChecked={index === 0}
                className="mt-1"
              />
              <span>
                <span className="block font-semibold text-white">
                  {coach.name}
                </span>
                <span className="text-xs text-slate-400">
                  {[coach.sport, coach.organizationName]
                    .filter(Boolean)
                    .join(" · ") || "Connected coach"}{" "}
                  · Connected ✓
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-red-400">{state.error}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
