-- Add slotIncrementMinutes field to Facility table
-- Default to 60 minutes (1 hour) for existing facilities
ALTER TABLE "facilities" ADD COLUMN "slotIncrementMinutes" INTEGER NOT NULL DEFAULT 60;

-- Add check constraint to ensure only 30 or 60 minute increments
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_slotIncrementMinutes_check" 
  CHECK ("slotIncrementMinutes" IN (30, 60));

-- Add comment for documentation
COMMENT ON COLUMN "facilities"."slotIncrementMinutes" IS 'Time slot increment in minutes: 30 or 60';
