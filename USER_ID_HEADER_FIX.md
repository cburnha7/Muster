# User ID Header Fix - Implementation Summary

## Problem
The backend was not receiving the correct user ID from the frontend. The logs showed:
```
📋 Decoded user ID from token: undefined
📋 x-user-id header (lowercase): undefined
📋 X-User-Id header (capitalized): undefined
📋 No auth, using host user: host@muster.app
```

This was causing all API requests to fall back to a hardcoded "host" user instead of using the currently logged-in user.

## Root Cause
1. Frontend was using mock authentication with `authService` storing user data in localStorage
2. Redux store's auth slice was not being populated with mock user data
3. RTK Query was trying to read `auth.token` but the field is actually `auth.accessToken`
4. Mock tokens (e.g., `mock_token_123`) are not valid JWTs, so backend couldn't decode them
5. Backend had no mechanism to accept user ID via header in development mode

## Solution

### Frontend Changes

#### 1. Updated `src/store/api/eventsApi.ts`
- Fixed token field reference from `auth.token` to `auth.accessToken`
- Added X-User-Id header in development mode
- Header is populated from `authService.getCurrentUser().id`

```typescript
prepareHeaders: (headers, { getState }) => {
  const token = (getState() as RootState).auth.accessToken; // Fixed field name
  
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  
  // DEVELOPMENT: Send X-User-Id header for mock authentication
  if (process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true') {
    const { authService } = require('../../services/auth/AuthService');
    const currentUser = authService.getCurrentUser();
    if (currentUser?.id) {
      headers.set('X-User-Id', currentUser.id);
      console.log('🔑 Setting X-User-Id header:', currentUser.id);
    }
  }
  
  headers.set('content-type', 'application/json');
  return headers;
}
```

#### 2. Updated `src/store/api.ts`
- Applied the same fix to the main API configuration
- Ensures all RTK Query endpoints send the X-User-Id header

### Backend Changes

#### 1. Updated `server/src/middleware/auth.ts`
- Modified `optionalAuthMiddleware` to accept X-User-Id header in development
- Added check for mock tokens to avoid JWT verification errors
- Prioritizes X-User-Id header over token decoding in development mode

```typescript
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const xUserId = req.headers['x-user-id'] as string | undefined;
    
    console.log('🔐 Optional Auth - X-User-Id:', xUserId);
    
    // DEVELOPMENT: Accept X-User-Id header for mock authentication
    if (xUserId && process.env.NODE_ENV === 'development') {
      req.user = { userId: xUserId };
      console.log('🔐 Optional Auth - Using X-User-Id header:', xUserId);
      return next();
    }
    
    // Check if it's a mock token and skip JWT verification
    if (token.startsWith('mock_token_') && process.env.NODE_ENV === 'development') {
      console.log('🔐 Optional Auth - Mock token detected, but no X-User-Id header');
      return next();
    }
    
    // Normal JWT verification for production tokens
    // ...
  }
}
```

#### 2. Updated `server/src/routes/users.ts`
- Removed hardcoded fallback to "host" user
- Now returns 401 error if no user ID is provided
- Cleaner error handling and logging

```typescript
router.get('/bookings', optionalAuthMiddleware, async (req, res) => {
  try {
    let userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Fetch bookings for authenticated user
    // ...
  }
});
```

## Testing

After these changes, you should see in the logs:
```
🔑 Setting X-User-Id header: <actual-user-id>
🔐 Optional Auth - X-User-Id: <actual-user-id>
🔐 Optional Auth - Using X-User-Id header: <actual-user-id>
📋 Fetching bookings for user: player@muster.app Player One
```

## Expected Behavior

1. When you log in as "Player", all API requests will use Player's user ID
2. When you log in as "Host", all API requests will use Host's user ID
3. Events you create will be owned by the logged-in user
4. Bookings will be scoped to the logged-in user
5. Profile data will show the logged-in user's information

## Files Modified

### Frontend
- `src/store/api/eventsApi.ts` - Added X-User-Id header, fixed token field
- `src/store/api.ts` - Added X-User-Id header, fixed token field

### Backend
- `server/src/middleware/auth.ts` - Accept X-User-Id header in development
- `server/src/routes/users.ts` - Removed hardcoded fallback user

## Notes

- This solution is for DEVELOPMENT ONLY
- The X-User-Id header is only sent when `EXPO_PUBLIC_USE_MOCK_AUTH=true`
- In production, proper JWT authentication will be used
- The backend only accepts X-User-Id when `NODE_ENV=development`
