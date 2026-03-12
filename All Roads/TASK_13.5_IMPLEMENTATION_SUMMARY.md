# Task 13.5: Link Event to Rental in Database - Implementation Summary

## Overview
Task 13.5 ensures that events can be properly linked to facility rentals in the database, establishing a bidirectional relationship that can be queried from both directions.

## Implementation Status: ✅ COMPLETE

### What Was Done

#### 1. Database Schema (Already Implemented) ✅
The Prisma schema already includes the necessary fields and relationships:

**Event Model:**
```prisma
model Event {
  // ... other fields
  rentalId    String?
  rental      FacilityRental? @relation(fields: [rentalId], references: [id])
  // ... other fields
}
```

**FacilityRental Model:**
```prisma
model FacilityRental {
  // ... other fields
  events      Event[]
  // ... other fields
}
```

**Key Features:**
- `rentalId` is optional (nullable) - events can exist without rentals
- Foreign key relationship established
- Bidirectional navigation: Event → Rental and Rental → Events

#### 2. Backend API (Already Implemented) ✅
The backend API in `server/src/routes/events.ts` already handles rentalId:

**Event Creation with Rental Validation:**
```typescript
// POST /api/events
router.post('/', async (req, res) => {
  // ... organizer setup

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
    // ... time validation logic

    // Set facility from rental
    eventData.facilityId = rental.timeSlot.court.facilityId;
  }

  const event = await prisma.event.create({
    data: eventData,
    include: {
      organizer: { ... },
      facility: true,
      rental: {
        include: {
          timeSlot: {
            include: {
              court: true,
            },
          },
        },
      },
    },
  });

  res.status(201).json(event);
});
```

**Event Retrieval with Rental:**
```typescript
// GET /api/events/:id
router.get('/:id', async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organizer: { ... },
      facility: true,
      rental: {
        include: {
          timeSlot: {
            include: {
              court: true,
            },
          },
        },
      },
    },
  });
  // ...
});
```

**Validation Rules Implemented:**
1. ✅ Rental must exist
2. ✅ Only the renter can create events for their rental
3. ✅ Rental must be in 'confirmed' status
4. ✅ Event time must exactly match rental slot time
5. ✅ Facility is automatically set from rental

#### 3. TypeScript Types (Updated) ✅
Updated `src/types/index.ts` to include rentalId in CreateEventData:

**Before:**
```typescript
export interface CreateEventData {
  title: string;
  description: string;
  sportType: SportType;
  facilityId: string;
  startTime: Date;
  endTime: Date;
  maxParticipants: number;
  price: number;
  skillLevel: SkillLevel;
  equipment: string[];
  rules?: string;
  eventType: EventType;
  teamIds?: string[];
  eligibility?: EventEligibility;
}
```

**After:**
```typescript
export interface CreateEventData {
  title: string;
  description: string;
  sportType: SportType;
  facilityId: string;
  startTime: Date;
  endTime: Date;
  maxParticipants: number;
  price: number;
  skillLevel: SkillLevel;
  equipment: string[];
  rules?: string;
  eventType: EventType;
  teamIds?: string[];
  eligibility?: EventEligibility;
  rentalId?: string; // Link to FacilityRental if event is created from a rental
}
```

**Event Type (Already Included Rental):**
```typescript
export interface Event {
  // ... other fields
  rentalId?: string;
  rental?: {
    id: string;
    timeSlot: {
      id: string;
      court: {
        id: string;
        name: string;
        sportType: string;
      };
    };
  };
  // ... other fields
}
```

#### 4. Frontend Integration (Already Implemented) ✅
The `CreateEventScreen` already passes rentalId when creating events from rentals:

```typescript
// In CreateEventScreen.tsx
const eventDataWithRental = isFromRental
  ? { ...eventData, rentalId }
  : eventData;

const newEvent = await eventService.createEvent(eventDataWithRental as any);
```

#### 5. Test Coverage (Created) ✅
Created comprehensive test files:

**Integration Tests:** `tests/integration/event-rental-linking.integration.test.ts`
- Event creation with rentalId
- Bidirectional querying (event → rental, rental → events)
- Rental validation
- Multiple events per rental
- Cascade behavior

**API Tests:** `tests/api/events-rental-linking.api.test.ts`
- POST /api/events with rentalId
- Rental ownership validation
- Rental status validation
- Time matching validation
- GET /api/events/:id with rental information
- GET /api/events list with rental filter

**Verification Script:** `tests/integration/verify-event-rental-link.ts`
- Schema verification
- Foreign key constraint check
- End-to-end relationship testing

## Verification Checklist

### Database Schema ✅
- [x] Event table has `rentalId` field (String?, nullable)
- [x] Foreign key constraint exists (Event.rentalId → FacilityRental.id)
- [x] Bidirectional relationship defined in Prisma schema
- [x] Relationship can be queried in both directions

### Backend API ✅
- [x] POST /api/events accepts rentalId parameter
- [x] Validates rental exists
- [x] Validates rental ownership (only renter can create event)
- [x] Validates rental status (must be 'confirmed')
- [x] Validates event time matches rental slot time
- [x] Automatically sets facilityId from rental
- [x] GET /api/events/:id includes rental information
- [x] GET /api/events includes rental information in list

### Frontend ✅
- [x] CreateEventScreen passes rentalId when creating from rental
- [x] EventService.createEvent accepts rentalId in CreateEventData
- [x] TypeScript types include rentalId

### Data Integrity ✅
- [x] Events can be created with rentalId
- [x] Events can be created without rentalId (optional field)
- [x] Multiple events can reference the same rental
- [x] Invalid rentalId is rejected
- [x] Unauthorized users cannot create events for others' rentals

## Query Examples

### Query Event with Rental Information
```typescript
const event = await prisma.event.findUnique({
  where: { id: eventId },
  include: {
    rental: {
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
    },
  },
});

// Access rental information
console.log(event.rental?.timeSlot.court.name); // "Court 1"
console.log(event.rental?.timeSlot.court.facility.name); // "Downtown Sports Complex"
```

### Query Rental with Associated Events
```typescript
const rental = await prisma.facilityRental.findUnique({
  where: { id: rentalId },
  include: {
    events: true,
  },
});

// Access events for this rental
console.log(rental.events.length); // Number of events
console.log(rental.events[0].title); // "Basketball Pickup Game"
```

## Success Criteria Met

✅ **Event table has rentalId foreign key**
- Field exists in schema
- Foreign key constraint established
- Nullable (optional) field

✅ **Events created from rentals are linked in database**
- Backend API stores rentalId
- Frontend passes rentalId
- Database relationship established

✅ **Relationship can be queried bidirectionally**
- Event → Rental: `event.rental`
- Rental → Events: `rental.events`
- Both directions tested and working

## Additional Features Implemented

### Validation Rules
1. **Rental Existence**: Validates rental exists before creating event
2. **Ownership**: Only the renter can create events for their rental
3. **Status**: Rental must be 'confirmed' (not pending, cancelled, etc.)
4. **Time Matching**: Event start/end time must exactly match rental slot
5. **Facility Auto-Set**: Facility is automatically set from rental's court

### Error Handling
- 404: Rental not found
- 403: User is not the renter
- 400: Rental not confirmed
- 400: Event time doesn't match rental slot

### Data Integrity
- Foreign key constraint prevents invalid rentalId
- Optional field allows events without rentals
- Multiple events can share one rental
- Cascade behavior defined (rental deletion doesn't cascade to events)

## Files Modified

1. **src/types/index.ts**
   - Added `rentalId?: string` to `CreateEventData` interface
   - Event interface already included rental relation

## Files Created

1. **tests/integration/event-rental-linking.integration.test.ts**
   - Comprehensive integration tests for database relationships

2. **tests/api/events-rental-linking.api.test.ts**
   - API endpoint tests for event creation with rentals

3. **tests/integration/verify-event-rental-link.ts**
   - Verification script for manual testing

4. **TASK_13.5_IMPLEMENTATION_SUMMARY.md**
   - This documentation file

## Testing Instructions

### Manual Testing via API

1. **Create a rental:**
```bash
POST http://localhost:3000/api/rentals
{
  "userId": "user-id",
  "timeSlotId": "slot-id"
}
```

2. **Create an event from the rental:**
```bash
POST http://localhost:3000/api/events
{
  "title": "Basketball Game",
  "description": "Pickup game",
  "sportType": "basketball",
  "skillLevel": "intermediate",
  "eventType": "pickup",
  "startTime": "2024-01-15T14:00:00Z",
  "endTime": "2024-01-15T16:00:00Z",
  "maxParticipants": 10,
  "price": 0,
  "organizerId": "user-id",
  "rentalId": "rental-id"
}
```

3. **Retrieve event with rental:**
```bash
GET http://localhost:3000/api/events/{event-id}
```

Expected response includes:
```json
{
  "id": "event-id",
  "title": "Basketball Game",
  "rentalId": "rental-id",
  "rental": {
    "id": "rental-id",
    "timeSlot": {
      "id": "slot-id",
      "court": {
        "id": "court-id",
        "name": "Court 1",
        "sportType": "basketball"
      }
    }
  }
}
```

### Automated Testing

Run the verification script:
```bash
cd server
npx tsx ../tests/integration/verify-event-rental-link.ts
```

Expected output:
```
✓ Step 1: Checking Event schema for rentalId field...
✓ Step 2: Checking foreign key constraint...
✓ Step 3: Creating test data...
✓ Step 4: Creating event with rental link...
✓ Step 5: Testing event → rental query...
✓ Step 6: Testing rental → events query...
✓ Step 7: Cleaning up test data...
✅ All verification checks passed!
```

## Integration with Previous Tasks

This task builds on:
- **Task 13.1**: CreateEventScreen accepts rentalId parameter ✅
- **Task 13.2**: Event form pre-filled with rental details ✅
- **Task 13.3**: Location and time fields locked when creating from rental ✅
- **Task 13.4**: Validation ensures event matches rental slot ✅

This task enables:
- **Task 13.6**: Event details screen can show rental information
- **Task 14.1**: EventCard can show if event is tied to a rental
- **Task 14.2**: EventDetailsScreen can display court/field information
- **Task 14.3**: Show facility map with highlighted court

## Conclusion

Task 13.5 is **COMPLETE**. The event-rental linking functionality is fully implemented:

1. ✅ Database schema supports the relationship
2. ✅ Backend API validates and stores the link
3. ✅ Frontend passes rentalId when creating events
4. ✅ Relationship can be queried bidirectionally
5. ✅ Comprehensive validation ensures data integrity
6. ✅ Test coverage verifies all functionality

The implementation allows events to be properly linked to facility rentals, enabling features like:
- Showing rental information on event details
- Tracking which events are associated with rentals
- Validating that events match their rental slots
- Querying all events for a specific rental
- Displaying court/facility information from the rental

No further action is required for this task.
