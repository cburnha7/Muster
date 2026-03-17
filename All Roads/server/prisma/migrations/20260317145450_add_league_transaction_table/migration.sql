-- CreateTable
CREATE TABLE "league_transactions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rosterId" TEXT,
    "facilityId" TEXT,
    "rentalId" TEXT,
    "matchId" TEXT,
    "stripePaymentId" TEXT,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,

    CONSTRAINT "league_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "league_transactions_leagueId_idx" ON "league_transactions"("leagueId");

-- CreateIndex
CREATE INDEX "league_transactions_seasonId_idx" ON "league_transactions"("seasonId");

-- CreateIndex
CREATE INDEX "league_transactions_leagueId_seasonId_idx" ON "league_transactions"("leagueId", "seasonId");

-- CreateIndex
CREATE INDEX "league_transactions_type_idx" ON "league_transactions"("type");

-- CreateIndex
CREATE INDEX "league_transactions_createdAt_idx" ON "league_transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "league_transactions" ADD CONSTRAINT "league_transactions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_transactions" ADD CONSTRAINT "league_transactions_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
