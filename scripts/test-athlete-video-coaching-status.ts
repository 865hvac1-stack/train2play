/**
 * Athlete Video Coaching status copy (no database).
 * Run: npx tsx scripts/test-athlete-video-coaching-status.ts
 */
import assert from "node:assert/strict";

import {
  VIDEO_REVIEW_STATUS,
  athleteReviewFeedbackTypes,
  formatAthleteVideoReviewStatus,
  formatVideoReviewStatus,
  hasAthleteReviewFeedback,
} from "../lib/video-categories";

assert.equal(
  formatAthleteVideoReviewStatus({ status: VIDEO_REVIEW_STATUS.AWAITING_REVIEW }),
  "Submitted",
);
assert.equal(
  formatAthleteVideoReviewStatus({ status: VIDEO_REVIEW_STATUS.IN_REVIEW }),
  "In review",
);
assert.equal(
  formatAthleteVideoReviewStatus({
    status: VIDEO_REVIEW_STATUS.REVIEWED,
    voiceReviewReady: true,
  }),
  "Feedback Ready",
);
assert.equal(
  formatAthleteVideoReviewStatus({
    status: VIDEO_REVIEW_STATUS.REVIEWED,
    coachFeedback: "Keep your base wider.",
  }),
  "Feedback Ready",
);
assert.equal(
  formatAthleteVideoReviewStatus({
    status: VIDEO_REVIEW_STATUS.REVIEWED,
    annotationCount: 2,
  }),
  "Feedback Ready",
);
assert.equal(
  hasAthleteReviewFeedback({ status: VIDEO_REVIEW_STATUS.REVIEWED }),
  false,
);
assert.equal(
  formatAthleteVideoReviewStatus({ status: VIDEO_REVIEW_STATUS.REVIEWED }),
  "Reviewed",
);
assert.equal(
  formatVideoReviewStatus(VIDEO_REVIEW_STATUS.REVIEWED),
  "Reviewed",
);
assert.deepEqual(
  athleteReviewFeedbackTypes({
    voiceReviewReady: true,
    trainingAssigned: true,
  }),
  ["Voice Feedback", "Training assigned"],
);

console.log("athlete video coaching status copy checks passed");
