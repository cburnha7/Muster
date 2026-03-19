# Facility Creation Debug Summary

## Current Issues

1. **Duplicate Submissions**: Creating a facility results in 4 identical facilities
2. **Missing Courts**: Courts are not being created with the facility
3. **Navigation Not Working**: Screen doesn't navigate back to Facilities list after creation

## Changes Made

### 1. Duplicate Prevention
- Added `useCallback` to `handleSubmit` and `createFacility` to prevent recreation on re-renders
- Added `isSubmittingRef` (React ref) in addition to `isSubmitting` state to survive re-renders
- Check both state and ref before allowing submission
- Added timestamps to console logs to track when handleSubmit is called

### 2. Removed Invalid Field
- Removed `wholeFacilityRate` from facility creation (doesn't exist in Prisma schema)

### 3. Console Logging
- Added detailed emoji-based logging with timestamps:
  - 🔘 handleSubmit called
  - 🔒 Setting isSubmitting
  - ⚠️ Already submitting (duplicate prevention)
  - 📤 Sending facility creation request
  - ✅ Facility created
  - 🏟️ Creating courts
  - 🧭 Navigating

## Backend Verification

Created test script `server/src/scripts/test-facility-creation.ts` which successfully:
- Creates a facility
- Creates 2 courts
- Verifies courts are linked to facility

Result: Backend works correctly ✅

## Next Steps

1. **Check Browser Console**: Look for the timestamped logs to see:
   - How many times `handleSubmit` is called
   - Whether timestamps are identical (same millisecond = likely same event)
   - Whether timestamps are different (multiple button presses or re-renders)

2. **Possible Causes**:
   - FormButton being pressed multiple times
   - React StrictMode causing double renders (but we're in production mode)
   - Parent component re-rendering and recreating handlers
   - Event bubbling causing multiple calls

3. **If Still Failing**:
   - Share the exact console logs with timestamps
   - Check if there are any errors in the console
   - Verify the button is actually disabled when `isSubmitting` is true

## Test Instructions

1. Reload the app (Ctrl+R or 'r' in Expo terminal)
2. Navigate to Facilities tab
3. Tap the + FAB button
4. Fill in the form:
   - Name: "Test Ground"
   - Description: "Test description"
   - Address: Full address
   - Sport Types: Select at least one
   - Add at least one court
5. Tap "Create Ground"
6. **Check browser console** for logs
7. Share the console output

## Expected Console Output

```
🔘 [1234567890] handleSubmit called, isSubmitting: false ref: false
🔒 [1234567890] Setting isSubmitting to true
📤 Sending facility creation request...
✅ Facility created: [facility-id]
🏟️ Creating 1 courts...
✅ Court 1 created: [court-id]
✅ Facility added to Redux with 1 courts
🧭 Navigating to Facilities list...
```

## Files Modified

1. `src/screens/facilities/CreateFacilityScreen.tsx`
   - Added useCallback to handleSubmit and createFacility
   - Added isSubmittingRef for duplicate prevention
   - Removed wholeFacilityRate field
   - Added timestamp logging

2. `server/src/scripts/test-facility-creation.ts`
   - Created test script to verify backend works

3. `server/src/scripts/check-facilities.ts`
   - Script to check current facilities in database
