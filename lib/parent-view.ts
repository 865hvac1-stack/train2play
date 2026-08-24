import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";

export async function getAthleteByShareToken(token: string) {
  const link = await prisma.parentShareLink.findUnique({
    where: { token },
    include: {
      athlete: {
        include: {
          coach: { select: { name: true } },
          trainingPlans: {
            where: { status: "ACTIVE" },
            include: {
              workouts: {
                select: {
                  title: true,
                  completed: true,
                  scheduledDate: true,
                },
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { updatedAt: "desc" },
          },
          progressMetrics: {
            orderBy: [{ recordedAt: "asc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });

  if (!link || link.revokedAt) {
    return null;
  }

  return link.athlete;
}

export async function requireAthleteByShareToken(token: string) {
  const athlete = await getAthleteByShareToken(token);
  if (!athlete) {
    notFound();
  }
  return athlete;
}
