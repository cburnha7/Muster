-- AlterTable: Add sportTypes array column to teams
ALTER TABLE "teams" ADD COLUMN "sportTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill: Copy existing sportType into sportTypes array
UPDATE "teams" SET "sportTypes" = ARRAY["sportType"] WHERE "sportType" IS NOT NULL AND array_length("sportTypes", 1) IS NULL;
