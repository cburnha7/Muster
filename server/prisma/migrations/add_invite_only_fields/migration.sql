-- Add invite-only event fields to Event table
ALTER TABLE "events" ADD COLUMN "minimumPlayerCount" INTEGER;
ALTER TABLE "events" ADD COLUMN "wasAutoOpenedToPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN "autoOpenedAt" TIMESTAMP(3);

-- Add index for efficient querying of invite-only events
CREATE INDEX "events_invite_only_auto_open_idx" ON "events"("eligibilityIsInviteOnly", "wasAutoOpenedToPublic", "startTime") WHERE "eligibilityIsInviteOnly" = true AND "wasAutoOpenedToPublic" = false;

-- Add comment explaining the fields
COMMENT ON COLUMN "events"."minimumPlayerCount" IS 'Minimum players needed for event to proceed (required for invite-only events)';
COMMENT ON COLUMN "events"."wasAutoOpenedToPublic" IS 'Track if event was automatically opened to public due to not reaching minimum players';
COMMENT ON COLUMN "events"."autoOpenedAt" IS 'Timestamp when the event was automatically opened to public';
