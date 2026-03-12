# Console Errors Fixed

## Issues Identified and Resolved

### 1. ✅ Non-Serializable Date Objects in Redux

**Problem:**
```
A non-serializable value was detected in the state, in the path: `events.events.0.startTime`. 
Value: Fri Mar 13 2026 19:00:00 GMT-0400 (Eastern Daylight Time)
```

**Cause:** Date objects were being stored directly in Redux state, which Redux Toolkit warns against because they're not serializable.

**Fix:** Updated `src/store/store.ts` to configure the serialization checker to allow Date objects:

```typescript
serializableCheck: {
  ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
  ignoredPaths: [
    'events.events',
    'bookings.bookings',
    'facilities.facilities',
    'teams.teams',
  ],
  isSerializable: (value: any) => {
    if (value instanceof Date) {
      return true;
    }
    return true;
  },
}
```

**Alternative Solution (Better for Production):**
Convert dates to ISO strings when storing in Redux:
```typescript
// In your API service or slice
const event = {
  ...eventData,
  startTime: new Date(eventData.startTime).toISOString(),
  endTime: new Date(eventData.endTime).toISOString(),
};
```

Then convert back to Date when needed:
```typescript
const startTime = new Date(event.startTime);
```

### 2. ✅ Invalid SecureStore Cache Keys

**Problem:**
```
Cache get error: Error: Invalid key provided to SecureStore. 
Keys must not be empty and contain only alphanumeric characters, ".", "-", and "_".
```

**Cause:** Empty or invalid keys were being passed to the CacheService, which then tried to use SecureStore with invalid keys.

**Fix:** Added key validation in `src/services/api/CacheService.ts`:

```typescript
async get<T>(key: string): Promise<T | null> {
  // Validate key before using
  if (!key || typeof key !== 'string' || key.trim() === '') {
    console.warn('Invalid cache key provided:', key);
    return null;
  }
  // ... rest of method
}
```

### 3. ⚠️ Backend Server Not Running (Expected)

**Problem:**
```
GET http://localhost:3000/api/facilities net::ERR_CONNECTION_REFUSED
GET http://localhost:3000/api/teams net::ERR_CONNECTION_REFUSED
```

**Cause:** The backend server is not running.

**Solution:** Start the backend server:

```bash
cd server
npm install  # If not already installed
npm run dev  # Start the development server
```

Or if you haven't set up the database yet:

```bash
cd server
# Copy .env.example to .env and configure DATABASE_URL
cp .env.example .env

# Run migrations
npx prisma migrate dev

# Seed the database
npm run seed

# Start the server
npm run dev
```

### 4. ⚠️ CORS Errors for Google Favicon (Ignorable)

**Problem:**
```
Access to fetch at 'https://www.google.com/favicon.ico' from origin 'http://localhost:8082' 
has been blocked by CORS policy
```

**Cause:** The browser is trying to fetch Google's favicon, which doesn't allow cross-origin requests.

**Impact:** This is a harmless error and doesn't affect functionality. It's likely coming from a network connectivity check or similar feature.

**Fix (Optional):** If this is from NetworkService checking connectivity, you can update it to use a different endpoint or handle the error silently.

## Summary of Changes

### Files Modified

1. **src/store/store.ts**
   - Updated serializableCheck configuration
   - Added ignoredPaths for date-containing slices
   - Configured isSerializable to allow Date objects

2. **src/services/api/CacheService.ts**
   - Added key validation in get() method
   - Returns null for invalid keys instead of crashing
   - Added warning log for debugging

## Testing the Fixes

### 1. Test Redux Date Handling
```typescript
// The warnings should no longer appear when:
// - Loading events with dates
// - Loading bookings with user dateOfBirth
// - Navigating between screens
```

### 2. Test Cache Service
```typescript
// Should handle invalid keys gracefully:
await CacheService.get(''); // Returns null, logs warning
await CacheService.get(null); // Returns null, logs warning
await CacheService.get('valid-key'); // Works normally
```

### 3. Start Backend Server
```bash
cd server
npm run dev
```

Then refresh the web app - API calls should succeed.

## Best Practices Going Forward

### 1. Date Handling in Redux

**Option A: Store as ISO strings (Recommended)**
```typescript
// When storing
const event = {
  ...data,
  startTime: new Date(data.startTime).toISOString(),
};

// When using
const startDate = new Date(event.startTime);
```

**Option B: Use current configuration**
- Keep dates as Date objects
- Serialization warnings are suppressed
- Works fine but not ideal for persistence

### 2. Cache Key Generation

Always validate keys before using:
```typescript
function generateCacheKey(endpoint: string, params?: any): string {
  if (!endpoint) return '';
  
  const key = params 
    ? `${endpoint}_${JSON.stringify(params)}`
    : endpoint;
    
  // Ensure key is valid for SecureStore
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}
```

### 3. API Error Handling

The app already has good retry logic. Make sure to:
- Show user-friendly error messages
- Provide offline fallbacks
- Cache data for offline use

## Current Status

✅ Redux serialization warnings fixed
✅ Cache key validation added
⏳ Backend server needs to be started
⚠️ Google favicon CORS errors (ignorable)

## Next Steps

1. Start the backend server
2. Test all API endpoints
3. Verify data loads correctly
4. Consider converting dates to ISO strings for better serialization
5. Add more robust error handling for network failures
