/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "membershipTier" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'member',
ADD COLUMN     "tierTag" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
