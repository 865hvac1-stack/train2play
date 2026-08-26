import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  getLoginLandingPath,
  isAthleteRole,
  isCoachPortalRole,
  isPlatformAdmin,
} from "@/lib/roles";
import { prisma } from "@/lib/db";

export async function getSession() {
  return auth();
}

export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user;
}

/** Coach Portal only — athletes/parents are redirected to their home. */
export async function requireCoach() {
  const user = await requireUser();
  await maybePromotePlatformAdmin(user.id, user.email);
  const role = (await getUserRole(user.id)) ?? user.role ?? "COACH";

  if (isAthleteRole(role)) {
    redirect("/athlete");
  }
  if (!isCoachPortalRole(role)) {
    redirect(getLoginLandingPath({ role, onboardingCompletedAt: new Date() }));
  }

  return { ...user, role };
}

/** Train2Play master-library admins only. */
export async function requirePlatformAdmin() {
  const user = await requireCoach();
  if (!isPlatformAdmin(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

function platformAdminEmails() {
  return (process.env.PLATFORM_ADMIN_EMAIL ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

async function maybePromotePlatformAdmin(
  userId: string,
  email: string | null | undefined,
) {
  const allowlist = platformAdminEmails();
  if (!email || allowlist.length === 0) return;
  if (!allowlist.includes(email.toLowerCase())) return;
  await prisma.user.updateMany({
    where: { id: userId, role: { not: "PLATFORM_ADMIN" } },
    data: { role: "PLATFORM_ADMIN" },
  });
}

export async function requireCoachId() {
  const user = await requireCoach();
  return user.id;
}

/** Athlete experience only. */
export async function requireAthlete() {
  const user = await requireUser();
  const role = user.role ?? "COACH";

  if (!isAthleteRole(role)) {
    if (isCoachPortalRole(role)) {
      redirect("/dashboard");
    }
    redirect("/login");
  }

  return user;
}

/** Ensures JWT role stays fresh if role changed in DB (best-effort). */
export async function getUserRole(userId: string) {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return row?.role ?? "COACH";
}
