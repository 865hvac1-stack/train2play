"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { athleteSchema } from "@/lib/athletes";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type AthleteActionState = {
  error?: string;
};

export async function createAthleteAction(
  _prevState: AthleteActionState,
  formData: FormData,
): Promise<AthleteActionState> {
  const user = await requireUser();

  const parsed = athleteSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    sport: formData.get("sport"),
    position: formData.get("position") || undefined,
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const dateOfBirth = parsed.data.dateOfBirth
    ? new Date(parsed.data.dateOfBirth)
    : null;

  await prisma.athlete.create({
    data: {
      coachId: user.id,
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      sport: parsed.data.sport,
      position: parsed.data.position?.trim() || null,
      dateOfBirth,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/athletes");
  redirect("/athletes");
}

export async function deleteAthleteAction(athleteId: string) {
  const user = await requireUser();

  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, coachId: user.id },
  });

  if (!athlete) {
    throw new Error("Athlete not found");
  }

  await prisma.athlete.delete({ where: { id: athleteId } });

  revalidatePath("/dashboard");
  revalidatePath("/athletes");
  redirect("/athletes");
}
