-- AlterTable
ALTER TABLE "events" ADD COLUMN     "ageRestricted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "player_sport_ratings" ADD COLUMN     "ageBracket" TEXT,
ADD COLUMN     "bracketEventCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bracketPercentile" DOUBLE PRECISION,
ADD COLUMN     "bracketRating" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "overallEventCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overallPercentile" DOUBLE PRECISION,
ADD COLUMN     "overallRating" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ageBracket" TEXT;

-- CreateIndex
CREATE INDEX "player_sport_ratings_sportType_ageBracket_idx" ON "player_sport_ratings"("sportType", "ageBracket");
