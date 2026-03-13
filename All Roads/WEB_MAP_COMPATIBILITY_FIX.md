# Web Map Compatibility Fix

## Problem
The app was crashing on web with the error:
```
Uncaught TypeError: (0 , r(...).codegenNativeComponent) is not a function
```

This occurred because `react-native-maps` attempts to load native components that don't exist in the web environment.

## Solution
Added Platform.OS checks to conditionally render map components only on native platforms (iOS/Android) and show fallback UI on web.

## Changes Made

### 1. EventsMapView Component
**File**: `src/components/maps/EventsMapView.tsx`

- Added early return with fallback UI when `Platform.OS === 'web'`
- Shows message: "Map View Not Available - Map view is only available on iOS and Android. Please use the list view."
- Added styles for web fallback: `webFallback`, `webFallbackTitle`, `webFallbackText`

### 2. GroundsMapView Component
**File**: `src/components/maps/GroundsMapView.tsx`

- Added early return with fallback UI when `Platform.OS === 'web'`
- Shows same message as EventsMapView for consistency
- Added styles for web fallback: `webFallback`, `webFallbackTitle`, `webFallbackText`

### 3. ViewToggle Component
**File**: `src/components/maps/ViewToggle.tsx`

- Returns `null` when `Platform.OS === 'web'` to hide the map/list toggle
- This prevents users from attempting to switch to map view on web

## Behavior

### On iOS/Android (Native)
- Map view works as expected
- Users can toggle between list and map views
- Location services and markers function normally

### On Web
- Map toggle button is hidden (ViewToggle returns null)
- If somehow map view is triggered, shows friendly fallback message
- Users are directed to use list view instead
- No native component errors occur

## Testing
Test on web browser to verify:
1. No `codegenNativeComponent` errors in console
2. Map toggle button is not visible in Events and Facilities screens
3. If map view is somehow accessed, fallback message displays correctly
4. List view continues to work normally

## Future Enhancement (Optional)
Consider implementing Leaflet-based web map view as mentioned in `MAP_VIEW_IMPLEMENTATION.md` for full cross-platform map support.
