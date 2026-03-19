-- AlterTable
ALTER TABLE "leagues" ADD COLUMN     "autoGenerateMatchups" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduleFrequency" TEXT,
ADD COLUMN     "seasonLength" INTEGER;
