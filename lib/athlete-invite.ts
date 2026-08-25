import { createHash, randomBytes } from "crypto";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { syncAthleteProfile } from "@/lib/athlete-profiles";
import { canEditAthlete } from "@/lib/authz";

const INVITE_DAYS = 14;

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateInviteToken() {
  return randomBytes(32).toString("hex");
}

export async function createAthleteInvite(options: {
  coachUserId: string;
  athleteId: string;
  email: string;
}) {
  const allowed = await canEditAthlete(prisma, options.coachUserId, options.athleteId);
  if (!allowed) {
    throw new Error("Not authorized to invite this athlete");
  }

  const athlete = await prisma.athlete.findUnique({
    where: { id: options.athleteId },
    include: { athleteProfile: true },
  });
  if (!athlete) throw new Error("Athlete not found");

  // Ensure profile exists for linking
  if (!athlete.athleteProfile) {
    await syncAthleteProfile({
      id: athlete.id,
      coachId: athlete.coachId,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      dateOfBirth: athlete.dateOfBirth,
      sport: athlete.sport,
      position: athlete.position,
    });
  }

  const email = options.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { athleteProfile: { select: { id: true } } },
  });
  if (existingUser && existingUser.role !== "ATHLETE") {
    throw new Error("That email already belongs to a non-athlete account");
  }
  if (existingUser?.athleteProfile) {
    throw new Error("That email is already linked to an athlete profile");
  }

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_DAYS);

  // Invalidate prior unused invites for this athlete
  await prisma.athleteInvite.deleteMany({
    where: { athleteId: options.athleteId, acceptedAt: null },
  });

  await prisma.athleteInvite.create({
    data: {
      athleteId: options.athleteId,
      email,
      tokenHash,
      invitedByUserId: options.coachUserId,
      expiresAt,
    },
  });

  return { token, expiresAt, email };
}

export async function acceptAthleteInvite(options: {
  token: string;
  password: string;
  name?: string;
}) {
  const tokenHash = hashInviteToken(options.token);
  const invite = await prisma.athleteInvite.findUnique({
    where: { tokenHash },
    include: {
      athlete: true,
    },
  });

  if (!invite || invite.acceptedAt) {
    throw new Error("This invite is invalid or already used");
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new Error("This invite has expired");
  }
  if (options.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const profile = await syncAthleteProfile({
    id: invite.athlete.id,
    coachId: invite.athlete.coachId,
    firstName: invite.athlete.firstName,
    lastName: invite.athlete.lastName,
    dateOfBirth: invite.athlete.dateOfBirth,
    sport: invite.athlete.sport,
    position: invite.athlete.position,
  });

  if (profile.userId) {
    throw new Error("This athlete is already linked to a login");
  }

  const passwordHash = await bcrypt.hash(options.password, 12);
  const displayName =
    options.name?.trim() ||
    `${invite.athlete.firstName} ${invite.athlete.lastName}`;

  const user = await prisma.user.upsert({
    where: { email: invite.email },
    update: {
      name: displayName,
      passwordHash,
      role: "ATHLETE",
      onboardingCompletedAt: new Date(),
    },
    create: {
      email: invite.email,
      name: displayName,
      passwordHash,
      role: "ATHLETE",
      onboardingCompletedAt: new Date(),
    },
  });

  await prisma.athleteProfile.update({
    where: { id: profile.id },
    data: { userId: user.id },
  });

  await prisma.athleteInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  return { userId: user.id, email: user.email };
}
