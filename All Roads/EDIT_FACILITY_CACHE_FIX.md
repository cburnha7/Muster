# Edit Facility Cache Fix

## Problem
When editing a facility and updating it, the changes were saved to the database and appeared in the facilities list. However, when reopening the EditFacilityScreen, it showed stale cached data instead of the updated values.

### Console Evidence
```
📦 Cache hit for: GET /facilities/{id}
```

This showed that even after cache invalidation on update, the BaseApiService was still returning cached data when the screen refocused.

## Root Cause
The `useFocusEffect` hook in EditFacilityScreen was calling `loadFacilityData()` which used:
- `facilityService.getFacility(facilityId)` 
- `courtService.getCourts(facilityId)`

Both methods were using the cache without a way to bypass it, so they returned stale data even though the cache should have been invalidated.

## Solution
Added `skipCache` parameter support to both service methods:

### 1. Updated FacilityService.getFacility()
```typescript
async getFacility(id: string, skipCache: boolean = false): Promise<Facility> {
  return this.get<Facility>(API_ENDPOINTS.FACILITIES.BY_ID(id), {
    cacheOptions: { skipCache }
  });
}
```

### 2. Updated CourtService.getCourts()
```typescript
async getCourts(facilityId: string, skipCache: boolean = false): Promise<Court[]> {
  return this.get<Court[]>(`/facilities/${facilityId}/courts`, {
    cacheOptions: { skipCache }
  });
}
```

### 3. Updated EditFacilityScreen
Modified `loadFacilityData()` to accept a `skipCache` parameter and pass it to both service calls:

```typescript
const loadFacilityData = async (skipCache: boolean = false) => {
  // ...
  const facility = await facilityService.getFacility(facilityId, skipCache);
  const facilityCourts = await courtService.getCourts(facilityId, skipCache);
  // ...
}
```

Updated `useFocusEffect` to always skip cache when screen comes into focus:

```typescript
useFocusEffect(
  useCallback(() => {
    console.log('📍 EditFacilityScreen focused, reloading data with skipCache');
    loadFacilityData(true); // Skip cache when screen comes into focus
  }, [facilityId])
);
```

## How It Works
1. When EditFacilityScreen comes into focus (user navigates to it), `useFocusEffect` triggers
2. It calls `loadFacilityData(true)` with `skipCache = true`
3. Both `getFacility()` and `getCourts()` pass `{ cacheOptions: { skipCache: true } }` to BaseApiService
4. BaseApiService's `get()` method checks `cacheOptions?.skipCache` and bypasses the cache
5. Fresh data is fetched from the API
6. User sees the updated facility data immediately

## Benefits
- Clean, explicit API: `skipCache` parameter clearly indicates intent
- Backward compatible: Default `skipCache = false` maintains existing behavior
- Consistent with BaseApiService architecture: Uses existing `cacheOptions` interface
- No workarounds: No need for cache-busting parameters like `_t: Date.now()`

## Testing
To verify the fix:
1. Create a facility with courts
2. Edit the facility (change name, add/remove courts)
3. Click "Update Ground"
4. Reopen the facility for editing
5. Verify all changes are visible immediately (no stale data)

## Files Modified
- `src/services/api/FacilityService.ts` - Added `skipCache` parameter to `getFacility()`
- `src/services/api/CourtService.ts` - Added `skipCache` parameter to `getCourts()`
- `src/screens/facilities/EditFacilityScreen.tsx` - Updated to use `skipCache` on focus
