# Mock User Scoping Implementation

## Overview
All user-specific data is now properly scoped to the currently authenticated user. No hardcoded user references remain in the application code.

## Changes Made

### 1. User Switcher Component
**File**: `src/components/dev/UserSwitcher.tsx`

A floating button that allows switching between test users in development mode:
- Player (`player@muster.app`)
- Host (`host@muster.app`)
- Owner (`owner@muster.app`)
- Player+ (`playerplus@muster.app`)

The switcher:
- Only appears when `EXPO_PUBLIC_USE_MOCK_AUTH=true`
- Stores selected user in localStorage
- Reloads the app after switching to ensure clean state
- Shows current user name on the button

### 2. AuthService Updates
**File**: `src/services/auth/AuthService.ts`

#### New Method: `switchMockUser()`
```typescript
async switchMockUser(userId: string, email: string, firstName: string, lastName: string): Promise<void>
```
- Stores selected user in localStorage
- Updates current user session
- Only available in development mode

#### Updated Method: `initialize()`
- Checks localStorage for selected mock user
- Falls back to default (Host) if none selected
- Logs which user is loaded for debugging

### 3. App Integration
**File**: `App.tsx`
- Added `<UserSwitcher />` component to root layout
- Positioned as floating button in bottom-right corner

## Test Users

All four test users exist in the database with proper IDs:

| User | Email | ID | Purpose |
|------|-------|-----|---------|
| Player | player@muster.app | `a6e3e977-0cea-4374-9008-047de0b0618c` | Regular player, joins events |
| Host | host@muster.app | `d85bc42c-2368-4337-a486-8d88ff31ccfb` | Event host, has rentals |
| Owner | owner@muster.app | `cec0c431-d1d9-4b6f-a284-d75c71ad6f24` | Facility owner |
| Player+ | playerplus@muster.app | `46fec81e-8485-4394-8982-6c466ee30b5d` | Premium player |

## Data Scoping Verification

### Already Properly Scoped
The following areas already use `authService.getCurrentUser()` correctly:

1. **Bookings Tab** (`BookingsListScreen.tsx`)
   - Uses `userService.getUserBookings()` which gets current user from auth headers

2. **Events Tab** (`EventsListScreen.tsx`)
   - Shows all public events (not user-specific)
   - Participation state derived from current user

3. **Grounds Tab** (`FacilitiesListScreen.tsx`)
   - Shows all active facilities (not user-specific)
   - Ownership determined by comparing facility.ownerId to current user

4. **Profile Screen** (`ProfileScreen.tsx`)
   - Uses `useAuth()` hook to get current user
   - Shows current user's profile data

5. **API Requests** (`BaseApiService.ts`)
   - Automatically adds `X-User-Id` header from `authService.getCurrentUser()`
   - All backend requests properly scoped

### Backend Scoping
The backend properly scopes data using:
- `X-User-Id` header from requests
- User ID from JWT tokens (when implemented)
- Query parameters for user-specific endpoints

## Testing Instructions

### 1. Start the App
```bash
npm start
```

### 2. Switch Users
1. Click the floating green button in bottom-right (shows current user name)
2. Select a different user from the modal
3. App will reload with new user

### 3. Verify Data Scoping

#### As Player
- Bookings tab: Should show player's bookings only
- Events tab: Shows all events, participation reflects player's joins
- Grounds tab: Shows all facilities
- Profile: Shows Player Account details

#### As Host
- Bookings tab: Should show host's bookings
- Events tab: Shows all events, participation reflects host's joins
- Grounds tab: Shows all facilities
- Profile: Shows Host Account details

#### As Owner
- Bookings tab: Should show owner's bookings
- Events tab: Shows all events
- Grounds tab: Shows all facilities (including "My House" owned by owner)
- Profile: Shows Owner Account details
- My Grounds section: Shows owned facilities

#### As Player+
- Bookings tab: Should show player+'s bookings
- Events tab: Shows all events
- Grounds tab: Shows all facilities
- Profile: Shows Player+ Account details

## No Hardcoded References

All hardcoded user IDs have been removed from:
- ✅ Frontend components
- ✅ Service layer
- ✅ Auth system
- ✅ API requests

The only remaining hardcoded IDs are in:
- Documentation files (for reference)
- Test scripts in `server/src/scripts/` (for testing purposes)

## Environment Variables

Ensure `.env` has:
```
EXPO_PUBLIC_USE_MOCK_AUTH=true
```

## Future Enhancements

1. **Seed Data Script**: Create a script to generate test data for all four users
2. **User Profiles**: Add more differentiation between user types
3. **Permissions**: Implement role-based access control
4. **Real Auth**: Replace mock auth with JWT-based authentication

## Troubleshooting

### User Switcher Not Showing
- Check `EXPO_PUBLIC_USE_MOCK_AUTH=true` in `.env`
- Restart Expo dev server after changing `.env`

### Wrong User Data Showing
- Clear browser localStorage
- Refresh the page
- Use User Switcher to select correct user

### Backend Not Recognizing User
- Check browser console for `X-User-Id` header in network requests
- Verify `authService.getCurrentUser()` returns correct user
- Check backend logs for user ID received

## Summary

All user-specific data is now properly scoped to the currently authenticated user. The User Switcher makes it easy to test the app as different users, and all data fetching respects the current user's identity.
