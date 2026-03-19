# Design Document: Events Calendar View

## Overview

This design replaces the flat `SectionList` in `EventsListScreen` with a calendar-driven layout powered by `react-native-calendars`. The screen gains a dependent toggle bar at the top so guardians can filter by family member, a month-view calendar with color-coded dot markers, and a date-filtered event list below. The existing search/filter bar and list/map `ViewToggle` are preserved in their current positions.

The core change is structural: instead of paginating all events, the screen fetches events scoped to the visible month and renders them through the calendar + date-list pattern. A deterministic color assignment system maps each family member to a distinct color so dots and event cards are visually attributable.

### Key Design Decisions

1. **`multi-dot` marking type** — `react-native-calendars` supports a `multi-dot` marking type on its `Calendar` component, which allows rendering multiple colored dots under a single date. This is essential for the "Whole Crew" view where several family members may have events on the same day.

2. **Month-scoped fetching** — Rather than paginating all events, the screen fetches events for the currently visible calendar month (first day to last day) using the existing `useGetEventsQuery` hook with `startDate`/`endDate` filters. This keeps payloads small and avoids loading data the user can't see.

3. **Local UI state over Redux** — Selected date, active filter person, and visible month are local `useState` values within the refactored screen component. These are ephemeral UI concerns that don't need to persist or be shared across screens.

4. **Deterministic color palette** — Person colors are assigned by index position (guardian = index 0, dependents in order from the `context` slice). The palette is a fixed array of 8 visually distinct colors chosen to contrast against `colors.chalk` / `colors.chalkWarm` backgrounds. This avoids randomness and ensures colors are stable across renders.

5. **Event ownership via participants array** — The `Event` type already carries a `participants` array with `userId` fields, plus an `organizerId`. Ownership is determined by checking if a person's user ID matches `organizerId` or any `participants[].userId`. No new API endpoint is needed.

## Architecture

```mermaid
graph TD
    subgraph EventsListScreen ["EventsListScreen (refactored)"]
        DT[DependentToggle]
        CK[ColorKey]
        SB[SearchBar + FilterButton]
        VT[ViewToggle]
        CAL[EventsCalendar]
        DEL[DateEventList]
        MAP[EventsMapViewWrapper]
    end

    subgraph State ["Local UI State"]
        SD[selectedDate: string]
        AF[activeFilter: PersonFilter]
        VM[visibleMonth: string]
        VW[viewMode: list | map]
    end

    subgraph Redux ["Redux / RTK Query"]
        CTX[contextSlice — dependents]
        EQ[useGetEventsQuery — month-scoped]
        BQ[useGetUserBookingsQuery]
        AUTH[useAuth — current user]
    end

    subgraph Utils ["Utilities"]
        CC[personColors — color assignment]
        CU[calendarUtils — theme, formatDateForCalendar]
        EO[getEventOwnership — ownership resolver]
    end

    AUTH --> DT
    CTX --> DT
    DT --> AF
    AF --> CAL
    AF --> DEL
    SD --> DEL
    VM --> EQ
    EQ --> CAL
    EQ --> DEL
    BQ --> DEL
    CC --> CAL
    CC --> DEL
    CC --> CK
    CU --> CAL
    EO --> CAL
    EO --> DEL
    VW --> MAP
    VW --> CAL
```

### Component Hierarchy

```
EventsListScreen (refactored)
├── DependentToggle (new)
│   └── ColorKey (new, inline legend)
├── SearchBar (existing)
├── FilterButton (existing)
├── ViewToggle (existing)
├── [viewMode === 'list']
│   ├── EventsCalendar (new, wraps react-native-calendars Calendar)
│   └── DateEventList (new, wraps SectionList of EventCards)
│       └── EventCard (existing, with color indicator prop)
│       └── EmptyState (new, inline)
└── [viewMode === 'map']
    └── EventsMapViewWrapper (existing)
```


## Components and Interfaces

### 1. DependentToggle

A horizontal scrollable row of pill-shaped buttons rendered at the top of the Events tab. Each pill shows a person's first name. The active pill uses `colors.grass` background with white text; inactive pills use `colors.chalk` background with `colors.ink` text.

```typescript
type PersonFilter =
  | { type: 'individual'; userId: string }
  | { type: 'wholeCrew' };

interface DependentToggleProps {
  guardian: User;
  dependents: DependentSummary[];
  activeFilter: PersonFilter;
  onFilterChange: (filter: PersonFilter) => void;
  personColors: Map<string, string>; // userId → hex color
}
```

Behavior:
- Renders nothing when `dependents.length === 0` (Requirement 3.3).
- Default selection is the guardian (Requirement 3.7).
- Includes a `ColorKey` row below the pills when dependents exist, showing each person's first name next to a small colored circle (Requirement 4.6).
- The "Whole Crew" pill is always the last option.

### 2. ColorKey

An inline row rendered directly below the `DependentToggle` pills. Each entry is a small circle filled with the person's `Person_Color` followed by their first name in `fonts.label` at a small size.

```typescript
interface ColorKeyProps {
  entries: Array<{ userId: string; firstName: string; color: string }>;
}
```

Not rendered when the guardian has no dependents (Requirement 4.7).

### 3. EventsCalendar

A thin wrapper around `react-native-calendars` `Calendar` component configured with the shared `calendarTheme` and `multi-dot` marking type.

```typescript
interface EventsCalendarProps {
  selectedDate: string;                    // YYYY-MM-DD
  markedDates: Record<string, MultiDotMarking>; // pre-computed
  onDateSelect: (dateString: string) => void;
  onMonthChange: (month: { year: number; month: number }) => void;
}

// MultiDotMarking shape from react-native-calendars
interface MultiDotMarking {
  dots: Array<{ key: string; color: string }>;
  selected?: boolean;
  selectedColor?: string;
}
```

Behavior:
- Uses `markingType="multi-dot"` to support multiple colored dots per date.
- Applies `calendarTheme` from `src/utils/calendarUtils.ts` (Requirement 1.1).
- Arrow colors use `colors.grass` (Requirement 1.2, already in `calendarTheme.arrowColor`).
- Selected date gets a green circle via `selected: true, selectedColor: colors.grass` (Requirement 1.3).
- Defaults selected date to today on mount (Requirement 1.4).
- Calls `onMonthChange` when the user navigates months, triggering a new data fetch.

### 4. DateEventList

A `SectionList` that displays events for the selected date, split into "My Events" and "Public Events" sections, reusing the existing `EventCard` component.

```typescript
interface DateEventListProps {
  events: Event[];
  currentUserId: string;
  activeFilter: PersonFilter;
  personColors: Map<string, string>;
  bookedEventIds: Set<string>;
  onEventPress: (event: Event) => void;
  isLoading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}
```

Behavior:
- Filters the month's events to only those whose `startTime` falls on the selected date (Requirement 2.1).
- Renders `EventCard` for each event (Requirement 2.2).
- Splits into "My Events" / "Public Events" sections (Requirement 2.3).
- Shows an empty state with a calendar icon and message when no events match (Requirement 2.4).
- Passes a `colorIndicator` prop to `EventCard` for the person color stripe (Requirement 4.5). This requires a minor extension to `EventCard` — an optional `colorIndicator?: string` prop that renders a small colored left-border or badge.

### 5. EventCard Extension

The existing `EventCard` component receives one new optional prop:

```typescript
interface EventCardProps {
  // ... existing props
  colorIndicator?: string; // hex color for left-border stripe
}
```

When provided, a 4px-wide vertical stripe in the given color is rendered on the left edge of the card. When not provided, the card renders as before (backward compatible).

## Data Models

### PersonFilter

```typescript
type PersonFilter =
  | { type: 'individual'; userId: string }
  | { type: 'wholeCrew' };
```

Represents the active selection in the `DependentToggle`. Used to filter events for both the calendar dots and the date event list.

### Person Color Palette

```typescript
const PERSON_COLORS: string[] = [
  '#3D8C5E', // grass — guardian always gets the brand green
  '#5B9FD4', // sky blue
  '#E8A030', // court gold
  '#9B59B6', // purple
  '#E67E22', // orange
  '#1ABC9C', // teal
  '#E74C3C', // red
  '#34495E', // dark slate
];

function assignPersonColors(
  guardianId: string,
  dependents: DependentSummary[]
): Map<string, string> {
  const map = new Map<string, string>();
  map.set(guardianId, PERSON_COLORS[0]);
  dependents.forEach((dep, index) => {
    map.set(dep.id, PERSON_COLORS[(index + 1) % PERSON_COLORS.length]);
  });
  return map;
}
```

The guardian always receives index 0 (`colors.grass`). Dependents are assigned sequentially. The palette wraps if there are more than 8 family members (unlikely but handled). All colors are chosen to be visually distinguishable against `colors.chalk` and `colors.chalkWarm` backgrounds (Requirement 4.2).

### Event Ownership Resolution

```typescript
interface EventOwnership {
  ownerUserIds: string[]; // all family member IDs associated with this event
}

function resolveEventOwnership(
  event: Event,
  familyUserIds: string[] // [guardianId, ...dependentIds]
): EventOwnership {
  const ownerUserIds: string[] = [];
  for (const userId of familyUserIds) {
    const isOrganizer = event.organizerId === userId;
    const isParticipant = event.participants?.some(p => p.userId === userId);
    if (isOrganizer || isParticipant) {
      ownerUserIds.push(userId);
    }
  }
  return { ownerUserIds };
}
```

This function is called for each event to determine which family members are associated with it. It checks both `organizerId` and the `participants` array (Requirement 7.1, 7.2). An event can be associated with multiple family members (Requirement 7.3).

### Marked Dates Computation

```typescript
function buildMarkedDates(
  events: Event[],
  activeFilter: PersonFilter,
  familyUserIds: string[],
  personColors: Map<string, string>,
  selectedDate: string
): Record<string, MultiDotMarking> {
  const dateMap: Record<string, Set<string>> = {}; // date → set of userIds with events

  for (const event of events) {
    const dateKey = formatDateForCalendar(new Date(event.startTime));
    const ownership = resolveEventOwnership(event, familyUserIds);

    if (activeFilter.type === 'wholeCrew') {
      // Show dots for all family members who own this event
      if (!dateMap[dateKey]) dateMap[dateKey] = new Set();
      ownership.ownerUserIds.forEach(id => dateMap[dateKey].add(id));
    } else {
      // Show dot only if the filtered person owns this event
      if (ownership.ownerUserIds.includes(activeFilter.userId)) {
        if (!dateMap[dateKey]) dateMap[dateKey] = new Set();
        dateMap[dateKey].add(activeFilter.userId);
      }
    }
  }

  // Also include public events (no family ownership) as a neutral dot
  for (const event of events) {
    const dateKey = formatDateForCalendar(new Date(event.startTime));
    const ownership = resolveEventOwnership(event, familyUserIds);
    if (ownership.ownerUserIds.length === 0) {
      if (!dateMap[dateKey]) dateMap[dateKey] = new Set();
      dateMap[dateKey].add('__public__');
    }
  }

  const marked: Record<string, MultiDotMarking> = {};
  for (const [date, userIds] of Object.entries(dateMap)) {
    const dots = Array.from(userIds).map(uid => ({
      key: uid,
      color: uid === '__public__'
        ? colors.inkFaint
        : personColors.get(uid) || colors.inkFaint,
    }));
    marked[date] = {
      dots,
      ...(date === selectedDate
        ? { selected: true, selectedColor: colors.grass }
        : {}),
    };
  }

  return marked;
}
```

### Month-Scoped Query Parameters

When the visible month changes, the screen computes `startDate` and `endDate` for the RTK Query call:

```typescript
function getMonthDateRange(year: number, month: number): { startDate: Date; endDate: Date } {
  const startDate = new Date(year, month - 1, 1);        // first day of month
  const endDate = new Date(year, month, 0, 23, 59, 59);  // last day of month
  return { startDate, endDate };
}
```

The `useGetEventsQuery` hook is called with these dates in the `filters` parameter, along with the current user's ID. The `EventFilters` type already supports `startDate` and `endDate` fields.

### State Shape (Local)

```typescript
// Inside refactored EventsListScreen
const [selectedDate, setSelectedDate] = useState<string>(formatDateForCalendar(new Date()));
const [activeFilter, setActiveFilter] = useState<PersonFilter>({ type: 'individual', userId: currentUser.id });
const [visibleMonth, setVisibleMonth] = useState<{ year: number; month: number }>({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
});
const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Dots reflect event presence

*For any* set of events, any active filter (individual or Whole Crew), and any date, the marked dates object should contain a dot entry for that date if and only if at least one event with a matching owner exists on that date under the active filter. Conversely, dates with no matching events should have no dots.

**Validates: Requirements 1.5, 1.6**

### Property 2: Date filtering returns only same-day events

*For any* selected date and any set of events, the date-filtered event list should contain exactly those events whose `startTime` falls on the selected date (same year, month, and day). No events from other dates should appear, and no matching events should be omitted.

**Validates: Requirements 2.1**

### Property 3: Section categorization is a partition

*For any* set of date-filtered events and a current user ID, the "My Events" section should contain exactly those events where `organizerId === currentUserId`, and the "Public Events" section should contain exactly the remaining events. The two sections should be disjoint and their union should equal the full filtered set.

**Validates: Requirements 2.3**

### Property 4: Toggle option count equals family size plus one

*For any* guardian with N dependents (where N > 0), the `DependentToggle` should render exactly N + 2 options: one for the guardian, one for each dependent, and one "Whole Crew" option.

**Validates: Requirements 3.2**

### Property 5: Individual filter shows only that person's events

*For any* individual person filter (guardian or dependent) and any set of events, the filtered event list should contain exactly those events where the filtered person's user ID matches either the event's `organizerId` or any entry in the event's `participants[].userId` array.

**Validates: Requirements 3.4, 7.4**

### Property 6: Whole Crew filter is the union of all individual filters

*For any* set of events and any family (guardian + dependents), the set of events shown under the "Whole Crew" filter should equal the union of events that would be shown under each individual family member's filter. No event should appear in Whole Crew that wouldn't appear for at least one individual, and no event visible to any individual should be missing from Whole Crew.

**Validates: Requirements 3.5, 7.3**

### Property 7: Color assignment produces unique colors for all family members

*For any* guardian and any set of up to 7 dependents, the `assignPersonColors` function should return a map where every family member has a distinct color value. No two family members should share the same hex color string.

**Validates: Requirements 4.1**

### Property 8: Dot and card colors match assigned person colors

*For any* event, any active filter, and any person color assignment, the color used for an event's dot on the calendar and the color indicator on its event card should exactly match the `Person_Color` assigned to the owning person. In Whole Crew mode, each dot on a multi-dot date should use the color of the specific person it represents.

**Validates: Requirements 4.3, 4.4, 4.5**

### Property 9: Month date range spans exactly the full month

*For any* year and month value, the `getMonthDateRange` function should return a `startDate` that is the first day of that month (day 1, 00:00:00) and an `endDate` that is the last day of that month (23:59:59). The range should never include days from adjacent months.

**Validates: Requirements 5.2**

### Property 10: Event ownership resolution is correct

*For any* event and any set of family user IDs, the `resolveEventOwnership` function should return exactly those user IDs that appear as the event's `organizerId` or in the event's `participants[].userId` array. It should not include user IDs that are neither the organizer nor a participant, and it should not omit any that are.

**Validates: Requirements 7.1, 7.2**

## Error Handling

| Scenario | Behavior |
|---|---|
| `useGetEventsQuery` returns an error | Display error view with `Ionicons alert-circle-outline` icon, error message, and a "Retry" button that calls `refetch()`. Matches existing error handling pattern in `EventsListScreen`. |
| Events are loading (initial or month change) | Show `LoadingSpinner` component in place of the calendar + list area. |
| Network timeout during month navigation | RTK Query's built-in retry (3 attempts with backoff) handles transient failures. After exhaustion, the error state above is shown. |
| `dependents` array is empty | `DependentToggle` and `ColorKey` are not rendered. The screen behaves as a single-user calendar with no color coding. |
| `currentUser` is null (not authenticated) | The screen should not be reachable in this state (tab navigator is behind auth gate). No special handling needed. |
| Event has no `participants` array | `resolveEventOwnership` treats missing/empty `participants` as an empty array. Only `organizerId` match is checked. |
| Selected date has no events | `DateEventList` renders the `EmptyState` component with a calendar icon and "No events on this day" message. |
| Pull-to-refresh | Calls `refetchEvents()` for the current month range. `RefreshControl` with `colors.grass` tint, matching existing pattern. |

## Testing Strategy

### Property-Based Testing

Use `fast-check` (already in the project's dev dependencies per `tech.md`) for property-based tests. Each property test should run a minimum of 100 iterations.

Tests should be placed in `tests/events-calendar/` and each test file should reference the design property it validates via a comment tag.

Tag format: `Feature: events-calendar-view, Property {number}: {property_text}`

**Property tests to implement:**

1. `buildMarkedDates.property.test.ts` — Properties 1, 8 (dots reflect event presence; dot colors match person colors)
2. `dateFilter.property.test.ts` — Property 2 (date filtering correctness)
3. `sectionCategorization.property.test.ts` — Property 3 (My Events / Public Events partition)
4. `dependentToggle.property.test.ts` — Property 4 (toggle option count)
5. `eventFiltering.property.test.ts` — Properties 5, 6 (individual filter correctness; Whole Crew union)
6. `assignPersonColors.property.test.ts` — Property 7 (color uniqueness)
7. `getMonthDateRange.property.test.ts` — Property 9 (month range correctness)
8. `resolveEventOwnership.property.test.ts` — Property 10 (ownership resolution)

**Generators needed:**
- `arbitraryEvent` — generates random `Event` objects with valid `startTime`, `organizerId`, and `participants` arrays
- `arbitraryDependentSummary` — generates random `DependentSummary` objects with unique IDs
- `arbitraryPersonFilter` — generates either an individual filter or Whole Crew
- `arbitraryYearMonth` — generates valid year (2020–2030) and month (1–12) pairs

### Unit Testing

Use Jest + React Native Testing Library for unit and component tests. Unit tests complement property tests by covering specific examples and edge cases.

**Unit tests to implement:**

1. `EventsCalendar.test.tsx` — Verify calendar renders with `calendarTheme`, defaults to today, selected date highlighting
2. `DependentToggle.test.tsx` — Verify not rendered when no dependents, default selection is guardian, "Whole Crew" option present
3. `DateEventList.test.tsx` — Verify empty state rendering, section headers, EventCard color indicator prop
4. `ColorKey.test.tsx` — Verify not rendered when no dependents, shows correct names and colors
5. `EventsListScreen.integration.test.tsx` — Verify view mode toggle between calendar and map, search bar preservation, month navigation triggers refetch

### Testing Balance

- Property tests handle comprehensive input coverage for pure logic functions (`resolveEventOwnership`, `assignPersonColors`, `buildMarkedDates`, `getMonthDateRange`, date filtering, section categorization)
- Unit tests handle specific UI rendering examples, edge cases (no dependents, empty events), and integration points (RTK Query hook calls, navigation)
- Together they provide coverage of both the logic layer and the presentation layer
