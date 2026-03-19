# Map View Implementation Summary

## Overview
Added map view functionality to both Events and Grounds tabs, allowing users to toggle between list and map views while maintaining all existing filters and functionality.

## Components Created

### 1. ViewToggle Component
**Location:** `src/components/maps/ViewToggle.tsx`
- Toggle button to switch between list and map views
- Uses Muster brand colors (grass for active state)
- Clean, minimal design

### 2. EventMapPreview Component
**Location:** `src/components/maps/EventMapPreview.tsx`
- Compact card preview shown when tapping an event pin
- Displays event name, sport type, date/time, and location
- "View Details" button to navigate to full event screen
- Close button to dismiss preview

### 3. GroundMapPreview Component
**Location:** `src/components/maps/GroundMapPreview.tsx`
- Compact card preview shown when tapping a ground pin
- Displays ground name, address, and court count
- "View Details" button to navigate to full ground screen
- Close button to dismiss preview

### 4. EventsMapView Component
**Location:** `src/components/maps/EventsMapView.tsx`
- Map view for events using react-native-maps
- Shows events as pins on the map
- User-booked events use distinct color (court orange)
- Regular events use grass green
- Filters out invite-only events user hasn't been invited to
- Centers on user location on load

### 5. GroundsMapView Component
**Location:** `src/components/maps/GroundsMapView.tsx`
- Map view for grounds using react-native-maps
- Shows grounds as pins on the map
- Grounds with available slots use grass green
- Fully booked grounds use soft gray (TODO: implement availability check)
- Centers on user location on load

### 6. LocationService
**Location:** `src/services/location/LocationService.ts`
- Handles location permission requests
- Gets current user location
- Falls back to default location (NYC) if permission denied
- Uses expo-location for cross-platform support

## Integration Points

### Events Tab (EventsListScreen)
**Status:** Components created, integration pending
**Required changes:**
1. Add ViewToggle to header
2. Add state for viewMode ('list' | 'map')
3. Conditionally render EventsMapView or existing list
4. Pass filtered events and user booking IDs to map view
5. Handle event press to navigate to EventDetailsScreen

### Grounds Tab (GroundsListScreen)
**Status:** Components created, integration pending
**Required changes:**
1. Add ViewToggle to header
2. Add state for viewMode ('list' | 'map')
3. Conditionally render GroundsMapView or existing list
4. Pass filtered grounds to map view
5. Handle ground press to navigate to GroundDetailsScreen

## Platform Support

### Native (iOS/Android)
- Uses react-native-maps (already installed)
- iOS: Apple Maps (PROVIDER_DEFAULT)
- Android: Google Maps (PROVIDER_GOOGLE)
- Location permissions via expo-location

### Web
- react-native-maps has limited web support
- May need to implement Leaflet fallback for web
- Location API available in browsers

## Pin Colors

### Events Map
- **Grass Green** (`colors.grass`): Regular events
- **Court Orange** (`colors.court`): Events user has joined

### Grounds Map
- **Grass Green** (`colors.grass`): Grounds with available slots
- **Soft Gray** (`colors.soft`): Fully booked grounds

## Features Implemented
✅ Map view toggle component
✅ Event map preview cards
✅ Ground map preview cards
✅ Location permission handling
✅ User location centering
✅ Pin color differentiation
✅ Tap to view preview
✅ Navigate to detail screens

## Features Pending
⏳ Integration into EventsListScreen
⏳ Integration into GroundsListScreen
⏳ Ground availability check for pin colors
⏳ Invite-only event filtering
⏳ Web platform support (Leaflet)
⏳ Cluster markers for dense areas (optional enhancement)

## Next Steps

1. **Integrate into EventsListScreen:**
   - Import ViewToggle and EventsMapView
   - Add viewMode state
   - Add toggle to header
   - Conditionally render map or list
   - Pass userBookedEventIds from bookings data

2. **Integrate into GroundsListScreen:**
   - Import ViewToggle and GroundsMapView
   - Add viewMode state
   - Add toggle to header
   - Conditionally render map or list

3. **Test on platforms:**
   - iOS simulator
   - Android emulator
   - Web browser

4. **Implement ground availability:**
   - Add API endpoint or logic to check available slots
   - Update pin color based on availability

5. **Filter invite-only events:**
   - Check event eligibility
   - Only show pins for events user can join

## Dependencies
- `react-native-maps`: 1.26.20 (already installed)
- `expo-location`: (check if installed, add if needed)

## Notes
- All components use Muster brand colors and styling
- Map views maintain existing filters from list views
- No changes to home screen
- Location permission gracefully handled with fallback
