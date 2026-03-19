-- AlterTable
ALTER TABLE "events" ADD COLUMN     "scheduledStatus" TEXT NOT NULL DEFAULT 'scheduled';

-- AlterTable
ALTER TABLE "leagues" ADD COLUMN     "minimumRosterSize" INTEGER,
ADD COLUMN     "preferredGameDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "preferredTimeWindowEnd" TEXT,
ADD COLUMN     "preferredTimeWindowStart" TEXT,
ADD COLUMN     "registrationCloseDate" TIMESTAMP(3),
ADD COLUMN     "scheduleGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seasonGameCount" INTEGER;
