/*
  Warnings:

  - You are about to drop the column `season` on the `leagues` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "leagues" DROP COLUMN "season",
ADD COLUMN     "certifiedAt" TIMESTAMP(3),
ADD COLUMN     "isCertified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pointsConfig" JSONB NOT NULL DEFAULT '{"win": 3, "draw": 1, "loss": 0}',
ADD COLUMN     "seasonId" TEXT,
ADD COLUMN     "seasonName" TEXT;

-- CreateTable
CREATE TABLE "league_memberships" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "goalDifference" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seasonId" TEXT,

    CONSTRAINT "league_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "playedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "outcome" TEXT,
    "eventId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leagueId" TEXT NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_documents" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "documentType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leagueId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "league_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_documents" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "boardMembers" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "leagueId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "certification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "league_memberships_leagueId_idx" ON "league_memberships"("leagueId");

-- CreateIndex
CREATE INDEX "league_memberships_teamId_idx" ON "league_memberships"("teamId");

-- CreateIndex
CREATE INDEX "league_memberships_seasonId_idx" ON "league_memberships"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "league_memberships_leagueId_teamId_seasonId_key" ON "league_memberships"("leagueId", "teamId", "seasonId");

-- CreateIndex
CREATE INDEX "matches_leagueId_idx" ON "matches"("leagueId");

-- CreateIndex
CREATE INDEX "matches_seasonId_idx" ON "matches"("seasonId");

-- CreateIndex
CREATE INDEX "matches_homeTeamId_idx" ON "matches"("homeTeamId");

-- CreateIndex
CREATE INDEX "matches_awayTeamId_idx" ON "matches"("awayTeamId");

-- CreateIndex
CREATE INDEX "matches_scheduledAt_idx" ON "matches"("scheduledAt");

-- CreateIndex
CREATE INDEX "seasons_leagueId_idx" ON "seasons"("leagueId");

-- CreateIndex
CREATE INDEX "seasons_isActive_idx" ON "seasons"("isActive");

-- CreateIndex
CREATE INDEX "league_documents_leagueId_idx" ON "league_documents"("leagueId");

-- CreateIndex
CREATE INDEX "certification_documents_leagueId_idx" ON "certification_documents"("leagueId");

-- CreateIndex
CREATE INDEX "leagues_sportType_idx" ON "leagues"("sportType");

-- CreateIndex
CREATE INDEX "leagues_isActive_idx" ON "leagues"("isActive");

-- CreateIndex
CREATE INDEX "leagues_isCertified_idx" ON "leagues"("isCertified");

-- AddForeignKey
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_documents" ADD CONSTRAINT "league_documents_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_documents" ADD CONSTRAINT "league_documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_documents" ADD CONSTRAINT "certification_documents_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification_documents" ADD CONSTRAINT "certification_documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
