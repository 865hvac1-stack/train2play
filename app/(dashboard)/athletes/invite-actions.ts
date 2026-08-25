"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAthleteInvite } from "@/lib/athlete-invite";
import { prisma } from "@/lib/db";
import { sendAthleteLoginInviteEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { isEmailConfigured } from "@/lib/settings";
import { requireCoach } from "@/lib/session";

export type InviteActionState = { error?: string; inviteUrl?: string };

export async function inviteAthleteLoginAction(
  athleteId: string,
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const coach = await requireCoach();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address" };
  }

  try {
    const invite = await createAthleteInvite({
      coachUserId: coach.id,
      athleteId,
      email,
    });

    // Token only returned to the coach UI — never logged
    const inviteUrl = `${getAppUrl()}/accept-invite?token=${invite.token}`;

    if (isEmailConfigured()) {
      const athlete = await prisma.athlete.findUnique({
        where: { id: athleteId },
        select: { firstName: true, lastName: true },
      });
      try {
        await sendAthleteLoginInviteEmail({
          to: email,
          athleteName: athlete
            ? `${athlete.firstName} ${athlete.lastName}`
            : "Athlete",
          coachName: coach.name ?? "Your coach",
          inviteUrl,
        });
      } catch {
        // Coach can still copy the link
      }
    }

    revalidatePath(`/athletes/${athleteId}`);
    return { inviteUrl };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create invite",
    };
  }
}

export async function acceptInviteAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "");

  try {
    const { acceptAthleteInvite } = await import("@/lib/athlete-invite");
    const result = await acceptAthleteInvite({ token, password, name });

    const { signIn } = await import("@/auth");
    await signIn("credentials", {
      email: result.email,
      password,
      redirect: false,
    });
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
    return {
      error: error instanceof Error ? error.message : "Could not accept invite",
    };
  }

  redirect("/athlete");
}
