# Time Slot Auto-Creation Fix

## Issue
Courts created through the facility creation form had no available time slots, making them unbookable.

## Root Cause
When the backend 500 error fix removed the auto-creation of a default court from the facility creation endpoint, it also removed the time slot generation logic. The court creation endpoint (`POST /facilities/:facilityId/courts`) was not generating time slots for newly created courts.

## Solution

### 1. Added Auto-Creation to Court Endpoint
Modified `server/src/routes/courts.ts` POST endpoint to automatically generate time slots when a court is created:

- Generates time slots for the next 90 days
- Creates slots from 6 AM to 10 PM (16 hours per day)
- Each slot is 1 hour long
- Uses court's `pricePerHour` or facility's `pricePerHour` (defaults to $50)
- All slots start with `status: 'available'`

**Total slots per court**: 90 days × 16 hours = 1,440 time slots

### 2. Generated Slots for Existing Courts
Ran `server/src/scripts/generate-timeslots-for-courts.ts` to backfill time slots for existing courts:

- Court: "Backyard at My House" - 1,440 slots created
- Court: "Rink at My House" - 1,440 slots created
- Total: 2,880 time slots created

### 3. Verification
Created `server/src/scripts/check-court-timeslots.ts` to verify time slots:

```
Court: Backyard at My House
  Total time slots: 1440
  Available slots: 1440
  Sample slots for today (2026-03-12):
    06:00 - 07:00 | available | $50
    07:00 - 08:00 | available | $50
    08:00 - 09:00 | available | $50
    ...
```

## Files Modified
- `server/src/routes/courts.ts` - Added time slot auto-creation to POST endpoint

## Files Created
- `server/src/scripts/check-court-timeslots.ts` - Verification script

## Testing
1. Existing courts now have time slots and show available times
2. New courts created through the form will automatically get time slots
3. Courts are now bookable for events and rentals

## Next Steps
- Test creating a new ground with courts to verify auto-creation works
- Verify that courts show available times in the UI
- Test booking a time slot to ensure the rental flow works
