-- AlterTable
ALTER TABLE "facilities" ADD COLUMN     "waiverRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waiverText" TEXT,
ADD COLUMN     "waiverVersion" TEXT;

-- CreateTable
CREATE TABLE "waiver_signatures" (
    "id" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "waiverVersion" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,

    CONSTRAINT "waiver_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waiver_signatures_userId_idx" ON "waiver_signatures"("userId");

-- CreateIndex
CREATE INDEX "waiver_signatures_facilityId_idx" ON "waiver_signatures"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "waiver_signatures_userId_facilityId_waiverVersion_key" ON "waiver_signatures"("userId", "facilityId", "waiverVersion");

-- AddForeignKey
ALTER TABLE "waiver_signatures" ADD CONSTRAINT "waiver_signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiver_signatures" ADD CONSTRAINT "waiver_signatures_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
