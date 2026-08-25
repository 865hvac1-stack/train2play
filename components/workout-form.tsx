"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Camera, Film, Link2, Upload } from "lucide-react";

import {
  attachWorkoutInstructionVideoAction,
  createWorkoutAction,
  type TrainingActionState,
} from "@/app/(dashboard)/training/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: TrainingActionState = {};

const VIDEO_ACCEPT =
  "video/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? pendingLabel : label}
    </Button>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function VideoSourceFields({
  idPrefix,
  required = false,
}: {
  idPrefix: string;
  required?: boolean;
}) {
  const [mode, setMode] = useState<"upload" | "url">("url");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function openPicker(pickerMode: "gallery" | "camera") {
    const input = fileInputRef.current;
    if (!input) return;
    if (pickerMode === "camera") {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }
    input.click();
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand/25 bg-brand-light/50 p-3 sm:p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">
          Video for kids to watch{required ? "" : " (optional)"}
        </p>
        <p className="text-xs text-slate-600">
          Upload a clip, or paste a YouTube / Vimeo / direct MP4 link. Shows on the family share
          page.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "url" ? "default" : "outline"}
          onClick={() => setMode("url")}
        >
          <Link2 className="size-3.5" />
          Paste link
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "upload" ? "default" : "outline"}
          onClick={() => setMode("upload")}
        >
          <Upload className="size-3.5" />
          Upload file
        </Button>
      </div>

      {mode === "url" ? (
        <div className="space-y-2">
          <input type="hidden" name="instructionVideoMode" value="url" />
          <Label htmlFor={`${idPrefix}-url`}>YouTube, Vimeo, or MP4 URL</Label>
          <Input
            id={`${idPrefix}-url`}
            name="instructionVideoUrl"
            type="url"
            required={required}
            placeholder="https://youtube.com/watch?v=… or https://….mp4"
            className="h-11 text-base sm:h-9 sm:text-sm"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <input type="hidden" name="instructionVideoMode" value="upload" />
          <input
            ref={fileInputRef}
            id={`${idPrefix}-file`}
            name="instructionVideoFile"
            type="file"
            accept={VIDEO_ACCEPT}
            className="sr-only"
            required={required && !selectedFile}
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => openPicker("camera")}
              className={cn(
                "flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand/40 bg-white px-3 py-3 text-center",
                "hover:border-brand hover:bg-brand-light/40",
              )}
            >
              <Camera className="h-6 w-6 text-brand" />
              <span className="text-sm font-semibold text-slate-900">Record</span>
            </button>
            <button
              type="button"
              onClick={() => openPicker("gallery")}
              className={cn(
                "flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white px-3 py-3 text-center",
                "hover:border-brand hover:bg-brand-light/40",
              )}
            >
              <Film className="h-6 w-6 text-slate-700" />
              <span className="text-sm font-semibold text-slate-900">Gallery / files</span>
            </button>
          </div>
          {selectedFile ? (
            <div className="rounded-lg border border-brand/30 bg-white px-3 py-2 text-sm">
              <p className="truncate font-medium text-slate-900">{selectedFile.name}</p>
              <p className="text-xs text-slate-600">{formatBytes(selectedFile.size)} · ready</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">MP4 / MOV · up to 100 MB</p>
          )}
        </div>
      )}
    </div>
  );
}

type WorkoutFormProps = {
  planId: string;
};

export function WorkoutForm({ planId }: WorkoutFormProps) {
  const [state, formAction] = useActionState(
    createWorkoutAction.bind(null, planId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4" encType="multipart/form-data">
      <div className="space-y-2">
        <Label htmlFor="title">Workout title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Speed and agility session"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Instructions</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Drills, sets, reps, rest periods..."
          className="flex min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="scheduledDate">Scheduled date</Label>
          <Input id="scheduledDate" name="scheduledDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationMinutes">Duration (minutes)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            placeholder="45"
          />
        </div>
      </div>

      <VideoSourceFields idPrefix="new-workout" />

      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton label="Add workout" pendingLabel="Saving… keep this screen open" />
    </form>
  );
}

type AttachVideoFormProps = {
  planId: string;
  workoutId: string;
};

export function AttachWorkoutVideoForm({ planId, workoutId }: AttachVideoFormProps) {
  const [state, formAction] = useActionState(
    attachWorkoutInstructionVideoAction.bind(null, planId, workoutId),
    initialState,
  );

  return (
    <form action={formAction} className="mt-3 space-y-3" encType="multipart/form-data">
      <VideoSourceFields idPrefix={`workout-${workoutId}`} required />
      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <SubmitButton
        label="Save video for kids"
        pendingLabel="Uploading… keep this screen open"
      />
    </form>
  );
}
