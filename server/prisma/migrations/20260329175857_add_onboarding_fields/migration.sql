-- AlterTable
ALTER TABLE "users" ADD COLUMN     "intents" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "locationCity" TEXT,
ADD COLUMN     "locationLat" DOUBLE PRECISION,
ADD COLUMN     "locationLng" DOUBLE PRECISION,
ADD COLUMN     "locationState" TEXT,
ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sportPreferences" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "bookings_userId_idx" ON "bookings"("userId");

-- CreateIndex
CREATE INDEX "bookings_eventId_idx" ON "bookings"("eventId");

-- CreateIndex
CREATE INDEX "bookings_facilityId_idx" ON "bookings"("facilityId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_courtId_idx" ON "bookings"("courtId");

-- CreateIndex
CREATE INDEX "bookings_rentalId_idx" ON "bookings"("rentalId");

-- CreateIndex
CREATE INDEX "bookings_userId_status_idx" ON "bookings"("userId", "status");

-- CreateIndex
CREATE INDEX "bookings_eventId_status_idx" ON "bookings"("eventId", "status");

-- CreateIndex
CREATE INDEX "bookings_eventId_userId_status_idx" ON "bookings"("eventId", "userId", "status");

-- CreateIndex
CREATE INDEX "certification_documents_uploadedBy_idx" ON "certification_documents"("uploadedBy");

-- CreateIndex
CREATE INDEX "events_organizerId_idx" ON "events"("organizerId");

-- CreateIndex
CREATE INDEX "events_facilityId_idx" ON "events"("facilityId");

-- CreateIndex
CREATE INDEX "events_startTime_idx" ON "events"("startTime");

-- CreateIndex
CREATE INDEX "events_rentalId_idx" ON "events"("rentalId");

-- CreateIndex
CREATE INDEX "events_timeSlotId_idx" ON "events"("timeSlotId");

-- CreateIndex
CREATE INDEX "events_sportType_startTime_idx" ON "events"("sportType", "startTime");

-- CreateIndex
CREATE INDEX "events_status_startTime_idx" ON "events"("status", "startTime");

-- CreateIndex
CREATE INDEX "events_facilityId_startTime_idx" ON "events"("facilityId", "startTime");

-- CreateIndex
CREATE INDEX "facilities_latitude_longitude_idx" ON "facilities"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "facilities_ownerId_isActive_idx" ON "facilities"("ownerId", "isActive");

-- CreateIndex
CREATE INDEX "facility_access_images_facilityId_idx" ON "facility_access_images"("facilityId");

-- CreateIndex
CREATE INDEX "facility_availability_facilityId_idx" ON "facility_availability"("facilityId");

-- CreateIndex
CREATE INDEX "facility_courts_facilityId_idx" ON "facility_courts"("facilityId");

-- CreateIndex
CREATE INDEX "facility_rate_schedules_facilityId_idx" ON "facility_rate_schedules"("facilityId");

-- CreateIndex
CREATE INDEX "league_documents_uploadedBy_idx" ON "league_documents"("uploadedBy");

-- CreateIndex
CREATE INDEX "league_memberships_leagueId_status_idx" ON "league_memberships"("leagueId", "status");

-- CreateIndex
CREATE INDEX "matches_eventId_idx" ON "matches"("eventId");

-- CreateIndex
CREATE INDEX "matches_rentalId_idx" ON "matches"("rentalId");

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "reviews"("userId");

-- CreateIndex
CREATE INDEX "reviews_facilityId_idx" ON "reviews"("facilityId");

-- CreateIndex
CREATE INDEX "team_members_teamId_status_idx" ON "team_members"("teamId", "status");

-- CreateIndex
CREATE INDEX "teams_leagueId_idx" ON "teams"("leagueId");

-- CreateIndex
CREATE INDEX "users_guardianId_idx" ON "users"("guardianId");
