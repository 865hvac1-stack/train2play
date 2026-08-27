-- Starter drills were inserted by application code without an editor. Remove
-- those rows so every visible suggestion is created and managed by a real
-- library editor. Related recipients and sends cascade with the drill.
DELETE FROM "CatalogDrill"
WHERE "updatedById" IS NULL;
