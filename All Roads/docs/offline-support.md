# Offline Support Implementation

## Overview

The Sports Booking App now includes comprehensive offline support, allowing users to access cached data and queue actions when network connectivity is unavailable. The implementation follows the requirements specified in sections 8 (Offline Functionality) and 10 (Data Persistence and Sync).

## Components Implemented

### 1. Offline Data Caching (`src/services/offline/OfflineService.ts`)

**Features:**
- Selective data caching with priority levels (high, medium, low)
- Automatic cache expiration based on configurable max age
- Cache size management with automatic cleanup
- Cache invalidation by key or pattern
- Cache statistics and monitoring

**Key Methods:**
- `cacheData<T>(key, data, config)` - Cache data with metadata
- `getCachedData<T>(key)` - Retrieve cached data
- `invalidateCache(key)` - Remove specific cache entry
- `invalidateCachePattern(pattern)` - Remove entries matching pattern
- `clearAllCache()` - Clear all cached data
- `getCacheStats()` - Get cache statistics

**Configuration:**
- Max cache size: 50MB
- Default max age: 7 days
- Automatic cleanup when cache exceeds limit
- Priority-based eviction (low priority items removed first)

### 2. Offline Queue and Sync (`src/services/offline/OfflineQueueService.ts`)

**Features:**
- Queue failed requests for retry when online
- Automatic retry with configurable max attempts
- Queue persistence across app restarts
- Sync status monitoring
- Event-based sync notifications

**Key Methods:**
- `queueAction(action)` - Add action to offline queue
- `syncQueue(executeAction)` - Process all queued actions
- `getQueue()` - Get all queued actions
- `getQueueSize()` - Get number of pending actions
- `removeAction(actionId)` - Remove specific action
- `clearQueue()` - Clear entire queue

**Configuration:**
- Max retries: 3 attempts per action
- Automatic sync on network reconnection
- Ordered execution (oldest first)

### 3. Sync Manager (`src/services/offline/SyncManager.ts`)

**Features:**
- Automatic synchronization on network reconnection
- Manual sync trigger
- Conflict detection and resolution
- Configurable conflict resolution strategies
- Sync status monitoring

**Conflict Resolution Strategies:**
- `server-wins` - Server data takes precedence
- `client-wins` - Local changes overwrite server
- `merge` - Combine local and server data
- `manual` - Require user intervention

**Key Methods:**
- `sync()` - Manually trigger synchronization
- `startAutoSync(intervalMs)` - Enable automatic sync
- `stopAutoSync()` - Disable automatic sync
- `registerConflictHandler(type, handler)` - Register custom conflict handler
- `getSyncStatus()` - Get current sync status

**Default Behavior:**
- Auto-sync enabled by default (30-second interval)
- Server wins for shared resources (events, facilities, teams)
- Client wins for personal data (profile, preferences)

### 4. Enhanced Redux Persist Configuration (`src/store/store.ts`)

**Features:**
- Cache expiration transform (7-day max age)
- Selective persistence (auth, events, facilities, teams, bookings)
- Throttled writes to storage (1-second throttle)
- Automatic rehydration on app start

### 5. UI Components

#### OfflineIndicator (`src/components/navigation/OfflineIndicator.tsx`)
- Displays network status banner
- Shows pending sync count
- Manual sync button
- Animated slide-in/out transitions

#### OfflineFeatureWarning (`src/components/ui/OfflineFeatureWarning.tsx`)
- Warns users when features are unavailable offline
- Customizable feature name and message
- Only visible when offline

#### SyncStatusCard (`src/components/ui/SyncStatusCard.tsx`)
- Comprehensive sync status display
- Manual sync trigger button
- Queue size indicator
- Last sync timestamp
- Visual status indicators (color-coded)

### 6. Offline Capability Hook (`src/hooks/useOfflineCapability.ts`)

**Features:**
- Check feature availability based on network status
- Three capability levels:
  - `online-only` - Requires internet connection
  - `offline-capable` - Limited functionality offline
  - `offline-full` - Full functionality offline
- Predefined feature capabilities
- Custom capability checking

**Usage Example:**
```typescript
import { useFeatureAvailability } from '../hooks';

const { isAvailable, requiresOnline, message } = useFeatureAvailability('CREATE_EVENT');

if (!isAvailable) {
  return <OfflineFeatureWarning featureName="Create Event" message={message} />;
}
```

## Integration Guide

### 1. Using Offline Service

```typescript
import { offlineService } from '../services/offline';

// Cache data
await offlineService.cacheData('events', events, {
  priority: 'high',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});

// Retrieve cached data
const cachedEvents = await offlineService.getCachedData('events');

// Invalidate cache
await offlineService.invalidateCache('events');
```

### 2. Using Offline Queue

```typescript
import { offlineQueueService } from '../services/offline';

// Queue an action
await offlineQueueService.queueAction({
  type: 'CREATE_EVENT',
  endpoint: '/events',
  method: 'POST',
  payload: eventData,
  maxRetries: 3,
});

// Check queue size
const queueSize = await offlineQueueService.getQueueSize();
```

### 3. Using Sync Manager

```typescript
import { syncManager } from '../services/offline';

// Manual sync
const result = await syncManager.sync();

// Register conflict handler
syncManager.registerConflictHandler('UPDATE_EVENT', async (conflict) => {
  // Custom conflict resolution logic
  return {
    strategy: 'merge',
    resolvedData: mergeEventData(conflict.localData, conflict.serverData),
  };
});

// Get sync status
const status = await syncManager.getSyncStatus();
```

### 4. Using UI Components

```typescript
import { OfflineIndicator, OfflineFeatureWarning, SyncStatusCard } from '../components/ui';

// In your screen component
<View>
  <OfflineIndicator showSyncButton={true} />
  
  <OfflineFeatureWarning
    featureName="Create Event"
    message="You can view cached events, but creating new events requires an internet connection"
  />
  
  <SyncStatusCard />
</View>
```

### 5. Using Offline Capability Hook

```typescript
import { useFeatureAvailability } from '../hooks';

const CreateEventButton = () => {
  const { isAvailable, message } = useFeatureAvailability('CREATE_EVENT');
  
  return (
    <View>
      <Button
        title="Create Event"
        disabled={!isAvailable}
        onPress={handleCreateEvent}
      />
      {message && <Text>{message}</Text>}
    </View>
  );
};
```

## Requirements Coverage

### Requirement 8: Offline Functionality
- ✅ 8.1 - Display cached bookings and events when offline
- ✅ 8.2 - Synchronize offline changes when connectivity restored
- ✅ 8.3 - Cache essential data (profile, bookings, facilities)
- ✅ 8.4 - Indicate unavailable features and queue actions
- ✅ 8.5 - Handle sync conflicts gracefully
- ✅ 8.6 - Provide offline access to booking confirmations

### Requirement 10: Data Persistence and Sync
- ✅ 10.1 - Persist data locally and sync with server
- ✅ 10.2 - Handle data conflicts (server priority for shared, client for personal)
- ✅ 10.3 - Load cached data immediately, refresh in background
- ✅ 10.4 - Maintain data integrity during sync
- ✅ 10.5 - Prioritize essential data, clear old cache

## Testing

The offline support implementation should be tested with:

1. **Unit Tests** - Test individual service methods
2. **Integration Tests** - Test sync workflows
3. **Property Tests** - Test cache management and conflict resolution (Task 14.4)

## Future Enhancements

- Add user-configurable sync preferences
- Implement differential sync (only sync changed data)
- Add sync progress indicators for large datasets
- Implement background sync using Expo Background Fetch
- Add analytics for offline usage patterns
