# Delete Ground Implementation

## Overview
Added the ability to delete a ground from the Edit Ground screen, which is accessed from the "My Grounds" section on the Profile screen.

## Changes Made

### Backend (server/src/routes/facilities.ts)

Added DELETE endpoint for facilities:

```typescript
router.delete('/:id', async (req, res) => {
  // Validates:
  // - Facility exists
  // - No future rentals (confirmed status)
  // - No future events
  
  // Cleans up:
  // - Facility map images
  // - Related records (via Prisma cascade)
  
  // Returns: 204 No Content on success
});
```

**Safety Checks:**
- Prevents deletion if there are future confirmed rentals
- Prevents deletion if there are future events
- Cleans up facility map images before deletion
- Uses Prisma cascade to handle related records

### Frontend (src/screens/facilities/EditFacilityScreen.tsx)

Added delete functionality:

1. **Import removeFacility action** from Redux slice
2. **handleDelete()** - Shows confirmation alert
3. **confirmDelete()** - Executes deletion:
   - Calls `facilityService.deleteFacility()`
   - Dispatches `removeFacility()` to update Redux state
   - Shows success message
   - Navigates back to Facilities list
4. **Delete Button UI** - Red destructive button below Update button

**UI Flow:**
1. User clicks "Delete Ground" button
2. Confirmation alert appears: "Are you sure you want to delete this ground? This action cannot be undone."
3. User confirms or cancels
4. If confirmed, ground is deleted and user is navigated back

## User Experience

### Navigation Flow
```
Profile Screen
  → My Grounds section
    → Click on a ground
      → Edit Ground Screen (old version restored)
        → Update Ground button (existing)
        → Delete Ground button (NEW)
```

### Delete Button Styling
- Red background (#EF4444) to indicate destructive action
- White text
- Positioned below the Update button
- Disabled during submission to prevent double-clicks

### Error Handling
- Shows error alert if deletion fails
- Common errors:
  - "Cannot delete ground with future rentals"
  - "Cannot delete ground with future events"
  - Network errors

## Redux Integration

Uses existing `removeFacility` action from `facilitiesSlice`:
- Removes facility from the facilities array
- Decrements total count
- Clears selectedFacility if it matches the deleted one

## Testing Checklist

- [ ] Delete button appears on Edit Ground screen
- [ ] Confirmation alert shows when clicking Delete
- [ ] Ground is deleted when confirmed
- [ ] User is navigated back to Facilities list
- [ ] Ground is removed from Redux state
- [ ] Ground no longer appears in "My Grounds" list
- [ ] Cannot delete ground with future rentals
- [ ] Cannot delete ground with future events
- [ ] Facility map images are cleaned up

## Files Modified

1. `server/src/routes/facilities.ts` - Added DELETE endpoint
2. `src/screens/facilities/EditFacilityScreen.tsx` - Added delete button and logic

## Notes

- The Edit Ground screen is the "old version" that the user preferred
- Delete functionality is only available to the ground owner
- Backend has TODO comments for authorization checks (to be implemented)
- Deletion is permanent and cannot be undone
- All related data (courts, time slots, etc.) are deleted via Prisma cascade
