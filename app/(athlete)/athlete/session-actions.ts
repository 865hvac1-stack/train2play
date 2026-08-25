"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAthleteContext } from "@/lib/athlete-dashboard";
import type { ResultKind } from "@/lib/personal-records";
import {
  completeExerciseInSession,
  finishWorkoutSession,
  startOrResumeWorkoutSession,
} from "@/lib/workout-session";

export type SessionActionState = {
  error?: string;
  ok?: boolean;
  isPersonalRecord?: boolean;
  nonce?: number;
};

export async function startWorkoutAction(workoutId: string) {
  const ctx = await requireAthleteContext();
  if (!ctx.athleteId) {
    throw new Error("Athlete profile is not linked yet");
  }

  const { session, alreadyComplete } = await startOrResumeWorkoutSession({
    athleteUserId: ctx.userId,
    athleteId: ctx.athleteId,
    workoutId,
  });

  revalidatePath("/athlete");
  revalidatePath("/athlete/train");

  if (alreadyComplete) {
    redirect(`/athlete/workout/${session.id}/complete`);
  }

  redirect(`/athlete/workout/${session.id}`);
}

export async function completeExerciseAction(
  sessionId: string,
  workoutExerciseId: string,
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const ctx = await requireAthleteContext();

  const resultKind = String(
    formData.get("resultKind") ?? "NONE",
  ) as ResultKind;
  const primaryRaw = String(formData.get("valuePrimary") ?? "").trim();
  const secondaryRaw = String(formData.get("valueSecondary") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const unit = String(formData.get("unit") ?? "").trim() || null;

  const valuePrimary =
    primaryRaw === "" ? null : Number.parseFloat(primaryRaw);
  const valueSecondary =
    secondaryRaw === "" ? null : Number.parseFloat(secondaryRaw);

  if (primaryRaw !== "" && Number.isNaN(valuePrimary)) {
    return { error: "Enter a valid number" };
  }
  if (secondaryRaw !== "" && Number.isNaN(valueSecondary)) {
    return { error: "Enter a valid number for attempts" };
  }

  try {
    const { isPersonalRecord } = await completeExerciseInSession({
      athleteUserId: ctx.userId,
      sessionId,
      workoutExerciseId,
      resultKind,
      valuePrimary,
      valueSecondary,
      unit,
      notes,
    });

    revalidatePath(`/athlete/workout/${sessionId}`);
    revalidatePath("/athlete");
    revalidatePath("/athlete/progress");
    revalidatePath("/athlete/history");

    return { ok: true, isPersonalRecord, nonce: Date.now() };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not save exercise",
    };
  }
}

export async function finishWorkoutAction(sessionId: string) {
  const ctx = await requireAthleteContext();

  try {
    await finishWorkoutSession({
      athleteUserId: ctx.userId,
      sessionId,
    });
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Could not finish workout",
    );
  }

  revalidatePath("/athlete");
  revalidatePath("/athlete/train");
  revalidatePath("/athlete/progress");
  revalidatePath("/athlete/history");
  revalidatePath(`/athlete/workout/${sessionId}/complete`);
  redirect(`/athlete/workout/${sessionId}/complete`);
}
