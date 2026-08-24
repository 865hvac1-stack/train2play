"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { athleteSchema } from "@/lib/athletes";
import { syncAthleteProfile } from "@/lib/athlete-profiles";
import { requireAthleteAccess } from "@/lib/authz";
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

  const athlete = await prisma.athlete.create({
    data: {
      coachId: user.id,
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      sport: parsed.data.sport,
      position: parsed.data.position?.trim() || null,
      dateOfBirth,
      notes: parsed.data.notes?.trim() || null,
      rosterStatus: "ROSTER",
    },
  });

  await syncAthleteProfile(athlete);

  revalidatePath("/dashboard");
  revalidatePath("/athletes");
  redirect("/athletes");
}

export async function deleteAthleteAction(athleteId: string) {
  const user = await requireUser();

  await requireAthleteAccess(prisma, user.id, athleteId, "edit");

  await prisma.athlete.delete({ where: { id: athleteId } });

  revalidatePath("/dashboard");
  revalidatePath("/athletes");
  redirect("/athletes");
}
