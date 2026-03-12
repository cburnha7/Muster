# Profile Tab - Owned Grounds and Events Implementation

## Overview
Updated the ProfileScreen to display the user's owned grounds and organized events, providing quick access to manage their content directly from the profile tab.

## Changes Made

### 1. ProfileScreen Updates (`src/screens/profile/ProfileScreen.tsx`)

#### New Imports
- Added `facilityService` and `eventService` for API calls
- Added `Facility`, `Event`, and `FacilityWithVerification` types
- Added theme imports (`colors`, `Spacing`, `TextStyles`)
- Added `Ionicons` for icons

#### New State Variables
```typescript
const [myGrounds, setMyGrounds] = useState<Facility[]>([]);
const [myEvents, setMyEvents] = useState<Event[]>([]);
const [loadingGrounds, setLoadingGrounds] = useState(false);
const [loadingEvents, setLoadingEvents] = useState(false);
```

#### New API Methods
- `loadMyGrounds(userId)` - Fetches facilities owned by the user using `facilityService.getFacilitiesByOwner()`
- `loadMyEvents(userId)` - Fetches events organized by the user using `eventService.getEventsByOrganizer()`

Both methods are called automatically when the profile loads.

#### New UI Sections

**My Grounds Section:**
- Displays up to 10 owned facilities in compact card format
- Shows facility name, location (city, state), verification status, and rating
- Each card is tappable and navigates to `ManageGround` screen
- "See All" link navigates to Facilities tab
- Only visible when user owns at least one ground

**My Events Section:**
- Displays up to 10 organized events in compact card format
- Shows event title, date/time, status (Upcoming/In Progress/Completed/Cancelled), and participant count
- Each card is tappable and navigates to `EventDetails` screen
- "See All" link navigates to Events tab
- Only visible when user has organized at least one event

**Empty State:**
- Shown when user has no grounds and no events
- Displays encouraging message with two action buttons:
  - "Create Ground" - navigates to CreateFacility screen
  - "Create Event" - navigates to CreateEvent screen

#### Helper Functions

**Event Status:**
```typescript
getEventStatusColor(event) - Returns color based on event status
getEventStatusText(event) - Returns status text (Upcoming/In Progress/Completed/Cancelled)
```

**Facility Verification:**
```typescript
getVerificationStatusColor(facility) - Returns color based on verification status
getVerificationStatusText(facility) - Returns status text (Verified/Pending Verification)
```

#### Styling
- Updated all styles to use Muster theme system
- Replaced hardcoded colors with theme colors (`colors.grass`, `colors.textPrimary`, etc.)
- Replaced hardcoded spacing with theme spacing (`Spacing.lg`, `Spacing.md`, etc.)
- Replaced hardcoded text styles with theme text styles (`TextStyles.h2`, `TextStyles.body`, etc.)
- Added new styles for compact cards, empty state, and section headers

## UI Layout

```
Profile Screen
├── Header (Profile Image, Name, Email, Edit Button)
├── Stats (Bookings, Events, Teams)
├── My Grounds Section (if user owns grounds)
│   ├── Section Header (Title + "See All" link)
│   └── Compact Ground Cards
│       ├── Icon + Name
│       ├── Location
│       └── Verification Status + Rating
├── My Events Section (if user has events)
│   ├── Section Header (Title + "See All" link)
│   └── Compact Event Cards
│       ├── Icon + Title
│       ├── Date/Time
│       └── Status + Participants
├── Empty State (if no grounds and no events)
│   ├── Icon + Message
│   └── Action Buttons (Create Ground, Create Event)
├── Menu Options (Statistics, Settings, Notifications, Booking History)
└── Preferred Sports
```

## API Integration

### Existing API Methods Used
- `facilityService.getFacilitiesByOwner(ownerId, pagination)` - Fetches user's owned facilities
- `eventService.getEventsByOrganizer(organizerId, filters, pagination)` - Fetches user's organized events

### Pagination
- Both sections fetch first 10 items (page 1, limit 10)
- "See All" links navigate to respective tabs for full lists

### Performance
- Grounds and events load in parallel with profile data
- Loading states prevent UI blocking
- Errors are logged to console but don't block profile display

## User Experience

### Navigation Flow
1. **Ground Card Tap** → ManageGround screen (facility management)
2. **Event Card Tap** → EventDetails screen (event details)
3. **"See All" (Grounds)** → Facilities tab
4. **"See All" (Events)** → Events tab
5. **"Create Ground"** → CreateFacility screen
6. **"Create Event"** → CreateEvent screen

### Visual Indicators
- **Verification Status**: Green badge for verified, gray for pending
- **Event Status**: 
  - Green = Upcoming
  - Orange = In Progress
  - Gray = Completed
  - Red = Cancelled
- **Rating**: Star icon with numeric rating
- **Participants**: Shows current/max participant count

### Responsive Behavior
- Sections only appear when user has content
- Loading spinners during data fetch
- Empty state encourages content creation
- Compact card design for efficient space usage

## Theme Compliance

All UI elements use the Muster theme system:
- **Primary Color**: `colors.grass` (#3D8C5E) - buttons, active states
- **Accent Color**: `colors.court` (#E8A030) - ratings, highlights
- **Text Colors**: `colors.textPrimary`, `colors.textSecondary`, `colors.textTertiary`
- **Background**: `colors.background`, `colors.surface`
- **Borders**: `colors.border`
- **Spacing**: Consistent use of `Spacing` constants
- **Typography**: Consistent use of `TextStyles` presets

## Testing Recommendations

### Manual Testing
1. Test with user who owns no grounds/events (empty state)
2. Test with user who owns only grounds
3. Test with user who owns only events
4. Test with user who owns both
5. Test navigation to ManageGround screen
6. Test navigation to EventDetails screen
7. Test "See All" links
8. Test "Create Ground" and "Create Event" buttons
9. Verify verification status colors
10. Verify event status colors and text

### Edge Cases
- User with 0 grounds and 0 events
- User with 1 ground and 0 events
- User with 0 grounds and 1 event
- User with many grounds (10+)
- User with many events (10+)
- Facilities with no rating
- Events with 0 participants
- Cancelled events
- Completed events

## Future Enhancements

1. **Pull to Refresh**: Add refresh control to reload owned content
2. **Pagination**: Add "Load More" for users with 10+ items
3. **Filters**: Add status filters for events (upcoming/completed/cancelled)
4. **Search**: Add search within owned grounds/events
5. **Quick Actions**: Add swipe actions for quick management
6. **Analytics**: Show quick stats (total revenue, bookings, etc.)
7. **Notifications**: Show unread notifications badge
8. **Recent Activity**: Show recent bookings/rentals for owned grounds

## Summary

The ProfileScreen now provides a comprehensive overview of the user's owned content, making it easy to:
- View all owned grounds at a glance
- View all organized events at a glance
- Quickly navigate to management screens
- Encourage content creation for new users
- Maintain consistent branding with Muster theme

All changes follow the existing codebase patterns and use the established theme system for consistency.
