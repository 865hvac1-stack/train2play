/**
 * Athlete signup privacy checks.
 * Run: npx tsx scripts/test-athlete-signup-consent.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";

import { CONSENT_DOCUMENT_VERSION, CONSENT_TYPE } from "../lib/consent";
import { createPrismaClient } from "../lib/db";
import { createUser, signupSchema } from "../lib/users";

const prisma = createPrismaClient();

async function main() {
  const missingGuardian = signupSchema.safeParse({
    name: "Minor Athlete",
    email: "minor-without-guardian@example.com",
    password: "Password123",
    accountType: "ATHLETE",
    sports: ["Basketball"],
    dateOfBirth: "2012-05-10",
    acceptTerms: true,
  });
  assert.equal(
    missingGuardian.success,
    false,
    "minor signup must require guardian details and consent",
  );

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `consent-${suffix}@example.com`;
  let userId: string | null = null;
  let profileId: string | null = null;

  try {
    const user = await createUser({
      name: "Minor Athlete",
      email,
      password: "Password123",
      accountType: "ATHLETE",
      sports: ["Basketball"],
      sport: "Basketball",
      position: "Guard",
      dateOfBirth: "2012-05-10",
      acceptTerms: true,
      guardianFirstName: "Pat",
      guardianLastName: "Parent",
      guardianRelationship: "Parent",
      guardianEmail: `guardian-${suffix}@example.com`,
      guardianPhone: "555-0100",
      parentalConsent: true,
      publicVideoConsent: false,
      publicLeaderboardConsent: false,
    });
    userId = user.id;

    const profile = await prisma.athleteProfile.findUniqueOrThrow({
      where: { userId: user.id },
      include: { guardianContacts: true, consentRecords: true },
    });
    profileId = profile.id;

    assert.equal(profile.guardianContacts.length, 1);
    assert.equal(profile.guardianContacts[0]?.firstName, "Pat");
    assert.equal(profile.publicVideoSharingEnabled, false);
    assert.equal(profile.publicLeaderboardOptIn, false);
    assert.equal(profile.consentRecords.length, 4);

    const byType = new Map(
      profile.consentRecords.map((record) => [record.consentType, record]),
    );
    assert.equal(byType.get(CONSENT_TYPE.TERMS_AND_PRIVACY)?.granted, true);
    assert.equal(byType.get(CONSENT_TYPE.PARENTAL_DATA)?.granted, true);
    assert.equal(byType.get(CONSENT_TYPE.PUBLIC_VIDEO)?.granted, false);
    assert.equal(byType.get(CONSENT_TYPE.PUBLIC_LEADERBOARD)?.granted, false);
    assert.ok(
      profile.consentRecords.every(
        (record) => record.documentVersion === CONSENT_DOCUMENT_VERSION,
      ),
    );

    console.log("athlete signup guardian and consent checks passed");
  } finally {
    if (profileId) {
      await prisma.athleteProfile.delete({ where: { id: profileId } });
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
