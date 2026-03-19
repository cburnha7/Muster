# My Reservations & Event Location Scoping Implementation

## Overview
Implemented a comprehensive reservation management system that displays user reservations on their profile and scopes event location selection to only show authorized venues.

## Changes Made

### 1. Database Schema Updates

**File**: `server/prisma/schema.prisma`

Added `usedForEventId` field to `FacilityRental` model to track which rentals have been used for events:

```prisma
model FacilityRental {
  // ... existing fields
  usedForEventId String?
  
  // Relations
  usedForEvent Event? @relation("RentalUsedForEvent", fields: [usedForEventId], references: [id])
  rentalsUsedForThisEvent FacilityRental[] @relation("RentalUsedForEvent")
  
  @@index([usedForEventId])
}
```

**Migration**: `20260311171444_add_rental_used_for_event`

### 2. Backend API Endpoints

#### New Eligible Locations Endpoint
**File**: `server/src/routes/eligible-locations.ts`

- **GET** `/api/users/:userId/eligible-locations`
- Returns owned facilities and unused rentals for event creation
- Filters out:
  - Inactive facilities
  - Cancelled rentals
  - Rentals already used for events
  - Past rentals

#### Updated Event Creation
**File**: `server/src/routes/events.ts`

- When an event is created with a `rentalId`, the rental is marked as used
- Sets `usedForEventId` on the rental to prevent reuse
- Validates that event time matches rental slot time

#### Updated Server Index
**File**: `server/src/index.ts`

- Registered new eligible locations route

### 3. Frontend Components

#### My Reservations Section
**File**: `src/components/profile/MyReservationsSection.tsx`

New component that displays user reservations with:
- **Upcoming/Past Toggle**: Switch between future and past reservations
- **Reservation Cards**: Show facility name, court name, date, time, and sport type
- **Used Badge**: Visual indicator for rentals already used for events
- **Empty States**: Prompts to book courts when no reservations exist
- **View All Button**: Links to full My Rentals screen
- **Limit Display**: Shows up to 3 reservations with link to see all

Features:
- Loads reservations via API
- Formats dates and times for display
- Filters by upcoming/past status
- Shows "Used" badge for rentals with `usedForEventId`

#### Profile Screen Integration
**File**: `src/screens/profile/ProfileScreen.tsx`

- Added My Reservations section at the top of profile (after stats, before My Grounds)
- Imports and renders `MyReservationsSection` component
- Passes user ID to component for data fetching

**File**: `src/components/profile/index.ts`

- Exports `MyReservationsSection` for easy importing

### 4. Event Creation Location Scoping

The eligible locations endpoint provides:

1. **Owned Facilities**: All active facilities where `ownerId` matches the user
2. **Unused Rentals**: Confirmed rentals that:
   - Belong to the user
   - Are in the future
   - Have not been used for an event (`usedForEventId` is null)
   - Are not cancelled

When creating an event from a rental:
- Location, date, and time are locked to match the rental
- Rental is marked as used after event creation
- Rental still appears in My Reservations but with "Used" badge

### 5. Time Slot Date Fix

**Files**: 
- `server/src/scripts/fix-timeslot-dates.ts`
- `server/src/routes/courts.ts` (added logging)

Fixed timezone issue where time slots were stored with incorrect UTC offsets:
- Normalized all existing time slot dates to midnight UTC
- Fixed 992 time slots for Rowe courts
- Added logging to availability endpoint for debugging

## User Flow

### Booking a Court
1. User navigates to Facilities → Select facility → Court Availability
2. Selects date and time slot
3. Confirms rental
4. Rental appears in My Reservations on profile

### Creating Event from Reservation
1. User views My Reservations on profile
2. Clicks on a reservation (or navigates from My Rentals screen)
3. Creates event with pre-filled location and time
4. Event is created and rental is marked as "Used"
5. Rental still visible in My Reservations with "Used" badge

### Location Scoping
When creating an event:
- Location picker only shows:
  - Facilities the user owns
  - Court/field time slots from unused reservations
- Used reservations don't appear as options
- If no owned facilities or unused reservations exist, empty state prompts user to book or create

## API Endpoints Summary

### Existing (Updated)
- **POST** `/api/events` - Now marks rental as used when `rentalId` provided
- **GET** `/api/rentals/my-rentals?userId={id}&upcoming=true` - Used by My Reservations

### New
- **GET** `/api/users/:userId/eligible-locations` - Returns owned facilities and unused rentals

## Database Changes

### FacilityRental Table
- Added `usedForEventId` column (nullable string)
- Added index on `usedForEventId`
- Added foreign key relation to Event

## UI Components

### My Reservations Section
- Displays at top of profile screen
- Shows upcoming reservations by default
- Toggle to view past reservations
- Each card shows:
  - Facility name
  - Court/field name
  - Date (formatted)
  - Time range (12-hour format)
  - Sport type
  - "Used" badge if applicable
- Empty state with "Book a Court" button
- "View All" link to My Rentals screen

## Testing Recommendations

1. **Reservation Display**
   - Book a court and verify it appears in My Reservations
   - Check upcoming/past toggle functionality
   - Verify "Used" badge appears after creating event

2. **Event Creation**
   - Create event from rental and verify rental is marked as used
   - Verify used rental doesn't appear in location picker
   - Test location scoping with owned facilities

3. **Edge Cases**
   - User with no reservations (empty state)
   - User with no owned facilities (empty state in event creation)
   - Cancelled rentals (should not appear)
   - Past rentals (should appear in "Past" tab only)

## Next Steps

To fully implement location scoping in the Create Event screen:

1. Update `CreateEventScreen.tsx` to use the eligible locations endpoint
2. Replace facility dropdown with scoped location picker
3. Add empty state when no eligible locations exist
4. Update location selection UI to distinguish between owned facilities and rentals
5. Add visual indicators for rental-based locations

## Files Modified

### Backend
- `server/prisma/schema.prisma`
- `server/src/routes/events.ts`
- `server/src/routes/eligible-locations.ts` (new)
- `server/src/index.ts`
- `server/src/routes/courts.ts` (logging)

### Frontend
- `src/components/profile/MyReservationsSection.tsx` (new)
- `src/components/profile/index.ts` (new)
- `src/screens/profile/ProfileScreen.tsx`

### Scripts
- `server/src/scripts/fix-timeslot-dates.ts` (new)
- `server/src/scripts/test-availability-api.ts` (new)
- `server/src/scripts/test-api-call.ts` (new)
- `server/src/scripts/generate-rowe-timeslots.ts` (new)
- `server/src/scripts/make-rowe-available.ts` (new)

## Summary

Successfully implemented My Reservations feature on the profile screen and created the backend infrastructure for event location scoping. Users can now see their court/field reservations prominently displayed on their profile, with clear indicators for which reservations have been used for events. The backend tracks rental usage and provides an API endpoint to scope event location selection to only authorized venues (owned facilities and unused reservations).
