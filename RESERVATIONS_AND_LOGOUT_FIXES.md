# Reservations and Logout Fixes

## Issues Fixed

### 1. My Reservations Not Showing (404 Error)

**Problem**: The `/api/rentals/my-rentals` endpoint was returning 404 errors.

**Root Causes**:
1. **Route Order Conflict**: The route `/rentals/:rentalId` was defined before `/rentals/my-rentals`, causing Express to match "my-rentals" as a rentalId parameter.
2. **Date Comparison Issue**: The query was comparing rental dates (stored at midnight UTC) against the current timestamp, causing today's rentals to be filtered out.

**Fixes Applied**:

#### Route Order Fix (`server/src/routes/rentals.ts`)
- Moved `/rentals/my-rentals` route BEFORE `/rentals/:rentalId` route
- Added comment to prevent future reordering: `// MUST be before /:rentalId to avoid route conflict`

#### Date Comparison Fix (`server/src/routes/rentals.ts`)
```typescript
// Before (incorrect)
if (upcoming === 'true') {
  where.timeSlot = {
    date: { gte: new Date() },
  };
}

// After (correct)
if (upcoming === 'true') {
  // Normalize to start of day for date comparison
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  where.timeSlot = {
    date: { gte: today },
  };
}
```

**Verification**:
- Created test script `server/src/scripts/check-rentals.ts` to verify rentals exist in database
- Created test script `server/src/scripts/test-my-rentals-endpoint.ts` to verify query logic
- Confirmed host user has 2 rentals for Rowe facility (Court 1, 15:00-16:00 and 16:00-17:00)
- Query now correctly returns rentals for today

### 2. Logout Navigation Issue

**Status**: Already Fixed in Previous Session

The logout functionality was already working correctly:
- `AuthContext.logout()` clears user state and AsyncStorage
- `RootNavigator` uses conditional rendering based on user state
- When user becomes null, navigation automatically shows LoginScreen

**Current Implementation**:
```typescript
// RootNavigator.tsx
{!isOnboardingCompleted ? (
  <Stack.Screen name="Onboarding">...</Stack.Screen>
) : !user ? (
  <Stack.Screen name="Auth" component={LoginScreen} />
) : (
  <Stack.Screen name="Main" component={TabNavigator} />
)}
```

## Testing Instructions

### Test My Reservations
1. Login as "host" user (password: 1234)
2. Navigate to Profile screen
3. Verify "My Reservations" section shows 2 reservations for Rowe facility
4. Each reservation should show:
   - Facility name: Rowe
   - Court: 1
   - Date: Today (Mar 11)
   - Time slots: 3:00 PM - 4:00 PM and 4:00 PM - 5:00 PM
   - Status badge: "Available" (green)

### Test Logout
1. From Profile screen, scroll to bottom
2. Tap "Logout" button (red text with logout icon)
3. Should immediately return to Login screen
4. Verify user is logged out (can't access protected screens)

## Files Modified

### Backend
- `server/src/routes/rentals.ts` - Fixed route order and date comparison

### Scripts Created
- `server/src/scripts/check-rentals.ts` - Verify rentals in database
- `server/src/scripts/test-my-rentals-endpoint.ts` - Test query logic

## Technical Notes

### Date Storage in Database
- Dates are stored at midnight UTC (e.g., 2026-03-11T00:00:00.000Z)
- Times are stored separately as strings (e.g., "15:00", "16:00")
- When comparing dates, always normalize to midnight to avoid time-of-day issues

### Express Route Matching
- Routes are matched in the order they are defined
- Specific routes (e.g., `/rentals/my-rentals`) must come before parameterized routes (e.g., `/rentals/:rentalId`)
- Otherwise, "my-rentals" will be treated as a value for the `:rentalId` parameter

### React Navigation State Management
- Navigation state updates automatically when context values change
- No need to manually call navigation.navigate() after logout
- Conditional rendering in RootNavigator handles screen transitions

## Next Steps

1. Test the fixes in the app:
   - Login as host user
   - Verify reservations appear on profile
   - Test logout functionality

2. If reservations still don't show:
   - Check browser/app console for errors
   - Verify API_URL environment variable is correct
   - Check network tab for actual API response

3. Consider future improvements:
   - Add pull-to-refresh on My Reservations section
   - Add ability to cancel reservations from profile
   - Show reservation status (upcoming, past, cancelled)
   - Add filtering options (by facility, by date range)
