-- CreateTable
CREATE TABLE "ParentShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "athleteId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "ParentShareLink_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentShareLink_token_key" ON "ParentShareLink"("token");

-- CreateIndex
CREATE INDEX "ParentShareLink_athleteId_idx" ON "ParentShareLink"("athleteId");

-- CreateIndex
CREATE INDEX "ParentShareLink_token_idx" ON "ParentShareLink"("token");
