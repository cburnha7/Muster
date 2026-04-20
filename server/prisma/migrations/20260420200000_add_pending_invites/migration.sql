-- CreateTable
CREATE TABLE "pending_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "contextName" TEXT,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedBy" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_invites_email_idx" ON "pending_invites"("email");

-- CreateIndex
CREATE INDEX "pending_invites_contextId_idx" ON "pending_invites"("contextId");
