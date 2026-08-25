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
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

function VideoSourceFields({ idPrefix }: { idPrefix: string }) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="space-y-3 rounded-xl border border-brand/20 bg-brand-light/40 p-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Video for kids to watch</p>
        <p className="text-xs text-slate-500">
          Optional. Shows on this workout and on the family share link.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "upload" ? "default" : "outline"}
          onClick={() => setMode("upload")}
        >
          <Upload className="size-3.5" />
          Upload
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "url" ? "default" : "outline"}
          onClick={() => setMode("url")}
        >
          <Link2 className="size-3.5" />
          Paste URL
        </Button>
      </div>

      {mode === "upload" ? (
        <div className="space-y-2">
          <input type="hidden" name="instructionVideoMode" value="upload" />
          <input
            ref={fileRef}
            id={`${idPrefix}-file`}
            name="instructionVideoFile"
            type="file"
            accept={VIDEO_ACCEPT}
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setFileName(file?.name ?? null);
            }}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 justify-start"
              onClick={() => {
                if (fileRef.current) {
                  fileRef.current.setAttribute("capture", "environment");
                  fileRef.current.click();
                }
              }}
            >
              <Camera className="size-4 text-brand" />
              Record / take video
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 justify-start"
              onClick={() => {
                if (fileRef.current) {
                  fileRef.current.removeAttribute("capture");
                  fileRef.current.click();
                }
              }}
            >
              <Film className="size-4 text-brand" />
              Choose from gallery
            </Button>
          </div>
          <p className={cn("text-xs", fileName ? "text-slate-800" : "text-slate-500")}>
            {fileName ? `Selected: ${fileName}` : "MP4 / MOV · up to 100 MB"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <input type="hidden" name="instructionVideoMode" value="url" />
          <Label htmlFor={`${idPrefix}-url`}>Direct video URL</Label>
          <Input
            id={`${idPrefix}-url`}
            name="instructionVideoUrl"
            type="url"
            placeholder="https://…/clip.mp4"
          />
          <p className="text-xs text-slate-500">
            Must be a direct MP4/MOV link (not a YouTube page).
          </p>
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
        <p className="text-sm text-destructive">{state.error}</p>
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
      <VideoSourceFields idPrefix={`workout-${workoutId}`} />
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <SubmitButton
        label="Add video for kids"
        pendingLabel="Uploading… keep this screen open"
      />
    </form>
  );
}
