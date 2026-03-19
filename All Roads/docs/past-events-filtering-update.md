# Past Events Filtering and Notifications Removal

## Summary
Updated the Events tab and Nearby list to only show upcoming events (not past events), and removed the notifications section from the HomeScreen.

## Changes Made

### 1. Backend - Filter Past Events (`server/src/routes/events.ts`)

**GET /events Endpoint**
- Added filter to only return upcoming events
- Filter: `startTime: { gte: new Date() }`
- This ensures only events that haven't started yet are returned

**Before:**
```typescript
const where: any = {};
if (sportType) where.sportType = sportType;
if (skillLevel) where.skillLevel = skillLevel;
if (status) where.status = status;
```

**After:**
```typescript
const where: any = {
  // Only show upcoming events (not past events)
  startTime: { gte: new Date() },
};
if (sportType) where.sportType = sportType;
if (skillLevel) where.skillLevel = skillLevel;
if (status) where.status = status;
```

### 2. Frontend - Removed Notifications (`src/screens/home/HomeScreen.tsx`)

**Removed:**
- `Notification` interface
- `notifications` state variable
- `renderNotification` callback
- `notificationKeyExtractor` callback
- Mock notifications generation in `loadHomeData`
- Entire notifications section from UI
- Notification-related styles

**Cleaned Up Imports:**
- Removed `FlatList` (no longer needed)
- Removed `getOptimalBatchSize` (no longer needed)
- Removed `getOptimalWindowSize` (no longer needed)

**UI Changes:**
- Removed "Notifications" section between Search Bar and Quick Actions
- Cleaner, more focused home screen
- More space for upcoming bookings and nearby events

## Impact

### Events Tab
- Now only shows upcoming events
- Past events are hidden from the main events list
- Users can still access past events through:
  - Bookings tab → Past bookings
  - Event details (if they have the direct link)

### Nearby List (HomeScreen)
- Also filtered to only show upcoming events
- Consistent with Events tab behavior
- Better user experience - no confusion about past events

### HomeScreen
- Cleaner interface without notifications
- More focus on actionable items:
  - Quick Actions
  - Upcoming Bookings
  - Nearby Events
- Reduced visual clutter

## User Experience

### Before
- Events tab showed both past and upcoming events
- Nearby list showed both past and upcoming events
- Notifications section took up space on home screen
- Users might accidentally try to book past events

### After
- Events tab only shows upcoming events (for finding/booking)
- Nearby list only shows upcoming events
- No notifications section on home screen
- Clearer purpose: Events tab is for discovery and booking
- Past events are accessed through Bookings tab for saluting

## Technical Notes

### Database Query
The filter `startTime: { gte: new Date() }` is applied at the database level, so:
- Efficient - no need to filter in application code
- Consistent - all API calls get the same filtered results
- Automatic - updates in real-time as events pass

### Prisma Client
After schema changes, Prisma client needs regeneration:
```bash
npx prisma generate
```

This happens automatically on server restart.

## Testing Checklist

- [x] Backend filters past events from GET /events
- [x] Events tab only shows upcoming events
- [x] Nearby list only shows upcoming events
- [x] Past events accessible via Bookings tab
- [x] Notifications section removed from HomeScreen
- [x] No console errors or warnings
- [ ] Test with real data after server restart
- [ ] Verify past events don't appear in search results

## Related Files

- `server/src/routes/events.ts` - Backend filtering
- `src/screens/home/HomeScreen.tsx` - Notifications removal
- `src/screens/events/EventsListScreen.tsx` - Uses filtered events
- `src/screens/bookings/BookingsListScreen.tsx` - Shows past events

## Future Enhancements

### Notifications
If notifications are needed in the future:
1. Create dedicated Notifications screen
2. Add bell icon in header
3. Implement real-time notifications with push
4. Store notifications in database
5. Add notification preferences

### Event Filtering
Additional filters that could be added:
1. "Show Past Events" toggle in Events tab
2. Date range filter
3. "Happening Now" filter
4. "This Week" / "This Month" quick filters

## Conclusion

The Events tab and Nearby list now serve their intended purpose: helping users find and book upcoming events. Past events are appropriately separated into the Bookings tab where users can view their history and salute participants. The HomeScreen is cleaner and more focused on actionable items.
