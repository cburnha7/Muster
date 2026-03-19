# Performance Optimization Guide

This document outlines the performance optimizations implemented in the Sports Booking App to ensure smooth user experience and efficient resource usage.

## Overview

The app implements three main categories of performance optimizations:
1. **Lazy Loading** - Screens and components are loaded on-demand
2. **Image Optimization** - Images are cached and optimized for mobile devices
3. **List Rendering Optimization** - FlatList virtualization for efficient scrolling

## 1. Lazy Loading

### Screen Lazy Loading

All screens in stack navigators are lazy-loaded using the `lazyLoadScreen` utility to reduce initial bundle size and improve app startup time.

**Implementation:**
```typescript
import { lazyLoadScreen } from '../../utils/lazyLoad';

const EventsListScreen = lazyLoadScreen(() => 
  import('../../screens/events/EventsListScreen')
    .then(m => ({ default: m.EventsListScreen }))
);
```

**Benefits:**
- Faster app startup time
- Reduced initial memory footprint
- Screens are loaded only when needed
- Automatic loading spinner during screen load

**Applied to:**
- All stack navigators (Events, Facilities, Teams, Bookings, Profile, Home)
- Modal screens (Create/Edit forms)
- Detail screens

### Component Lazy Loading

The `lazyLoadComponent` utility is available for lazy-loading individual components when needed.

**Usage:**
```typescript
import { lazyLoadComponent } from '../../utils/lazyLoad';

const HeavyComponent = lazyLoadComponent(() => 
  import('./HeavyComponent')
);
```

## 2. Image Optimization

### OptimizedImage Component

The `OptimizedImage` component provides automatic image caching and optimization.

**Features:**
- Automatic image caching to device storage
- Loading states with customizable placeholders
- Error handling with fallback images
- Configurable cache behavior

**Usage:**
```typescript
<OptimizedImage
  source={{ uri: 'https://example.com/image.jpg' }}
  style={styles.image}
  cacheEnabled={true}
  resizeMode="cover"
  placeholder={<ActivityIndicator />}
  fallback={<DefaultImage />}
/>
```

### Image Optimization Utilities

**Available Functions:**
- `optimizeImage(uri, options)` - Resize and compress images
- `cacheImage(url)` - Cache remote images locally
- `clearImageCache()` - Clear cached images
- `getImageCacheSize()` - Get total cache size

**Configuration:**
```typescript
const options = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  format: 'jpeg'
};
```

### Best Practices

1. **Always use OptimizedImage for remote images**
   ```typescript
   // Good
   <OptimizedImage source={{ uri: imageUrl }} />
   
   // Avoid
   <Image source={{ uri: imageUrl }} />
   ```

2. **Optimize uploaded images before sending to server**
   ```typescript
   const optimizedUri = await optimizeImage(imageUri, {
     maxWidth: 800,
     quality: 0.7
   });
   ```

3. **Clear cache periodically in settings**
   ```typescript
   const cacheSize = await getImageCacheSize();
   if (cacheSize > MAX_CACHE_SIZE) {
     await clearImageCache();
   }
   ```

## 3. List Rendering Optimization

### FlatList Performance Configuration

All list screens implement comprehensive FlatList optimizations for smooth scrolling with large datasets.

**Standard Configuration:**
```typescript
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  getItemLayout={getItemLayout}
  
  // Performance optimizations
  removeClippedSubviews={true}
  maxToRenderPerBatch={getOptimalBatchSize()}
  updateCellsBatchingPeriod={50}
  initialNumToRender={getOptimalBatchSize()}
  windowSize={getOptimalWindowSize()}
  
  // Pagination
  onEndReached={loadMore}
  onEndReachedThreshold={0.1}
/>
```

### Key Optimizations

#### 1. Memoized Callbacks
```typescript
const renderItem = useCallback(({ item }) => (
  <ItemCard item={item} onPress={handlePress} />
), [handlePress]);

const keyExtractor = useCallback((item) => item.id, []);
```

#### 2. getItemLayout
Provides exact item dimensions for better scroll performance:
```typescript
const getItemLayout = useCallback(
  (_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }),
  []
);
```

#### 3. Dynamic Batch Sizing
Adapts to device performance:
```typescript
import { getOptimalBatchSize, getOptimalWindowSize } from '../../utils/performance';

maxToRenderPerBatch={getOptimalBatchSize()}
windowSize={getOptimalWindowSize()}
```

#### 4. Memoized List Items
```typescript
import { createMemoizedListItem } from '../../components/ui/MemoizedListItem';

const MemoizedEventCard = createMemoizedListItem(EventCard);
```

### Performance Utilities

**Available Functions:**
- `getOptimalBatchSize()` - Returns optimal batch size based on device
- `getOptimalWindowSize()` - Returns optimal window size for virtualization
- `debounce(fn, delay)` - Debounces function calls (e.g., search)

**Usage:**
```typescript
import { debounce } from '../../utils/performance';

const debouncedSearch = useMemo(
  () => debounce(async (query: string) => {
    // Search logic
  }, 300),
  []
);
```

## Optimized Screens

The following screens have been fully optimized:

### List Screens
- ✅ EventsListScreen
- ✅ FacilitiesListScreen
- ✅ TeamsListScreen
- ✅ BookingsListScreen
- ✅ SearchResultsScreen

### Stack Navigators
- ✅ EventsStackNavigator
- ✅ FacilitiesStackNavigator
- ✅ TeamsStackNavigator
- ✅ BookingsStackNavigator
- ✅ ProfileStackNavigator
- ✅ HomeStackNavigator

## Performance Monitoring

### Built-in Monitoring

The app includes performance monitoring through `PerformanceMonitoringService`:

```typescript
import { performanceMonitor } from '../../services/monitoring';

// Track screen render time
performanceMonitor.startTrace('screen_load');
// ... screen loading logic
performanceMonitor.stopTrace('screen_load');

// Track API calls
performanceMonitor.trackHttpRequest(url, method, duration, statusCode);
```

### Key Metrics

Monitor these metrics for optimal performance:
- **Screen Load Time**: < 1 second
- **List Scroll FPS**: 60 FPS
- **Image Load Time**: < 500ms (cached), < 2s (network)
- **API Response Time**: < 1 second
- **Memory Usage**: < 200MB for typical usage

## Best Practices

### 1. Always Use Optimizations for Lists
```typescript
// Good - Optimized FlatList
<FlatList
  data={items}
  renderItem={memoizedRenderItem}
  keyExtractor={keyExtractor}
  getItemLayout={getItemLayout}
  removeClippedSubviews={true}
  maxToRenderPerBatch={getOptimalBatchSize()}
  windowSize={getOptimalWindowSize()}
/>

// Avoid - Unoptimized list
<ScrollView>
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</ScrollView>
```

### 2. Lazy Load Heavy Screens
```typescript
// Good - Lazy loaded
const HeavyScreen = lazyLoadScreen(() => import('./HeavyScreen'));

// Avoid - Eager loading
import { HeavyScreen } from './HeavyScreen';
```

### 3. Optimize Images
```typescript
// Good - Optimized and cached
<OptimizedImage source={{ uri: imageUrl }} cacheEnabled={true} />

// Avoid - Direct image loading
<Image source={{ uri: imageUrl }} />
```

### 4. Debounce User Input
```typescript
// Good - Debounced search
const debouncedSearch = useMemo(
  () => debounce(searchFunction, 300),
  []
);

// Avoid - Search on every keystroke
<TextInput onChangeText={searchFunction} />
```

### 5. Memoize Expensive Computations
```typescript
// Good - Memoized
const filteredItems = useMemo(
  () => items.filter(item => item.active),
  [items]
);

// Avoid - Computed on every render
const filteredItems = items.filter(item => item.active);
```

## Testing Performance

### Manual Testing
1. Test scrolling performance with 100+ items
2. Monitor memory usage during extended sessions
3. Test image loading on slow networks
4. Verify smooth animations and transitions

### Automated Testing
```typescript
// Performance test example
it('should render large list efficiently', () => {
  const items = generateMockItems(1000);
  const { getByTestId } = render(<ItemList items={items} />);
  
  // Verify initial render
  expect(getByTestId('flat-list')).toBeTruthy();
  
  // Verify only initial batch is rendered
  const renderedItems = getAllByTestId('list-item');
  expect(renderedItems.length).toBeLessThan(50);
});
```

## Troubleshooting

### Slow List Scrolling
- Verify `removeClippedSubviews={true}` is set
- Check if `getItemLayout` is implemented
- Ensure render callbacks are memoized
- Reduce item complexity or use simpler components

### High Memory Usage
- Clear image cache periodically
- Implement proper cleanup in useEffect
- Check for memory leaks in event listeners
- Reduce windowSize if needed

### Slow Image Loading
- Verify images are being cached
- Optimize image sizes before upload
- Use appropriate image formats (JPEG for photos, PNG for graphics)
- Consider using thumbnails for list views

## Future Optimizations

Potential areas for further optimization:
- Implement code splitting for larger features
- Add service worker for offline image caching
- Implement progressive image loading
- Add request deduplication for API calls
- Implement virtual scrolling for very large lists (10,000+ items)

## Resources

- [React Native Performance](https://reactnative.dev/docs/performance)
- [FlatList Optimization](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [Expo Image Optimization](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/)
- [React Performance](https://react.dev/learn/render-and-commit)
