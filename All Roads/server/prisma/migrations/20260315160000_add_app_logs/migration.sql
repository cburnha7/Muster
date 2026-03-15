-- CreateTable
CREATE TABLE "app_logs" (
    "id" TEXT NOT NULL,
    "logType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "screen" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_logs_logType_idx" ON "app_logs"("logType");
CREATE INDEX "app_logs_userId_idx" ON "app_logs"("userId");
CREATE INDEX "app_logs_createdAt_idx" ON "app_logs"("createdAt");
