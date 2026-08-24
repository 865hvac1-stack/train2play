import { randomBytes } from "crypto";

import { brand } from "@/lib/brand";
import { getAppUrl } from "@/lib/env";

export function generateShareToken() {
  return randomBytes(24).toString("hex");
}

export function getShareUrl(token: string) {
  return `${getAppUrl()}/view/${token}`;
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

export function isShareLinkActive(link: { revokedAt: Date | null }) {
  return link.revokedAt === null;
}
