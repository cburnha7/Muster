-- CreateTable
CREATE TABLE "player_dues_payments" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "stripePaymentIntentId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "playerId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,

    CONSTRAINT "player_dues_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_dues_payments_playerId_idx" ON "player_dues_payments"("playerId");

-- CreateIndex
CREATE INDEX "player_dues_payments_rosterId_idx" ON "player_dues_payments"("rosterId");

-- CreateIndex
CREATE INDEX "player_dues_payments_seasonId_idx" ON "player_dues_payments"("seasonId");

-- CreateIndex
CREATE INDEX "player_dues_payments_paymentStatus_idx" ON "player_dues_payments"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "player_dues_payments_playerId_rosterId_seasonId_key" ON "player_dues_payments"("playerId", "rosterId", "seasonId");

-- AddForeignKey
ALTER TABLE "player_dues_payments" ADD CONSTRAINT "player_dues_payments_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_dues_payments" ADD CONSTRAINT "player_dues_payments_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_dues_payments" ADD CONSTRAINT "player_dues_payments_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
