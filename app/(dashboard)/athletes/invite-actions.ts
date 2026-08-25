"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAthleteInvite } from "@/lib/athlete-invite";
import { prisma } from "@/lib/db";
import { sendAthleteLoginInviteEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { isEmailConfigured } from "@/lib/settings";
import { requireCoach } from "@/lib/session";

export type InviteActionState = {
  error?: string;
  inviteUrl?: string;
  emailSent?: boolean;
  emailReason?: string;
};

/** Create invite + attempt email. Raw token only returned to coach UI, never logged. */
export async function issueAthleteInviteEmail(options: {
  coachUserId: string;
  coachName: string;
  athleteId: string;
  email: string;
}) {
  const invite = await createAthleteInvite({
    coachUserId: options.coachUserId,
    athleteId: options.athleteId,
    email: options.email,
  });

  const inviteUrl = `${getAppUrl()}/accept-invite?token=${invite.token}`;

  let emailSent = false;
  let emailReason: string | undefined;

  if (!isEmailConfigured()) {
    emailReason =
      "Email is not configured yet. Copy the invite link and send it to the athlete.";
  } else {
    const athlete = await prisma.athlete.findUnique({
      where: { id: options.athleteId },
      select: { firstName: true, lastName: true },
    });
    try {
      const result = await sendAthleteLoginInviteEmail({
        to: options.email,
        athleteName: athlete
          ? `${athlete.firstName} ${athlete.lastName}`
          : "Athlete",
        coachName: options.coachName || "Your coach",
        inviteUrl,
      });
      emailSent = result.sent;
      if (!result.sent) {
        emailReason = result.reason;
      }
    } catch {
      emailReason = "Invite created, but the email could not be sent.";
    }
  }

  return { inviteUrl, emailSent, emailReason, email: invite.email };
}

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
    const result = await issueAthleteInviteEmail({
      coachUserId: coach.id,
      coachName: coach.name ?? "Your coach",
      athleteId,
      email,
    });

    revalidatePath(`/athletes/${athleteId}`);
    return {
      inviteUrl: result.inviteUrl,
      emailSent: result.emailSent,
      emailReason: result.emailReason,
    };
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
