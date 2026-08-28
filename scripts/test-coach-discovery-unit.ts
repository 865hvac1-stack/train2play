/**
 * Unit checks for Coach Profile discovery + badges (no database).
 * Run: npx tsx scripts/test-coach-discovery-unit.ts
 */
import assert from "node:assert/strict";

import {
  BACKGROUND_CHECK_STATUS,
  COACH_DISCOVERY_STATUS,
  isBackgroundCheckPublicBadge,
  isTrain2PlayApproved,
} from "../lib/coaching/status";
import { isDiscoverableCoach } from "../lib/coaching/discovery";
import { coachProfileCompletion } from "../lib/coaching/profile";
import { isReservedProfileSlug } from "../lib/community/slugs";

function testApprovalIsSeparateFromBackgroundCheck() {
  assert.equal(isTrain2PlayApproved(COACH_DISCOVERY_STATUS.APPROVED), true);
  assert.equal(isTrain2PlayApproved(COACH_DISCOVERY_STATUS.DRAFT), false);
  assert.equal(isTrain2PlayApproved(COACH_DISCOVERY_STATUS.SUBMITTED), false);
  assert.equal(isTrain2PlayApproved(COACH_DISCOVERY_STATUS.SUSPENDED), false);
  assert.equal(
    isBackgroundCheckPublicBadge({ status: BACKGROUND_CHECK_STATUS.CLEAR }),
    true,
  );
  assert.equal(
    isBackgroundCheckPublicBadge({ status: BACKGROUND_CHECK_STATUS.PENDING }),
    false,
  );
  assert.equal(
    isBackgroundCheckPublicBadge({ status: BACKGROUND_CHECK_STATUS.NOT_STARTED }),
    false,
  );
  assert.equal(
    isBackgroundCheckPublicBadge({
      status: BACKGROUND_CHECK_STATUS.CLEAR,
      expiresAt: new Date(Date.now() - 60_000),
    }),
    false,
  );
}

function testDiscoveryRequiresApprovalAndToggle() {
  assert.equal(
    isDiscoverableCoach({
      discoveryStatus: COACH_DISCOVERY_STATUS.APPROVED,
      appearInFindACoach: true,
      user: { isActive: true },
    }),
    true,
  );
  assert.equal(
    isDiscoverableCoach({
      discoveryStatus: COACH_DISCOVERY_STATUS.DRAFT,
      appearInFindACoach: true,
      user: { isActive: true },
    }),
    false,
  );
  assert.equal(
    isDiscoverableCoach({
      discoveryStatus: COACH_DISCOVERY_STATUS.APPROVED,
      appearInFindACoach: false,
      user: { isActive: true },
    }),
    false,
  );
  assert.equal(
    isDiscoverableCoach({
      discoveryStatus: COACH_DISCOVERY_STATUS.SUSPENDED,
      appearInFindACoach: true,
      user: { isActive: true },
    }),
    false,
  );
  assert.equal(
    isDiscoverableCoach({
      discoveryStatus: COACH_DISCOVERY_STATUS.APPROVED,
      appearInFindACoach: true,
      user: { isActive: false },
    }),
    false,
  );
}

function testSubmitRequiresCoreFields() {
  const incomplete = coachProfileCompletion({
    avatarUrl: null,
    bio: null,
    locationLabel: null,
    locationState: null,
    featuredVideoId: null,
    instagramUrl: null,
    xUrl: null,
    tiktokUrl: null,
    youtubeUrl: null,
    websiteUrl: null,
    sports: [],
    discoveryStatus: COACH_DISCOVERY_STATUS.DRAFT,
  });
  assert.equal(incomplete.canSubmit, false);

  const complete = coachProfileCompletion({
    avatarUrl: "/uploads/images/coach.jpg",
    bio: "I coach baseball.",
    locationLabel: "Knoxville Area, Tennessee",
    locationState: "TN",
    featuredVideoId: "vid_1",
    instagramUrl: "https://instagram.com/coach",
    xUrl: null,
    tiktokUrl: null,
    youtubeUrl: null,
    websiteUrl: null,
    sports: [{ specialties: ["Hitting"] }],
    discoveryStatus: COACH_DISCOVERY_STATUS.DRAFT,
  });
  assert.equal(complete.canSubmit, true);

  const suspended = coachProfileCompletion({
    avatarUrl: "/uploads/images/coach.jpg",
    bio: "I coach baseball.",
    locationLabel: "Knoxville Area, Tennessee",
    locationState: "TN",
    featuredVideoId: "vid_1",
    instagramUrl: "https://instagram.com/coach",
    xUrl: null,
    tiktokUrl: null,
    youtubeUrl: null,
    websiteUrl: null,
    sports: [{ specialties: ["Hitting"] }],
    discoveryStatus: COACH_DISCOVERY_STATUS.SUSPENDED,
  });
  assert.equal(suspended.canSubmit, false);
}

function testReservedCoachSlug() {
  assert.equal(isReservedProfileSlug("coach"), true);
  assert.equal(isReservedProfileSlug("coaches"), true);
}

testApprovalIsSeparateFromBackgroundCheck();
testDiscoveryRequiresApprovalAndToggle();
testSubmitRequiresCoreFields();
testReservedCoachSlug();
console.log("coach-discovery unit checks passed");
