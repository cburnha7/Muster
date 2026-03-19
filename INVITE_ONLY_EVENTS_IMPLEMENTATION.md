# Invite-Only Events with Auto-Open Implementation

## Overview
This document describes the implementation of invite-only events with minimum player count requirements and automatic opening to public at the 2-day threshold.

## Features Implemented

### 1. Database Schema Updates
**File**: `server/prisma/schema.prisma`

Added three new fields to the Event model:
- `minimumPlayerCount`: Integer field for minimum players needed (required for invite-only events)
- `wasAutoOpenedToPublic`: Boolean flag tracking if event was auto-opened (default: false)
- `autoOpenedAt`: Timestamp of when auto-opening occurred

**Migration**: `server/prisma/migrations/add_invite_only_fields/migration.sql`

### 2. TypeScript Type Updates
**File**: `src/types/index.ts`

Updated `EventEligibility` interface to include:
```typescript
minimumPlayerCount?: number;
wasAutoOpenedToPublic?: boolean;
autoOpenedAt?: Date;
```

### 3. Event Creation Form Updates
**File**: `src/screens/events/CreateEventScreen.tsx`

Added UI components for:
- Invite-only toggle checkbox
- Minimum player count input field (required when invite-only is enabled)
- Information box explaining the 2-day auto-open rule
- Form validation ensuring minimum player count doesn't exceed max participants

### 4. Background Job Service
**File**: `server/src/jobs/InviteOnlyEventAutoOpenJob.ts`

Created scheduled job that:
- Runs every 6 hours (configurable via cron schedule)
- Queries invite-only events starting within 2 days
- Checks if current participants < minimum player count
- Auto-opens qualifying events to public
- Sends notifications to event organizers
- Tracks metrics (events checked, opened, errors)

**Job Registration**: `server/src/jobs/index.ts`
- Registered cron job with schedule: `'0 */6 * * *'` (every 6 hours)
- Includes error handling and logging

### 5. Notification Service
**File**: `server/src/services/NotificationService.ts`

Added method `sendEventAutoOpenedNotification()` that:
- Notifies organizer when their event is auto-opened
- Includes event details and reason for opening
- Logs notification for monitoring

### 6. Visual Indicators
**File**: `src/components/ui/EventCard.tsx`

Added UI elements:
- "Invite Only" badge with lock icon (orange/court color)
- Badge only shows while event is still invite-only
- "Now open to public - was invite-only" banner for auto-opened events
- Uses brand colors from theme system

## Business Logic

### Auto-Open Trigger Conditions
An invite-only event is automatically opened to public when ALL of the following are true:
1. Event is marked as invite-only (`eligibilityIsInviteOnly = true`)
2. Event has not been previously auto-opened (`wasAutoOpenedToPublic = false`)
3. Event status is 'active'
4. Event starts within 2 days from current time
5. Current confirmed participants < minimum player count

### After Auto-Opening
Once an event is auto-opened:
- `eligibilityIsInviteOnly` is set to `false`
- `wasAutoOpenedToPublic` is set to `true`
- `autoOpenedAt` is set to current timestamp
- Event appears in all public lists (Events tab, search, nearby events)
- Organizer receives immediate notification
- "Invite Only" badge is removed
- Optional banner shows it was previously invite-only

### If Minimum is Reached
If an invite-only event reaches its minimum player count before the 2-day threshold:
- Event remains invite-only for the full duration
- Auto-open job skips the event
- Event never appears in public lists

## API Changes

### Event Creation Endpoint
The event creation endpoint now accepts:
```typescript
{
  eligibility: {
    isInviteOnly: boolean;
    minimumPlayerCount?: number; // Required if isInviteOnly is true
    // ... other eligibility fields
  }
}
```

### Event Query Filtering
Invite-only events are filtered from public queries unless:
- User is the organizer
- User has been explicitly invited (future enhancement)
- User is a member of a restricted team
- Event has been auto-opened to public

## Monitoring & Observability

### Job Metrics
The auto-open job tracks:
- `eventsChecked`: Total invite-only events evaluated
- `eventsAutoOpened`: Events that were opened to public
- `notificationsSent`: Organizer notifications sent
- `duration`: Job execution time in milliseconds
- `errors`: Array of any errors encountered

### Logging
- Job start/completion logged with metrics
- Individual event auto-opens logged with details
- Errors logged with event ID and error message
- Warnings logged if errors occur during execution

## Database Indexes
Added composite index for efficient querying:
```sql
CREATE INDEX "events_invite_only_auto_open_idx" 
ON "events"("eligibilityIsInviteOnly", "wasAutoOpenedToPublic", "startTime") 
WHERE "eligibilityIsInviteOnly" = true AND "wasAutoOpenedToPublic" = false;
```

## Testing Recommendations

### Unit Tests
- Validate form validation for minimum player count
- Test auto-open logic with various participant counts
- Test date threshold calculations (exactly 2 days, before, after)

### Integration Tests
- Create invite-only event and verify it's hidden from public lists
- Simulate time passing and verify auto-open triggers
- Verify notification is sent to organizer
- Test event with minimum reached stays invite-only

### Manual Testing
1. Create invite-only event with minimum player count
2. Verify "Invite Only" badge appears
3. Verify event doesn't appear in public Events tab
4. Manually trigger job or wait for scheduled run
5. Verify event opens to public after 2-day threshold
6. Verify organizer receives notification
7. Verify badge changes to "Now open to public"

## Future Enhancements

### User Invitations
- Add EventInvitation model to track specific user invites
- UI for organizer to invite users by email/username
- Invited users see event in their personalized feed
- Accept/decline invitation flow

### Team Restrictions
- Already supported via `restrictedToTeams` field
- Can be combined with invite-only for team-only events
- Team members automatically have access

### Notification Preferences
- Allow users to opt-in/out of auto-open notifications
- Support multiple notification channels (push, email, SMS)
- Configurable notification timing

### Analytics
- Track conversion rate of invite-only to public events
- Monitor average time to reach minimum players
- Dashboard for organizers showing event performance

## Configuration

### Cron Schedule
Current: Every 6 hours (`'0 */6 * * *'`)

To change frequency, update in `server/src/jobs/index.ts`:
```typescript
cron.schedule('0 */6 * * *', async () => { ... });
```

Common alternatives:
- Every hour: `'0 * * * *'`
- Every 4 hours: `'0 */4 * * *'`
- Daily at midnight: `'0 0 * * *'`

### Threshold Period
Current: 2 days before event

To change, update in `server/src/jobs/InviteOnlyEventAutoOpenJob.ts`:
```typescript
const twoDaysFromNow = new Date();
twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2); // Change this number
```

## Deployment Checklist

- [ ] Run database migration: `npx prisma migrate deploy`
- [ ] Restart backend server to register new cron job
- [ ] Verify cron job appears in logs: "🕐 Initializing cron jobs..."
- [ ] Monitor first job execution for errors
- [ ] Test notification delivery to organizers
- [ ] Update API documentation with new fields
- [ ] Train support team on new feature

## Rollback Plan

If issues arise:
1. Disable cron job by commenting out in `server/src/jobs/index.ts`
2. Restart server
3. Revert database migration if needed:
   ```sql
   ALTER TABLE "events" DROP COLUMN "minimumPlayerCount";
   ALTER TABLE "events" DROP COLUMN "wasAutoOpenedToPublic";
   ALTER TABLE "events" DROP COLUMN "autoOpenedAt";
   ```
4. Deploy previous version of frontend

## Support & Troubleshooting

### Job Not Running
- Check server logs for "🕐 Initializing cron jobs..."
- Verify node-cron is installed: `npm list node-cron`
- Check timezone configuration in cron.schedule options

### Events Not Auto-Opening
- Verify job is executing (check logs every 6 hours)
- Check database for qualifying events:
  ```sql
  SELECT * FROM events 
  WHERE "eligibilityIsInviteOnly" = true 
  AND "wasAutoOpenedToPublic" = false 
  AND "startTime" <= NOW() + INTERVAL '2 days';
  ```
- Review job metrics in logs for errors

### Notifications Not Sending
- Check NotificationService logs
- Verify email service configuration
- Test notification service independently

## Related Files

### Frontend
- `src/screens/events/CreateEventScreen.tsx` - Event creation form
- `src/components/ui/EventCard.tsx` - Event display with badges
- `src/types/index.ts` - TypeScript type definitions

### Backend
- `server/prisma/schema.prisma` - Database schema
- `server/src/jobs/InviteOnlyEventAutoOpenJob.ts` - Auto-open job
- `server/src/jobs/index.ts` - Job registration
- `server/src/services/NotificationService.ts` - Notifications

### Documentation
- `INVITE_ONLY_EVENTS_IMPLEMENTATION.md` - This file
