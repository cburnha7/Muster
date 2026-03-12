# Event Creation - Court/Field Selector and Time Slot Display

## Overview
Add court/field selector and time slot picker to event creation flow with ownership-aware availability display.

## Requirements

### 1. Court/Field Selector
- Display after ground/facility is selected
- Match UI/behavior of existing booking court screen
- Show all courts/fields at the selected facility

### 2. Time Slot Display (Ownership-Aware)

#### For Rented Grounds (user has reservations):
- Display ALL time slots on selected court/field
- Gray out slots user hasn't reserved (non-interactive)
- Only user's confirmed reservations are selectable
- Visual distinction between user's slots and others

#### For Owned Grounds (user owns facility):
- Display ALL time slots on selected court/field
- All available slots are selectable
- Gray out: already booked, rented by others, blocked
- Owner has full discretion over calendar

### 3. Automatic Slot Blocking
- When owner creates event and assigns to court/time slot
- Slot automatically marked as blocked
- Tied to event record
- Auto-unblocked if event cancelled

## Implementation Plan

### Phase 1: Backend - Court Listing
- Add endpoint to get courts for a facility
- Include court details and availability status

### Phase 2: Backend - Time Slot Availability
- Enhance available-slots endpoint
- Add ownership context to each slot
- Include rental information
- Mark slots as selectable/non-selectable

### Phase 3: Backend - Event-Slot Linking
- Link events to specific time slots
- Auto-block slots when event created
- Auto-unblock when event cancelled/deleted

### Phase 4: Frontend - Court Selector
- Create CourtSelector component
- Reuse existing court list UI
- Handle court selection

### Phase 5: Frontend - Time Slot Picker
- Create TimeSlotPicker component
- Display slots with ownership-aware styling
- Handle slot selection
- Show visual indicators (available, reserved, blocked, etc.)

### Phase 6: Frontend - Integration
- Update CreateEventScreen workflow
- Add court and slot selection steps
- Pre-fill event details from selected slot
- Handle validation


## Database Schema Changes

### Add Event-TimeSlot Relationship

Need to add `timeSlotId` to Event model to support:
1. Direct linking of events to time slots (for owned facilities)
2. Auto-blocking of slots when event created
3. Auto-unblocking when event cancelled

```prisma
model Event {
  // ... existing fields
  timeSlotId  String? // Direct link to time slot (for owned facilities)
  
  // Relations
  timeSlot    FacilityTimeSlot? @relation(fields: [timeSlotId], references: [id])
}

model FacilityTimeSlot {
  // ... existing fields
  
  // Relations
  events      Event[] // Events using this slot
}
```

### Migration Steps
1. Add timeSlotId field to Event model
2. Add events relation to FacilityTimeSlot model
3. Run migration
4. Update event creation logic to handle timeSlotId

## API Endpoints

### Existing (to enhance):
- `GET /api/facilities/:facilityId/courts` - Already exists
- `GET /api/facilities/:facilityId/courts/:courtId/slots` - Already exists
- `GET /api/facilities/:facilityId/available-slots` - Already exists (needs enhancement)

### New/Enhanced:
- `GET /api/facilities/:facilityId/courts/:courtId/available-slots-for-event`
  - Returns slots with ownership context
  - Marks user's rentals vs available slots
  - Includes selectability flags

## Frontend Components

### 1. CourtSelector Component
```typescript
interface CourtSelectorProps {
  facilityId: string;
  selectedCourtId?: string;
  onCourtSelect: (courtId: string) => void;
  isOwner: boolean;
}
```

### 2. TimeSlotPicker Component
```typescript
interface TimeSlotPickerProps {
  facilityId: string;
  courtId: string;
  userId: string;
  isOwner: boolean;
  selectedSlotId?: string;
  onSlotSelect: (slot: TimeSlotData) => void;
}

interface TimeSlotData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  status: 'available' | 'blocked' | 'rented';
  isSelectable: boolean;
  isUserRental: boolean;
  rentalId?: string;
}
```

## Implementation Steps

### Step 1: Database Migration ✓ (Next)
- Add timeSlotId to Event model
- Add events relation to FacilityTimeSlot
- Run migration

### Step 2: Backend - Enhanced Slot Endpoint
- Update available-slots endpoint
- Add court-specific slot endpoint
- Include ownership context
- Mark selectability

### Step 3: Backend - Event Creation Logic
- Link event to timeSlot when created
- Auto-block slot (set status to 'blocked', blockReason to event ID)
- Handle both rental-based and direct slot selection

### Step 4: Backend - Event Cancellation Logic
- Auto-unblock slot when event cancelled
- Clear blockReason
- Set status back to 'available'

### Step 5: Frontend - CourtSelector
- Create component
- Fetch courts for facility
- Display court list
- Handle selection

### Step 6: Frontend - TimeSlotPicker
- Create component
- Fetch slots for court
- Display with ownership-aware styling
- Handle selection
- Show visual indicators

### Step 7: Frontend - CreateEventScreen Integration
- Add court selection step
- Add time slot selection step
- Pre-fill event details from slot
- Update validation
- Handle submission with timeSlotId
