# Authentication and UI Fixes Summary

## Issues Fixed

### 1. Double Search Bars on Teams Page ✅
**Problem**: TeamsListScreen had two SearchBar components rendering
**Fix**: Removed the duplicate SearchBar in the content section, kept only the one in the header
**File**: `src/screens/teams/TeamsListScreen.tsx`

### 2. Token Refresh System ✅
**Problem**: 401 errors with "No refresh token available"
**Root Causes**:
- Redux state only stored `accessToken`, not `refreshToken`
- API interceptor couldn't find refresh token
- AsyncStorage doesn't work on web
- No infinite loop prevention

**Fixes**:
- Added `refreshToken` to Redux auth state
- Updated all auth actions to store both tokens
- Enhanced API interceptor with TokenStorage fallback
- Removed AsyncStorage, using TokenStorage exclusively
- Added infinite loop prevention with `isRefreshing` flag
- Proper error handling and session clearing

**Files Modified**:
- `src/store/slices/authSlice.ts`
- `src/services/api/AuthService.ts`
- `src/store/api.ts`
- `src/context/AuthContext.tsx`

### 3. Event Creation 400 Error ✅
**Problem**: Creating events failed with 400 Bad Request
**Root Cause**: Client sent nested `eligibility` object but Prisma expects flat fields
**Fix**: Transform nested eligibility object to flat fields before Prisma create
**File**: `server/src/routes/events.ts`

### 4. Logout Navigation ✅
**Problem**: Logout cleared state but didn't navigate to login screen
**Fix**: Added navigation.reset() to force navigation to Auth screen after logout
**File**: `src/screens/profile/ProfileScreen.tsx`

### 5. AuthContext Redux Integration ✅
**Problem**: AuthContext maintained separate state from Redux
**Fix**: 
- AuthContext now reads directly from Redux selectors
- Dispatches `loadCachedUser` on mount to load tokens from TokenStorage
- Properly syncs with Redux state changes

**File**: `src/context/AuthContext.tsx`

## Remaining Issues

### Bookings Page Not Loading After Login
**Symptoms**:
- "No token available" errors
- "No current user" errors  
- 401 responses from API

**Root Cause**: 
The issue is likely a timing problem where:
1. User logs in → tokens stored in TokenStorage and Redux
2. Navigation happens → BookingsListScreen mounts
3. Screen tries to load bookings immediately via `useFocusEffect`
4. API service hasn't picked up the new tokens yet

**Potential Solutions**:

1. **Add auth check in BookingsListScreen**:
```typescript
useFocusEffect(
  useCallback(() => {
    // Only load if user is authenticated
    if (user && token) {
      loadBookings();
    }
  }, [loadBookings, user, token])
);
```

2. **Ensure BaseApiService reads from Redux**:
The API service needs to get tokens from Redux state or TokenStorage on every request.

3. **Add loading state in RootNavigator**:
Don't show Main navigator until tokens are fully loaded.

## Token Flow After Login

### Current Flow:
1. User submits login form
2. `loginUser` thunk dispatched
3. AuthService.login() called
4. Response: `{ user, accessToken, refreshToken }`
5. TokenStorage.storeTokens() saves to localStorage/SecureStore
6. Redux state updated with user, accessToken, refreshToken
7. AuthContext reads from Redux
8. RootNavigator sees user exists, shows Main navigator
9. BookingsListScreen mounts and tries to load data

### Expected Behavior:
- API requests should include Authorization header with accessToken
- If 401, should attempt refresh using refreshToken
- If refresh fails, should clear session and show login

### Debug Steps:
1. Check if Redux state has tokens after login
2. Check if API interceptor is reading tokens from Redux
3. Check if Authorization header is being set
4. Check if TokenStorage has tokens after login
5. Verify loadCachedUser is being called on app start

## Files to Review

### Authentication Flow:
- `src/context/AuthContext.tsx` - Auth context provider
- `src/store/slices/authSlice.ts` - Redux auth state
- `src/services/api/AuthService.ts` - Auth API calls
- `src/services/auth/TokenStorage.ts` - Token persistence
- `src/store/api.ts` - RTK Query API with token refresh
- `src/navigation/RootNavigator.tsx` - Auth flow navigation

### API Services:
- `src/services/api/BaseApiService.ts` - Base API service (check if exists)
- `src/services/api/UserService.ts` - User API calls
- `src/services/api/config.ts` - API configuration

### Screens:
- `src/screens/bookings/BookingsListScreen.tsx` - Bookings list
- `src/screens/profile/ProfileScreen.tsx` - Profile with logout
- `src/screens/auth/LoginScreen.tsx` - Login screen
- `src/screens/auth/RegistrationScreen.tsx` - Registration screen

## Testing Checklist

- [ ] Login stores both accessToken and refreshToken in Redux
- [ ] Login stores both tokens in TokenStorage (localStorage on web)
- [ ] After login, API requests include Authorization header
- [ ] After login, bookings page loads successfully
- [ ] Token refresh works when accessToken expires
- [ ] Logout clears Redux state
- [ ] Logout clears TokenStorage
- [ ] Logout navigates to login screen
- [ ] After logout, cannot access protected routes
- [ ] After app restart, tokens are loaded from storage
- [ ] Works on web (localStorage)
- [ ] Works on native (SecureStore)
- [ ] No double search bars on teams page
- [ ] Event creation works with eligibility restrictions
