-- AlterTable
ALTER TABLE "users" ADD COLUMN     "guardianId" TEXT,
ADD COLUMN     "isDependent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transferNotificationSent" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "email" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
