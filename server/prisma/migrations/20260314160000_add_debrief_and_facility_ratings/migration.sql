-- Add debriefSubmitted to bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "debriefSubmitted" BOOLEAN NOT NULL DEFAULT false;

-- Create facility_ratings table
CREATE TABLE IF NOT EXISTS "facility_ratings" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "facility_ratings_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "facility_ratings_userId_facilityId_eventId_key" ON "facility_ratings"("userId", "facilityId", "eventId");

-- Create index on facilityId
CREATE INDEX IF NOT EXISTS "facility_ratings_facilityId_idx" ON "facility_ratings"("facilityId");

-- Add foreign keys
ALTER TABLE "facility_ratings" ADD CONSTRAINT "facility_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "facility_ratings" ADD CONSTRAINT "facility_ratings_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
