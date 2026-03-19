-- AlterTable
ALTER TABLE "facilities" ADD COLUMN     "cancellationPolicyHours" INTEGER;

-- AlterTable
ALTER TABLE "leagues" ADD COLUMN     "readyNotificationSent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "cancel_requests" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "groundId" TEXT NOT NULL,

    CONSTRAINT "cancel_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cancel_requests_groundId_status_idx" ON "cancel_requests"("groundId", "status");

-- CreateIndex
CREATE INDEX "cancel_requests_userId_idx" ON "cancel_requests"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "cancel_requests_reservationId_status_key" ON "cancel_requests"("reservationId", "status");

-- AddForeignKey
ALTER TABLE "cancel_requests" ADD CONSTRAINT "cancel_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancel_requests" ADD CONSTRAINT "cancel_requests_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "facility_rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancel_requests" ADD CONSTRAINT "cancel_requests_groundId_fkey" FOREIGN KEY ("groundId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: update existing cancellationStatus values to new format
UPDATE "facility_rentals"
SET "cancellationStatus" = 'pending'
WHERE "cancellationStatus" = 'pending_cancellation';
