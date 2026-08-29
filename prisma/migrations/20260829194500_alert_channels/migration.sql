-- Optional SMS + Web Push delivery for existing AppNotification events

ALTER TABLE "User"
  ADD COLUMN "phoneE164" TEXT,
  ADD COLUMN "smsAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "smsOptInAt" TIMESTAMP(3);

ALTER TABLE "AppNotification"
  ADD COLUMN "pushSentAt" TIMESTAMP(3),
  ADD COLUMN "smsSentAt" TIMESTAMP(3);

CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

ALTER TABLE "PushSubscription"
  ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
