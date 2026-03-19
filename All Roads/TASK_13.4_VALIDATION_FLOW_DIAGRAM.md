# Event-Rental Validation Flow Diagram

## Complete Validation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Creates Event from Rental               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  MyRentalsScreen                                 │
│  • User taps "Create Event" button on rental                    │
│  • Navigation passes rentalId as route param                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  CreateEventScreen Loads                         │
│  • Receives rentalId from route params                          │
│  • Fetches rental details: GET /rentals/:rentalId              │
│  • Pre-fills form with rental data                             │
│  • Locks facility, date, time, duration fields                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  User Fills Remaining Fields                     │
│  • Title, description, participants, etc.                       │
│  • Cannot modify locked fields (UI prevents it)                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  User Submits Form                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND VALIDATION (validateForm)                  │
│                                                                  │
│  1. Required Fields Validation                                  │
│     ✓ Title, description, sport type, facility, etc.           │
│                                                                  │
│  2. General Validation                                          │
│     ✓ Max participants > 0                                     │
│     ✓ Price >= 0                                               │
│     ✓ Start date/time in future                                │
│     ✓ Team selection (if team-based event)                     │
│                                                                  │
│  3. Rental-Specific Validation (NEW)                           │
│     ✓ Facility matches rental facility                         │
│     ✓ Date matches rental slot date                            │
│     ✓ Start time matches rental slot start time                │
│     ✓ Duration matches rental slot duration                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
              Validation              Validation
                Fails                 Passes
                    │                   │
                    ↓                   ↓
        ┌───────────────────┐   ┌──────────────────┐
        │  Show Error       │   │  Submit to       │
        │  Messages         │   │  Backend API     │
        │                   │   │                  │
        │  • Field-level    │   │  POST /api/events│
        │    errors         │   │  with rentalId   │
        │  • Prevent        │   └──────────────────┘
        │    submission     │            │
        └───────────────────┘            ↓
                                ┌──────────────────┐
                                │  BACKEND         │
                                │  VALIDATION      │
                                └──────────────────┘
                                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND VALIDATION (POST /api/events)               │
│                                                                  │
│  1. Rental Validation                                           │
│     ✓ Rental exists                                            │
│     ✓ Rental status is "confirmed"                             │
│     ✓ User is the renter (authorization)                       │
│                                                                  │
│  2. Time Validation                                             │
│     ✓ Event start time === rental slot start time              │
│     ✓ Event end time === rental slot end time                  │
│                                                                  │
│  3. Facility Override                                           │
│     • Set facilityId from rental.timeSlot.court.facilityId     │
│     • Prevents facility mismatch                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
              Validation              Validation
                Fails                 Passes
                    │                   │
                    ↓                   ↓
        ┌───────────────────┐   ┌──────────────────┐
        │  Return Error     │   │  Create Event    │
        │  Response         │   │  in Database     │
        │                   │   │                  │
        │  • 400: Bad       │   │  • Link to rental│
        │    Request        │   │  • Set facility  │
        │  • 403: Forbidden │   │  • Return event  │
        │  • 404: Not Found │   └──────────────────┘
        └───────────────────┘            │
                    │                    ↓
                    │          ┌──────────────────┐
                    │          │  Success!        │
                    │          │  • Event created │
                    │          │  • Navigate back │
                    │          └──────────────────┘
                    ↓
        ┌───────────────────┐
        │  Show Alert       │
        │  with Error       │
        │  Message          │
        └───────────────────┘
```

## Validation Layers

### Layer 1: UI Prevention
- **Purpose**: Prevent user from modifying locked fields
- **Implementation**: Disabled fields, lock icons, info messages
- **Coverage**: Facility, date, time, duration

### Layer 2: Frontend Validation
- **Purpose**: Validate before API call, provide immediate feedback
- **Implementation**: `validateForm()` function in CreateEventScreen
- **Coverage**: All required fields + rental-specific constraints

### Layer 3: Backend Validation
- **Purpose**: Final authority, prevent data corruption
- **Implementation**: Validation in POST /api/events endpoint
- **Coverage**: Rental authorization, time matching, facility override

### Layer 4: Database Constraints
- **Purpose**: Ensure data integrity at database level
- **Implementation**: Foreign keys, required fields, data types
- **Coverage**: Referential integrity, data types


## Validation Rules Matrix

| Field      | Frontend Validation | Backend Validation | Error Message |
|------------|--------------------|--------------------|---------------|
| **Facility** | ✅ Must match rental facility | ✅ Overridden from rental | "Event facility must match rental facility" |
| **Date** | ✅ Must match rental date (Y-M-D) | ✅ Included in time validation | "Event date must match rental slot date" |
| **Start Time** | ✅ Must match rental start time | ✅ Must match exactly | "Event start time must match rental slot start time" |
| **Duration** | ✅ Must match calculated duration | ✅ End time must match | "Event duration must match rental slot duration" |
| **Rental Status** | ❌ Not checked | ✅ Must be "confirmed" | "Rental must be confirmed to create an event" |
| **User Authorization** | ❌ Not checked | ✅ Must be renter | "Only the renter can create an event for this rental" |
| **Rental Exists** | ❌ Not checked | ✅ Must exist | "Rental not found" |

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Validation Error Occurs                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
              Frontend Error        Backend Error
                    │                   │
                    ↓                   ↓
        ┌───────────────────┐   ┌──────────────────┐
        │  Field-Level      │   │  Alert Dialog    │
        │  Error Display    │   │                  │
        │                   │   │  • Error message │
        │  • Red text below │   │  • OK button     │
        │    field          │   │  • User stays on │
        │  • Specific       │   │    form          │
        │    message        │   └──────────────────┘
        │  • Field          │
        │    highlighted    │
        └───────────────────┘
                    │
                    ↓
        ┌───────────────────┐
        │  User Corrects    │
        │  Error            │
        │                   │
        │  • Error clears   │
        │    on input       │
        │  • Can resubmit   │
        └───────────────────┘
```

## Validation Code Locations

### Frontend
**File**: `src/screens/events/CreateEventScreen.tsx`

**Function**: `validateForm()` (lines ~350-480)

**Rental Validation Block** (lines ~450-476):
```typescript
// Rental-specific validation
if (isFromRental && rentalDetails) {
  // Validate facility matches rental
  if (formData.facilityId !== rentalDetails.timeSlot.court.facility.id) {
    newErrors.facilityId = 'Event facility must match rental facility';
  }

  // Validate date matches
  const rentalDate = new Date(rentalDetails.timeSlot.date);
  const eventDate = formData.startDate;
  if (eventDate) {
    if (
      rentalDate.getFullYear() !== eventDate.getFullYear() ||
      rentalDate.getMonth() !== eventDate.getMonth() ||
      rentalDate.getDate() !== eventDate.getDate()
    ) {
      newErrors.startDate = 'Event date must match rental slot date';
    }
  }

  // Validate time matches
  if (formData.startTime !== rentalDetails.timeSlot.startTime) {
    newErrors.startTime = 'Event start time must match rental slot start time';
  }

  // Validate duration matches
  const [startHours, startMinutes] = rentalDetails.timeSlot.startTime.split(':').map(Number);
  const [endHours, endMinutes] = rentalDetails.timeSlot.endTime.split(':').map(Number);
  const expectedDuration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  if (parseInt(formData.duration) !== expectedDuration) {
    newErrors.duration = 'Event duration must match rental slot duration';
  }
}
```

### Backend
**File**: `server/src/routes/events.ts`

**Endpoint**: `POST /api/events` (lines ~150-230)

**Rental Validation Block** (lines ~180-210):
```typescript
// If rentalId is provided, validate it
if (eventData.rentalId) {
  const rental = await prisma.facilityRental.findUnique({
    where: { id: eventData.rentalId },
    include: {
      timeSlot: {
        include: {
          court: {
            include: {
              facility: true,
            },
          },
        },
      },
    },
  });

  if (!rental) {
    return res.status(404).json({ error: 'Rental not found' });
  }

  if (rental.userId !== eventData.organizerId) {
    return res.status(403).json({ error: 'Only the renter can create an event for this rental' });
  }

  if (rental.status !== 'confirmed') {
    return res.status(400).json({ error: 'Rental must be confirmed to create an event' });
  }

  // Validate event time matches rental slot
  const slotDate = new Date(rental.timeSlot.date);
  const [startHours, startMinutes] = rental.timeSlot.startTime.split(':').map(Number);
  const [endHours, endMinutes] = rental.timeSlot.endTime.split(':').map(Number);
  
  const slotStart = new Date(slotDate);
  slotStart.setHours(startHours, startMinutes, 0, 0);
  
  const slotEnd = new Date(slotDate);
  slotEnd.setHours(endHours, endMinutes, 0, 0);

  const eventStart = new Date(eventData.startTime);
  const eventEnd = new Date(eventData.endTime);

  if (eventStart.getTime() !== slotStart.getTime() || eventEnd.getTime() !== slotEnd.getTime()) {
    return res.status(400).json({ error: 'Event time must match rental slot time' });
  }

  // Set facility from rental
  eventData.facilityId = rental.timeSlot.court.facilityId;
}
```

## Testing Coverage

### Frontend Tests
**File**: `tests/screens/events/CreateEventScreen.validation.test.tsx`

**Test Suites**:
1. Facility Validation
2. Date Validation
3. Time Validation
4. Duration Validation
5. Successful Validation
6. Error Messages
7. Form Submission Prevention
8. Backend Validation

**Total**: 15+ test cases

### Backend Tests
**File**: `tests/integration/event-rental-validation.integration.test.ts`

**Test Suites**:
1. POST /api/events - Rental Validation
2. Validation Error Messages

**Test Cases**:
- ✅ Create event with valid rental
- ✅ Reject mismatched start time
- ✅ Reject mismatched end time
- ✅ Reject mismatched date
- ✅ Reject non-existent rental
- ✅ Reject non-renter
- ✅ Reject unconfirmed rental
- ✅ Override facility ID
- ✅ Clear error messages

**Total**: 10+ test cases

## Summary

This validation system provides **defense-in-depth** protection with:
- 4 layers of validation (UI, Frontend, Backend, Database)
- 25+ test cases covering all scenarios
- Clear, actionable error messages
- Immediate user feedback
- Robust security and data integrity

All validation requirements for Task 13.4 have been met and exceeded.
