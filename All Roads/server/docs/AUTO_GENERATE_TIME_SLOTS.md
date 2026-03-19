# Auto-Generate Time Slots Feature

## Overview

The auto-generate time slots feature automatically creates and maintains a rolling 365-day window of bookable time slots for all courts. This eliminates manual setup work for ground operators and ensures courts are immediately available for booking upon creation.

## Key Features

- **Automatic Generation**: Time slots are generated automatically when a court is created
- **365-Day Rolling Window**: Maintains a full year of available time slots
- **Operating Hours Integration**: Respects facility-specific operating hours
- **Async Execution**: Slot generation runs asynchronously to keep API responses fast
- **Daily Maintenance**: Cron job maintains the rolling window automatically
- **Error Recovery**: Failed generations are tracked and retried automatically

## API Changes

### POST /api/facilities/:id/courts

**Behavior Change**: Court creation now generates time slots asynchronously.

**Request** (unchanged):
```json
{
  "name": "Court 1",
  "sportType": "basketball",
  "pricePerHour": 75,
  "capacity": 10,
  "isIndoor": false
}
```

**Response** (unchanged):
```json
{
  "id": "court-uuid",
  "name": "Court 1",
  "sportType": "basketball",
  "pricePerHour": 75,
  "facilityId": "facility-uuid",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Important Notes**:
- API responds immediately (< 500ms) with court data
- Time slots are generated asynchronously in the background
- Slots will be available within a few seconds after court creation
- If slot generation fails, the court is still created successfully
- Failed generations are automatically retried by the daily maintenance job

## Time Slot Generation Details

### Default Operating Hours

If a facility has no operating hours defined, slots are generated with these defaults:
- **Start Time**: 06:00 (6 AM)
- **End Time**: 22:00 (10 PM)
- **Days**: All days of the week (Monday-Sunday)
- **Slot Duration**: 1 hour

### Custom Operating Hours

If a facility has operating hours defined in the `FacilityAvailability` table:
- Slots are generated only during specified operating hours
- Day-of-week restrictions are respected
- Blocked days (maintenance, private events) have no slots generated

### Slot Properties

Each generated time slot has:
- **Date**: Normalized to UTC midnight
- **Start Time**: HH:MM format (24-hour notation)
- **End Time**: HH:MM format (24-hour notation)
- **Duration**: 1 hour (60 minutes)
- **Price**: Inherited from court's `pricePerHour` or facility's default
- **Status**: "available" by default

### Example Slot Generation

For a court with default hours (06:00-22:00):
- **Slots per day**: 16 (6 AM to 10 PM)
- **Total slots**: 5,840 (365 days × 16 hours)

For a court with custom hours (08:00-20:00, Monday-Friday only):
- **Slots per day**: 12 (8 AM to 8 PM)
- **Days per year**: ~260 weekdays
- **Total slots**: ~3,120

## Maintenance and Operations

### Daily Cron Job

A cron job runs daily at 00:00 UTC to:
1. Check all active courts for complete 365-day coverage
2. Generate missing slots for courts with incomplete coverage
3. Retry previously failed generations
4. Log metrics and errors

**Performance**: Completes within 2 minutes for all courts in the system.

### Backfill Script

For existing courts without time slots, run the backfill script:

```bash
cd server
npm run backfill-timeslots
```

Or manually:
```bash
cd server
npx tsx src/scripts/backfillTimeSlots.ts
```

The script:
- Identifies all active courts with zero time slots
- Generates 365-day rolling window for each court
- Reports progress and completion metrics
- Exits with code 1 if any failures occurred

### Monitoring

Key metrics to monitor:
- **Generation Success Rate**: Should be > 95%
- **Courts with Zero Slots**: Should be 0 after 24 hours
- **Cron Job Duration**: Should be < 2 minutes
- **Single Court Generation**: Should be < 5 seconds

### Alerts

Alerts are triggered when:
- A court has zero slots 24 hours after creation
- Cron job duration exceeds 2 minutes
- Generation success rate falls below 95%

## Compatibility with Existing Systems

### Rentals and Bookings

- **Rented Slots**: Slots with status "rented" are never modified or deleted
- **Blocked Slots**: Slots with status "blocked" are preserved
- **Manual Slots**: Manually created slots are not modified

### Price Updates

- **Existing Slots**: Updating a court's `pricePerHour` does NOT change existing slot prices
- **New Slots**: New slots generated after price update will use the new price

### Court Deletion

- **Cascade Delete**: Deleting a court automatically deletes all associated time slots
- **Rental Check**: Courts with future confirmed rentals cannot be deleted

## Configuration

Configuration is centralized in `server/src/config/timeslots.ts`:

```typescript
export const timeSlotConfig = {
  rollingWindowDays: 365,        // Rolling window duration
  defaultStartTime: '06:00',     // Default start time
  defaultEndTime: '22:00',       // Default end time
  slotDurationMinutes: 60,       // Slot duration
  batchSize: 1000,               // Batch insert size
  cronSchedule: '0 0 * * *',     // Daily at midnight UTC
  maxRetries: 3,                 // Max retry attempts
  maxGenerationTimeMs: 5000,     // Performance threshold
  maxCronDurationMs: 120000,     // Cron job timeout
};
```

## Troubleshooting

### Court has zero slots after 24 hours

**Check**:
```sql
SELECT COUNT(*) FROM facility_time_slots WHERE court_id = '<court-id>';
```

**Fix**:
```bash
cd server
npx tsx src/scripts/backfillTimeSlots.ts
```

### Cron job taking too long

**Check logs** for slow courts:
```bash
grep "Slot generation" /var/log/muster-api.log
```

**Optimize**:
- Increase batch size in configuration
- Check database indexes
- Review operating hours complexity

### Duplicate slots created

**Check**:
```sql
SELECT court_id, date, start_time, COUNT(*) as count
FROM facility_time_slots
GROUP BY court_id, date, start_time
HAVING COUNT(*) > 1;
```

**Fix**: The system uses `skipDuplicates: true` to prevent this. If duplicates exist, they were created before this feature was deployed.

## Migration Guide

### For Existing Deployments

1. **Deploy Code**: Deploy the new services and API changes
2. **Install Dependencies**: `npm install node-cron @types/node-cron`
3. **Enable Cron Job**: Uncomment cron job initialization in `server/src/index.ts`
4. **Run Backfill**: Execute backfill script for existing courts
5. **Monitor**: Check logs and metrics for first 24 hours
6. **Verify**: Confirm all courts have 365-day coverage

### Rollback Plan

If issues arise:
1. **Disable Cron Job**: Comment out cron job initialization
2. **Revert API**: Restore inline slot generation in court creation
3. **Clean Up**: Remove duplicate slots if any were created

## Future Enhancements

Planned improvements:
- Configurable slot durations (30 min, 1 hour, 2 hours)
- Dynamic pricing by time of day
- Seasonal operating hours
- Bulk slot operations
- Slot generation preview
- Machine learning for demand prediction

## Support

For issues or questions:
- Check logs: `server/logs/` or console output
- Review metrics: Cron job execution logs
- Contact: System administrators or on-call engineer
