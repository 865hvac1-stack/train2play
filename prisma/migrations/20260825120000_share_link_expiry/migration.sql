-- Add optional expiry to parent share links
ALTER TABLE "ParentShareLink" ADD COLUMN "expiresAt" TIMESTAMP(3);
