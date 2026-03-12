-- AlterTable
ALTER TABLE "facility_rentals" ADD COLUMN     "usedForEventId" TEXT;

-- CreateIndex
CREATE INDEX "facility_rentals_usedForEventId_idx" ON "facility_rentals"("usedForEventId");

-- AddForeignKey
ALTER TABLE "facility_rentals" ADD CONSTRAINT "facility_rentals_usedForEventId_fkey" FOREIGN KEY ("usedForEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
