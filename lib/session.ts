import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  getLoginLandingPath,
  isAthleteRole,
  isCoachPortalRole,
  isLibraryEditor,
  isPlatformAdmin,
  isTrainer,
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

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastActiveAt: true,
    },
  });
  if (!dbUser?.isActive) {
    redirect("/login?error=account-inactive");
  }

  const heartbeatCutoff = new Date(Date.now() - 15 * 60 * 1000);
  if (!dbUser.lastActiveAt || dbUser.lastActiveAt < heartbeatCutoff) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { lastActiveAt: new Date() },
    });
  }

  return {
    ...session.user,
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
  };
}

/** Coach Portal only — athletes/parents are redirected to their home. */
export async function requireCoach() {
  const user = await requireUser();
  await maybePromoteStaff(user.id, user.email);
  const role = (await getUserRole(user.id)) ?? user.role ?? "COACH";

  if (isAthleteRole(role)) {
    redirect("/athlete");
  }
  if (!isCoachPortalRole(role)) {
    redirect(getLoginLandingPath({ role, onboardingCompletedAt: new Date() }));
  }

  return { ...user, role };
}

/** Train2Play master-library editors — trainers and platform admins. */
export async function requireLibraryEditor() {
  const user = await requireCoach();
  if (!isLibraryEditor(user.role)) {
    redirect(isTrainer(user.role) ? "/trainer" : "/dashboard");
  }
  return user;
}

/** Train2Play master-library admins only. */
export async function requirePlatformAdmin() {
  const user = await requireCoach();
  if (!isPlatformAdmin(user.role)) {
    redirect(isTrainer(user.role) ? "/trainer" : "/dashboard");
  }
  return user;
}

function splitEmails(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function maybePromoteStaff(
  userId: string,
  email: string | null | undefined,
) {
  if (!email) return;
  const lowered = email.toLowerCase();
  const admins = splitEmails(process.env.PLATFORM_ADMIN_EMAIL);
  if (admins.includes(lowered)) {
    await prisma.user.updateMany({
      where: { id: userId, role: { not: "PLATFORM_ADMIN" } },
      data: { role: "PLATFORM_ADMIN", onboardingCompletedAt: new Date() },
    });
    return;
  }
  const trainers = splitEmails(process.env.TRAINER_EMAILS);
  if (trainers.includes(lowered)) {
    await prisma.user.updateMany({
      where: {
        id: userId,
        role: { notIn: ["PLATFORM_ADMIN", "TRAINER"] },
      },
      data: { role: "TRAINER", onboardingCompletedAt: new Date() },
    });
  }
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
