import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { isShareLinkActive } from "@/lib/share";

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
                  id: true,
                  title: true,
                  description: true,
                  completed: true,
                  scheduledDate: true,
                  durationMinutes: true,
                  instructionVideoUrl: true,
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

  if (!link || !isShareLinkActive(link)) {
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
