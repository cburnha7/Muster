# Booking & Participation Unification - Implementation Plan

## Current State Analysis

### What Works
- ✅ Join Up creates booking + increments currentParticipants atomically
- ✅ Step Out deletes booking + decrements currentParticipants atomically
- ✅ RTK Query automatically invalidates cache on mutations
- ✅ Home screen filters out booked events from nearby list
- ✅ Events tab filters out booked events

### What Needs Fixing

1. **Bookings Tab Shows BookingCards Instead of EventCards**
   - Current: BookingsListScreen renders BookingCard components
   - Required: Should render EventCard components (same as Events tab)
   
2. **Participants Fetched Separately**
   - Current: EventDetailsScreen calls `/events/:id/participants` endpoint
   - Required: Derive participants from bookings (single source of truth)

3. **Step Out Doesn't Navigate**
   - Current: Step Out stays on current screen
   - Required: Navigate to home screen after successful cancellation

4. **Bookings Tab Uses Different Query**
   - Current: Uses `getUserBookings` query
   - Required: Should use same query as home screen for consistency

## Implementation Steps

### Step 1: Update BookingsListScreen to Show EventCards
- Replace BookingCard with EventCard
- Query events where user has bookings instead of querying bookings
- Keep same filter tabs (upcoming/past/cancelled)

### Step 2: Derive Participants from Bookings
- Update `/events/:id/participants` endpoint to query bookings
- Return user info from booking records
- Remove any separate participants table/logic

### Step 3: Fix Step Out Navigation
- Update EventDetailsScreen to navigate to Home after Step Out
- Update HomeScreen Step Out to stay on Home (already there)
- Ensure modal closes before navigation

### Step 4: Unify Queries
- Both Home and Bookings tab should use `useGetUserBookingsQuery`
- Transform bookings to events for display
- Ensure cache is shared between screens

## Files to Modify

### Frontend
1. `src/screens/bookings/BookingsListScreen.tsx` - Use EventCard instead of BookingCard
2. `src/screens/events/EventDetailsScreen.tsx` - Navigate to Home after Step Out
3. `src/screens/home/HomeScreen.tsx` - Already correct, verify behavior
4. `src/components/ui/BookingCard.tsx` - May deprecate or use only for non-event bookings
5. `src/store/api/eventsApi.ts` - Verify cache invalidation

### Backend
1. `server/src/routes/events.ts` - Update participants endpoint to query bookings
2. `server/src/routes/users.ts` - Verify bookings endpoint returns full event data

## Testing Checklist

- [ ] Join Up creates booking and adds to participants
- [ ] Step Out deletes booking and removes from participants
- [ ] Step Out navigates to home screen
- [ ] Bookings tab shows EventCards not BookingCards
- [ ] Bookings tab upcoming matches home screen upcoming
- [ ] Participants list derived from bookings
- [ ] Cache invalidation works across all screens
- [ ] No duplicate data sources
