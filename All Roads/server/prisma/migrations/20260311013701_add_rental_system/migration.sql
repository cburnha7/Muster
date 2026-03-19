-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "rentalId" TEXT;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "rentalId" TEXT;

-- CreateTable
CREATE TABLE "facility_time_slots" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "blockReason" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courtId" TEXT NOT NULL,

    CONSTRAINT "facility_time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_rentals" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "confirmationSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent24h" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent1h" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,

    CONSTRAINT "facility_rentals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facility_time_slots_courtId_idx" ON "facility_time_slots"("courtId");

-- CreateIndex
CREATE INDEX "facility_time_slots_date_idx" ON "facility_time_slots"("date");

-- CreateIndex
CREATE INDEX "facility_time_slots_status_idx" ON "facility_time_slots"("status");

-- CreateIndex
CREATE UNIQUE INDEX "facility_time_slots_courtId_date_startTime_key" ON "facility_time_slots"("courtId", "date", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "facility_rentals_timeSlotId_key" ON "facility_rentals"("timeSlotId");

-- CreateIndex
CREATE INDEX "facility_rentals_userId_idx" ON "facility_rentals"("userId");

-- CreateIndex
CREATE INDEX "facility_rentals_status_idx" ON "facility_rentals"("status");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "facility_rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "facility_rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_time_slots" ADD CONSTRAINT "facility_time_slots_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "facility_courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_rentals" ADD CONSTRAINT "facility_rentals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_rentals" ADD CONSTRAINT "facility_rentals_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "facility_time_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
