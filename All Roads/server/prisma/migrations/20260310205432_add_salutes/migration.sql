-- CreateTable
CREATE TABLE "salutes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,

    CONSTRAINT "salutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salutes_eventId_idx" ON "salutes"("eventId");

-- CreateIndex
CREATE INDEX "salutes_fromUserId_idx" ON "salutes"("fromUserId");

-- CreateIndex
CREATE INDEX "salutes_toUserId_idx" ON "salutes"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "salutes_eventId_fromUserId_toUserId_key" ON "salutes"("eventId", "fromUserId", "toUserId");

-- AddForeignKey
ALTER TABLE "salutes" ADD CONSTRAINT "salutes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salutes" ADD CONSTRAINT "salutes_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salutes" ADD CONSTRAINT "salutes_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
