"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createVideoFromUploadAction,
  createVideoFromUrlAction,
  type VideoActionState,
} from "@/app/(dashboard)/videos/actions";

const initialState: VideoActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
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
        <Input id="url-title" name="title" placeholder="Sprint mechanics — side view" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url-videoUrl">Video URL (direct MP4 link)</Label>
        <Input
          id="url-videoUrl"
          name="videoUrl"
          type="url"
          placeholder="https://example.com/clip.mp4"
          required
        />
        <p className="text-xs text-muted-foreground">
          Use a direct link to an MP4 file. YouTube links won&apos;t work for drawing — upload the
          file instead.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="url-athleteId">Athlete (optional)</Label>
        <select
          id="url-athleteId"
          name="athleteId"
          defaultValue={defaultAthleteId ?? ""}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="">Team / general</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.firstName} {a.lastName}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="url-description">Notes (optional)</Label>
        <Textarea id="url-description" name="description" rows={2} placeholder="Context for this clip…" />
      </div>

      <SubmitButton label="Add from URL" />
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
  const [state, formAction] = useActionState(createVideoFromUploadAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="file-title">Title</Label>
        <Input id="file-title" name="title" placeholder="Throwing form — game film" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Video file</Label>
        <Input id="file" name="file" type="file" accept="video/mp4,video/webm,video/quicktime" required />
        <p className="text-xs text-muted-foreground">MP4, WebM, or MOV — up to 100 MB.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file-athleteId">Athlete (optional)</Label>
        <select
          id="file-athleteId"
          name="athleteId"
          defaultValue={defaultAthleteId ?? ""}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="">Team / general</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.firstName} {a.lastName}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file-description">Notes (optional)</Label>
        <Textarea id="file-description" name="description" rows={2} />
      </div>

      <SubmitButton label="Upload video" />
    </form>
  );
}
