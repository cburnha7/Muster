# Event-Rental Database Relationship Diagram

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Database Schema                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│      Facility        │
│──────────────────────│
│ id (PK)              │
│ name                 │
│ ownerId (FK → User)  │
│ ...                  │
└──────────────────────┘
          │
          │ 1:N
          ▼
┌──────────────────────┐
│   FacilityCourt      │
│──────────────────────│
│ id (PK)              │
│ facilityId (FK)      │
│ name                 │
│ sportType            │
│ ...                  │
└──────────────────────┘
          │
          │ 1:N
          ▼
┌──────────────────────┐
│  FacilityTimeSlot    │
│──────────────────────│
│ id (PK)              │
│ courtId (FK)         │
│ date                 │
│ startTime            │
│ endTime              │
│ status               │
│ price                │
└──────────────────────┘
          │
          │ 1:1
          ▼
┌──────────────────────┐         ┌──────────────────────┐
│  FacilityRental      │         │       Event          │
│──────────────────────│         │──────────────────────│
│ id (PK)              │◄────────│ id (PK)              │
│ userId (FK → User)   │   1:N   │ title                │
│ timeSlotId (FK)      │         │ organizerId (FK)     │
│ status               │         │ facilityId (FK)      │
│ totalPrice           │         │ rentalId (FK) ◄──────┼─── TASK 13.5
│ paymentStatus        │         │ startTime            │
│ ...                  │         │ endTime              │
└──────────────────────┘         │ ...                  │
                                 └──────────────────────┘
```

## Relationship Details

### Event → Rental (Forward Relation)

**Type:** Many-to-One (N:1)
- Multiple events can reference the same rental
- Each event can have at most one rental

**Schema Definition:**
```prisma
model Event {
  rentalId    String?
  rental      FacilityRental? @relation(fields: [rentalId], references: [id])
}
```

**Query Example:**
```typescript
const event = await prisma.event.findUnique({
  where: { id: eventId },
  include: { rental: true }
});

// Access: event.rental
```

### Rental → Events (Reverse Relation)

**Type:** One-to-Many (1:N)
- Each rental can have multiple events
- Events are optional (rental can exist without events)

**Schema Definition:**
```prisma
model FacilityRental {
  events      Event[]
}
```

**Query Example:**
```typescript
const rental = await prisma.facilityRental.findUnique({
  where: { id: rentalId },
  include: { events: true }
});

// Access: rental.events[]
```

## Data Flow: Creating Event from Rental

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Event Creation Flow                                   │
└─────────────────────────────────────────────────────────────────────────┘

1. User rents a time slot
   ┌──────────────────┐
   │ FacilityRental   │
   │ id: rental-123   │
   │ userId: user-1   │
   │ timeSlotId: ts-1 │
   │ status: confirmed│
   └──────────────────┘
           │
           │ User clicks "Create Event"
           ▼
2. Navigate to CreateEventScreen with rentalId
   ┌──────────────────────────────────────┐
   │ CreateEventScreen                    │
   │ - Pre-fill form with rental details  │
   │ - Lock location and time fields      │
   │ - Validate against rental slot       │
   └──────────────────────────────────────┘
           │
           │ User submits form
           ▼
3. Frontend sends request with rentalId
   POST /api/events
   {
     "title": "Basketball Game",
     "rentalId": "rental-123",
     "startTime": "2024-01-15T14:00:00Z",
     "endTime": "2024-01-15T16:00:00Z",
     ...
   }
           │
           │ Backend validates
           ▼
4. Backend Validation
   ┌─────────────────────────────────────┐
   │ ✓ Rental exists?                    │
   │ ✓ User is the renter?               │
   │ ✓ Rental is confirmed?              │
   │ ✓ Event time matches slot?          │
   │ ✓ Set facilityId from rental        │
   └─────────────────────────────────────┘
           │
           │ All checks pass
           ▼
5. Create Event with rentalId
   ┌──────────────────┐
   │ Event            │
   │ id: event-456    │
   │ title: "..."     │
   │ rentalId: ───────┼──► rental-123
   │ facilityId: f-1  │
   │ startTime: ...   │
   │ endTime: ...     │
   └──────────────────┘
           │
           │ Relationship established
           ▼
6. Event and Rental are linked
   ┌──────────────────┐         ┌──────────────────┐
   │ FacilityRental   │◄────────│ Event            │
   │ id: rental-123   │         │ id: event-456    │
   │ events: [        │         │ rentalId: ───────┼──►
   │   event-456      │         │                  │
   │ ]                │         └──────────────────┘
   └──────────────────┘
```

## Query Patterns

### Pattern 1: Get Event with Full Rental Context

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
                facility: true
              }
            }
          }
        }
      }
    }
  }
});

// Access chain:
// event.rental.timeSlot.court.name → "Court 1"
// event.rental.timeSlot.court.facility.name → "Downtown Sports Complex"
// event.rental.timeSlot.startTime → "14:00"
// event.rental.timeSlot.endTime → "16:00"
```

### Pattern 2: Get All Events for a Rental

```typescript
const rental = await prisma.facilityRental.findUnique({
  where: { id: rentalId },
  include: {
    events: {
      include: {
        organizer: true
      }
    }
  }
});

// Access:
// rental.events.length → Number of events
// rental.events[0].title → "Basketball Pickup Game"
// rental.events[0].organizer.firstName → "John"
```

### Pattern 3: Find All Events with Rentals

```typescript
const eventsWithRentals = await prisma.event.findMany({
  where: {
    rentalId: { not: null }
  },
  include: {
    rental: {
      include: {
        timeSlot: {
          include: {
            court: true
          }
        }
      }
    }
  }
});

// Returns only events that are linked to rentals
```

### Pattern 4: Find Events Without Rentals

```typescript
const regularEvents = await prisma.event.findMany({
  where: {
    rentalId: null
  }
});

// Returns only events that are NOT linked to rentals
```

## Validation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│              Backend Validation for Event Creation                       │
└─────────────────────────────────────────────────────────────────────────┘

Request: POST /api/events with rentalId
           │
           ▼
    ┌──────────────────┐
    │ rentalId present?│
    └──────────────────┘
           │
           ├─── No ──► Create event normally (no rental link)
           │
           └─── Yes ──► Validate rental
                        │
                        ▼
                 ┌──────────────────┐
                 │ Rental exists?   │
                 └──────────────────┘
                        │
                        ├─── No ──► 404 Error: "Rental not found"
                        │
                        └─── Yes ──► Check ownership
                                     │
                                     ▼
                              ┌──────────────────────┐
                              │ User is the renter?  │
                              └──────────────────────┘
                                     │
                                     ├─── No ──► 403 Error: "Only renter can create event"
                                     │
                                     └─── Yes ──► Check status
                                                  │
                                                  ▼
                                           ┌──────────────────────┐
                                           │ Rental confirmed?    │
                                           └──────────────────────┘
                                                  │
                                                  ├─── No ──► 400 Error: "Rental must be confirmed"
                                                  │
                                                  └─── Yes ──► Validate time
                                                               │
                                                               ▼
                                                        ┌──────────────────────┐
                                                        │ Event time matches   │
                                                        │ rental slot time?    │
                                                        └──────────────────────┘
                                                               │
                                                               ├─── No ──► 400 Error: "Time must match"
                                                               │
                                                               └─── Yes ──► Set facilityId
                                                                            │
                                                                            ▼
                                                                     ┌──────────────────────┐
                                                                     │ Create event with    │
                                                                     │ rentalId link        │
                                                                     └──────────────────────┘
                                                                            │
                                                                            ▼
                                                                     201 Created
```

## Use Cases

### Use Case 1: Single Event per Rental
**Scenario:** User rents a court and creates one event

```
Rental (rental-1)
  └─► Event (event-1) "Basketball Pickup"
```

### Use Case 2: Multiple Events per Rental
**Scenario:** User rents a court for 2 hours and creates multiple events

```
Rental (rental-1) [14:00-16:00]
  ├─► Event (event-1) "Beginner Session" [14:00-15:00]
  └─► Event (event-2) "Advanced Session" [15:00-16:00]
```

### Use Case 3: Event Without Rental
**Scenario:** User creates event at a facility without renting

```
Event (event-3) "Open Gym"
  rentalId: null
  facilityId: facility-1
```

### Use Case 4: Rental Without Events
**Scenario:** User rents a court but doesn't create public events

```
Rental (rental-2)
  events: [] (empty)
```

## Benefits of This Relationship

1. **Data Integrity**
   - Events are linked to their source rentals
   - Prevents orphaned events
   - Maintains audit trail

2. **Business Logic**
   - Validate event time matches rental
   - Ensure only renter can create events
   - Track rental utilization

3. **User Experience**
   - Show rental details on event page
   - Display court/facility information
   - Navigate between rental and events

4. **Reporting**
   - Track how many events are created from rentals
   - Analyze rental-to-event conversion
   - Monitor facility usage patterns

5. **Future Features**
   - Automatic event cancellation if rental is cancelled
   - Rental-specific event restrictions
   - Integrated billing (rental + event fees)

## Database Constraints

### Foreign Key Constraint
```sql
ALTER TABLE events
ADD CONSTRAINT events_rentalId_fkey
FOREIGN KEY (rentalId)
REFERENCES facility_rentals(id);
```

**Behavior:**
- `ON DELETE`: No action (events remain if rental is deleted)
- `ON UPDATE`: Cascade (if rental ID changes, event updates)
- Nullable: Yes (events can exist without rentals)

### Index
```sql
CREATE INDEX idx_events_rentalId ON events(rentalId);
```

**Purpose:**
- Fast lookup of events by rental
- Efficient JOIN operations
- Improved query performance

## Summary

Task 13.5 establishes a robust, bidirectional relationship between Events and Rentals:

- ✅ Database schema supports the relationship
- ✅ Foreign key constraint ensures data integrity
- ✅ Nullable field allows events without rentals
- ✅ Multiple events can share one rental
- ✅ Comprehensive validation prevents invalid links
- ✅ Bidirectional queries work efficiently
- ✅ Backend API handles all edge cases
- ✅ Frontend integration complete

This relationship enables rich features like showing rental information on events, tracking facility usage, and ensuring events match their rental slots.
