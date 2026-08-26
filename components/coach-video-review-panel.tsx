"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  assignDrillFromReviewAction,
  assignPlanFromReviewAction,
  saveCoachFeedbackAction,
  saveCoachFeedbackDraftAction,
  type CoachReviewActionState,
} from "@/app/(dashboard)/videos/review-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listCatalogDrillsForSport } from "@/lib/drills";

function SubmitLabel({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return <>{pending ? busy : idle}</>;
}

type PlanOption = {
  id: string;
  title: string;
  workoutCount: number;
};

export function CoachReviewAssignPanel({
  reviewId,
  sport,
  plans,
}: {
  reviewId: string;
  sport: string;
  plans: PlanOption[];
}) {
  const drills = useMemo(() => listCatalogDrillsForSport(sport), [sport]);
  const [mode, setMode] = useState<"drill" | "workout" | "program">("drill");
  const [drillState, drillAction] = useActionState(
    assignDrillFromReviewAction.bind(null, reviewId),
    {} as CoachReviewActionState,
  );
  const [workoutState, workoutAction] = useActionState(
    assignPlanFromReviewAction.bind(null, reviewId, "WORKOUT"),
    {} as CoachReviewActionState,
  );
  const [programState, programAction] = useActionState(
    assignPlanFromReviewAction.bind(null, reviewId, "PROGRAM"),
    {} as CoachReviewActionState,
  );

  const state =
    mode === "drill"
      ? drillState
      : mode === "workout"
        ? workoutState
        : programState;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="font-heading text-lg font-bold text-slate-900">
          Assign training
        </h3>
        <p className="text-sm text-slate-600">
          Assign corrective work from this review without leaving the page.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["drill", "Assign drill"],
            ["workout", "Assign workout"],
            ["program", "Assign program"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={mode === value ? "default" : "outline"}
            onClick={() => setMode(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {mode === "drill" ? (
        <form action={drillAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="drillId">Drill</Label>
            <select
              id="drillId"
              name="drillId"
              required
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select a drill…
              </option>
              {drills.map(({ drill, ageBandLabel }) => (
                <option key={drill.id} value={drill.id}>
                  {drill.title} ({ageBandLabel})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sets">Sets</Label>
              <Input id="sets" name="sets" type="number" min={1} defaultValue={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reps">Reps</Label>
              <Input id="reps" name="reps" type="number" min={1} defaultValue={10} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coachNote">Coach note</Label>
            <Input
              id="coachNote"
              name="coachNote"
              placeholder="Focus on getting your feet set before the catch."
            />
          </div>
          <Button type="submit">
            <SubmitLabel idle="Assign to athlete" busy="Assigning…" />
          </Button>
        </form>
      ) : null}

      {mode === "workout" ? (
        <form action={workoutAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="sourcePlanId">Source plan / workout</Label>
            <select
              id="sourcePlanId"
              name="sourcePlanId"
              required
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select…
              </option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title} ({plan.workoutCount} sessions)
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coachNoteWorkout">Coach note</Label>
            <Input id="coachNoteWorkout" name="coachNote" />
          </div>
          <Button type="submit" disabled={plans.length === 0}>
            <SubmitLabel idle="Assign workout" busy="Assigning…" />
          </Button>
        </form>
      ) : null}

      {mode === "program" ? (
        <form action={programAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="sourcePlanIdProgram">Program</Label>
            <select
              id="sourcePlanIdProgram"
              name="sourcePlanId"
              required
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select…
              </option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title} ({plan.workoutCount} sessions)
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coachNoteProgram">Coach note</Label>
            <Input id="coachNoteProgram" name="coachNote" />
          </div>
          <Button type="submit" disabled={plans.length === 0}>
            <SubmitLabel idle="Assign program" busy="Assigning…" />
          </Button>
        </form>
      ) : null}

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-primary">{state.success}</p>
      ) : null}
    </div>
  );
}

export function CoachReviewFeedbackForm({
  reviewId,
  defaultFeedback,
  isReviewed,
  hasVoiceReview = false,
}: {
  reviewId: string;
  defaultFeedback: string;
  isReviewed: boolean;
  hasVoiceReview?: boolean;
}) {
  const [draftState, draftAction] = useActionState(
    saveCoachFeedbackDraftAction.bind(null, reviewId),
    {} as CoachReviewActionState,
  );
  const [completeState, completeAction] = useActionState(
    saveCoachFeedbackAction.bind(null, reviewId),
    {} as CoachReviewActionState,
  );

  const state = completeState.success || completeState.error ? completeState : draftState;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="font-heading text-lg font-bold text-slate-900">
          Coach feedback
        </h3>
        <p className="text-sm text-slate-600">
          Written feedback is optional when a voice review is saved. Save a
          draft anytime, then complete the review when ready.
        </p>
      </div>
      <form action={completeAction} className="space-y-3">
        <textarea
          name="coachFeedback"
          rows={5}
          defaultValue={defaultFeedback}
          required={!hasVoiceReview}
          placeholder="Your feet are getting too narrow before the catch..."
          className="w-full rounded-lg border border-input px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" formAction={draftAction} variant="outline">
            <SubmitLabel idle="Save draft" busy="Saving…" />
          </Button>
          <Button type="submit" disabled={isReviewed}>
            <SubmitLabel
              idle={
                isReviewed
                  ? "Already reviewed"
                  : hasVoiceReview
                    ? "Save & send review"
                    : "Complete review"
              }
              busy="Sending…"
            />
          </Button>
        </div>
      </form>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-primary">{state.success}</p>
      ) : null}
    </div>
  );
}
