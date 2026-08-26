"use client";

import { useActionState } from "react";

import {
  addLibraryCourseToMyLibraryAction,
  updateLibrarySharingAction,
  type LibraryActionState,
} from "@/app/(dashboard)/library/actions";
import { Button } from "@/components/ui/button";

export function LibrarySharingForm({
  courseId,
  shareWithCoaches,
  shareWithAthletes,
}: {
  courseId: string;
  shareWithCoaches: boolean;
  shareWithAthletes: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateLibrarySharingAction.bind(null, courseId),
    {} as LibraryActionState,
  );

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm font-semibold text-slate-900">Push this course out</p>
      <p className="text-sm text-slate-600">
        Coaches and athletes only see it for the sport on this course.
      </p>
      <label className="flex items-start gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          name="shareWithCoaches"
          defaultChecked={shareWithCoaches}
          className="mt-1 size-4"
        />
        Publish to coaches in this sport
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          name="shareWithAthletes"
          defaultChecked={shareWithAthletes}
          className="mt-1 size-4"
        />
        Publish to athletes who play this sport
      </label>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save publishing"}
      </Button>
    </form>
  );
}

export function AddLibraryCourseButton({ courseId }: { courseId: string }) {
  return (
    <form action={addLibraryCourseToMyLibraryAction.bind(null, courseId)}>
      <Button type="submit">Add to my courses</Button>
    </form>
  );
}
