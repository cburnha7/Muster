# Court/Time Slot Picker Implementation Status

## ✅ Completed

### Backend (100% Complete)
1. **Database Schema**
   - Added `timeSlotId` to Event model
   - Added `events` relation to FacilityTimeSlot model
   - Migration applied successfully

2. **New Endpoint**: `GET /api/facilities/:facilityId/courts/:courtId/slots-for-event`
   - Returns slots with ownership context
   - Marks selectability based on owner vs renter
   - Includes rental information
   - Filters by date range

3. **Enhanced Event Creation**: `POST /api/events`
   - Handles `timeSlotId` for owner-created events
   - Validates slot availability
   - Auto-blocks slot when event created
   - Links event to time slot
   - Transaction-based for data integrity

4. **Enhanced Event Deletion**: `DELETE /api/events/:id`
   - Auto-unblocks slot when event deleted
   - Clears rental usedForEventId
   - Transaction-based cleanup

### Frontend Components (100% Complete)
1. **CourtSelector Component** (`src/components/events/CourtSelector.tsx`)
   - Displays all courts at selected facility
   - Visual selection with checkmarks
   - Shows court details (sport type, capacity, indoor/outdoor)
   - Loading and empty states

2. **TimeSlotPicker Component** (`src/components/events/TimeSlotPicker.tsx`)
   - Ownership-aware slot display
   - Owner: shows all available slots
   - Renter: shows only user's rentals, grays out others
   - Visual indicators (available, rental, disabled)
   - Grouped by date
   - Legend for slot states
   - Selectability enforcement

## 🚧 Remaining Work

### Frontend Integration (Estimated: 200-300 lines)
Need to update `CreateEventScreen.tsx` to:
1. Add court selection step after facility selection
2. Add time slot selection step after court selection
3. Pre-fill event details from selected slot
4. Update form validation
5. Pass `timeSlotId` to event creation API
6. Handle the new workflow

### Integration Steps:
```typescript
// 1. Add state for court and slot selection
const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

// 2. Show CourtSelector after facility selected
{formData.facilityId && !selectedCourt && (
  <CourtSelector
    facilityId={formData.facilityId}
    selectedCourtId={selectedCourt?.id}
    onCourtSelect={(courtId, court) => setSelectedCourt(court)}
  />
)}

// 3. Show TimeSlotPicker after court selected
{selectedCourt && (
  <TimeSlotPicker
    facilityId={formData.facilityId}
    courtId={selectedCourt.id}
    userId={user.id}
    selectedSlotId={selectedSlot?.id}
    onSlotSelect={(slot) => {
      setSelectedSlot(slot);
      // Pre-fill form data from slot
      prefillFromSlot(slot);
    }}
  />
)}

// 4. Pre-fill function
const prefillFromSlot = (slot: TimeSlot) => {
  const slotDate = new Date(slot.date);
  setFormData(prev => ({
    ...prev,
    startDate: slotDate,
    startTime: slot.startTime,
    duration: calculateDuration(slot.startTime, slot.endTime),
    timeSlotId: slot.id,
    rentalId: slot.rentalId,
  }));
};

// 5. Update submission to include timeSlotId
const eventData = {
  ...formData,
  timeSlotId: selectedSlot?.id,
  rentalId: selectedSlot?.rentalId,
};
```

## Testing Checklist

### As Owner User:
- [ ] Select owned facility
- [ ] See all courts
- [ ] Select a court
- [ ] See all available time slots
- [ ] Select a slot
- [ ] Create event
- [ ] Verify slot is blocked
- [ ] Delete event
- [ ] Verify slot is unblocked

### As Renter User (host):
- [ ] Select facility with rentals (Rowe)
- [ ] See courts
- [ ] Select court with rental
- [ ] See only own rental slots (grayed out others)
- [ ] Select rental slot
- [ ] Create event
- [ ] Verify rental marked as used
- [ ] Cannot select same slot again

## Files Created/Modified

### Backend:
- `server/prisma/schema.prisma` - Added Event.timeSlotId
- `server/src/routes/courts.ts` - Added slots-for-event endpoint
- `server/src/routes/events.ts` - Enhanced create/delete with auto-blocking

### Frontend:
- `src/components/events/CourtSelector.tsx` - NEW
- `src/components/events/TimeSlotPicker.tsx` - NEW
- `src/screens/events/CreateEventScreen.tsx` - NEEDS UPDATE

## Next Steps

1. Update CreateEventScreen to integrate CourtSelector and TimeSlotPicker
2. Test complete workflow as owner
3. Test complete workflow as renter
4. Verify auto-blocking/unblocking works
5. Handle edge cases and error states
