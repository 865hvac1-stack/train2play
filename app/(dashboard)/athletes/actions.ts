"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { issueAthleteInviteEmail } from "@/app/(dashboard)/athletes/invite-actions";
import { athleteSchema } from "@/lib/athletes";
import { syncAthleteProfile } from "@/lib/athlete-profiles";
import { requireAthleteAccess } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { requireCoach, requireUser } from "@/lib/session";

export type AthleteActionState = {
  error?: string;
  athleteId?: string;
  inviteUrl?: string;
  emailSent?: boolean;
  emailReason?: string;
};

export async function createAthleteAction(
  _prevState: AthleteActionState,
  formData: FormData,
): Promise<AthleteActionState> {
  const user = await requireCoach();

  const inviteEmailRaw = String(formData.get("inviteEmail") ?? "").trim();

  const parsed = athleteSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    sport: formData.get("sport"),
    position: formData.get("position") || undefined,
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    notes: formData.get("notes") || undefined,
    inviteEmail: inviteEmailRaw || undefined,
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

  const inviteEmail = parsed.data.inviteEmail?.trim().toLowerCase();

  if (inviteEmail) {
    try {
      const invite = await issueAthleteInviteEmail({
        coachUserId: user.id,
        coachName: user.name ?? "Your coach",
        athleteId: athlete.id,
        email: inviteEmail,
      });

      revalidatePath("/dashboard");
      revalidatePath("/athletes");
      revalidatePath(`/athletes/${athlete.id}`);

      if (invite.emailSent) {
        redirect(`/athletes/${athlete.id}?invite=sent`);
      }

      // Email not configured / failed — keep coach on form result to copy link
      return {
        athleteId: athlete.id,
        inviteUrl: invite.inviteUrl,
        emailSent: false,
        emailReason: invite.emailReason,
      };
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "digest" in error &&
        typeof (error as { digest?: string }).digest === "string" &&
        (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw error;
      }
      revalidatePath("/dashboard");
      revalidatePath("/athletes");
      return {
        athleteId: athlete.id,
        error:
          error instanceof Error
            ? `Athlete saved, but invite failed: ${error.message}`
            : "Athlete saved, but invite failed.",
      };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/athletes");
  redirect(`/athletes/${athlete.id}`);
}

export async function deleteAthleteAction(athleteId: string) {
  const user = await requireUser();

  await requireAthleteAccess(prisma, user.id, athleteId, "edit");

  await prisma.athlete.delete({ where: { id: athleteId } });

  revalidatePath("/dashboard");
  revalidatePath("/athletes");
  redirect("/athletes");
}
