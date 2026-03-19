# Token Storage Synchronization Fix

## Problem
After login, API requests were getting 401 Unauthorized errors even though the user was logged in and Redux state showed they were authenticated.

## Root Cause
The app has two separate AuthService implementations:
1. `src/services/api/AuthService.ts` - Used by Redux for login/register, stores tokens in TokenStorage
2. `src/services/auth/AuthService.ts` - Used by BaseApiService for token management, has its own token cache

When users logged in via Redux:
1. Login succeeded and tokens were stored in TokenStorage
2. Redux state was updated with user and tokens
3. User was marked as authenticated
4. BUT BaseApiService was reading tokens from auth/AuthService's cache, which was never updated
5. API requests had no Authorization header, resulting in 401 errors

## Solution
Updated BaseApiService to read both tokens AND user data directly from TokenStorage instead of relying on auth/AuthService's cache:

1. **Request Interceptor - Token**: Changed from `authService.getToken()` (synchronous cache) to `await TokenStorage.getAccessToken()` (reads from actual storage)
2. **Request Interceptor - User**: Changed from `authService.getCurrentUser()` to `await TokenStorage.getUser()` (reads from actual storage)
3. **Token Refresh**: After refresh, read new token from TokenStorage instead of authService cache
4. **Import TokenStorage**: Added TokenStorage import to BaseApiService

This ensures BaseApiService always reads the latest tokens and user data that were stored by the login process, and properly sets both the Authorization header and X-User-Id header for mock authentication.

## Files Modified
- `src/services/api/BaseApiService.ts` - Read tokens from TokenStorage instead of authService cache

## How It Works Now

### Login Flow
1. User logs in via LoginScreen
2. Redux loginUser thunk calls api/AuthService.login()
3. api/AuthService stores tokens in TokenStorage
4. Redux state updated with user, accessToken, refreshToken
5. User marked as authenticated
6. BaseApiService reads token from TokenStorage on next request
7. API request includes Authorization header
8. Request succeeds

### API Request Flow
1. User makes API request (e.g., load bookings, create event)
2. BaseApiService request interceptor runs
3. Interceptor calls `await TokenStorage.getAccessToken()` for token
4. Interceptor calls `await TokenStorage.getUser()` for user data
5. Token retrieved from storage (where login stored it)
6. User data retrieved from storage (where login stored it)
7. Authorization header set: `Bearer ${token}`
8. X-User-Id header set: `${user.id}` (for mock auth in development)
9. Request sent with proper authentication
10. Server validates token and returns data

## Testing
- Login → Navigate to bookings → Should load without 401 errors
- Login → Navigate to any authenticated screen → Should work
- Logout → Login again → Should work immediately
- Refresh page (web) → Should maintain authentication

## Related Files
- `src/services/api/BaseApiService.ts` - Axios-based API service with TokenStorage integration
- `src/services/auth/TokenStorage.ts` - Centralized token storage
- `src/services/api/AuthService.ts` - API layer auth service (used by Redux)
- `src/services/auth/AuthService.ts` - Auth layer service (used for mock auth)
- `src/store/slices/authSlice.ts` - Redux auth state management
