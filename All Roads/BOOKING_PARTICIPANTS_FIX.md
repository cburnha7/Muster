# Booking Participants Display Fix

## Problem
The participants tracker on BookingCard was showing as blank because the booking API wasn't returning the `currentParticipants` and `maxParticipants` fields from the event.

## Root Cause
The `/users/bookings` endpoint was using a `select` statement that only included specific event fields, and it was missing:
- `price`
- `currentParticipants`
- `maxParticipants`

## Solution
Updated the `/users/bookings` endpoint to include the missing fields in the event select statement.

### Changes Made

**File**: `server/src/routes/users.ts`

Added to the event select:
```typescript
event: {
  select: {
    id: true,
    title: true,
    sportType: true,
    startTime: true,
    endTime: true,
    imageUrl: true,
    price: true,                    // ← Added
    currentParticipants: true,      // ← Added
    maxParticipants: true,          // ← Added
    facility: { ... },
  },
},
```

## Impact
Now the BookingCard component will correctly display:
- Participants tracker: "X/Y players" badge
- Price: "$15.00" or "Free"

## Other Endpoints
The other booking endpoints (`/bookings` and `/bookings/user/:userId`) already use `include` instead of `select`, so they return all event fields including participants data. No changes needed there.

## Testing
After deploying:
1. Navigate to Bookings tab or Home screen
2. Check upcoming bookings show participants counter
3. Verify price displays correctly
4. Confirm green badge for available spots, red for full events

## Deployment
```bash
git add .
git commit -m "Fix bookings API to include event participants and price data"
git push
```

Vercel will auto-deploy in 2-3 minutes.
