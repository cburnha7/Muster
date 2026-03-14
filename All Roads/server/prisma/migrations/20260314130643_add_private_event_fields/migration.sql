-- This migration was a duplicate of 20260314090638_add_private_event_fields
-- which already added isPrivate and invitedUserIds to the events table.
-- The original migration failed because those columns already existed.
-- Converted to IF NOT EXISTS to be safely idempotent.

-- AlterTable
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "invitedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT false;
