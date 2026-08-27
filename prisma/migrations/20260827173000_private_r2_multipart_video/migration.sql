CREATE TABLE "MediaUpload" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 's3',
    "storageKey" TEXT NOT NULL,
    "multipartId" TEXT,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaUpload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaUpload_storageKey_key" ON "MediaUpload"("storageKey");
CREATE INDEX "MediaUpload_ownerUserId_status_idx" ON "MediaUpload"("ownerUserId", "status");
CREATE INDEX "MediaUpload_status_expiresAt_idx" ON "MediaUpload"("status", "expiresAt");

ALTER TABLE "MediaUpload"
ADD CONSTRAINT "MediaUpload_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
