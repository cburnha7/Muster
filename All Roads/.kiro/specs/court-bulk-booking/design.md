# Design Document: Court Bulk Booking

## Overview

Extends the court booking flow to support a "Book the Whole Day" toggle, persistent multi-day/multi-court selections, a running selection summary, atomic bulk submission with conflict resolution, and grouped reservation display — all linked by a `bookingSessionId` on the rental record.

## Data Model Changes

### FacilityRental (modified)

```prisma
model FacilityRental {
  // ... existing fields ...

  bookingSessionId String? // UUID linking rentals from the same bulk transaction

  @@index([bookingSessionId])
}
```

Migration: Add nullable `bookingSessionId` column and index. No data backfill needed — existing rentals remain null.

## API Changes

### New Endpoint

#### `POST /api/rentals/bulk`

Request:
```json
{
  "userId": "string",
  "slots": [
    { "facilityId": "string", "courtId": "string", "slotId": "string" }
  ]
}
```

Success Response (201):
```json
{
  "bookingSessionId": "uuid",
  "rentals": [
    {
      "id": "string",
      "bookingSessionId": "uuid",
      "timeSlot": { "id": "...", "date": "...", "startTime": "...", "endTime": "...", "court": { "id": "...", "name": "..." } },
      "totalPrice": 25.00,
      "status": "confirmed"
    }
  ],
  "totalPrice": 150.00,
  "slotCount": 6
}
```

Conflict Response (409):
```json
{
  "conflicts": [
    { "slotId": "...", "courtId": "...", "courtName": "...", "date": "...", "startTime": "...", "endTime": "...", "reason": "rented" }
  ],
  "availableSlots": [
    { "slotId": "...", "courtId": "...", "facilityId": "..." }
  ]
}
```

### Backend Logic (`server/src/routes/rentals.ts`)

```
POST /api/rentals/bulk handler:
1. Validate userId and slots array (non-empty)
2. Begin Prisma transaction:
   a. Fetch all referenced FacilityTimeSlots with court + facility includes
   b. Validate each slot exists, belongs to correct court/facility, date is not past
   c. Partition into available vs. conflicting
   d. If conflicts exist → rollback, return 409 with conflict details
   e. If all available:
      - Generate bookingSessionId (uuid)
      - Update all slot statuses to 'rented'
      - Create FacilityRental for each slot with bookingSessionId
      - Return 201 with rentals
3. End transaction
```

### Modified Endpoint

#### `GET /api/rentals/my-rentals`

No changes to the endpoint itself. The response already includes full timeSlot → court → facility data. The frontend groups by `bookingSessionId` client-side.

## Frontend Changes

### Selection Cart State

The `CourtAvailabilityScreen` currently stores `selectedSlots: TimeSlot[]` scoped to the current court/day. This changes to a persistent map:

```typescript
// Key: slotId, Value: slot metadata for summary/submission
interface CartSlot {
  slotId: string;
  facilityId: string;
  courtId: string;
  courtName: string;
  date: string;       // YYYY-MM-DD
  startTime: string;
  endTime: string;
  price: number;
}

// State: Map<string, CartSlot> keyed by slotId
const [selectionCart, setSelectionCart] = useState<Map<string, CartSlot>>(new Map());
```

The cart persists across court/date changes within the screen. It clears on screen unmount.

### Whole Day Toggle

New state: `const [wholeDayOn, setWholeDayOn] = useState(false);`

- Resets to `false` when `selectedCourt` or `selectedDate` changes
- On toggle ON: add all available slots for current court+date to cart
- On toggle OFF: remove all slots for current court+date from cart
- If user manually deselects a slot while toggle is ON → set toggle to OFF

### handleSlotPress Changes

```typescript
const handleSlotPress = (slot: TimeSlot) => {
  if (slot.status !== 'available') return;

  setSelectionCart(prev => {
    const next = new Map(prev);
    if (next.has(slot.id)) {
      next.delete(slot.id);
    } else {
      next.set(slot.id, {
        slotId: slot.id,
        facilityId,
        courtId: selectedCourt.id,
        courtName: selectedCourt.name,
        date: selectedDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: slot.price || 0,
      });
    }
    return next;
  });
};
```

### handleDateSelect / handleCourtSelect Changes

Remove the `setSelectedSlots([])` calls. The cart persists. Only reset `wholeDayOn` to false.

### Selection Summary Footer

Replace the current footer with a persistent summary:

```
┌─────────────────────────────────────────┐
│  🛒 6 slots · 2 courts · 3 days        │
│  Total: $150.00                         │
│  [Book 6 Slots →]                       │
└─────────────────────────────────────────┘
```

Derived from the cart map: count entries, count unique courtIds, count unique dates, sum prices.

### Confirmation Flow

Replace `RentalConfirmationModal` usage with a new `BulkBookingConfirmationModal` that:
- Groups cart slots by court name, then by date
- Shows each slot's time and price
- Shows grand total
- Has "Confirm Booking" and "Cancel" buttons

### Conflict Dialog

New `BookingConflictModal` component:
- Lists conflict slots with court name, date, time
- "Book Available Slots" button → resubmit without conflicts
- "Cancel" button → return to screen with cart intact

### Submission Flow

```typescript
const handleConfirmBulkBooking = async () => {
  const slots = Array.from(selectionCart.values()).map(s => ({
    facilityId: s.facilityId,
    courtId: s.courtId,
    slotId: s.slotId,
  }));

  const response = await fetch(`${API_URL}/rentals/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.id, slots }),
  });

  if (response.status === 201) {
    // Success — clear cart, show confirmation, reload availability
  } else if (response.status === 409) {
    // Conflicts — show conflict dialog
  } else {
    // Error
  }
};
```

### MyReservationsSection Changes

Group reservations by `bookingSessionId`:

```typescript
// Group rentals
const grouped = new Map<string | null, Reservation[]>();
for (const r of reservations) {
  const key = r.bookingSessionId || r.id; // null sessions use their own id
  const group = grouped.get(key) || [];
  group.push(r);
  grouped.set(key, group);
}
```

- Groups with >1 rental render as a collapsible card with session header
- Single rentals render as before (no visual change)

## Component Summary

| Component | Action |
|---|---|
| `CourtAvailabilityScreen` | Refactor state to use cart Map, add toggle, update footer |
| `BulkBookingConfirmationModal` | New — grouped slot review before confirm |
| `BookingConflictModal` | New — conflict resolution dialog |
| `MyReservationsSection` | Update to group by bookingSessionId |
| `server/src/routes/rentals.ts` | Add `POST /rentals/bulk` handler |
| `server/prisma/schema.prisma` | Add `bookingSessionId` to FacilityRental |
| Migration | Add column + index |

