-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "rentalId" TEXT;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "facility_rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
