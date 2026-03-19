# Token Refresh Fix - Implementation Summary

## Problem
The app was throwing 401 errors and failing to refresh access tokens with "No refresh token available" error. Users were stuck in a broken authenticated state after the access token expired.

## Root Causes Identified

1. **Missing refreshToken in Redux State**: The auth slice only stored `accessToken`, not `refreshToken`
2. **API Interceptor Reading from Wrong Location**: The interceptor tried to read `refreshToken` from Redux state where it didn't exist
3. **No Fallback to TokenStorage**: When Redux didn't have the token, there was no fallback to check TokenStorage
4. **AsyncStorage Usage on Web**: AuthService was using AsyncStorage directly, which doesn't work on web
5. **No Infinite Loop Prevention**: The refresh logic could potentially retry indefinitely

## Changes Made

### 1. Updated Auth Slice (`src/store/slices/authSlice.ts`)
- Added `refreshToken: string | null` to `AuthState` interface
- Updated `initialState` to include `refreshToken: null`
- Modified `setTokens` action to accept and store `refreshToken`
- Updated `clearAuth` action to clear `refreshToken`
- Updated all auth action fulfillment handlers to store `refreshToken`:
  - `registerUser.fulfilled`
  - `registerWithSSO.fulfilled`
  - `loginUser.fulfilled`
  - `loginWithSSO.fulfilled`
  - `linkAccount.fulfilled`
  - `refreshAccessToken.fulfilled`
- Updated logout handlers to clear `refreshToken`
- Added `selectRefreshToken` selector
- Updated `loadCachedUser` to load `refreshToken` from TokenStorage
- Added `TokenStorage` import

### 2. Fixed AuthService (`src/services/api/AuthService.ts`)
- Removed `AsyncStorage` import (doesn't work on web)
- Removed `TOKEN_KEY` and `USER_KEY` constants
- Updated `initializeTokenCache()` to use `TokenStorage.getAccessToken()`
- Updated `storeAuthData()` to only use TokenStorage (removed AsyncStorage calls)
- Updated `refreshToken()` to only use TokenStorage (removed AsyncStorage call)
- Updated `logout()` to only use `TokenStorage.clearAll()` (removed AsyncStorage calls)
- Updated `getStoredUser()` to only use TokenStorage (removed AsyncStorage fallback)

### 3. Enhanced API Interceptor (`src/store/api.ts`)
- Added `TokenStorage` import
- Added `isRefreshing` flag to prevent multiple simultaneous refresh attempts
- Added `refreshPromise` to allow waiting for in-progress refresh
- Enhanced `baseQueryWithReauth` with:
  - Logging for debugging token refresh flow
  - Check Redux state for `refreshToken` first
  - Fallback to `TokenStorage.getRefreshToken()` if not in Redux
  - Graceful handling when no refresh token is available
  - Store new tokens in both TokenStorage and Redux after successful refresh
  - Clear session and dispatch `clearAuth` on refresh failure
  - Prevent infinite retry loops with `isRefreshing` flag
  - Proper error handling and cleanup

### 4. TokenStorage Already Had Web Support
- TokenStorage already uses `localStorage` on web (Platform.OS === 'web')
- Uses `sessionStorage` for access token and `localStorage` for refresh token on web
- Uses `SecureStore` on native platforms

## Token Lifecycle Flow

### Login Flow
1. User logs in via `loginUser` thunk
2. Backend returns `{ user, accessToken, refreshToken }`
3. `AuthService.storeAuthData()` stores both tokens in TokenStorage
4. Redux state updated with user, accessToken, and refreshToken
5. Tokens persist across app restarts via localStorage (web) or SecureStore (native)

### Token Refresh Flow
1. API request receives 401 response
2. Interceptor checks if already refreshing (prevents duplicate attempts)
3. Gets refreshToken from Redux state, falls back to TokenStorage
4. If no refreshToken found, clears session and dispatches `clearAuth`
5. If refreshToken found, calls `/auth/refresh` endpoint
6. On success:
   - Stores new tokens in TokenStorage
   - Updates Redux state with new tokens
   - Retries original failed request
7. On failure:
   - Clears TokenStorage
   - Dispatches `clearAuth` to Redux
   - User redirected to login (handled by auth state change)

### Logout Flow
1. User logs out via `logoutUser` thunk
2. Calls backend `/auth/logout` endpoint
3. Clears all tokens from TokenStorage
4. Clears Redux auth state (including refreshToken)
5. User redirected to login screen

## Error Handling

### No Refresh Token Available
- Logs error message
- Clears TokenStorage
- Dispatches `clearAuth`
- User automatically redirected to login

### Refresh Request Fails
- Logs error message
- Clears TokenStorage
- Dispatches `clearAuth`
- User automatically redirected to login

### Infinite Loop Prevention
- `isRefreshing` flag prevents multiple simultaneous refresh attempts
- `refreshPromise` allows waiting for in-progress refresh
- Only one refresh attempt per 401 error
- Flags reset after refresh completes or fails

## Testing Checklist

- [x] Login stores both accessToken and refreshToken
- [x] Tokens persist across app restarts
- [x] 401 error triggers token refresh
- [x] Successful refresh updates tokens and retries request
- [x] Failed refresh clears session and redirects to login
- [x] No infinite retry loops
- [x] Works on web (localStorage) and native (SecureStore)
- [x] Logout clears all tokens
- [x] Multiple simultaneous 401s don't cause multiple refresh attempts

## Files Modified

1. `src/store/slices/authSlice.ts` - Added refreshToken to state
2. `src/services/api/AuthService.ts` - Removed AsyncStorage, use TokenStorage only
3. `src/store/api.ts` - Enhanced token refresh logic with fallback and error handling
4. `src/services/auth/TokenStorage.ts` - Already had web support (no changes needed)

## Result

Users can now:
- Log in and have tokens properly stored
- Have tokens automatically refreshed when expired
- Be gracefully logged out when refresh fails
- Use the app on web without AsyncStorage errors
- Not get stuck in broken authenticated states
