"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
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
import { cn } from "@/lib/utils";
import { videoFileSizeError } from "@/lib/video-upload-limits";

const initialState: VideoActionState = {};

const VIDEO_ACCEPT =
  "video/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v";

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
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
  const [state, formAction] = useActionState(createVideoFromUrlAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
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

      <SubmitButton label="Add from URL" />
    </form>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadVideoForm({
  athletes,
  defaultAthleteId,
}: {
  athletes: { id: string; firstName: string; lastName: string }[];
  defaultAthleteId?: string;
}) {
  const [state, formAction] = useActionState(createVideoFromUploadAction, initialState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileError = selectedFile ? videoFileSizeError(selectedFile) : null;

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
    <form action={formAction} className="space-y-4" encType="multipart/form-data">
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

        <input
          ref={fileInputRef}
          id="file"
          name="file"
          type="file"
          accept={VIDEO_ACCEPT}
          className="sr-only"
          required={!selectedFile}
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
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
              <p className="text-xs text-slate-600">
                {formatBytes(selectedFile.size)}
                {fileError ? ` — ${fileError}` : " · ready to upload"}
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Clear
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Works with iPhone and Android videos (MP4 / MOV). Max 100 MB — shorter clips upload
            more reliably on cellular.
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

      <SubmitButton label="Upload video" disabled={Boolean(fileError)} />
    </form>
  );
}
