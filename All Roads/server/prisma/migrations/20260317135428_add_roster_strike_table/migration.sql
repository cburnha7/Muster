-- CreateTable
CREATE TABLE "roster_strikes" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "matchId" TEXT,
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rosterId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,

    CONSTRAINT "roster_strikes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "roster_strikes_rosterId_idx" ON "roster_strikes"("rosterId");

-- CreateIndex
CREATE INDEX "roster_strikes_seasonId_idx" ON "roster_strikes"("seasonId");

-- AddForeignKey
ALTER TABLE "roster_strikes" ADD CONSTRAINT "roster_strikes_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_strikes" ADD CONSTRAINT "roster_strikes_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
