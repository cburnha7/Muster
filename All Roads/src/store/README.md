# Redux Store Architecture

This document describes the Redux store architecture for the Muster app, including RTK Query integration for data fetching and caching.

## Overview

The store uses Redux Toolkit with RTK Query for efficient data fetching, caching, and automatic synchronization across components.

## Store Structure

```
src/store/
├── api/
│   └── eventsApi.ts          # RTK Query API for events and bookings
├── selectors/
│   ├── eventSelectors.ts     # Memoized selectors for event filtering
│   └── index.ts
├── slices/
│   ├── authSlice.ts          # Authentication state
│   ├── eventsSlice.ts        # Legacy events state (being phased out)
│   ├── bookingsSlice.ts      # Legacy bookings state (being phased out)
│   └── ...
├── store.ts                  # Store configuration
└── index.ts                  # Barrel exports
```

## RTK Query Integration

### Events API (`src/store/api/eventsApi.ts`)

The Events API provides endpoints for fetching events and bookings with automatic caching and invalidation.

#### Default Filters

```typescript
export const DEFAULT_EVENT_FILTERS: EventFilters = {
  status: EventStatus.ACTIVE,
};
```

These filters are used by both the Home Screen and Events Tab to ensure consistent data.

#### Available Hooks

**Queries:**
- `useGetEventsQuery({ filters, pagination })` - Fetch events with filters
- `useGetUserBookingsQuery({ status, pagination })` - Fetch user bookings

**Mutations:**
- `useBookEventMutation()` - Book an event (auto-invalidates cache)
- `useCancelBookingMutation()` - Cancel a booking (auto-invalidates cache)

#### Cache Behavior

- **Automatic Caching**: Identical queries share the same cache entry
- **Tag-Based Invalidation**: Mutations automatically invalidate related queries
- **Retry Logic**: Failed requests retry up to 3 times with exponential backoff
- **Stale-While-Revalidate**: Returns cached data while fetching fresh data in background

#### Example Usage

```typescript
import { useGetEventsQuery, DEFAULT_EVENT_FILTERS } from '../../store/api/eventsApi';
import { selectHomeScreenEvents } from '../../store/selectors/eventSelectors';

function HomeScreen() {
  // Fetch events with default filters
  const { 
    data, 
    isLoading, 
    error,
    refetch 
  } = useGetEventsQuery({
    filters: DEFAULT_EVENT_FILTERS,
    pagination: { page: 1, limit: 20 },
  });

  // Use selector to get filtered events (max 10 for home screen)
  const nearbyEvents = useSelector(selectHomeScreenEvents);

  // Refresh data
  const handleRefresh = async () => {
    await refetch();
  };

  return (
    // ... component JSX
  );
}
```

## Memoized Selectors

### Event Selectors (`src/store/selectors/eventSelectors.ts`)

Selectors provide derived state with memoization for optimal performance.

#### Available Selectors

- `selectBookedEventIds` - Set of event IDs the user has booked
- `selectAvailableEvents` - All events excluding joined events
- `selectHomeScreenEvents` - First 10 available events for Home Screen
- `selectEventsTabEvents` - All available events for Events Tab

#### Example Usage

```typescript
import { useSelector } from 'react-redux';
import { selectHomeScreenEvents } from '../../store/selectors/eventSelectors';

function HomeScreen() {
  const nearbyEvents = useSelector(selectHomeScreenEvents);
  
  return (
    <FlatList
      data={nearbyEvents}
      renderItem={({ item }) => <EventCard event={item} />}
    />
  );
}
```

## Cache Invalidation

RTK Query uses tag-based invalidation to automatically refetch data when it changes.

### Tag Types

- `Events` - Individual events and event lists
- `Bookings` - Individual bookings and booking lists

### Invalidation Flow

1. User books an event via `useBookEventMutation()`
2. Mutation invalidates tags: `['Events', 'Bookings']`
3. All queries with those tags automatically refetch
4. Home Screen and Events Tab update without manual refresh

## Migration from Legacy Services

### Deprecated Methods

The following EventService methods are deprecated in favor of RTK Query hooks:

- `eventService.getEvents()` → `useGetEventsQuery()`
- `eventService.bookEvent()` → `useBookEventMutation()`
- `eventService.cancelBooking()` → `useCancelBookingMutation()`

### Migration Guide

**Before (Legacy):**
```typescript
import { eventService } from '../../services/api/EventService';

const [events, setEvents] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await eventService.getEvents();
      setEvents(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchEvents();
}, []);
```

**After (RTK Query):**
```typescript
import { useGetEventsQuery, DEFAULT_EVENT_FILTERS } from '../../store/api/eventsApi';
import { selectHomeScreenEvents } from '../../store/selectors/eventSelectors';

const { data, isLoading, error } = useGetEventsQuery({
  filters: DEFAULT_EVENT_FILTERS,
  pagination: { page: 1, limit: 20 },
});

const events = useSelector(selectHomeScreenEvents);
```

## Error Handling

### Error Display

Always use brand colors for error states:

```typescript
import { colors } from '../../theme';

{error && (
  <View style={styles.errorState}>
    <Ionicons name="alert-circle-outline" size={48} color={colors.track} />
    <Text style={styles.errorText}>
      Unable to load events. Pull down to refresh.
    </Text>
  </View>
)}
```

### Error Codes

RTK Query transforms API errors to brand error codes:
- `ERR_UNAUTHORIZED` - Authentication required
- `ERR_API` - General API error

## Performance Optimization

### Cache Hit Rate

Target: >80% for default queries

### Request Deduplication

RTK Query automatically deduplicates simultaneous identical requests.

### Memoization

Selectors use `createSelector` from Reselect for efficient memoization.

## Best Practices

1. **Use RTK Query hooks** for all data fetching instead of manual API calls
2. **Use selectors** for derived state instead of computing in components
3. **Use DEFAULT_EVENT_FILTERS** for consistent filtering across screens
4. **Handle errors** with brand colors (`colors.track`)
5. **Leverage automatic cache invalidation** instead of manual refetching
6. **Use pull-to-refresh** for user-initiated data updates

## Common Scenarios

### Scenario 1: Display Events on Home Screen

```typescript
const { data, isLoading, error, refetch } = useGetEventsQuery({
  filters: DEFAULT_EVENT_FILTERS,
  pagination: { page: 1, limit: 20 },
});

const nearbyEvents = useSelector(selectHomeScreenEvents);
```

### Scenario 2: Book an Event

```typescript
const [bookEvent, { isLoading }] = useBookEventMutation();

const handleBookEvent = async () => {
  try {
    await bookEvent({ 
      eventId: event.id, 
      userId: user.id 
    }).unwrap();
    
    // Cache automatically invalidated - no manual refetch needed
    Alert.alert('Success', 'Event booked!');
  } catch (error) {
    Alert.alert('Error', 'Failed to book event');
  }
};
```

### Scenario 3: Custom Filters on Events Tab

```typescript
const [customFilters, setCustomFilters] = useState<EventFilters>({});
const hasCustomFilters = Object.keys(customFilters).length > 0;
const activeFilters = hasCustomFilters ? customFilters : DEFAULT_EVENT_FILTERS;

const { data } = useGetEventsQuery({
  filters: activeFilters,
  pagination: { page: 1, limit: 20 },
});

// Use selector only for default filters
const filteredEvents = useSelector(selectEventsTabEvents);
const displayEvents = hasCustomFilters ? (data?.data || []) : filteredEvents;
```

## Troubleshooting

### Cache Not Updating

Ensure mutations properly invalidate tags:

```typescript
invalidatesTags: (_result, _error, { eventId }) => [
  { type: 'Events', id: eventId },
  { type: 'Events', id: 'LIST' },
  { type: 'Bookings', id: 'LIST' },
]
```

### Stale Data

Use `refetch()` for manual refresh:

```typescript
const { refetch } = useGetEventsQuery(...);

const handleRefresh = async () => {
  await refetch();
};
```

### Performance Issues

Check selector memoization and avoid creating selectors in components.

## Further Reading

- [RTK Query Documentation](https://redux-toolkit.js.org/rtk-query/overview)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Reselect Documentation](https://github.com/reduxjs/reselect)
