# Scoped Ground and Time Slot Picker Implementation

## Overview
Implement authorization-based scoping for ground/facility and time slot selection in event creation flow.

## Requirements

### Ground Picker Rules
1. Show grounds where user is the owner (ownerId matches userId)
2. Show grounds where user has at least one confirmed reservation
3. Hide all other grounds

### Time Slot Picker Rules (depends on selected ground)

#### If user owns the ground:
- Show ALL available time slots on that ground's courts
- Exclude: blocked slots, rented by others, already assigned to events

#### If user has reservations at the ground:
- Show ONLY the user's specific reservation slots
- Do not show any other available slots
- Exclude: slots already used for events (usedForEventId is set)

### Additional Rules
- Reservation slots already used for events must not appear
- Show empty state if no eligible slots
- Backend must enforce authorization (not just UI)

## Implementation Plan

### Phase 1: Backend API Endpoints

#### 1.1 Create `/api/facilities/authorized` endpoint
- Returns facilities user can create events at
- Includes owned facilities + facilities with user's rentals


#### 1.2 Create `/api/facilities/:facilityId/available-slots` endpoint
- Takes userId and facilityId as parameters
- Returns authorized time slots based on ownership/rental rules
- Includes metadata: isOwned, rentalId (if from rental)

#### 1.3 Update event creation endpoint validation
- Verify user has authorization for selected facility
- Verify user has authorization for selected time slot
- Return 403 if unauthorized

### Phase 2: Frontend Components

#### 2.1 Update CreateEventScreen
- Replace facility picker with authorized facilities only
- Add time slot picker component
- Handle empty states
- Show lock icons for rental-based selections

#### 2.2 Create TimeSlotPicker component
- Display available slots in calendar/list view
- Show slot metadata (court, time, price)
- Indicate if slot is from rental vs owned ground
- Handle selection and validation

### Phase 3: Authorization Logic

#### 3.1 Backend authorization helper
```typescript
async function getUserAuthorizedFacilities(userId: string)
async function getUserAuthorizedSlots(userId: string, facilityId: string)
async function validateEventAuthorization(userId: string, facilityId: string, slotId?: string)
```

#### 3.2 Frontend service methods
```typescript
facilityService.getAuthorizedFacilities(userId)
facilityService.getAvailableSlots(facilityId, userId)
```

## Detailed Implementation Steps

### Step 1: Backend - Authorized Facilities Endpoint


## Implementation Complete - Phase 1

### Backend Changes

#### 1. New Endpoints Added to `server/src/routes/facilities.ts`:

**GET `/api/facilities/authorized/for-events`**
- Query param: `userId` (required)
- Returns facilities where user is owner OR has confirmed unused rentals
- Response includes `isOwned` and `hasRentals` flags

**GET `/api/facilities/:id/available-slots`**
- Query param: `userId` (required)
- Returns authorized time slots based on ownership/rental rules
- If owner: returns all available slots
- If renter: returns only user's unused rental slots
- Response includes `isFromRental` and `rentalId` fields

#### 2. Enhanced Authorization in `server/src/routes/events.ts`:

**POST `/api/events`** - Updated validation:
- Checks if user owns facility OR has rental at facility
- If not owner and no rentalId provided: rejects with 403
- If rentalId provided: validates rental ownership and usage
- Prevents using already-used rentals (usedForEventId check)

### Frontend Changes

#### 1. Updated `src/services/api/FacilityService.ts`:

Added methods:
- `getAuthorizedFacilities(userId)` - Fetches authorized facilities
- `getAvailableSlots(facilityId, userId)` - Fetches available slots

#### 2. Updated `src/screens/events/CreateEventScreen.tsx`:

- Imported `useAuth` to get current user
- Changed `loadFacilities()` to `loadAuthorizedFacilities()`
- Now uses `facilityService.getAuthorizedFacilities(user.id)`
- Shows alert if no authorized facilities found

#### 3. Fixed `src/components/profile/MyReservationsSection.tsx`:

- Fixed UTC date comparison bug (was using `setHours` instead of `setUTCHours`)
- Reservations now display correctly on profile page

### Testing Instructions

1. **Test as facility owner (user: "owner")**:
   - Login as owner
   - Go to Create Event
   - Should see all owned facilities in picker
   - Can select any facility and create event

2. **Test as renter (user: "host")**:
   - Login as host
   - Go to Profile - should see 2 reservations for Rowe
   - Go to Create Event
   - Should see Rowe in facility picker (has rentals there)
   - Should NOT see facilities where host has no rentals

3. **Test authorization**:
   - Try to create event at facility without ownership/rental
   - Should get 403 error from backend

### Next Steps (Phase 2 - Time Slot Picker)

1. Create TimeSlotPicker component
2. Update CreateEventScreen to show time slot picker after facility selection
3. Pre-fill event details from selected slot
4. Handle empty states (no available slots)
5. Add visual indicators for rental vs owned slots

### Files Modified

**Backend**:
- `server/src/routes/facilities.ts` - Added 2 new endpoints
- `server/src/routes/events.ts` - Enhanced authorization
- `server/src/routes/rentals.ts` - Fixed route order and date comparison

**Frontend**:
- `src/services/api/FacilityService.ts` - Added 2 new methods
- `src/screens/events/CreateEventScreen.tsx` - Use authorized facilities
- `src/components/profile/MyReservationsSection.tsx` - Fixed UTC bug

### Known Issues

None - Phase 1 complete and tested.

### Notes

- The time slot picker UI is not yet implemented (Phase 2)
- Currently, users still manually enter date/time
- Next phase will add visual slot selection
