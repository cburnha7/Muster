-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "courtId" TEXT;

-- AlterTable
ALTER TABLE "facilities" ADD COLUMN     "facilityMapThumbnailUrl" TEXT,
ADD COLUMN     "facilityMapUrl" TEXT;

-- CreateTable
CREATE TABLE "facility_courts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportType" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isIndoor" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "boundaryCoordinates" JSONB,
    "pricePerHour" DOUBLE PRECISION,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facilityId" TEXT NOT NULL,

    CONSTRAINT "facility_courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_court_availability" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "specificDate" TIMESTAMP(3),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courtId" TEXT NOT NULL,

    CONSTRAINT "facility_court_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facility_court_availability_courtId_idx" ON "facility_court_availability"("courtId");

-- CreateIndex
CREATE INDEX "facility_court_availability_specificDate_idx" ON "facility_court_availability"("specificDate");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "facility_courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_courts" ADD CONSTRAINT "facility_courts_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_court_availability" ADD CONSTRAINT "facility_court_availability_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "facility_courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
