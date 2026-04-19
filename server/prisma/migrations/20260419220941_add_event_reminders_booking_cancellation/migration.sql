-- AlterTable
ALTER TABLE "public"."bookings" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."events" ADD COLUMN     "postGameMessageSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSent1h" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSent24h" BOOLEAN NOT NULL DEFAULT false;
