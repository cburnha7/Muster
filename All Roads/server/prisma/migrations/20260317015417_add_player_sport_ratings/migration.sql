-- CreateTable
CREATE TABLE "player_sport_ratings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sportType" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "percentile" DOUBLE PRECISION,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_sport_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_sport_ratings_sportType_idx" ON "player_sport_ratings"("sportType");

-- CreateIndex
CREATE INDEX "player_sport_ratings_userId_idx" ON "player_sport_ratings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "player_sport_ratings_userId_sportType_key" ON "player_sport_ratings"("userId", "sportType");

-- AddForeignKey
ALTER TABLE "player_sport_ratings" ADD CONSTRAINT "player_sport_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
