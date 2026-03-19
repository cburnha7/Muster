# Participants Tracker Implementation

## Overview
Added a prominent participants tracker badge to the EventCard component showing "X/Y players" format. The tracker is visible on all event cards across the app and updates based on event data.

## Changes Made

### EventCard Component
**File**: `src/components/ui/EventCard.tsx`

#### Visual Changes
- Added a new participants tracker badge positioned below the header
- Badge shows format: "X/Y players" (e.g., "4/10 players")
- Icon: People icon that changes color based on availability
- Styling:
  - Green background/border when spots available
  - Red background/border when event is full
  - Rounded corners with padding for clean look

#### Removed Duplicate
- Removed the participants count from the details section (was redundant)
- Kept the more prominent badge at the top for better visibility

#### Styling Details
```typescript
participantsTracker: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.grass + '15',  // Green when available
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
  alignSelf: 'flex-start',
  marginBottom: 8,
  borderWidth: 1,
  borderColor: colors.grass + '30',
}
```

When full, the badge dynamically changes to:
- Background: `colors.track + '15'` (red tint)
- Border: `colors.track + '30'` (red border)
- Text color: `colors.track` (red)
- Icon color: `colors.track` (red)

## Screens Affected

The participants tracker now appears on all screens that display EventCard:

1. **EventsListScreen** (`src/screens/events/EventsListScreen.tsx`)
   - Main events list/browse screen
   - Shows all available events with participant counts

2. **HomeScreen** (`src/screens/home/HomeScreen.tsx`)
   - Nearby events section
   - Shows participant counts for events near user

3. **FacilityDetailsScreen** (`src/screens/facilities/FacilityDetailsScreen.tsx`)
   - Upcoming events at a specific facility
   - Shows participant counts for facility events

4. **DiscoveryScreen** (`src/screens/search/DiscoveryScreen.tsx`)
   - Nearby events section
   - Recommended events section
   - Trending events section

5. **SearchResultsScreen** (`src/screens/search/SearchResultsScreen.tsx`)
   - Event search results
   - Shows participant counts in search results

## Data Flow

The participants data flows from the backend through the Event type:

```typescript
export interface Event {
  // ... other fields
  maxParticipants: number;
  currentParticipants: number;
  participants: Participant[];
  // ... other fields
}
```

The EventCard component:
1. Receives the event prop with participant data
2. Calculates `availableSpots = maxParticipants - currentParticipants`
3. Determines `isFullyBooked = availableSpots <= 0`
4. Renders the badge with appropriate styling based on availability

## Visual Behavior

### When Spots Available
- Green background with green border
- Green people icon
- Green text showing "X/Y players"
- Example: "4/10 players" in green

### When Event is Full
- Red background with red border
- Red people icon
- Red text showing "X/Y players"
- Example: "10/10 players" in red
- Footer also shows "Full" badge

## Brand Compliance

- Uses "players" terminology per brand guidelines
- Uses theme colors from `src/theme/colors.ts`:
  - `colors.grass` for available spots
  - `colors.track` for full events
- No hardcoded colors
- Consistent with Muster brand identity

## Testing

To verify the implementation:
1. Navigate to any screen showing event cards
2. Check that participant count badge appears below event title
3. Verify green styling for events with available spots
4. Verify red styling for full events
5. Confirm count updates when participants join/leave events

## Future Enhancements

Potential improvements:
- Add animation when participant count changes
- Show "Almost Full" state when < 3 spots remaining
- Add tooltip showing participant names on hover (web)
- Real-time updates via WebSocket when participants join
