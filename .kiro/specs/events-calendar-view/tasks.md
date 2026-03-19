# Implementation Plan: Events Calendar View

## Overview

Replace the flat event list on the Events tab with a calendar-driven view, dependent-aware context switcher, and color-coded event indicators. Implementation proceeds bottom-up: utility functions first, then new components, then EventCard extension, and finally wiring everything together in the refactored EventsListScreen.

## Tasks

- [x] 1. Create utility functions and types
  - [x] 1.1 Create `src/types/eventsCalendar.ts` with `PersonFilter`, `EventOwnership`, `ColorKeyEntry`, `MultiDotMarking` types and the `PERSON_COLORS` palette constant
    - Define `PersonFilter` union type (`individual` | `wholeCrew`)
    - Define `EventOwnership` interface with `ownerUserIds: string[]`
    - Define `ColorKeyEntry` with `userId`, `firstName`, `color`
    - Export `PERSON_COLORS` array of 8 hex strings as specified in design
    - _Requirements: 4.1, 4.2_

  - [x] 1.2 Create `src/utils/eventsCalendarUtils.ts` with `assignPersonColors`, `resolveEventOwnership`, `buildMarkedDates`, and `getMonthDateRange` functions
    - `assignPersonColors(guardianId, dependents)` → `Map<string, string>` — guardian gets index 0, dependents assigned sequentially with wrap
    - `resolveEventOwnership(event, familyUserIds)` → `EventOwnership` — checks `organizerId` and `participants[].userId`
    - `buildMarkedDates(events, activeFilter, familyUserIds, personColors, selectedDate)` → `Record<string, MultiDotMarking>` — computes multi-dot markings per date, includes public events as neutral dots with `colors.inkFaint`
    - `getMonthDateRange(year, month)` → `{ startDate, endDate }` — first day 00:00:00 to last day 23:59:59
    - _Requirements: 1.5, 1.6, 4.1, 4.3, 4.4, 5.2, 7.1, 7.2, 7.3_

  - [ ]* 1.3 Write property tests for `assignPersonColors`
    - **Property 7: Color assignment produces unique colors for all family members**
    - **Validates: Requirements 4.1**
    - File: `tests/events-calendar/assignPersonColors.property.test.ts`
    - Use `fast-check` with `arbitraryDependentSummary` generator, min 100 iterations

  - [ ]* 1.4 Write property tests for `resolveEventOwnership`
    - **Property 10: Event ownership resolution is correct**
    - **Validates: Requirements 7.1, 7.2**
    - File: `tests/events-calendar/resolveEventOwnership.property.test.ts`
    - Use `fast-check` with `arbitraryEvent` generator, min 100 iterations

  - [ ]* 1.5 Write property tests for `buildMarkedDates`
    - **Property 1: Dots reflect event presence**
    - **Property 8: Dot and card colors match assigned person colors**
    - **Validates: Requirements 1.5, 1.6, 4.3, 4.4, 4.5**
    - File: `tests/events-calendar/buildMarkedDates.property.test.ts`
    - Use `fast-check` with `arbitraryEvent`, `arbitraryPersonFilter` generators, min 100 iterations

  - [ ]* 1.6 Write property tests for `getMonthDateRange`
    - **Property 9: Month date range spans exactly the full month**
    - **Validates: Requirements 5.2**
    - File: `tests/events-calendar/getMonthDateRange.property.test.ts`
    - Use `fast-check` with `arbitraryYearMonth` generator, min 100 iterations

- [x] 2. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create new UI components
  - [x] 3.1 Create `src/components/events/DependentToggle.tsx`
    - Horizontal `ScrollView` of pill-shaped `TouchableOpacity` buttons
    - Props: `guardian`, `dependents`, `activeFilter`, `onFilterChange`, `personColors`
    - Active pill: `colors.grass` background, white text (`fonts.ui`)
    - Inactive pill: `colors.chalk` background, `colors.ink` text
    - Renders nothing when `dependents.length === 0`
    - "Whole Crew" pill is always last
    - Renders `ColorKey` below pills when dependents exist
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 4.6, 4.7_

  - [x] 3.2 Create `src/components/events/ColorKey.tsx`
    - Horizontal row of `{ circle + firstName }` entries
    - Props: `entries: ColorKeyEntry[]`
    - Circle: 10px, filled with person color
    - Name: `fonts.label`, small size
    - Not rendered when entries array is empty
    - _Requirements: 4.6, 4.7_

  - [x] 3.3 Create `src/components/events/EventsCalendar.tsx`
    - Wraps `react-native-calendars` `Calendar` with `markingType="multi-dot"`
    - Props: `selectedDate`, `markedDates`, `onDateSelect`, `onMonthChange`
    - Applies `calendarTheme` from `src/utils/calendarUtils.ts`
    - Selected date: `selected: true, selectedColor: colors.grass`
    - Calls `onMonthChange` on month navigation
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.4 Create `src/components/events/DateEventList.tsx`
    - `SectionList` splitting events into "My Events" and "Public Events" sections
    - Props: `events`, `currentUserId`, `activeFilter`, `personColors`, `bookedEventIds`, `onEventPress`, `isLoading`, `onRefresh`, `refreshing`
    - Filters events to selected date by comparing `startTime` date
    - Renders `EventCard` with `colorIndicator` prop from `personColors`
    - Empty state: calendar icon + "No events on this day" message
    - `RefreshControl` with `colors.grass` tint
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.5, 5.5_

  - [ ]* 3.5 Write property tests for date filtering and section categorization
    - **Property 2: Date filtering returns only same-day events**
    - **Property 3: Section categorization is a partition**
    - **Validates: Requirements 2.1, 2.3**
    - File: `tests/events-calendar/dateFilter.property.test.ts` and `tests/events-calendar/sectionCategorization.property.test.ts`

  - [ ]* 3.6 Write property tests for event filtering (individual and Whole Crew)
    - **Property 5: Individual filter shows only that person's events**
    - **Property 6: Whole Crew filter is the union of all individual filters**
    - **Validates: Requirements 3.4, 3.5, 7.3, 7.4**
    - File: `tests/events-calendar/eventFiltering.property.test.ts`

  - [ ]* 3.7 Write unit tests for DependentToggle
    - File: `tests/events-calendar/DependentToggle.test.tsx`
    - Test: not rendered when no dependents, default selection is guardian, "Whole Crew" option present, active pill styling
    - **Property 4: Toggle option count equals family size plus one**
    - **Validates: Requirements 3.2, 3.3, 3.7**
    - Also include property test in `tests/events-calendar/dependentToggle.property.test.ts`

  - [ ]* 3.8 Write unit tests for ColorKey, EventsCalendar, and DateEventList
    - File: `tests/events-calendar/ColorKey.test.tsx` — not rendered when no dependents, shows correct names and colors
    - File: `tests/events-calendar/EventsCalendar.test.tsx` — renders with calendarTheme, defaults to today, selected date highlighting
    - File: `tests/events-calendar/DateEventList.test.tsx` — empty state rendering, section headers, EventCard color indicator prop
    - _Requirements: 1.1, 1.4, 2.4, 4.6, 4.7_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Extend EventCard and refactor EventsListScreen
  - [x] 5.1 Add `colorIndicator` prop to `EventCard` in `src/components/ui/EventCard.tsx`
    - Add optional `colorIndicator?: string` prop to `EventCardProps`
    - When provided, render a 4px-wide vertical stripe on the left edge of the card in the given color
    - When not provided, card renders as before (backward compatible)
    - _Requirements: 4.5_

  - [x] 5.2 Refactor `src/screens/events/EventsListScreen.tsx` to integrate calendar view
    - Add local state: `selectedDate` (default today), `activeFilter` (default guardian), `visibleMonth`, `viewMode`
    - Load dependents from `context` Redux slice, current user from `useAuth`
    - Compute `personColors` via `assignPersonColors`
    - Call `useGetEventsQuery` with month-scoped date range from `getMonthDateRange`
    - Compute `markedDates` via `buildMarkedDates`
    - Render `DependentToggle` at top (above search bar)
    - Preserve existing search bar and filter button between toggle and calendar
    - Preserve existing `ViewToggle` (list/map)
    - When `viewMode === 'list'`: render `EventsCalendar` + `DateEventList`
    - When `viewMode === 'map'`: render `EventsMapViewWrapper` as before
    - Handle loading state with `LoadingSpinner`
    - Handle error state with retry button calling `refetch()`
    - Handle pull-to-refresh with `RefreshControl`
    - On month change: update `visibleMonth` state to trigger new query
    - _Requirements: 1.1–1.6, 2.1–2.5, 3.1–3.7, 4.1–4.7, 5.1–5.5, 6.1–6.3, 7.1–7.4_

  - [ ]* 5.3 Write integration tests for EventsListScreen
    - File: `tests/events-calendar/EventsListScreen.integration.test.tsx`
    - Test: view mode toggle between calendar and map, search bar preservation, month navigation triggers refetch
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3_

- [x] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific UI rendering examples and edge cases
- TypeScript is used throughout, matching the existing codebase
- All UI components import tokens from `src/theme/` — no hardcoded colors or fonts
- Brand vocabulary: use "Roster" not "Team", "Whole Crew" for the aggregate toggle option
