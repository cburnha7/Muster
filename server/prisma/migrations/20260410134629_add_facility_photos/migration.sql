-- AlterTable
ALTER TABLE "public"."game_participations" ADD COLUMN     "leagueId" TEXT,
ADD COLUMN     "postGameRank" INTEGER,
ADD COLUMN     "preGameRank" INTEGER,
ADD COLUMN     "preGameRating" DOUBLE PRECISION,
ADD COLUMN     "saluteCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sportType" TEXT;

-- AlterTable
ALTER TABLE "public"."player_sport_ratings" ADD COLUMN     "ageGroupGamesPlayed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ageGroupPercentile" DOUBLE PRECISION,
ADD COLUMN     "ageGroupRating" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN     "ageGroupScoreHistory" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "leagueRatingHistory" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "openGamesPlayed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openLastDecayAt" TIMESTAMP(3),
ADD COLUMN     "openPercentile" DOUBLE PRECISION,
ADD COLUMN     "openRating" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN     "openScoreHistory" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "public"."facility_photos" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."player_opponent_history" (
    "id" TEXT NOT NULL,
    "playerAId" TEXT NOT NULL,
    "playerBId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_opponent_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."saved_open_ground_locations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_open_ground_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "facility_photos_facilityId_idx" ON "public"."facility_photos"("facilityId");

-- CreateIndex
CREATE INDEX "player_opponent_history_playerAId_idx" ON "public"."player_opponent_history"("playerAId");

-- CreateIndex
CREATE INDEX "player_opponent_history_playerBId_idx" ON "public"."player_opponent_history"("playerBId");

-- CreateIndex
CREATE UNIQUE INDEX "player_opponent_history_playerAId_playerBId_key" ON "public"."player_opponent_history"("playerAId", "playerBId");

-- CreateIndex
CREATE INDEX "saved_open_ground_locations_userId_lastUsedAt_idx" ON "public"."saved_open_ground_locations"("userId", "lastUsedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "saved_open_ground_locations_userId_name_address_key" ON "public"."saved_open_ground_locations"("userId", "name", "address");

-- CreateIndex
CREATE INDEX "game_participations_userId_sportType_idx" ON "public"."game_participations"("userId", "sportType");

-- CreateIndex
CREATE INDEX "game_participations_userId_leagueId_idx" ON "public"."game_participations"("userId", "leagueId");

-- AddForeignKey
ALTER TABLE "public"."facility_photos" ADD CONSTRAINT "facility_photos_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."saved_open_ground_locations" ADD CONSTRAINT "saved_open_ground_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
