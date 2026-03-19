# Skip Onboarding & Auth for Development

## Overview
Modified the app to bypass onboarding and authentication screens for faster development iteration. The app now automatically logs in with mock user data and goes straight to the main app.

## Changes Made

### 1. Skip Onboarding (`src/navigation/RootNavigator.tsx`)
Modified `checkOnboardingStatus()` to automatically mark onboarding as complete:

```typescript
const checkOnboardingStatus = async () => {
  try {
    // DEVELOPMENT MODE: Skip onboarding and go straight to auth/main
    // Comment out the next line to re-enable onboarding
    setIsOnboardingCompleted(true);
    setIsLoading(false);
    return;
    
    // Production code (currently disabled)
    // ...
  }
};
```

### 2. Auto-Login with Mock User (`src/services/auth/AuthService.ts`)
Modified `initialize()` to automatically log in with mock user data:

```typescript
async initialize(): Promise<boolean> {
  try {
    // DEVELOPMENT MODE: Auto-login with mock user
    // Comment out this block to re-enable real authentication
    const mockData = require('../mock/mockData');
    this.currentUser = mockData.mockUser;
    this.token = 'mock_token_' + Date.now();
    this.refreshToken = 'mock_refresh_token_' + Date.now();
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return true;
    // END DEVELOPMENT MODE
    
    // Production code (currently disabled)
    // ...
  }
}
```

## Mock User Data

The app now automatically logs in as Edwin:
- **Name**: Edwin
- **Email**: edwin@muster.app
- **Stats**: 24 events attended, 8 hosted, 3 teams joined, 32 bookings
- **Token**: Auto-generated mock token (valid for 24 hours)

## What You'll See Now

When you refresh the browser at http://localhost:8081, you should now see:

1. ✅ No onboarding screens
2. ✅ No login screen
3. ✅ Directly to the main app (Home screen)
4. ✅ Welcome message: "Welcome back, Edwin!"
5. ✅ 2 notifications
6. ✅ Quick action buttons
7. ✅ 2 upcoming bookings
8. ✅ 5 nearby events with images

## Navigation

You can now navigate between tabs:
- **Home**: See events, bookings, notifications
- **Events**: Browse all events
- **Facilities**: View facilities
- **Teams**: See teams
- **Profile**: View Edwin's profile

## Re-enabling Onboarding & Auth

To restore normal authentication flow:

### 1. Re-enable Onboarding
In `src/navigation/RootNavigator.tsx`, comment out the development code:

```typescript
const checkOnboardingStatus = async () => {
  try {
    // Comment out these lines:
    // setIsOnboardingCompleted(true);
    // setIsLoading(false);
    // return;
    
    // Uncomment production code:
    const completed = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
    setIsOnboardingCompleted(completed === 'true');
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    setIsOnboardingCompleted(false);
  } finally {
    setIsLoading(false);
  }
};
```

### 2. Re-enable Authentication
In `src/services/auth/AuthService.ts`, comment out the development code:

```typescript
async initialize(): Promise<boolean> {
  try {
    // Comment out development mode block
    
    // Uncomment production code:
    const [token, refreshToken, userData, expiresAt] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
      SecureStore.getItemAsync(EXPIRES_AT_KEY),
    ]);

    if (token && refreshToken && userData && expiresAt) {
      this.token = token;
      this.refreshToken = refreshToken;
      this.currentUser = JSON.parse(userData);
      this.expiresAt = new Date(expiresAt);

      if (this.shouldRefreshToken()) {
        await this.refreshAccessToken();
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to initialize auth service:', error);
    await this.clearStoredAuth();
    return false;
  }
}
```

## Testing

### Current State (Development Mode)
- ✅ Onboarding: Skipped
- ✅ Authentication: Auto-logged in as Edwin
- ✅ Main App: Accessible immediately
- ✅ Mock Data: 5 events, 2 bookings, 2 notifications

### To Test
1. Open http://localhost:8081 in your browser
2. Do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. You should see the Home screen with Edwin's data
4. Navigate between tabs to explore the app
5. Click on events to see details
6. Test quick actions

## Benefits

### For Development
- ✅ Faster iteration - no need to go through onboarding/login each time
- ✅ Immediate access to main app features
- ✅ Test with consistent mock data
- ✅ Easy to switch back to production mode

### For Testing
- ✅ Test main app features without authentication overhead
- ✅ Consistent test user (Edwin)
- ✅ Pre-populated data for testing
- ✅ Quick access to all screens

## Files Modified
- `src/navigation/RootNavigator.tsx` - Skip onboarding check, removed lazy loading
- `src/navigation/TabNavigator.tsx` - Removed lazy loading
- `src/services/auth/AuthService.ts` - Auto-login with mock user
- `src/navigation/stacks/HomeStackNavigator.tsx` - Removed lazy loading
- `src/navigation/stacks/EventsStackNavigator.tsx` - Removed lazy loading
- `src/navigation/stacks/FacilitiesStackNavigator.tsx` - Removed lazy loading
- `src/navigation/stacks/TeamsStackNavigator.tsx` - Removed lazy loading
- `src/navigation/stacks/BookingsStackNavigator.tsx` - Removed lazy loading
- `src/navigation/stacks/ProfileStackNavigator.tsx` - Removed lazy loading

## Web Compatibility Fix

All lazy loading has been removed from the navigation system to fix "Requiring unknown module" errors on web. The app now uses direct imports for all screens, which resolves module resolution issues with webpack.

## Next Steps

1. ✅ Refresh browser to see changes
2. Test navigation between screens
3. Verify mock data displays correctly
4. Test event interactions
5. Explore all tabs and features

## Notes

- This is for development only - do not deploy with these changes
- Mock tokens expire after 24 hours (will auto-refresh on next load)
- All data is from `src/services/mock/mockData.ts`
- To test real authentication, re-enable production code

Date: March 9, 2026
