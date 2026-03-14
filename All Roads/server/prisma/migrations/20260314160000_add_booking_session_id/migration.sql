-- AlterTable
ALTER TABLE "facility_rentals" ADD COLUMN IF NOT EXISTS "bookingSessionId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "facility_rentals_bookingSessionId_idx" ON "facility_rentals"("bookingSessionId");
