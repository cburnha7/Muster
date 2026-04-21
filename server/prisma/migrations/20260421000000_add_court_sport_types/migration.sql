-- AlterTable: Add sportTypes array to facility_courts
ALTER TABLE "facility_courts" ADD COLUMN "sportTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill: Copy existing sportType into sportTypes array
UPDATE "facility_courts" SET "sportTypes" = ARRAY["sportType"] WHERE "sportType" IS NOT NULL AND "sportType" != '';
