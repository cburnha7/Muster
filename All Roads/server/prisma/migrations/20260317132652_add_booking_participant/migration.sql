-- CreateTable
CREATE TABLE "booking_participants" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "escrowAmount" DOUBLE PRECISION NOT NULL,
    "stripePaymentIntentId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "confirmedAt" TIMESTAMP(3),
    "confirmationDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bookingId" TEXT NOT NULL,

    CONSTRAINT "booking_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_participants_bookingId_idx" ON "booking_participants"("bookingId");

-- CreateIndex
CREATE INDEX "booking_participants_rosterId_idx" ON "booking_participants"("rosterId");

-- AddForeignKey
ALTER TABLE "booking_participants" ADD CONSTRAINT "booking_participants_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
