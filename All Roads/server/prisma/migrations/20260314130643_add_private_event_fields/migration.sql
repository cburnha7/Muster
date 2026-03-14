-- AlterTable
ALTER TABLE "events" ADD COLUMN     "invitedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;
