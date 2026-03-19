# Login System Implementation Plan

## Overview
Implement a complete authentication system with login screen, session management, and test users.

## Test Users Created ✅
- **player** / 1234 (Player)
- **host** / 1234 (Host)
- **owner** / 1234 (Owner)
- **playerplus** / 1234 (Player+)

All users have:
- membershipTier: "standard"
- role: "member"
- Full access to all features

## Components to Create

### 1. Auth Context (`src/context/AuthContext.tsx`)
- Manages authentication state
- Stores user and token
- Provides login/logout functions
- Persists session with AsyncStorage
- Auto-loads session on app start

### 2. Login Screen (`src/screens/auth/LoginScreen.tsx`)
- Username/email input field
- Password input field
- Login button
- Form validation
- Error display
- Loading state

### 3. Auth Service (`src/services/api/AuthService.ts`)
- login(username, password)
- logout()
- getCurrentUser()

### 4. Navigation Updates
- Add Auth Stack
- Conditional rendering based on auth state
- Redirect to login if not authenticated

### 5. Protected Routes
- Wrap main app in auth check
- Redirect to login if no session

## Implementation Steps

1. ✅ Update User schema with username, displayName, tierTag, membershipTier, role
2. ✅ Create migration
3. ✅ Seed test users
4. ✅ Update auth routes to support username login
5. ⏳ Create AuthContext
6. ⏳ Create AuthService
7. ⏳ Create LoginScreen
8. ⏳ Update navigation
9. ⏳ Update CourtAvailabilityScreen to use auth context
10. ⏳ Add logout functionality to ProfileScreen

## Session Management
- Store token in AsyncStorage
- Store user data in AsyncStorage
- Check for existing session on app launch
- Clear session on logout

## Security Notes
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with 7-day expiration
- Tokens stored securely in AsyncStorage
- No auto-login - always check for valid session

## Files to Create/Modify

### New Files
- `src/context/AuthContext.tsx`
- `src/services/api/AuthService.ts`
- `src/screens/auth/LoginScreen.tsx`
- `server/src/scripts/seed-test-users.ts` ✅

### Modified Files
- `server/prisma/schema.prisma` ✅
- `server/src/routes/auth.ts` ✅
- `src/navigation/AppNavigator.tsx`
- `src/screens/facilities/CourtAvailabilityScreen.tsx`
- `src/screens/profile/ProfileScreen.tsx`

## Testing Checklist
- [ ] Login with username works
- [ ] Login with email works
- [ ] Invalid credentials show error
- [ ] Session persists after app restart
- [ ] Logout clears session
- [ ] Protected routes redirect to login
- [ ] All 4 test users can login
- [ ] User data displays correctly in profile
