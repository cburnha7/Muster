-- AlterTable
ALTER TABLE "seasons" ADD COLUMN     "avgCourtCost" DOUBLE PRECISION,
ADD COLUMN     "duesAmount" DOUBLE PRECISION,
ADD COLUMN     "gamesPerTeam" INTEGER,
ADD COLUMN     "pricingType" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "suggestedMinDues" DOUBLE PRECISION;
