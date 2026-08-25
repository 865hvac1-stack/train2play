import { randomBytes } from "crypto";

import { brand } from "@/lib/brand";
import { getAppUrl } from "@/lib/env";

/** Default parent share link lifetime (days). */
export const SHARE_LINK_DEFAULT_DAYS = 90;

export function generateShareToken() {
  return randomBytes(24).toString("hex");
}

export function getShareUrl(token: string) {
  return `${getAppUrl()}/view/${token}`;
}

export function getDefaultShareLinkExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SHARE_LINK_DEFAULT_DAYS);
  return expiresAt;
}

export function isShareLinkActive(link: {
  revokedAt: Date | null;
  expiresAt?: Date | null;
}) {
  if (link.revokedAt) return false;
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return false;
  return true;
}

export function formatShareLinkExpiry(expiresAt: Date | null | undefined) {
  if (!expiresAt) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(expiresAt);
}

export function buildShareInviteMailto(options: {
  parentEmail: string;
  athleteName: string;
  shareUrl: string;
  coachName: string;
}) {
  const subject = `${options.athleteName}'s training progress — ${brand.name}`;
  const body = [
    "Hi,",
    "",
    `${options.coachName} shared a read-only view of ${options.athleteName}'s training progress on ${brand.name}:`,
    "",
    options.shareUrl,
    "",
    "Open the link to see assigned workouts, completion status, and performance metrics. No account is required.",
  ].join("\n");

  return `mailto:${options.parentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
