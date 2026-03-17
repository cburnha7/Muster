-- AlterTable
ALTER TABLE "facilities" ADD COLUMN     "noticeWindowHours" INTEGER,
ADD COLUMN     "penaltyDestination" TEXT,
ADD COLUMN     "policyVersion" TEXT,
ADD COLUMN     "teamPenaltyPct" INTEGER;
