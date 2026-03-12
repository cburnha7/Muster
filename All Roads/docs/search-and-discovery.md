# Search and Discovery Implementation

## Overview

This document describes the advanced search and discovery functionality implemented for the Sports Booking App. The implementation includes multi-criteria search across events, facilities, and teams, location-based discovery, and personalized recommendations.

## Features Implemented

### 1. Multi-Criteria Search

The search service supports searching across all entity types (events, facilities, teams) with unified filters:

- **Text Search**: Full-text search across entity names, descriptions, and metadata
- **Sport Type Filter**: Filter by specific sports (basketball, soccer, tennis, etc.)
- **Skill Level Filter**: Filter by skill level (beginner, intermediate, advanced)
- **Location-Based Filter**: Search within a specific radius from coordinates
- **Price Range Filter**: Filter by minimum and maximum price
- **Date Range Filter**: Filter events by date range
- **Entity-Specific Filters**: Event type, amenities, team availability, etc.

### 2. Location-Based Discovery

The discovery feature provides location-aware content:

- **Nearby Events**: Find events within a specified radius
- **Nearby Facilities**: Discover facilities close to user location
- **Nearby Teams**: Find teams in the user's area
- **Unified Discovery**: Get all nearby content in a single request
- **Permission Handling**: Graceful handling of location permissions

### 3. Personalized Recommendations

The recommendation system provides personalized content based on:

- **User Preferences**: Recommendations based on preferred sports and skill level
- **User History**: Suggestions based on past bookings and interactions
- **Location**: Location-aware recommendations
- **Popularity**: Trending events and popular facilities
- **Confidence Scoring**: Each recommendation includes a confidence score

### 4. Advanced Features

Additional search and discovery features:

- **Search Suggestions**: Autocomplete and search suggestions
- **Similar Content**: Find similar events, facilities, or teams
- **Trending Content**: Discover trending events and popular facilities
- **Search History**: Track and retrieve user search history
- **Multi-Tab Results**: Organized results by entity type

## Architecture

### Service Layer

#### SearchService (`src/services/search/SearchService.ts`)

The main search service extends `BaseApiService` and provides:

```typescript
class SearchService {
  // Multi-entity search
  searchAll(query, filters, pagination): Promise<MultiSearchResult>
  searchEvents(query, filters, pagination): Promise<SearchResult<Event>>
  searchFacilities(query, filters, pagination): Promise<SearchResult<Facility>>
  searchTeams(query, filters, pagination): Promise<SearchResult<Team>>
  
  // Location-based discovery
  discoverNearby(lat, lng, radius, filters): Promise<DiscoveryResult>
  getNearbyEvents(lat, lng, radius, filters): Promise<Event[]>
  getNearbyFacilities(lat, lng, radius, filters): Promise<Facility[]>
  getNearbyTeams(lat, lng, radius, filters): Promise<Team[]>
  
  // Recommendations
  getRecommendations(params): Promise<RecommendationResult>
  getRecommendedEvents(limit): Promise<Event[]>
  getRecommendedTeams(limit): Promise<Team[]>
  
  // Trending and popular
  getTrendingEvents(limit, filters): Promise<Event[]>
  getPopularFacilities(limit, filters): Promise<Facility[]>
  
  // Advanced features
  getSearchSuggestions(query, type): Promise<SuggestionsResult>
  getSimilarEvents(eventId, limit): Promise<Event[]>
  getSimilarFacilities(facilityId, limit): Promise<Facility[]>
  getSimilarTeams(teamId, limit): Promise<Team[]>
  
  // Search history
  getSearchHistory(limit): Promise<SearchHistoryItem[]>
  saveSearchToHistory(query, filters, resultCount): Promise<void>
  clearSearchHistory(): Promise<void>
}
```

### UI Components

#### SearchResultsScreen (`src/screens/search/SearchResultsScreen.tsx`)

Displays search results with:
- Tabbed interface (All, Events, Facilities, Teams)
- Integrated search bar with filters
- Result count display
- Pull-to-refresh functionality
- Empty state handling
- Error handling with retry

#### DiscoveryScreen (`src/screens/search/DiscoveryScreen.tsx`)

Provides location-based discovery with:
- Location permission handling
- Horizontal scrolling sections for different content types
- Nearby content (events, facilities, teams)
- Recommended content
- Trending and popular content
- "See All" navigation to full results

### Data Types

#### UnifiedSearchFilters

```typescript
interface UnifiedSearchFilters {
  query?: string;
  sportType?: SportType;
  skillLevel?: SkillLevel;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  priceMin?: number;
  priceMax?: number;
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  eventStatus?: string;
  amenities?: string[];
  isPublic?: boolean;
  hasOpenSlots?: boolean;
  sortBy?: 'relevance' | 'distance' | 'price' | 'rating' | 'date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}
```

#### MultiSearchResult

```typescript
interface MultiSearchResult {
  events: SearchResult<Event>;
  facilities: SearchResult<Facility>;
  teams: SearchResult<Team>;
  totalResults: number;
}
```

#### RecommendationResult

```typescript
interface RecommendationResult {
  events?: Event[];
  facilities?: Facility[];
  teams?: Team[];
  reason: string;
  confidence: number; // 0-1 score
}
```

## API Endpoints

The search service uses the following API endpoints:

### Search Endpoints
- `GET /search/all` - Search across all entity types
- `GET /search/events` - Search events
- `GET /search/facilities` - Search facilities
- `GET /search/teams` - Search teams
- `GET /search/nearby` - Location-based discovery
- `GET /search/recommendations` - Get personalized recommendations
- `GET /search/suggestions` - Get search suggestions
- `GET /search/history` - Get search history
- `POST /search/history` - Save search to history
- `DELETE /search/history` - Clear search history
- `GET /search/advanced` - Advanced filter search

### Entity-Specific Endpoints
- `GET /events/nearby` - Nearby events
- `GET /events/recommended` - Recommended events
- `GET /events/trending` - Trending events
- `GET /events/:id/similar` - Similar events
- `GET /facilities/nearby` - Nearby facilities
- `GET /facilities/popular` - Popular facilities
- `GET /facilities/:id/similar` - Similar facilities
- `GET /teams/nearby` - Nearby teams
- `GET /teams/recommended` - Recommended teams
- `GET /teams/:id/similar` - Similar teams

## Usage Examples

### Basic Search

```typescript
import { searchService } from '../../services/search';

// Search all entities
const results = await searchService.searchAll('basketball', {
  sportType: SportType.BASKETBALL,
  skillLevel: SkillLevel.INTERMEDIATE,
});

// Search specific entity type
const events = await searchService.searchEvents('pickup game', {
  startDate: new Date(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  priceMax: 20,
});
```

### Location-Based Discovery

```typescript
import { searchService } from '../../services/search';
import * as Location from 'expo-location';

// Get user location
const location = await Location.getCurrentPositionAsync({});

// Discover nearby content
const nearby = await searchService.discoverNearby(
  location.coords.latitude,
  location.coords.longitude,
  10, // 10km radius
  {
    sportType: SportType.SOCCER,
  }
);

// Get nearby events only
const nearbyEvents = await searchService.getNearbyEvents(
  location.coords.latitude,
  location.coords.longitude,
  5 // 5km radius
);
```

### Personalized Recommendations

```typescript
import { searchService } from '../../services/search';

// Get comprehensive recommendations
const recommendations = await searchService.getRecommendations({
  limit: 10,
  includeEvents: true,
  includeFacilities: true,
  includeTeams: true,
  basedOn: 'preferences',
});

// Get recommended events only
const recommendedEvents = await searchService.getRecommendedEvents(5);
```

### Search with Filters

```typescript
import { searchService } from '../../services/search';

const filters: UnifiedSearchFilters = {
  sportType: SportType.BASKETBALL,
  skillLevel: SkillLevel.INTERMEDIATE,
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 10,
  },
  priceMin: 0,
  priceMax: 50,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  sortBy: 'distance',
  sortOrder: 'asc',
};

const results = await searchService.advancedSearch(filters, {
  page: 1,
  limit: 20,
});
```

## Integration Points

### Home Screen Integration

The HomeScreen has been updated to use the search service:

```typescript
import { searchService } from '../../services/search';

const handleSearch = async (query: string) => {
  if (query.trim()) {
    navigation.navigate('SearchResults', { 
      query, 
      filters: searchFilters,
      searchType: 'all'
    });
  }
};
```

### Navigation Integration

Search and discovery screens should be integrated into the navigation stack:

```typescript
// In your stack navigator
<Stack.Screen 
  name="SearchResults" 
  component={SearchResultsScreen}
  options={{ title: 'Search Results' }}
/>
<Stack.Screen 
  name="Discovery" 
  component={DiscoveryScreen}
  options={{ title: 'Discover' }}
/>
```

## Requirements Validation

This implementation addresses the following requirements:

### Requirement 3.4: Search Functionality
✅ Search functionality accessible from home screen
✅ Multi-criteria search across events, facilities, and teams

### Requirement 4.4: Facility Search
✅ Facility search by location, name, and sport type
✅ Location-based facility discovery

### Requirement 5.6: Event Filtering
✅ Event filtering by sport type, date, location, and price range
✅ Advanced event search with multiple criteria

### Requirement 11.6: Team Discovery
✅ Team discovery features
✅ Search and filter teams by various criteria
✅ Find teams with open slots

## Performance Considerations

### Caching
- Search results are cached using the base API service caching mechanism
- Cache TTL is configurable per entity type
- Location-based results have shorter cache TTL due to dynamic nature

### Pagination
- All search endpoints support pagination
- Default page size is 20 items
- Pagination parameters: `page`, `limit`, `sortBy`, `sortOrder`

### Optimization
- Debounced search input to reduce API calls
- Lazy loading of search results
- Efficient horizontal scrolling with FlatList
- Image lazy loading in card components

## Testing

### Unit Tests
Unit tests should cover:
- Search service methods
- Filter validation
- Result transformation
- Error handling

### Integration Tests
Integration tests should verify:
- Search flow from input to results
- Location permission handling
- Navigation between search screens
- Filter application and clearing

### Property-Based Tests
Property-based tests should validate:
- Search result relevance (all results match filters)
- Location-based filtering accuracy
- Pagination consistency

## Future Enhancements

Potential improvements for future iterations:

1. **Search Analytics**: Track popular searches and user behavior
2. **Advanced Filters**: More granular filtering options
3. **Saved Searches**: Allow users to save and reuse search criteria
4. **Search Alerts**: Notify users when new content matches saved searches
5. **Voice Search**: Integrate voice input for search
6. **Image Search**: Search facilities by uploaded images
7. **Social Search**: Search based on friends' activities
8. **AI-Powered Recommendations**: Machine learning-based recommendations
9. **Collaborative Filtering**: Recommendations based on similar users
10. **Real-time Updates**: Live updates for search results

## Troubleshooting

### Common Issues

**Location Permission Denied**
- Ensure location permissions are requested properly
- Provide fallback content when location is unavailable
- Show clear messaging about why location is needed

**Empty Search Results**
- Verify API endpoints are correctly configured
- Check filter criteria aren't too restrictive
- Ensure backend search indexing is working

**Slow Search Performance**
- Implement debouncing on search input
- Use pagination to limit result size
- Enable caching for frequently accessed data
- Consider implementing search result prefetching

## Conclusion

The search and discovery implementation provides a comprehensive solution for finding events, facilities, and teams. It combines multi-criteria search, location-based discovery, and personalized recommendations to create an intuitive and powerful user experience.
