"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createCourseAction,
  createCourseItemAction,
  updateCourseAction,
  updateCourseItemAction,
  type CourseActionState,
} from "@/app/(dashboard)/courses/actions";
import { InstructionVideoFields } from "@/components/instruction-video-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COURSE_ITEM_TYPES,
  COURSE_SPORTS,
  courseAgeBandOptions,
} from "@/lib/courses";

const initialState: CourseActionState = {};

function SubmitButton({
  label,
  pendingLabel = "Saving…",
}: {
  label: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function CourseForm({
  mode = "create",
  courseId,
  defaults,
}: {
  mode?: "create" | "edit";
  courseId?: string;
  defaults?: {
    title?: string;
    sport?: string;
    description?: string | null;
    ageBand?: string | null;
    published?: boolean;
  };
}) {
  const action =
    mode === "edit" && courseId
      ? updateCourseAction.bind(null, courseId)
      : createCourseAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Course title</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={defaults?.title}
          placeholder="Baseball hitting fundamentals"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sport">Sport</Label>
          <select
            id="sport"
            name="sport"
            required
            defaultValue={defaults?.sport ?? ""}
            className="border-input bg-background h-11 w-full rounded-md border px-3 text-base sm:h-9 sm:text-sm"
          >
            <option value="" disabled>
              Select a sport
            </option>
            {COURSE_SPORTS.map((sport) => (
              <option key={sport} value={sport}>
                {sport}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ageBand">Age focus</Label>
          <select
            id="ageBand"
            name="ageBand"
            defaultValue={defaults?.ageBand ?? ""}
            className="border-input bg-background h-11 w-full rounded-md border px-3 text-base sm:h-9 sm:text-sm"
          >
            {courseAgeBandOptions.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaults?.description ?? ""}
          placeholder="What coaches and athletes will learn in this course…"
          className="flex min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="published"
          value="true"
          defaultChecked={defaults?.published ?? true}
          className="size-4 rounded border-slate-300"
        />
        Published in my library
      </label>

      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton label={mode === "edit" ? "Save course" : "Create course"} />
    </form>
  );
}

export function CourseItemForm({
  courseId,
  mode = "create",
  itemId,
  defaults,
}: {
  courseId: string;
  mode?: "create" | "edit";
  itemId?: string;
  defaults?: {
    type?: string;
    title?: string;
    body?: string | null;
    focus?: string | null;
    coachingCue?: string | null;
    equipment?: string | null;
    durationMin?: number | null;
    ageBand?: string | null;
    videoUrl?: string | null;
  };
}) {
  const action =
    mode === "edit" && itemId
      ? updateCourseItemAction.bind(null, courseId, itemId)
      : createCourseItemAction.bind(null, courseId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className="space-y-4"
      encType="multipart/form-data"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            defaultValue={defaults?.type ?? "DRILL"}
            className="border-input bg-background h-11 w-full rounded-md border px-3 text-base sm:h-9 sm:text-sm"
          >
            {COURSE_ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === "DRILL" ? "Drill" : type === "TIP" ? "Tip" : "Video"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ageBand">Age band</Label>
          <select
            id="ageBand"
            name="ageBand"
            defaultValue={defaults?.ageBand ?? ""}
            className="border-input bg-background h-11 w-full rounded-md border px-3 text-base sm:h-9 sm:text-sm"
          >
            {courseAgeBandOptions.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={defaults?.title}
          placeholder="Tee contact reps"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="focus">Focus</Label>
        <Input
          id="focus"
          name="focus"
          defaultValue={defaults?.focus ?? ""}
          placeholder="Swing path, soft hands, acceleration…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">How-to / tip details</Label>
        <textarea
          id="body"
          name="body"
          rows={4}
          defaultValue={defaults?.body ?? ""}
          placeholder="Step-by-step instructions coaches and athletes can follow…"
          className="flex min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coachingCue">Coaching cue</Label>
        <Input
          id="coachingCue"
          name="coachingCue"
          defaultValue={defaults?.coachingCue ?? ""}
          placeholder="One short cue athletes remember"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="equipment">Equipment</Label>
          <Input
            id="equipment"
            name="equipment"
            defaultValue={defaults?.equipment ?? ""}
            placeholder="Ball, cones, tee…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationMin">Minutes</Label>
          <Input
            id="durationMin"
            name="durationMin"
            type="number"
            min={1}
            defaultValue={defaults?.durationMin ?? undefined}
            placeholder="12"
          />
        </div>
      </div>

      <InstructionVideoFields
        idPrefix={itemId ? `course-item-${itemId}` : "course-item-new"}
        defaultUrl={defaults?.videoUrl}
        title="Drill video (optional)"
        description="Record or upload a demo, or paste a YouTube / Vimeo / MP4 link."
      />

      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton
        label={mode === "edit" ? "Save item" : "Add to course"}
        pendingLabel="Saving… keep this screen open"
      />
    </form>
  );
}
