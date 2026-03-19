-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "bookingHostId" TEXT,
ADD COLUMN     "bookingHostType" TEXT,
ADD COLUMN     "stripeTransferGroup" TEXT;
