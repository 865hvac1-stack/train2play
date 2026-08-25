import type { Prisma } from "@/lib/generated/prisma/client";
import { CONNECTION_STATUS } from "@/lib/coach-connections";

/** Athletes this coach may view/edit (owned roster OR approved connection). */
export function coachAccessibleAthleteWhere(
  coachUserId: string,
): Prisma.AthleteWhereInput {
  return {
    OR: [
      { coachId: coachUserId },
      {
        athleteProfile: {
          coachConnections: {
            some: {
              coachUserId,
              status: CONNECTION_STATUS.APPROVED,
            },
          },
        },
      },
      {
        athleteProfile: {
          memberships: {
            some: {
              coachUserId,
              endsAt: null,
            },
          },
        },
      },
    ],
  };
}
