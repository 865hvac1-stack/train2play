/**
 * Optional one-time backfill: create APPROVED EMAIL_INVITE connections
 * for existing roster athletes that only have Athlete.coachId.
 *
 * Safe to re-run. Does not modify training history.
 *
 *   npx tsx scripts/backfill-email-invite-connections.ts
 */
import "dotenv/config";

import { createPrismaClient } from "../lib/db";
import { ensureEmailInviteConnection } from "../lib/coach-connections";

const prisma = createPrismaClient();

async function main() {
  const athletes = await prisma.athlete.findMany({
    where: { rosterStatus: "ROSTER" },
    select: { id: true, coachId: true },
  });

  let created = 0;
  for (const athlete of athletes) {
    const before = await prisma.coachAthleteConnection.count({
      where: {
        coachUserId: athlete.coachId,
        status: "APPROVED",
        athleteProfile: { legacyAthleteId: athlete.id },
      },
    });
    await ensureEmailInviteConnection({
      coachUserId: athlete.coachId,
      athleteId: athlete.id,
    });
    const after = await prisma.coachAthleteConnection.count({
      where: {
        coachUserId: athlete.coachId,
        status: "APPROVED",
        athleteProfile: { legacyAthleteId: athlete.id },
      },
    });
    if (after > before) created += 1;
  }

  console.log(
    `Backfill complete. Checked ${athletes.length} roster athletes; created ${created} connection rows.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
