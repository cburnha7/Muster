-- AlterTable
ALTER TABLE "facility_rentals" ADD COLUMN     "recurringGroupId" TEXT;

-- CreateTable
CREATE TABLE "recurring_bookings" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalInstances" INTEGER NOT NULL,
    "activeInstances" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recurring_bookings_groupId_key" ON "recurring_bookings"("groupId");

-- CreateIndex
CREATE INDEX "recurring_bookings_userId_idx" ON "recurring_bookings"("userId");

-- CreateIndex
CREATE INDEX "recurring_bookings_courtId_idx" ON "recurring_bookings"("courtId");

-- CreateIndex
CREATE INDEX "facility_rentals_recurringGroupId_idx" ON "facility_rentals"("recurringGroupId");
