-- AlterTable
ALTER TABLE "facilities" ADD COLUMN     "requiresInsurance" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "facility_rentals" ADD COLUMN     "attachedInsuranceDocumentId" TEXT,
ADD COLUMN     "escrowBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "rentalFeeCharged" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "insurance_documents" (
    "id" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "policyName" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiryNotificationSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "insurance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_transactions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rentalId" TEXT NOT NULL,

    CONSTRAINT "escrow_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insurance_documents_userId_idx" ON "insurance_documents"("userId");

-- CreateIndex
CREATE INDEX "insurance_documents_status_idx" ON "insurance_documents"("status");

-- CreateIndex
CREATE INDEX "insurance_documents_expiryDate_idx" ON "insurance_documents"("expiryDate");

-- CreateIndex
CREATE INDEX "escrow_transactions_rentalId_idx" ON "escrow_transactions"("rentalId");

-- CreateIndex
CREATE INDEX "escrow_transactions_type_idx" ON "escrow_transactions"("type");

-- AddForeignKey
ALTER TABLE "facility_rentals" ADD CONSTRAINT "facility_rentals_attachedInsuranceDocumentId_fkey" FOREIGN KEY ("attachedInsuranceDocumentId") REFERENCES "insurance_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_documents" ADD CONSTRAINT "insurance_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_transactions" ADD CONSTRAINT "escrow_transactions_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "facility_rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
