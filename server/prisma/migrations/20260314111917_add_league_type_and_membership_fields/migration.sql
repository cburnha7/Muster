-- AlterTable: Add new fields to leagues
ALTER TABLE "leagues" ADD COLUMN     "leagueType" TEXT NOT NULL DEFAULT 'team',
ADD COLUMN     "membershipFee" DOUBLE PRECISION,
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'public';

-- AlterTable: Add new columns to league_memberships (memberId nullable initially)
ALTER TABLE "league_memberships" ADD COLUMN     "memberType" TEXT NOT NULL DEFAULT 'roster',
ADD COLUMN     "memberId" TEXT,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "teamId" DROP NOT NULL;

-- Backfill: Set memberId from teamId for all existing roster memberships
UPDATE "league_memberships" SET "memberId" = "teamId" WHERE "memberId" IS NULL;

-- Now make memberId NOT NULL
ALTER TABLE "league_memberships" ALTER COLUMN "memberId" SET NOT NULL;

-- DropIndex: Remove old unique constraint
DROP INDEX "league_memberships_leagueId_teamId_seasonId_key";

-- CreateIndex: Add new unique constraint with memberType and memberId
CREATE UNIQUE INDEX "league_memberships_leagueId_memberType_memberId_seasonId_key" ON "league_memberships"("leagueId", "memberType", "memberId", "seasonId");

-- CreateIndex: Add index on userId
CREATE INDEX "league_memberships_userId_idx" ON "league_memberships"("userId");

-- AddForeignKey: Link userId to users table
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
