import { Resend } from "resend";

import { brand } from "@/lib/brand";
import { getEmailFromAddress, isEmailConfigured } from "@/lib/settings";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailShell(options: {
  preheader: string;
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote?: string;
}) {
  const ctaUrl = escapeHtml(options.ctaUrl);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(options.preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#000000;padding:20px 28px;border-bottom:3px solid ${brand.colors.orange};">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">
                ${escapeHtml(brand.name)}
              </p>
              <p style="margin:6px 0 0;font-size:12px;font-weight:600;color:${brand.colors.orange};text-transform:uppercase;letter-spacing:0.14em;">
                ${escapeHtml(brand.tagline)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;color:#0f172a;font-size:15px;line-height:1.55;">
              ${options.bodyHtml}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="border-radius:10px;background:${brand.colors.orange};">
                    <a href="${ctaUrl}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">
                      ${escapeHtml(options.ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:13px;color:#64748b;">
                Or open this link:<br />
                <a href="${ctaUrl}" style="color:${brand.colors.orange};word-break:break-all;">${ctaUrl}</a>
              </p>
              ${
                options.footerNote
                  ? `<p style="margin:20px 0 0;font-size:13px;color:#64748b;">${options.footerNote}</p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                ${escapeHtml(brand.framework)}<br />
                Questions? <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:${brand.colors.orange};">${escapeHtml(brand.supportEmail)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

async function sendResendEmail(options: {
  to: string;
  subject: string;
  html: string;
  unavailableReason: string;
}) {
  if (!isEmailConfigured()) {
    return {
      sent: false as const,
      reason: options.unavailableReason,
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: getEmailFromAddress(),
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (error) {
    return {
      sent: false as const,
      reason: error.message ?? "Unable to send email",
    };
  }

  return { sent: true as const };
}

type ShareInviteEmailInput = {
  to: string;
  athleteName: string;
  coachName: string;
  shareUrl: string;
};

export async function sendShareInviteEmail(input: ShareInviteEmailInput) {
  const html = emailShell({
    preheader: `${input.coachName} shared ${input.athleteName}'s training progress`,
    title: `${input.athleteName}'s training progress`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi,</p>
      <p style="margin:0 0 12px;"><strong>${escapeHtml(input.coachName)}</strong> shared a read-only view of <strong>${escapeHtml(input.athleteName)}</strong>'s training progress on ${escapeHtml(brand.name)}.</p>
      <p style="margin:0;color:#64748b;font-size:14px;">This page shows assigned workouts, completion status, and performance metrics. No account is required.</p>
    `,
    ctaLabel: "View training progress",
    ctaUrl: input.shareUrl,
  });

  return sendResendEmail({
    to: input.to,
    subject: `${input.athleteName}'s training progress — ${brand.name}`,
    html,
    unavailableReason:
      "Email is not configured. Add RESEND_API_KEY to your environment.",
  });
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
  const details = [
    input.sport,
    input.position,
    `${Math.round(input.distanceMiles)} mi from ${input.zipCode}`,
    input.throwingVelo != null ? `${input.throwingVelo} mph` : null,
    input.pickupType,
  ]
    .filter(Boolean)
    .join(" · ");

  const html = emailShell({
    preheader: `New pickup player near you: ${input.playerName}`,
    title: "New pickup player nearby",
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(input.coachName)},</p>
      <p style="margin:0 0 12px;"><strong>${escapeHtml(input.playerName)}</strong> was listed near your search area.</p>
      <p style="margin:0;color:#64748b;font-size:14px;">${escapeHtml(details)}</p>
    `,
    ctaLabel: "View profile",
    ctaUrl: input.profileUrl,
    footerNote: `<a href="${escapeHtml(input.nearbyUrl)}" style="color:${brand.colors.orange};">Browse all nearby players</a>`,
  });

  const { error } = await resend.emails.send({
    from: getEmailFromAddress(),
    to: input.to,
    subject: `New pickup player near you — ${brand.name}`,
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
  const messageBlock = input.message
    ? `<p style="margin:12px 0 0;padding:12px;background:#f8fafc;border-radius:8px;color:#334155;">${escapeHtml(input.message)}</p>`
    : "";

  const html = emailShell({
    preheader: `${input.interestedCoachName} is interested in ${input.playerName}`,
    title: "Pickup interest",
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(input.listingCoachName)},</p>
      <p style="margin:0 0 12px;"><strong>${escapeHtml(input.interestedCoachName)}</strong> (${escapeHtml(input.interestedCoachEmail)}) expressed interest in <strong>${escapeHtml(input.playerName)}</strong>.</p>
      ${messageBlock}
    `,
    ctaLabel: "Open profile",
    ctaUrl: input.profileUrl,
  });

  return sendResendEmail({
    to: input.to,
    subject: `Interest in ${input.playerName} — ${brand.name}`,
    html,
    unavailableReason:
      "Email is not configured. Add RESEND_API_KEY to your environment.",
  });
}

type AthleteLoginInviteEmailInput = {
  to: string;
  athleteName: string;
  coachName: string;
  inviteUrl: string;
};

export async function sendAthleteLoginInviteEmail(
  input: AthleteLoginInviteEmailInput,
) {
  const html = emailShell({
    preheader: `${input.coachName} invited you to register on ${brand.name}`,
    title: `You're invited to ${brand.name}`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(input.athleteName)},</p>
      <p style="margin:0 0 12px;"><strong>${escapeHtml(input.coachName)}</strong> added you on ${escapeHtml(brand.name)} and invited you to register.</p>
      <p style="margin:0 0 8px;font-weight:700;">Create your login to:</p>
      <ul style="margin:0 0 12px;padding-left:20px;color:#334155;">
        <li style="margin-bottom:6px;">See Today&apos;s Training on your phone</li>
        <li style="margin-bottom:6px;">Complete workouts and log results</li>
        <li style="margin-bottom:6px;">Track progress and personal records</li>
      </ul>
      <p style="margin:0;color:#64748b;font-size:14px;">Use the button below to set your own password. Do not share this link.</p>
    `,
    ctaLabel: "Accept invite & register",
    ctaUrl: input.inviteUrl,
    footerNote: "This invite link expires in 14 days.",
  });

  return sendResendEmail({
    to: input.to,
    subject: `Register for ${brand.name} — invite from ${input.coachName}`,
    html,
    unavailableReason:
      "Email is not configured. Add RESEND_API_KEY to your environment.",
  });
}

export type WelcomeEmailInput = {
  to: string;
  name: string;
  accountType: "COACH" | "ATHLETE";
  loginUrl: string;
  createdByParent?: boolean;
  playerName?: string;
};

export async function sendWelcomeEmail(input: WelcomeEmailInput) {
  const firstName = escapeHtml(
    input.name.trim().split(/\s+/).filter(Boolean)[0] || "there",
  );
  const isAthlete = input.accountType === "ATHLETE";
  const playerName = escapeHtml(input.playerName?.trim() || "your player");

  const bodyHtml = input.createdByParent
    ? `
      <p style="margin:0 0 12px;">Hi ${firstName},</p>
      <p style="margin:0 0 12px;">You created a <strong>${escapeHtml(brand.name)}</strong> player account for <strong>${playerName}</strong>. Sign in with this email to open their training.</p>
      <p style="margin:0 0 8px;font-weight:700;">What to do next</p>
      <ol style="margin:0 0 12px;padding-left:20px;color:#334155;">
        <li style="margin-bottom:6px;">Sign in on your phone with this parent email</li>
        <li style="margin-bottom:6px;">Complete the player profile and add a photo</li>
        <li style="margin-bottom:6px;">Connect with a coach so training can be assigned</li>
      </ol>
      <p style="margin:0;color:#64748b;font-size:14px;">Keep this login. It is the parent-controlled account for ${playerName}.</p>
    `
    : isAthlete
    ? `
      <p style="margin:0 0 12px;">Hi ${firstName},</p>
      <p style="margin:0 0 12px;">Welcome to <strong>${escapeHtml(brand.name)}</strong>. Your athlete account is ready.</p>
      <p style="margin:0 0 8px;font-weight:700;">What to do next</p>
      <ol style="margin:0 0 12px;padding-left:20px;color:#334155;">
        <li style="margin-bottom:6px;">Open the app on your phone and sign in</li>
        <li style="margin-bottom:6px;">Check <strong>Today&apos;s Training</strong> for your assigned workout</li>
        <li style="margin-bottom:6px;">Complete exercises, log results, and track your progress</li>
      </ol>
      <p style="margin:0;color:#64748b;font-size:14px;">If you do not see a workout yet, your coach still needs to assign a program.</p>
    `
    : `
      <p style="margin:0 0 12px;">Hi ${firstName},</p>
      <p style="margin:0 0 12px;">Welcome to <strong>${escapeHtml(brand.name)}</strong>. Your coach portal is ready.</p>
      <p style="margin:0 0 8px;font-weight:700;">What to do next</p>
      <ol style="margin:0 0 12px;padding-left:20px;color:#334155;">
        <li style="margin-bottom:6px;">Add your athletes</li>
        <li style="margin-bottom:6px;">Create or assign a training program</li>
        <li style="margin-bottom:6px;">Invite each athlete so they can train and log results on their phone</li>
        <li style="margin-bottom:6px;">Review completions, results, and PRs from the athlete profile</li>
      </ol>
      <p style="margin:0;color:#64748b;font-size:14px;">${escapeHtml(brand.positioning)}</p>
    `;

  const html = emailShell({
    preheader: input.createdByParent
      ? `Player account ready for ${input.playerName?.trim() || "your player"} — ${brand.tagline}`
      : isAthlete
        ? `Your athlete account is ready — ${brand.tagline}`
        : `Your coach portal is ready — ${brand.tagline}`,
    title: `Welcome to ${brand.name}`,
    bodyHtml,
    ctaLabel: input.createdByParent
      ? "Open player home"
      : isAthlete
        ? "Open athlete home"
        : "Open coach portal",
    ctaUrl: input.loginUrl,
  });

  return sendResendEmail({
    to: input.to,
    subject: `Welcome to ${brand.name}`,
    html,
    unavailableReason:
      "Email is not configured. Add RESEND_API_KEY to your environment.",
  });
}

type PasswordResetEmailInput = {
  to: string;
  name: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  const html = emailShell({
    preheader: `Reset your ${brand.name} password`,
    title: `Reset your ${brand.name} password`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(input.name)},</p>
      <p style="margin:0 0 12px;">We received a request to reset your ${escapeHtml(brand.name)} password.</p>
      <p style="margin:0;color:#64748b;font-size:14px;">This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
    `,
    ctaLabel: "Reset password",
    ctaUrl: input.resetUrl,
  });

  return sendResendEmail({
    to: input.to,
    subject: `Reset your ${brand.name} password`,
    html,
    unavailableReason:
      "Password reset email is not configured. Contact support or add RESEND_API_KEY.",
  });
}

export type VideoSubmittedEmailInput = {
  to: string;
  coachName: string;
  athleteName: string;
  title: string;
  sport: string;
  category: string;
  reviewUrl: string;
};

export async function sendVideoSubmittedEmail(input: VideoSubmittedEmailInput) {
  const html = emailShell({
    preheader: `${input.athleteName} sent you a video on ${brand.name}`,
    title: `${input.athleteName} sent you a video`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(input.coachName)},</p>
      <p style="margin:0 0 12px;"><strong>${escapeHtml(input.athleteName)}</strong> sent you a video for review.</p>
      <p style="margin:0 0 12px;"><strong>${escapeHtml(input.title)}</strong><br />
      ${escapeHtml(input.sport)} · ${escapeHtml(input.category)}</p>
      <p style="margin:0;color:#64748b;font-size:14px;">Sign in to watch, annotate, leave feedback, and assign training. This email does not include the video file.</p>
    `,
    ctaLabel: "Review video",
    ctaUrl: input.reviewUrl,
  });

  return sendResendEmail({
    to: input.to,
    subject: `${input.athleteName} sent you a video on ${brand.name}`,
    html,
    unavailableReason:
      "Video review email is not configured. Add RESEND_API_KEY to enable it.",
  });
}

export type VideoReviewCompleteEmailInput = {
  to: string;
  athleteName: string;
  coachName: string;
  title: string;
  hasTraining: boolean;
  reviewUrl: string;
};

export async function sendVideoReviewCompleteEmail(
  input: VideoReviewCompleteEmailInput,
) {
  const trainingLine = input.hasTraining
    ? `<p style="margin:0 0 12px;">${escapeHtml(input.coachName)} also assigned training based on your video.</p>`
    : "";

  const html = emailShell({
    preheader: `${input.coachName} reviewed your ${input.title} video`,
    title: "Coach feedback ready",
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(input.athleteName)},</p>
      <p style="margin:0 0 12px;"><strong>${escapeHtml(input.coachName)}</strong> reviewed your <strong>${escapeHtml(input.title)}</strong> video.</p>
      ${trainingLine}
      <p style="margin:0;color:#64748b;font-size:14px;">Open Train2Play to watch annotations, read feedback, and start any assigned training.</p>
    `,
    ctaLabel: "View review",
    ctaUrl: input.reviewUrl,
  });

  return sendResendEmail({
    to: input.to,
    subject: `${input.coachName} reviewed your video on ${brand.name}`,
    html,
    unavailableReason:
      "Video review email is not configured. Add RESEND_API_KEY to enable it.",
  });
}
