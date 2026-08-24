"use server";

import { revalidatePath } from "next/cache";

import { generateShareToken } from "@/lib/share";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function createShareLinkAction(athleteId: string, label?: string) {
  const user = await requireUser();

  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, coachId: user.id },
  });

  if (!athlete) {
    throw new Error("Athlete not found");
  }

  const link = await prisma.parentShareLink.create({
    data: {
      athleteId,
      token: generateShareToken(),
      label: label?.trim() || "Family view",
    },
  });

  revalidatePath(`/athletes/${athleteId}`);
  return link;
}

export async function revokeShareLinkAction(athleteId: string, linkId: string) {
  const user = await requireUser();

  const link = await prisma.parentShareLink.findFirst({
    where: {
      id: linkId,
      athleteId,
      athlete: { coachId: user.id },
      revokedAt: null,
    },
  });

  if (!link) {
    throw new Error("Share link not found");
  }

  await prisma.parentShareLink.update({
    where: { id: linkId },
    data: { revokedAt: new Date() },
  });

  revalidatePath(`/athletes/${athleteId}`);
}
