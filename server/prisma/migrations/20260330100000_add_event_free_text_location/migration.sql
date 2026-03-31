-- AlterTable: Add free-text location fields to events
ALTER TABLE "events" ADD COLUMN "locationName" TEXT;
ALTER TABLE "events" ADD COLUMN "locationAddress" TEXT;
ALTER TABLE "events" ADD COLUMN "locationLat" DOUBLE PRECISION;
ALTER TABLE "events" ADD COLUMN "locationLng" DOUBLE PRECISION;
