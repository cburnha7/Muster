-- AlterTable
ALTER TABLE "events" ADD COLUMN     "timeSlotId" TEXT;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "facility_time_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
