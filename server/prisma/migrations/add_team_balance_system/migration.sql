-- Add roster balance and join fee fields to Team table
ALTER TABLE "teams" ADD COLUMN "balance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "teams" ADD COLUMN "joinFee" DOUBLE PRECISION;
ALTER TABLE "teams" ADD COLUMN "joinFeeType" TEXT;
ALTER TABLE "teams" ADD COLUMN "stripeAccountId" TEXT;
ALTER TABLE "teams" ADD COLUMN "lastBalanceUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add group fee coverage fields to Event table
ALTER TABLE "events" ADD COLUMN "isGroupFeeCovered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN "coveringTeamId" TEXT;

-- Create TeamTransaction table for tracking roster balance transactions
CREATE TABLE "team_transactions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT,
    "rentalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "team_transactions_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "team_transactions" ADD CONSTRAINT "team_transactions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_transactions" ADD CONSTRAINT "team_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "team_transactions" ADD CONSTRAINT "team_transactions_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "facility_rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for efficient querying
CREATE INDEX "team_transactions_teamId_idx" ON "team_transactions"("teamId");
CREATE INDEX "team_transactions_userId_idx" ON "team_transactions"("userId");
CREATE INDEX "team_transactions_type_idx" ON "team_transactions"("type");
CREATE INDEX "team_transactions_createdAt_idx" ON "team_transactions"("createdAt");

-- Add check constraint to ensure joinFeeType is valid
ALTER TABLE "teams" ADD CONSTRAINT "teams_joinFeeType_check" CHECK ("joinFeeType" IN ('one_time', 'monthly') OR "joinFeeType" IS NULL);

-- Add check constraint to ensure transaction type is valid
ALTER TABLE "team_transactions" ADD CONSTRAINT "team_transactions_type_check" CHECK ("type" IN ('join_fee', 'top_up', 'booking_debit', 'refund'));

-- Add check constraint to ensure payment status is valid
ALTER TABLE "team_transactions" ADD CONSTRAINT "team_transactions_paymentStatus_check" CHECK ("paymentStatus" IN ('pending', 'completed', 'failed', 'refunded'));

-- Add comments explaining the fields
COMMENT ON COLUMN "teams"."balance" IS 'Current roster balance in USD pooled from join fees and top-ups';
COMMENT ON COLUMN "teams"."joinFee" IS 'Optional join fee amount charged to new players';
COMMENT ON COLUMN "teams"."joinFeeType" IS 'Type of join fee: one_time or monthly';
COMMENT ON COLUMN "teams"."stripeAccountId" IS 'Stripe Connect account ID for receiving payments';
COMMENT ON COLUMN "teams"."lastBalanceUpdate" IS 'Timestamp of last balance modification';

COMMENT ON COLUMN "events"."isGroupFeeCovered" IS 'Whether event cost is covered by roster balance';
COMMENT ON COLUMN "events"."coveringTeamId" IS 'ID of roster covering the event cost';

COMMENT ON TABLE "team_transactions" IS 'Transaction history for roster balance changes';
COMMENT ON COLUMN "team_transactions"."type" IS 'Transaction type: join_fee, top_up, booking_debit, or refund';
COMMENT ON COLUMN "team_transactions"."amount" IS 'Transaction amount (positive for credits, negative for debits)';
COMMENT ON COLUMN "team_transactions"."balanceBefore" IS 'Roster balance before this transaction';
COMMENT ON COLUMN "team_transactions"."balanceAfter" IS 'Roster balance after this transaction';
