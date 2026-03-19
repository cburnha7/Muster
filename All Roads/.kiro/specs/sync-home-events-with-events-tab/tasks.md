# Implementation Plan: Sync Home Events with Events Tab

## Overview

This implementation plan converts the feature design into discrete coding tasks that establish a unified event query system using RTK Query. The plan follows a phased approach to minimize risk, starting with RTK Query setup, then selector implementation, followed by screen migrations, integration testing, and cleanup. Each task builds incrementally on previous work, with checkpoints to ensure stability before proceeding.

## Tasks

- [x] 1. Set up RTK Query API and store configuration
  - [x] 1.1 Create RTK Query events API with endpoints
    - Create `src/store/api/eventsApi.ts` with RTK Query configuration
    - Define `DEFAULT_EVENT_FILTERS` constant with status: 'ACTIVE'
    - Implement `getEvents` query endpoint with filters and pagination parameters
    - Implement `getUserBookings` query endpoint with status and pagination parameters
    - Implement `bookEvent` mutation endpoint with cache invalidation tags
    - Implement `cancelBooking` mutation endpoint with cache invalidation tags
    - Configure tag types: 'Events' and 'Bookings' for cache invalidation
    - Add auth token injection in prepareHeaders
    - Export hooks: useGetEventsQuery, useGetUserBookingsQuery, useBookEventMutation, useCancelBookingMutation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ]* 1.2 Write unit tests for RTK Query API endpoints
    - Test query parameter serialization
    - Test cache key generation for different filter combinations
    - Test tag-based invalidation on mutations
    - Test auth token injection
    - Test error transformation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 1.3 Update Redux store configuration
    - Add eventsApi reducer to store in `src/store/store.ts`
    - Add eventsApi middleware to middleware chain
    - Configure serializableCheck to ignore RTK Query actions
    - Call setupListeners to enable refetchOnFocus and refetchOnReconnect
    - _Requirements: 1.1, 5.5, 5.6, 5.7_
  
  - [ ]* 1.4 Write unit tests for store configuration
    - Test eventsApi reducer is properly registered
    - Test middleware chain includes eventsApi middleware
    - Test setupListeners is called
    - _Requirements: 1.1_

- [x] 2. Implement memoized Redux selectors
  - [x] 2.1 Create event selectors with memoization
    - Create `src/store/selectors/eventSelectors.ts`
    - Implement selectEventsResult base selector for RTK Query cache
    - Implement selectBookingsResult base selector for RTK Query cache
    - Implement selectBookedEventIds memoized selector using createSelector
    - Implement selectAvailableEvents memoized selector that filters out joined events
    - Implement selectHomeScreenEvents memoized selector that returns first 10 events
    - Implement selectEventsTabEvents memoized selector that returns all available events
    - _Requirements: 3.4, 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 2.2 Write unit tests for selectors
    - Test selectBookedEventIds with empty bookings
    - Test selectBookedEventIds with multiple bookings
    - Test selectAvailableEvents filters out joined events
    - Test selectHomeScreenEvents returns max 10 events
    - Test selectEventsTabEvents returns all events
    - Test selector memoization behavior
    - _Requirements: 3.4, 4.2, 4.3, 4.4_
  
  - [ ]* 2.3 Write property test for joined event filtering
    - **Property 1: Query Result Filtering**
    - **Validates: Requirements 3.4, 4.2, 4.3, 4.4**
    - Create `src/store/selectors/__tests__/eventSelectors.properties.test.ts`
    - Generate random arrays of events and bookings using fast-check
    - Verify filtered results exclude all events with IDs in booking list
    - Run minimum 100 iterations
    - _Requirements: 3.4, 4.2, 4.3, 4.4_
  
  - [ ]* 2.4 Write property test for Home Screen display limit
    - **Property 2: Home Screen Display Limit**
    - **Validates: Requirements 2.1, 2.4**
    - Generate random event arrays of varying sizes
    - Verify selector returns exactly 10 events when N > 10
    - Verify selector returns exactly N events when N ≤ 10
    - Run minimum 100 iterations
    - _Requirements: 2.1, 2.4_

- [x] 3. Checkpoint - Verify RTK Query and selectors
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Migrate Home Screen to RTK Query
  - [x] 4.1 Update Home Screen to use RTK Query hooks
    - Update `src/screens/home/HomeScreen.tsx`
    - Replace eventService.getEvents() with useGetEventsQuery hook
    - Pass DEFAULT_EVENT_FILTERS and pagination {page: 1, limit: 20}
    - Add useGetUserBookingsQuery hook with status: 'upcoming'
    - Replace manual filtering with selectHomeScreenEvents selector
    - Update loading state to combine eventsLoading and bookingsLoading
    - Update error handling to use eventsError
    - Update refresh handler to call refetchEvents() and refetchBookings()
    - Remove old event fetching logic
    - _Requirements: 1.2, 2.1, 2.4, 3.1, 3.3, 4.3, 5.5_
  
  - [ ]* 4.2 Write unit tests for Home Screen
    - Test loading state displays correctly
    - Test error state displays with colors.track styling
    - Test empty state when no events available
    - Test event list renders with filtered events
    - Test refresh functionality calls refetch
    - Test navigation to event details
    - _Requirements: 2.1, 3.1, 3.3, 8.2_
  
  - [ ]* 4.3 Write property test for sort order consistency
    - **Property 3: Sort Order Consistency**
    - **Validates: Requirement 2.5**
    - Generate random sorted event arrays
    - Verify Home Screen events match first 10 of Events Tab events
    - Run minimum 100 iterations
    - _Requirements: 2.5_

- [x] 5. Migrate Events Tab to RTK Query
  - [x] 5.1 Update Events List Screen to use RTK Query hooks
    - Update `src/screens/events/EventsListScreen.tsx`
    - Add state for customFilters
    - Determine activeFilters: use customFilters if present, else DEFAULT_EVENT_FILTERS
    - Replace Redux actions with useGetEventsQuery hook
    - Add useGetUserBookingsQuery hook
    - Use selectEventsTabEvents selector when using default filters
    - Use raw eventsData when using custom filters
    - Update loading, error, and empty states
    - Update refresh handler to call refetch
    - Preserve pagination functionality
    - Preserve search functionality
    - Preserve filter UI and interactions
    - _Requirements: 1.3, 3.2, 3.5, 4.4, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ]* 5.2 Write unit tests for Events List Screen
    - Test default filter view uses selector
    - Test custom filter view uses raw data
    - Test pagination controls work correctly
    - Test search functionality filters events
    - Test filter UI updates activeFilters
    - Test loading and error states
    - _Requirements: 3.2, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 5.3 Write property test for filter independence
    - **Property 8: Filter Independence**
    - **Validates: Requirements 3.5, 6.5**
    - Generate random custom filters
    - Verify Home Screen query parameters remain unchanged
    - Verify Home Screen continues using DEFAULT_EVENT_FILTERS
    - Run minimum 100 iterations
    - _Requirements: 3.5, 6.5_
  
  - [ ]* 5.4 Write property test for pagination preservation
    - **Property 9: Pagination Preservation**
    - **Validates: Requirement 6.3**
    - Generate random page numbers and limits
    - Verify query returns correct offset and limit
    - Verify results correspond to requested page
    - Run minimum 100 iterations
    - _Requirements: 6.3_

- [x] 6. Checkpoint - Verify screen migrations
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement cache behavior and synchronization
  - [x] 7.1 Add cache configuration and retry logic
    - Update `src/store/api/eventsApi.ts` with extraOptions
    - Configure maxRetries: 3 for getEvents endpoint
    - Configure exponential backoff: 1s, 2s, 4s
    - Add transformErrorResponse to map errors to brand error codes
    - Add onQueryStarted logging for development mode
    - _Requirements: 7.4, 8.1, 8.4, 8.5_
  
  - [ ]* 7.2 Write property test for cache hit behavior
    - **Property 4: Cache Hit Behavior**
    - **Validates: Requirements 1.5, 7.1, 7.2, 7.3**
    - Generate random filter parameters
    - Execute same query twice in succession
    - Verify second execution returns cached results without network request
    - Run minimum 100 iterations
    - _Requirements: 1.5, 7.1, 7.2, 7.3_
  
  - [ ]* 7.3 Write property test for cache invalidation
    - **Property 6: Cache Invalidation on Mutations**
    - **Validates: Requirements 5.1, 5.2, 5.3, 4.5, 5.4, 7.4**
    - Test cache invalidation after bookEvent mutation
    - Test cache invalidation after cancelBooking mutation
    - Verify subsequent queries fetch fresh data
    - Run minimum 100 iterations
    - _Requirements: 5.1, 5.2, 5.3, 4.5, 5.4, 7.4_
  
  - [ ]* 7.4 Write property test for automatic UI synchronization
    - **Property 7: Automatic UI Synchronization**
    - **Validates: Requirements 5.5, 5.6, 5.7**
    - Trigger cache invalidation
    - Verify Home Screen re-renders with updated data
    - Verify Events Tab re-renders with updated data
    - Verify no manual refresh required
    - Run minimum 100 iterations
    - _Requirements: 5.5, 5.6, 5.7_
  
  - [ ]* 7.5 Write property test for request deduplication
    - **Property 11: Request Deduplication**
    - **Validates: Requirement 7.6**
    - Execute two simultaneous queries with identical parameters
    - Verify only one network request is made
    - Verify both queries receive same cached result
    - Run minimum 100 iterations
    - _Requirements: 7.6_

- [ ] 8. Implement error handling and recovery
  - [x] 8.1 Add error handling to components
    - Update Home Screen error display to use brand error codes
    - Update Events Tab error display to use brand error codes
    - Use colors.track for error styling
    - Add user-friendly error messages
    - Add pull-to-refresh hint in error states
    - _Requirements: 8.1, 8.2, 8.3, 8.6_
  
  - [ ]* 8.2 Write property test for error state propagation
    - **Property 12: Error State Propagation**
    - **Validates: Requirement 8.1**
    - Simulate API failures
    - Verify query transitions to error state
    - Verify error is available to components
    - Run minimum 100 iterations
    - _Requirements: 8.1_
  
  - [ ]* 8.3 Write property test for retry on network failure
    - **Property 13: Retry on Network Failure**
    - **Validates: Requirement 8.4**
    - Simulate network errors
    - Verify service retries up to 3 times
    - Verify exponential backoff timing
    - Run minimum 100 iterations
    - _Requirements: 8.4_
  
  - [ ]* 8.4 Write property test for stale cache fallback
    - **Property 14: Stale Cache Fallback**
    - **Validates: Requirement 8.5**
    - Populate cache with valid data
    - Simulate refetch failure
    - Verify stale cached data is returned
    - Verify staleness indicator is present
    - Run minimum 100 iterations
    - _Requirements: 8.5_

- [x] 9. Integration testing and verification
  - [ ]* 9.1 Write end-to-end integration tests
    - Test user opens Home Screen and sees filtered events
    - Test user navigates to Events Tab and sees same events
    - Test user joins event and it disappears from both screens
    - Test user applies custom filter on Events Tab, Home Screen unchanged
    - Test network failure shows stale cache with indicator
    - Test pull-to-refresh loads fresh data
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 3.2, 3.5, 4.3, 4.4, 5.5, 5.6, 8.5_
  
  - [ ]* 9.2 Write property test for query parameter application
    - **Property 15: Query Parameter Application**
    - **Validates: Requirement 1.4**
    - Generate random filter combinations
    - Verify all filters are applied to results
    - Verify location-based filtering works
    - Verify sorting is applied
    - Verify user booking exclusions work
    - Run minimum 100 iterations
    - _Requirements: 1.4_
  
  - [ ]* 9.3 Verify performance metrics
    - Measure cache hit rate (target: >80%)
    - Measure time to first render (target: <500ms)
    - Measure memory usage (target: <10MB cache size)
    - Compare network request count vs old implementation (target: 50% reduction)
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

- [x] 10. Checkpoint - Verify integration and performance
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Cleanup and documentation
  - [x] 11.1 Remove deprecated code
    - Add deprecation warnings to old EventService methods
    - Document migration path for other consumers
    - Keep eventsSlice and bookingsSlice for backward compatibility
    - Remove manual cache clearing logic from EventService
    - _Requirements: 6.6_
  
  - [x] 11.2 Update documentation
    - Update `src/store/README.md` with RTK Query architecture
    - Document DEFAULT_EVENT_FILTERS usage
    - Document selector usage patterns
    - Add code examples for common scenarios
    - Document error handling patterns
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ]* 11.3 Final regression testing
    - Run full test suite with coverage report
    - Verify minimum 80% coverage for new code
    - Test on iOS simulator
    - Test on Android emulator
    - Test on web browser
    - Verify no console errors or warnings
    - _Requirements: All_

- [x] 12. Final checkpoint - Implementation complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- All code uses TypeScript as specified in the design document
- Follow Muster brand guidelines for colors, typography, and error messages
- Use RTK Query's automatic cache management and tag-based invalidation
- Preserve backward compatibility with existing Events Tab features
- Minimum 100 iterations per property test
- Minimum 80% code coverage for new code
