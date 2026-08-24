import { Resend } from "resend";

import { brand } from "@/lib/brand";
import { getEmailFromAddress, isEmailConfigured } from "@/lib/settings";

type ShareInviteEmailInput = {
  to: string;
  athleteName: string;
  coachName: string;
  shareUrl: string;
};

export async function sendShareInviteEmail(input: ShareInviteEmailInput) {
  if (!isEmailConfigured()) {
    return {
      sent: false as const,
      reason: "Email is not configured. Add RESEND_API_KEY to your environment.",
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const subject = `${input.athleteName}'s training progress — ${brand.name}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; line-height: 1.5; color: #0f172a;">
      <p>Hi,</p>
      <p><strong>${input.coachName}</strong> shared a read-only view of <strong>${input.athleteName}</strong>'s training progress on ${brand.name}.</p>
      <p style="margin: 24px 0;">
        <a href="${input.shareUrl}" style="background: #059669; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View training progress
        </a>
      </p>
      <p style="color: #64748b; font-size: 14px;">
        Or copy this link:<br />
        <a href="${input.shareUrl}">${input.shareUrl}</a>
      </p>
      <p style="color: #64748b; font-size: 14px;">
        This page shows assigned workouts, completion status, and performance metrics. No account is required.
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: getEmailFromAddress(),
    to: input.to,
    subject,
    html,
  });

  if (error) {
    return {
      sent: false as const,
      reason: error.message ?? "Unable to send email",
    };
  }

  return { sent: true as const };
}
