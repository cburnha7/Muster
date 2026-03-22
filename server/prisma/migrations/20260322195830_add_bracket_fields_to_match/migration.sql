-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_awayTeamId_fkey";

-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_homeTeamId_fkey";

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "bracketFlag" TEXT,
ADD COLUMN     "bracketPosition" INTEGER,
ADD COLUMN     "bracketRound" INTEGER,
ADD COLUMN     "gameNumber" INTEGER,
ADD COLUMN     "placeholderAway" TEXT,
ADD COLUMN     "placeholderHome" TEXT,
ALTER COLUMN "homeTeamId" DROP NOT NULL,
ALTER COLUMN "awayTeamId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
