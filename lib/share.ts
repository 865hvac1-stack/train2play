import { randomBytes } from "crypto";

export function generateShareToken() {
  return randomBytes(24).toString("hex");
}

export function getShareUrl(token: string) {
  const base =
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:43123";
  return `${base.replace(/\/$/, "")}/view/${token}`;
}

export function isShareLinkActive(link: { revokedAt: Date | null }) {
  return link.revokedAt === null;
}
