"use client";

import { useActionState, useMemo, useRef, useState } from "react";
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

/** Prefer gallery-friendly types (no capture attribute anywhere). */
const LIBRARY_ACCEPT =
  "video/mp4,video/quicktime,video/x-m4v,video/webm,.mp4,.mov,.m4v,.webm";

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-brand px-6 text-base font-bold text-black disabled:opacity-60"
    >
      {pending ? "Sending…" : "SEND FOR REVIEW"}
    </button>
  );
}

function copyFileToInput(file: File, target: HTMLInputElement | null) {
  if (!target) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  target.files = transfer.files;
}

export function AthleteVideoUploadForm({
  defaultSport,
  coaches,
}: {
  defaultSport: string;
  coaches: CoachOption[];
}) {
  const [sport, setSport] = useState(defaultSport || "Basketball");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const formFileRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const recordRef = useRef<HTMLInputElement>(null);

  const [state, action] = useActionState(
    submitAthleteVideoReviewAction,
    {} as AthleteVideoActionState,
  );

  const categories = useMemo(
    () => getVideoCategoriesForSport(sport),
    [sport],
  );

  function onPickedFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm)$/i.test(file.name)) {
      setFileError("Please choose a video file from your camera roll.");
      setFileName(null);
      if (formFileRef.current) formFileRef.current.value = "";
      return;
    }
    copyFileToInput(file, formFileRef.current);
    setFileName(file.name || "Selected video");
    setFileError(null);
  }

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
      <div className="space-y-3">
        <Label className="text-slate-300">Video</Label>

        {/* Named field the server action reads — never uses capture */}
        <input
          ref={formFileRef}
          type="file"
          name="videoFile"
          accept={LIBRARY_ACCEPT}
          required
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => onPickedFile(e.target.files?.[0])}
        />

        {/* Gallery / camera roll — explicit, no capture */}
        <input
          ref={libraryRef}
          type="file"
          accept={LIBRARY_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            onPickedFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {/* Optional record — only this one uses capture */}
        <input
          ref={recordRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            onPickedFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => libraryRef.current?.click()}
            className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-brand px-4 text-sm font-bold text-black"
          >
            Choose from camera roll
          </button>
          <button
            type="button"
            onClick={() => recordRef.current?.click()}
            className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/20 bg-zinc-900 px-4 text-sm font-bold text-white"
          >
            Record new video
          </button>
        </div>

        {fileName ? (
          <p className="rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-brand">
            Selected: {fileName}
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Tap <strong className="text-slate-300">Choose from camera roll</strong>{" "}
            to upload a video already on your phone (up to 100 MB).
          </p>
        )}
        {fileError ? <p className="text-sm text-red-400">{fileError}</p> : null}
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

      <SubmitButton disabled={!fileName} />
    </form>
  );
}
