# Implementation Plan: Recurring Court Bookings

## Overview

Most backend infrastructure (API endpoints, Prisma models, occurrence generation service) and two UI components (RecurringBookingToggle, RecurringConflictsModal) already exist. The remaining work is frontend integration: creating the API service layer, Redux state management, wiring the toggle into the booking flow, building the My Reservations grouped display with series management, and adding a booking preview component. Property-based tests validate the 12 correctness properties using fast-check.

## Tasks

- [ ] 1. Create API service layer and TypeScript types for recurring bookings
  - [ ] 1.1 Create `src/services/api/RecurringBookingService.ts` extending `BaseApiService`
    - Implement `checkAvailability(req: RecurringCheckRequest): Promise<RecurringCheckResponse>` calling `POST /rentals/recurring/check`
    - Implement `createRecurring(req: RecurringCreateRequest): Promise<RecurringCreateResponse>` calling `POST /rentals/recurring`
    - Implement `getSeriesDetails(groupId: string): Promise<RecurringSeriesResponse>` calling `GET /rentals/recurring/:groupId`
    - Implement `cancelSeries(groupId: string, userId: string): Promise<void>` calling `DELETE /rentals/recurring/:groupId`
    - Export singleton instance following existing pattern (e.g., `CourtService`, `BookingService`)
    - _Requirements: 4.1, 5.1, 7.3_

  - [ ] 1.2 Add recurring booking TypeScript interfaces to `src/types/`
    - Define `RecurringCheckRequest`, `RecurringCheckResponse`, `RecurringCreateRequest`, `RecurringCreateResponse`, `RecurringSeriesResponse`, `ConflictSlot`, `AvailableSlot`
    - Re-export `RecurringConfig` and `RecurringFrequency` from `RecurringBookingToggle`
    - _Requirements: 2.1, 2.2, 4.1, 5.1_

- [ ] 2. Create Redux slice for recurring booking state
  - [ ] 2.1 Create `src/store/slices/recurringBookingSlice.ts`
    - Define `RecurringBookingState` with `config`, `availabilityCheck`, `booking`, and `seriesCancellation` fields
    - Create async thunks: `checkRecurringAvailability`, `createRecurringBooking`, `cancelRecurringSeries`
    - Add reducers: `setRecurringConfig`, `resetRecurringState`, `clearAvailabilityCheck`
    - Handle loading, success, and error states in `extraReducers` for each thunk
    - Follow existing slice patterns (e.g., `bookingsSlice.ts`, `subscriptionSlice.ts`)
    - _Requirements: 1.1, 4.1, 5.1, 7.3_

  - [ ] 2.2 Register `recurringBookingSlice` in the Redux store
    - Add the reducer to `src/store/store.ts` combineReducers
    - Export typed selectors for recurring booking state
    - _Requirements: 1.1_

  - [ ]* 2.3 Write unit tests for `recurringBookingSlice`
    - Test state transitions for each async thunk (pending, fulfilled, rejected)
    - Test `setRecurringConfig` and `resetRecurringState` reducers
    - Test that `clearAvailabilityCheck` resets only the availability check state
    - _Requirements: 1.1, 4.1, 5.1_

- [ ] 3. Integrate RecurringBookingToggle into the court booking flow
  - [ ] 3.1 Wire `RecurringBookingToggle` into the booking screen
    - Import and render `RecurringBookingToggle` below the time slot selector in the court booking screen
    - Connect `onChange` to dispatch `setRecurringConfig` action
    - Pass `minEndDate` derived from the selected booking date
    - Conditionally show the toggle only when a time slot is selected
    - _Requirements: 1.1, 2.1, 2.2, 3.1_

  - [ ] 3.2 Add recurring availability check before confirmation
    - When user taps Confirm with recurring enabled, dispatch `checkRecurringAvailability` thunk
    - Build the request payload from selected court, time slot, and `RecurringConfig`
    - Show loading indicator while check is in progress
    - If no conflicts, proceed directly to `createRecurringBooking`
    - If conflicts exist, open `RecurringConflictsModal` with conflict data from Redux state
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 3.3 Wire `RecurringConflictsModal` actions to Redux
    - On "Skip & Confirm": dispatch `createRecurringBooking` with `skipConflicts: true`
    - On "Cancel": dispatch `resetRecurringState` and close modal
    - Pass `conflicts` and `availableCount` from `availabilityCheck` state
    - _Requirements: 4.3, 5.1_

  - [ ] 3.4 Handle booking confirmation and navigation
    - On successful `createRecurringBooking`, navigate to confirmation screen with series details
    - Show total price, instance count, and skipped conflicts in confirmation
    - On error, show toast and preserve recurring config so user can retry
    - Reset recurring state when user leaves the booking flow
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 4. Checkpoint — Verify booking flow integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Build RecurringBookingPreview component
  - [ ] 5.1 Create `src/components/bookings/RecurringBookingPreview.tsx`
    - Accept props: `availableSlots`, `conflicts`, `totalPrice`, `frequency`
    - Render a scrollable list of all dates with availability status icons
    - Show summary line: "X of Y dates available" with total price
    - Display frequency badge (Weekly/Monthly) using `fonts.label` and `colors.grass`
    - Use theme tokens from `src/theme/` for all colors and typography
    - _Requirements: 1.1, 4.1, 5.1_

  - [ ] 5.2 Integrate `RecurringBookingPreview` into the booking flow
    - Show preview after availability check completes (before confirmation)
    - Display between the toggle and the confirm button
    - Update preview when availability check results change
    - _Requirements: 1.1, 4.1_

- [ ] 6. Build RecurringSeriesCard and My Reservations grouping
  - [ ] 6.1 Create `src/components/bookings/RecurringSeriesCard.tsx`
    - Accept props: `recurringGroupId`, `frequency`, `courtName`, `facilityName`, `rentals`, `activeCount`, `totalCount`
    - Show recurring icon badge with frequency label (e.g., "Weekly booking (5 remaining)")
    - Render expandable/collapsible list of individual instances with date, time, and status
    - Add "Cancel Series" button that triggers series cancellation flow
    - Add per-instance "Cancel" button for individual cancellation
    - Use theme tokens from `src/theme/` for all styling
    - _Requirements: 6.1, 6.2, 7.1, 7.3_

  - [ ] 6.2 Add recurring grouping logic to `MyRentalsScreen`
    - In `src/screens/facilities/MyRentalsScreen.tsx`, group rentals by `recurringGroupId`
    - Render `RecurringSeriesCard` for grouped rentals, regular rental cards for non-recurring
    - Fetch series metadata via `RecurringBookingService.getSeriesDetails()` for each group
    - Sort groups by next upcoming instance date
    - _Requirements: 6.1, 6.2_

  - [ ] 6.3 Implement single instance cancellation from series card
    - On per-instance "Cancel" tap, call existing `DELETE /rentals/:rentalId` endpoint
    - Update local state to reflect cancelled instance
    - Show confirmation dialog before cancelling
    - Update remaining count in the series card header
    - _Requirements: 7.1, 7.2_

  - [ ] 6.4 Implement series cancellation from series card
    - On "Cancel Series" tap, show confirmation dialog with count of future instances to cancel
    - Dispatch `cancelRecurringSeries` thunk with `groupId`
    - On success, refresh the rentals list
    - On error, show toast with error message
    - _Requirements: 7.3, 7.4_

- [ ] 7. Checkpoint — Verify My Reservations integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Property-based tests for occurrence generation
  - [ ]* 8.1 Write property test: Weekly occurrences preserve day of week
    - **Property 1: Weekly occurrences preserve day of week**
    - Use fast-check to generate random start/end date pairs where end > start
    - Assert all dates from `generateOccurrences({ frequency: 'weekly', ... })` share the same `getUTCDay()` as start date
    - File: `server/src/services/__tests__/recurring-bookings.test.ts`
    - **Validates: Requirements 2.1**

  - [ ]* 8.2 Write property test: Monthly occurrences preserve day of month with clamping
    - **Property 2: Monthly occurrences preserve day of month (with clamping)**
    - Use fast-check to generate random start dates (including 29th, 30th, 31st) and end dates
    - Assert each date's `getUTCDate()` equals `min(startDate.getUTCDate(), lastDayOfThatMonth)`
    - File: `server/src/services/__tests__/recurring-bookings.test.ts`
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 8.3 Write property test: Instance count cap
    - **Property 11: Instance count cap**
    - Use fast-check to generate arbitrary valid recurring patterns
    - Assert `generateOccurrences` never returns more than 52 dates
    - File: `server/src/services/__tests__/recurring-bookings.test.ts`
    - **Validates: Requirements Limits L.1**

  - [ ]* 8.4 Write property test: Occurrence generation bounds
    - **Property 12: Occurrence generation bounds**
    - Use fast-check to generate valid recurring patterns
    - Assert first element equals start date, all elements <= end date, list is sorted ascending, no duplicates
    - File: `server/src/services/__tests__/recurring-bookings.test.ts`
    - **Validates: Requirements 2.1, 2.2**

- [ ] 9. Property-based tests for API behavior
  - [ ]* 9.1 Write property test: End date validation rejects invalid configurations
    - **Property 3: End date validation rejects invalid configurations**
    - Use fast-check to generate configs with null end dates, end <= start, and end > 365 days out
    - Assert the API returns 400 for each invalid case and accepts valid configs
    - File: `server/src/routes/__tests__/recurring-rentals.test.ts`
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 9.2 Write property test: Availability check correctly classifies slots
    - **Property 4: Availability check correctly classifies slots**
    - Use fast-check to generate sets of occurrence dates with random slot availability states
    - Assert every date appears in exactly one of `available` or `conflicts`, none omitted or duplicated
    - File: `server/src/routes/__tests__/recurring-rentals.test.ts`
    - **Validates: Requirements 4.1**

  - [ ]* 9.3 Write property test: Skip-conflicts books only available slots
    - **Property 5: Skip-conflicts books only available slots**
    - Use fast-check to generate booking requests with mixed availability
    - Assert created rentals correspond exactly to available slots
    - File: `server/src/routes/__tests__/recurring-rentals.test.ts`
    - **Validates: Requirements 4.3**

  - [ ]* 9.4 Write property test: Recurring creation produces correct rental count with shared group ID
    - **Property 6: Recurring creation produces correct rental count with shared group ID**
    - Use fast-check to generate valid booking requests with N available slots
    - Assert exactly N `FacilityRental` records created, all sharing the same `recurringGroupId`
    - File: `server/src/routes/__tests__/recurring-rentals.test.ts`
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 9.5 Write property test: RecurringBooking metadata matches request
    - **Property 7: RecurringBooking metadata matches request**
    - Assert `RecurringBooking` record fields match the original request and `totalInstances` equals rental count
    - File: `server/src/routes/__tests__/recurring-rentals.test.ts`
    - **Validates: Requirements 5.3**

  - [ ]* 9.6 Write property test: Rentals with shared recurringGroupId group together
    - **Property 8: Rentals with shared recurringGroupId group together**
    - Assert all rentals in a group share the same `courtId`, `userId`, and time window
    - File: `server/src/routes/__tests__/recurring-rentals.test.ts`
    - **Validates: Requirements 6.1**

  - [ ]* 9.7 Write property test: Single instance cancellation preserves sibling instances
    - **Property 9: Single instance cancellation preserves sibling instances**
    - Create a series, cancel one instance, assert siblings remain confirmed and `activeInstances` decremented by 1
    - File: `server/src/routes/__tests__/recurring-rentals.test.ts`
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 9.8 Write property test: Series cancellation affects only future instances
    - **Property 10: Series cancellation affects only future instances**
    - Create a series spanning past and future dates, cancel series, assert only future confirmed rentals become cancelled
    - File: `server/src/routes/__tests__/recurring-rentals.test.ts`
    - **Validates: Requirements 7.3, 7.4**

- [ ] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Backend API endpoints, Prisma models, and `generateOccurrences` service already exist — no backend implementation needed
- `RecurringBookingToggle` and `RecurringConflictsModal` are already implemented — tasks wire them into the flow
- Each property test maps to a correctness property from the design document
- All UI must use theme tokens from `src/theme/` per brand guidelines
