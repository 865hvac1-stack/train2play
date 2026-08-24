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

type PickupAlertEmailInput = {
  to: string;
  coachName: string;
  playerName: string;
  sport: string;
  position: string | null;
  zipCode: string;
  distanceMiles: number;
  throwingVelo: number | null;
  pickupType: string | null;
  profileUrl: string;
  nearbyUrl: string;
};

export async function sendPickupPlayerAlertEmail(input: PickupAlertEmailInput) {
  if (!isEmailConfigured()) {
    return {
      sent: false as const,
      reason: "Email is not configured. Add RESEND_API_KEY to your environment.",
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const veloLine = input.throwingVelo
    ? `<li>Throwing velo: <strong>${input.throwingVelo} mph</strong></li>`
    : "";
  const typeLabel =
    input.pickupType === "LOOKING_FOR_TEAM" ? "Looking for a team" : "Guest / tryout player";

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; line-height: 1.5; color: #0f172a;">
      <p>Hi ${input.coachName},</p>
      <p>A new pickup player near you was just added on ${brand.name}:</p>
      <p style="font-size: 18px; font-weight: 600;">${input.playerName}</p>
      <ul>
        <li>${input.sport}${input.position ? ` · ${input.position}` : ""}</li>
        <li>${typeLabel}</li>
        <li>Zip ${input.zipCode} · ~${input.distanceMiles.toFixed(1)} miles from you</li>
        ${veloLine}
      </ul>
      <p style="margin: 24px 0;">
        <a href="${input.profileUrl}" style="background: #059669; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View player profile
        </a>
      </p>
      <p style="color: #64748b; font-size: 14px;">
        Browse all nearby players: <a href="${input.nearbyUrl}">${input.nearbyUrl}</a>
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: getEmailFromAddress(),
    to: input.to,
    subject: `New pickup player near you — ${input.playerName}`,
    html,
  });

  if (error) {
    return { sent: false as const, reason: error.message ?? "Unable to send email" };
  }

  return { sent: true as const };
}

type PickupInterestEmailInput = {
  to: string;
  listingCoachName: string;
  interestedCoachName: string;
  interestedCoachEmail: string;
  playerName: string;
  message: string | null;
  profileUrl: string;
};

export async function sendPickupInterestEmail(input: PickupInterestEmailInput) {
  if (!isEmailConfigured()) {
    return {
      sent: false as const,
      reason: "Email is not configured. Add RESEND_API_KEY to your environment.",
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; line-height: 1.5; color: #0f172a;">
      <p>Hi ${input.listingCoachName},</p>
      <p><strong>${input.interestedCoachName}</strong> (${input.interestedCoachEmail}) is interested in your pickup player <strong>${input.playerName}</strong>.</p>
      ${input.message ? `<p style="background: #f8fafc; padding: 12px 16px; border-radius: 8px;">"${input.message}"</p>` : ""}
      <p style="margin: 24px 0;">
        <a href="${input.profileUrl}" style="background: #059669; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View player profile
        </a>
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: getEmailFromAddress(),
    to: input.to,
    subject: `Coach interested in ${input.playerName}`,
    html,
  });

  if (error) {
    return { sent: false as const, reason: error.message ?? "Unable to send email" };
  }

  return { sent: true as const };
}

type PasswordResetEmailInput = {
  to: string;
  name: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  if (!isEmailConfigured()) {
    return {
      sent: false as const,
      reason:
        "Password reset email is not configured. Contact support or add RESEND_API_KEY.",
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; line-height: 1.5; color: #0f172a;">
      <p>Hi ${input.name},</p>
      <p>We received a request to reset your ${brand.name} password.</p>
      <p style="margin: 24px 0;">
        <a href="${input.resetUrl}" style="background: #059669; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Reset password
        </a>
      </p>
      <p style="color: #64748b; font-size: 14px;">
        This link expires in 1 hour. If you did not request a reset, you can ignore this email.
      </p>
      <p style="color: #64748b; font-size: 14px;">
        Or copy this link:<br />
        <a href="${input.resetUrl}">${input.resetUrl}</a>
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: getEmailFromAddress(),
    to: input.to,
    subject: `Reset your ${brand.name} password`,
    html,
  });

  if (error) {
    return { sent: false as const, reason: error.message ?? "Unable to send email" };
  }

  return { sent: true as const };
}

