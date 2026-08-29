/**
 * Alert channel unit checks (phone parse + no send without opt-in).
 * Run: npx tsx scripts/test-alert-channels.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";

import { createPrismaClient } from "../lib/db";
import { createNotification, NOTIFICATION_TYPE } from "../lib/notifications";
import { formatPhoneDisplay, parsePhoneToE164 } from "../lib/phone";
import { buildAlertSms, isSmsConfigured } from "../lib/sms";
import { isPushConfigured } from "../lib/push";

assert.equal(parsePhoneToE164("(865) 555-1212"), "+18655551212");
assert.equal(parsePhoneToE164("18655551212"), "+18655551212");
assert.equal(parsePhoneToE164("555-1212"), null);
assert.equal(formatPhoneDisplay("+18655551212"), "(865) 555-1212");
assert.match(
  buildAlertSms({
    title: "Coach feedback ready",
    body: "Demo Coach reviewed your Swing",
    href: "/athlete/videos/reviews/abc",
  }),
  /Coach feedback ready/,
);
assert.equal(typeof isSmsConfigured(), "boolean");
assert.equal(typeof isPushConfigured(), "boolean");

const prisma = createPrismaClient();

async function main() {
  const stamp = Date.now();
  const user = await prisma.user.create({
    data: {
      name: "Alert Tester",
      email: `alerts.${stamp}@example.com`,
      passwordHash: "not-a-real-hash",
      role: "ATHLETE",
      smsAlertsEnabled: false,
    },
  });

  const notification = await createNotification({
    userId: user.id,
    type: NOTIFICATION_TYPE.VIDEO_REVIEWED,
    title: "Coach feedback ready",
    body: "A coach reviewed your video.",
    href: "/athlete/videos/reviews/test",
  });

  const stored = await prisma.appNotification.findUniqueOrThrow({
    where: { id: notification.id },
  });
  assert.equal(stored.smsSentAt, null);
  assert.equal(stored.pushSentAt, null);

  await prisma.appNotification.delete({ where: { id: notification.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("alert channel checks passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
