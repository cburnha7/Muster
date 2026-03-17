-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "policyNoticeWindowHours" INTEGER,
ADD COLUMN     "policyPenaltyDestination" TEXT,
ADD COLUMN     "policyTeamPenaltyPct" INTEGER,
ADD COLUMN     "policyVersion" TEXT;
