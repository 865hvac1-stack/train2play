"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, Film, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createVideoFromUploadAction,
  createVideoFromUrlAction,
  type VideoActionState,
} from "@/app/(dashboard)/videos/actions";
import { usePreservingSubmit } from "@/components/use-preserving-submit";
import { useVideoCompression } from "@/components/use-video-compression";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/video-upload-limits";

const initialState: VideoActionState = {};

const VIDEO_ACCEPT =
  "video/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v";

function SubmitButton({
  label,
  pending,
  disabled,
}: {
  label: string;
  pending: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      className="w-full sm:w-auto"
      size="lg"
      disabled={pending || disabled}
    >
      {pending ? "Uploading… keep this screen open" : label}
    </Button>
  );
}

function AthleteSelect({
  id,
  athletes,
  defaultAthleteId,
}: {
  id: string;
  athletes: { id: string; firstName: string; lastName: string }[];
  defaultAthleteId?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Athlete (optional)</Label>
      <select
        id={id}
        name="athleteId"
        defaultValue={defaultAthleteId ?? ""}
        className="border-input bg-background h-11 w-full rounded-md border px-3 text-base sm:h-9 sm:text-sm"
      >
        <option value="">Team / general</option>
        {athletes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.firstName} {a.lastName}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AddVideoUrlForm({
  athletes,
  defaultAthleteId,
}: {
  athletes: { id: string; firstName: string; lastName: string }[];
  defaultAthleteId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    createVideoFromUrlAction,
    initialState,
  );
  const onSubmit = usePreservingSubmit(formAction);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="url-title">Title</Label>
        <Input
          id="url-title"
          name="title"
          className="h-11 text-base sm:h-9 sm:text-sm"
          placeholder="Sprint mechanics — side view"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url-videoUrl">Video URL (direct MP4 link)</Label>
        <Input
          id="url-videoUrl"
          name="videoUrl"
          type="url"
          className="h-11 text-base sm:h-9 sm:text-sm"
          placeholder="https://example.com/clip.mp4"
          required
        />
        <p className="text-xs text-muted-foreground">
          Use a direct link to an MP4 file. YouTube links won&apos;t work for drawing — upload the
          file instead.
        </p>
      </div>

      <AthleteSelect
        id="url-athleteId"
        athletes={athletes}
        defaultAthleteId={defaultAthleteId}
      />

      <div className="space-y-2">
        <Label htmlFor="url-description">Notes (optional)</Label>
        <Textarea
          id="url-description"
          name="description"
          rows={2}
          className="text-base sm:text-sm"
          placeholder="Context for this clip…"
        />
      </div>

      <SubmitButton label="Add from URL" pending={pending} />
    </form>
  );
}

export function UploadVideoForm({
  athletes,
  defaultAthleteId,
}: {
  athletes: { id: string; firstName: string; lastName: string }[];
  defaultAthleteId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    createVideoFromUploadAction,
    initialState,
  );
  const onSubmit = usePreservingSubmit(formAction);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [optimize, setOptimize] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state: compression, prepare, reset } = useVideoCompression();
  const busy = compression.status === "working";
  const fileError = compression.sizeError;

  function openPicker(mode: "gallery" | "camera") {
    const input = fileInputRef.current;
    if (!input) return;

    if (mode === "camera") {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }

    input.click();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" encType="multipart/form-data">
      {compression.mediaId ? (
        <input
          type="hidden"
          name="directVideoMediaId"
          value={compression.mediaId}
        />
      ) : null}
      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="file-title">Title</Label>
        <Input
          id="file-title"
          name="title"
          className="h-11 text-base sm:h-9 sm:text-sm"
          placeholder="Throwing form — game film"
          required
          defaultValue={selectedFile?.name.replace(/\.[^.]+$/, "") ?? ""}
          key={selectedFile?.name ?? "title-empty"}
        />
      </div>

      <div className="space-y-3">
        <Label>Video from your phone or computer</Label>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          {[
            { value: true, label: "Optimized 720p", note: "Recommended" },
            { value: false, label: "Original quality", note: "R2 required" },
          ].map((choice) => (
            <button
              key={String(choice.value)}
              type="button"
              disabled={busy}
              onClick={() => {
                setOptimize(choice.value);
                if (selectedFile) {
                  void prepare(selectedFile, fileInputRef.current, {
                    optimize: choice.value,
                  });
                }
              }}
              className={cn(
                "rounded-md px-2 py-2 text-xs disabled:opacity-60",
                optimize === choice.value
                  ? "bg-white font-semibold shadow-sm"
                  : "text-slate-600",
              )}
            >
              <span className="block">{choice.label}</span>
              <span className="block font-normal text-slate-500">
                {choice.note}
              </span>
            </button>
          ))}
        </div>

        <input
          ref={fileInputRef}
          id="file"
          name="file"
          type="file"
          accept={VIDEO_ACCEPT}
          className="sr-only"
          required={!selectedFile}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setSelectedFile(file);
            if (file) {
              void prepare(file, fileInputRef.current, { optimize });
            }
            else reset();
          }}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => openPicker("camera")}
            className={cn(
              "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/40 bg-brand-light/60 px-4 py-4 text-center transition-colors",
              "active:bg-brand-light hover:border-brand hover:bg-brand-light",
            )}
          >
            <Camera className="h-7 w-7 text-brand" />
            <span className="text-sm font-semibold text-slate-900">Record / take video</span>
            <span className="text-xs text-slate-600">Opens your camera on phones</span>
          </button>

          <button
            type="button"
            onClick={() => openPicker("gallery")}
            className={cn(
              "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-4 text-center transition-colors",
              "active:bg-slate-50 hover:border-brand hover:bg-brand-light/40",
            )}
          >
            <Film className="h-7 w-7 text-slate-700" />
            <span className="text-sm font-semibold text-slate-900">Choose from gallery</span>
            <span className="text-xs text-slate-600">Photos / Files on your device</span>
          </button>
        </div>

        {selectedFile ? (
          <div className="flex items-start gap-3 rounded-lg border border-brand/30 bg-brand-light/50 px-3 py-3">
            <Upload className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{selectedFile.name}</p>
              {fileError || compression.uploadError ? (
                <p className="text-xs text-destructive">
                  {fileError ?? compression.uploadError}
                </p>
              ) : (
                <p className="text-xs text-slate-600">
                  {compression.message ?? formatBytes(selectedFile.size)}
                </p>
              )}
              {busy ? (
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand/20"
                  role="progressbar"
                  aria-valuenow={compression.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-brand transition-[width]"
                    style={{ width: `${compression.percent}%` }}
                  />
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => {
                setSelectedFile(null);
                reset();
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Clear
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Works with iPhone and Android videos (MP4 / MOV). Long clips are
            compressed on your device first, so a 45-second drill uploads in
            seconds instead of failing.
          </p>
        )}
      </div>

      <AthleteSelect
        id="file-athleteId"
        athletes={athletes}
        defaultAthleteId={defaultAthleteId}
      />

      <div className="space-y-2">
        <Label htmlFor="file-description">Notes (optional)</Label>
        <Textarea
          id="file-description"
          name="description"
          rows={2}
          className="text-base sm:text-sm"
        />
      </div>

      <SubmitButton
        label={busy ? "Compressing…" : "Upload video"}
        pending={pending}
        disabled={Boolean(fileError) || busy}
      />
    </form>
  );
}
