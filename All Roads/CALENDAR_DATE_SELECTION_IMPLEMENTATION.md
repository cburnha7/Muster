# Calendar Date Selection & Multi-Slot Implementation

## Summary

Fixed timezone issues with calendar date display and event creation, and implemented multi-slot selection for creating longer events.

## Issues Fixed

### 1. Calendar Showing Wrong Date for Reservations
**Problem**: Calendar was highlighting the day before the actual reservation date (e.g., showing March 10 when reservation was on March 11).

**Root Cause**: The `formatDateForCalendar` function was using local timezone methods (`getFullYear()`, `getMonth()`, `getDate()`) which caused timezone conversion issues when dates came from the database as UTC midnight.

**Solution**: Updated `formatDateForCalendar` in `src/utils/calendarUtils.ts` to use UTC methods:
```typescript
export function formatDateForCalendar(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

### 2. Event Date Showing Day Before After Slot Selection
**Problem**: When selecting a time slot on March 11, the form would show March 10.

**Root Cause**: In `handleSlotsSelect`, the code was creating a Date object directly from the UTC string without properly handling timezone conversion.

**Solution**: Updated to extract UTC date components and create a local Date:
```typescript
const slotDateUTC = new Date(firstSlot.date);
const slotDate = new Date(
  slotDateUTC.getUTCFullYear(),
  slotDateUTC.getUTCMonth(),
  slotDateUTC.getUTCDate()
);
```

### 3. Backend Date Validation Failing
**Problem**: Backend was rejecting events due to date/time mismatch even when times were correct.

**Root Cause**: Backend validation was using `setHours()` on a Date created from UTC string, causing timezone shifts.

**Solution**: Updated both timeSlot and rental validation in `server/src/routes/events.ts` to use UTC date components:
```typescript
const slotStart = new Date(
  slotDate.getUTCFullYear(),
  slotDate.getUTCMonth(),
  slotDate.getUTCDate(),
  startHours,
  startMinutes,
  0,
  0
);
```

## New Feature: Multi-Slot Selection

### Overview
Users can now select multiple sequential time slots to create longer events. This is useful for tournaments, extended practice sessions, or multi-hour games.

### Implementation

#### 1. TimeSlotPicker Component Updates
**File**: `src/components/events/TimeSlotPicker.tsx`

- Changed from single slot selection to array-based selection
- Props updated:
  - `selectedSlotId` → `selectedSlotIds: string[]`
  - `onSlotSelect` → `onSlotsSelect: (slots: TimeSlot[]) => void`

- Added sequential slot detection:
```typescript
const areSequential = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
  return slot1.endTime === slot2.startTime;
};
```

- Smart selection logic:
  - First tap: Select slot
  - Tap next sequential slot: Add to selection
  - Tap non-sequential slot: Start new selection
  - Tap selected slot: Deselect it and all slots after it

- Visual feedback:
  - All selected slots highlighted in green
  - Info badge shows count of selected slots
  - Checkmark icon on each selected slot

#### 2. CreateEventScreen Updates
**File**: `src/screens/events/CreateEventScreen.tsx`

- Changed state from single to multiple slots:
```typescript
const [selectedSlots, setSelectedSlots] = useState<Array<{...}>>([]);
```

- Updated `handleSlotsSelect` to:
  - Accept array of slots
  - Use first slot's start time
  - Use last slot's end time
  - Calculate total duration across all slots

- Updated event submission to send all slot IDs:
```typescript
timeSlotIds: selectedSlots.map(s => s.id)
```

- Enhanced UI to show multi-slot selection:
  - Displays start time from first slot
  - Displays end time from last slot
  - Shows badge with count when multiple slots selected

### User Experience

1. **Select First Slot**: Tap any available time slot
2. **Extend Selection**: Tap the next sequential slot to add it
3. **Continue Adding**: Keep tapping sequential slots to extend the event
4. **Change Selection**: Tap a non-sequential slot to start over
5. **Deselect**: Tap a selected slot to remove it and all slots after it

### Visual Indicators

- **Selected slots**: Green background with white checkmark
- **Multi-slot badge**: Shows "X consecutive slots selected"
- **Time display**: Shows combined start and end time
- **Duration**: Automatically calculated across all selected slots

## Files Modified

### Frontend
1. `src/utils/calendarUtils.ts` - Fixed date formatting to use UTC
2. `src/components/events/TimeSlotPicker.tsx` - Multi-slot selection
3. `src/screens/events/CreateEventScreen.tsx` - Multi-slot handling

### Backend
1. `server/src/routes/events.ts` - Fixed date validation for both timeSlot and rental paths

## Testing Recommendations

1. **Calendar Display**:
   - Verify rental dates show correct day on calendar
   - Check that orange dots appear on correct dates

2. **Single Slot Selection**:
   - Select one slot and verify date/time display correctly
   - Create event and verify it's created for correct date/time

3. **Multi-Slot Selection**:
   - Select 2-3 sequential slots
   - Verify duration updates correctly
   - Verify badge shows correct count
   - Create event and verify it spans all selected slots

4. **Timezone Edge Cases**:
   - Test near midnight in your timezone
   - Verify dates don't shift by one day

## Known Limitations

1. Backend currently uses first slot's ID for validation - may need updates to handle multiple slots
2. Multi-slot selection only works for sequential slots (by design)
3. Cannot select slots across different dates (by design)

## Next Steps

If backend needs to support multiple slots:
1. Update event creation to accept `timeSlotIds` array
2. Validate all slots are sequential and available
3. Block all selected slots when event is created
4. Update rental linking to handle multiple rentals

## Date/Time Storage Convention

- **Database**: Dates stored as UTC midnight (e.g., `2026-03-11T00:00:00.000Z`)
- **Times**: Stored as local time strings (e.g., `19:00` = 7 PM local)
- **Display**: Always extract UTC components and create local Date objects
- **Validation**: Use UTC components on both frontend and backend for consistency
