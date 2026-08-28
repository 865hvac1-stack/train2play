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

  const adultOnParentPath = signupSchema.safeParse({
    name: "Adult Player",
    email: "parent-of-adult@example.com",
    password: "Password123",
    accountType: "ATHLETE",
    signupRole: "PARENT",
    sports: ["Basketball"],
    dateOfBirth: "2000-01-15",
    acceptTerms: true,
    guardianFirstName: "Pat",
    guardianLastName: "Parent",
    guardianRelationship: "Parent",
    guardianEmail: "parent-of-adult@example.com",
    parentalConsent: true,
  });
  assert.equal(
    adultOnParentPath.success,
    false,
    "parent signup must reject players 18 and older",
  );

  const parentEmailMismatch = signupSchema.safeParse({
    name: "Kid Player",
    email: "parent-login@example.com",
    password: "Password123",
    accountType: "ATHLETE",
    signupRole: "PARENT",
    sports: ["Basketball"],
    dateOfBirth: "2012-05-10",
    acceptTerms: true,
    guardianFirstName: "Pat",
    guardianLastName: "Parent",
    guardianRelationship: "Parent",
    guardianEmail: "other-guardian@example.com",
    parentalConsent: true,
  });
  assert.equal(
    parentEmailMismatch.success,
    false,
    "parent signup login email must match guardian email",
  );

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `consent-${suffix}@example.com`;
  const parentEmail = `parent-${suffix}@example.com`;
  let userId: string | null = null;
  let profileId: string | null = null;
  let parentUserId: string | null = null;
  let parentProfileId: string | null = null;

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

    const parentCreated = await createUser({
      name: "Jordan Reed",
      email: parentEmail,
      password: "Password123",
      accountType: "ATHLETE",
      signupRole: "PARENT",
      sports: ["Baseball"],
      sport: "Baseball",
      position: "Pitcher",
      dateOfBirth: "2013-08-02",
      acceptTerms: true,
      guardianFirstName: "Alex",
      guardianLastName: "Reed",
      guardianRelationship: "Parent",
      guardianEmail: parentEmail,
      guardianPhone: "555-0199",
      parentalConsent: true,
      publicVideoConsent: false,
      publicLeaderboardConsent: false,
    });
    parentUserId = parentCreated.id;

    assert.equal(parentCreated.email, parentEmail);
    assert.equal(parentCreated.name, "Jordan Reed");
    assert.equal(parentCreated.role, "ATHLETE");

    const parentProfile = await prisma.athleteProfile.findUniqueOrThrow({
      where: { userId: parentCreated.id },
      include: { guardianContacts: true, consentRecords: true },
    });
    parentProfileId = parentProfile.id;
    assert.equal(parentProfile.firstName, "Jordan");
    assert.equal(parentProfile.lastName, "Reed");
    assert.equal(parentProfile.guardianContacts.length, 1);
    assert.equal(parentProfile.guardianContacts[0]?.email, parentEmail);
    assert.equal(parentProfile.guardianContacts[0]?.firstName, "Alex");
    assert.equal(
      parentProfile.consentRecords.some(
        (record) =>
          record.consentType === CONSENT_TYPE.PARENTAL_DATA && record.granted,
      ),
      true,
    );

    console.log("athlete signup guardian and consent checks passed");
  } finally {
    if (parentProfileId) {
      await prisma.athleteProfile.delete({ where: { id: parentProfileId } });
    }
    if (parentUserId) {
      await prisma.user.delete({ where: { id: parentUserId } });
    }
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
