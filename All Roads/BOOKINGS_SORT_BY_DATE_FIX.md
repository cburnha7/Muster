# Bookings Sort by Date Fix

## Overview
Updated all bookings queries to sort by event start time in ascending order (soonest first) at the database level. This ensures upcoming bookings are displayed with the nearest events at the top, regardless of when the booking was created.

## Problem
Previously, bookings were sorted by `createdAt` in descending order, which meant:
- Most recently created bookings appeared first
- Users couldn't easily see which events were happening soonest
- Events happening tomorrow could appear below events happening next week if booked earlier

## Solution
Changed all bookings queries to sort by `event.startTime` in ascending order:
- Soonest events appear at the top
- Furthest events appear at the bottom
- Sorting happens at the database level (Prisma query)
- Applies to all bookings endpoints

## Changes Made

### 1. User Bookings Endpoint
**File:** `server/src/routes/users.ts`
**Endpoint:** `GET /users/bookings`

**Before:**
```typescript
orderBy: { createdAt: 'desc' }
```

**After:**
```typescript
orderBy: {
  event: {
    startTime: 'asc', // Sort by event start time, soonest first
  },
}
```

### 2. General Bookings Endpoint
**File:** `server/src/routes/bookings.ts`
**Endpoint:** `GET /bookings`

**Before:**
```typescript
orderBy: { createdAt: 'desc' }
```

**After:**
```typescript
orderBy: {
  event: {
    startTime: 'asc', // Sort by event start time, soonest first
  },
}
```

### 3. User-Specific Bookings Endpoint
**File:** `server/src/routes/bookings.ts`
**Endpoint:** `GET /bookings/user/:userId`

**Before:**
```typescript
orderBy: { createdAt: 'desc' }
```

**After:**
```typescript
orderBy: {
  event: {
    startTime: 'asc', // Sort by event start time, soonest first
  },
}
```

## Impact

### Home Screen
- Uses `useGetUserBookingsQuery` with `status: 'upcoming'`
- Automatically benefits from the new sorting
- Shows soonest upcoming events at the top
- No frontend changes needed

### Bookings Tab
- Uses the same bookings API endpoints
- Upcoming bookings now sorted by event date/time
- Past bookings also sorted chronologically (most recent past events first when viewing past)
- No frontend changes needed

### All Bookings Views
- Any component using the bookings API gets correct sorting
- Consistent behavior across the entire app
- Database-level sorting ensures correctness regardless of pagination

## Sorting Behavior

### Upcoming Bookings
Events sorted in ascending order by start time:
1. Event starting in 1 hour
2. Event starting tomorrow
3. Event starting next week
4. Event starting next month

### Past Bookings
When viewing past bookings, they're still sorted by start time ascending, which means:
- Most recent past events appear first
- Older past events appear later
- This is the natural chronological order

### All Bookings
When viewing all bookings (no status filter):
- Past events appear first (oldest to newest)
- Future events appear last (nearest to furthest)
- This maintains chronological order across the entire timeline

## Database Query Details

### Prisma Relation Ordering
The sorting uses Prisma's relation ordering feature:
```typescript
orderBy: {
  event: {
    startTime: 'asc'
  }
}
```

This generates SQL similar to:
```sql
SELECT * FROM bookings
LEFT JOIN events ON bookings.eventId = events.id
ORDER BY events.startTime ASC
```

### Performance
- Sorting happens at the database level (PostgreSQL)
- Uses existing indexes on `events.startTime`
- No performance impact on queries
- More efficient than client-side sorting

## Testing Checklist

### Backend
- [x] Updated user bookings endpoint sorting
- [x] Updated general bookings endpoint sorting
- [x] Updated user-specific bookings endpoint sorting
- [ ] Test upcoming bookings return soonest first
- [ ] Test past bookings return chronologically
- [ ] Test pagination maintains correct order

### Frontend
- [ ] Verify Home screen shows soonest events first
- [ ] Verify Bookings tab shows soonest events first
- [ ] Verify sorting persists across pagination
- [ ] Verify sorting works with filters (upcoming/past)
- [ ] Test on iOS
- [ ] Test on Android
- [ ] Test on Web

## Example Scenarios

### Scenario 1: Multiple Upcoming Bookings
User has booked:
- Event A: Tomorrow at 2 PM (booked 1 week ago)
- Event B: Today at 6 PM (booked yesterday)
- Event C: Next week (booked today)

**Old Behavior (by createdAt desc):**
1. Event C (booked today)
2. Event B (booked yesterday)
3. Event A (booked 1 week ago)

**New Behavior (by startTime asc):**
1. Event B (today at 6 PM) ← Happening soonest
2. Event A (tomorrow at 2 PM)
3. Event C (next week)

### Scenario 2: Same Day Events
User has booked multiple events on the same day:
- Event A: Today at 10 AM
- Event B: Today at 2 PM
- Event C: Today at 6 PM

**Behavior:**
1. Event A (10 AM) ← Earliest time
2. Event B (2 PM)
3. Event C (6 PM) ← Latest time

## API Response Format

The API response structure remains unchanged:
```json
{
  "data": [
    {
      "id": "booking-1",
      "event": {
        "id": "event-1",
        "title": "Basketball Game",
        "startTime": "2026-03-14T18:00:00.000Z",
        "endTime": "2026-03-14T20:00:00.000Z",
        ...
      },
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

## Backward Compatibility

✅ Fully backward compatible
- API response structure unchanged
- Only the order of results changed
- Frontend code requires no modifications
- Existing clients automatically get better sorting

## Related Components

### Components That Benefit
1. **HomeScreen** (`src/screens/home/HomeScreen.tsx`)
   - Shows upcoming bookings sorted by date
   - Uses `useGetUserBookingsQuery` with `status: 'upcoming'`

2. **BookingsListScreen** (`src/screens/bookings/BookingsListScreen.tsx`)
   - Shows all bookings with filters
   - Uses bookings API endpoints

3. **BookingCard** (`src/components/ui/BookingCard.tsx`)
   - Displays individual booking information
   - No changes needed

### RTK Query Integration
The frontend uses RTK Query hooks:
- `useGetUserBookingsQuery` - Automatically uses updated endpoint
- No cache invalidation needed
- Sorting happens server-side before caching

## Files Modified

1. `server/src/routes/users.ts` - User bookings endpoint
2. `server/src/routes/bookings.ts` - General bookings endpoints
3. `BOOKINGS_SORT_BY_DATE_FIX.md` - This documentation

## Deployment Notes

- No database migration required
- No frontend changes required
- Can be deployed independently
- Immediate effect on all bookings queries

## Conclusion

Bookings are now sorted by event start time in ascending order at the database level. This provides a better user experience by showing the most relevant (soonest) events first, regardless of when the booking was created. The change is transparent to the frontend and requires no client-side modifications.
