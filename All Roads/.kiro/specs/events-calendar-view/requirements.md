# Requirements Document

## Introduction

Replace the flat event list on the Events tab with a calendar-driven view and a dependent-aware context switcher. The calendar matches the existing booking calendar style (react-native-calendars with the shared `calendarTheme`), shows dot indicators on dates that have events, and lists events for the selected date below. A toggle at the top of the tab lets the guardian switch between individual family members and a "Whole Crew" aggregate view. Each person is assigned a distinct color so that calendar dots and event cards are color-coded by owner, making it easy to see whose events fall on which day.

## Glossary

- **Events_Tab**: The main Events screen in the bottom tab navigator, currently implemented as `EventsListScreen`. After this feature it renders a calendar, dependent toggle, and date-filtered event list.
- **Events_Calendar**: A month-view calendar component rendered at the top of the Events_Tab, using `react-native-calendars` with the shared `calendarTheme` from `src/utils/calendarUtils.ts`. Displays month navigation arrows, a green circle on the selected date, and dot indicators on dates that have events.
- **Date_Event_List**: The scrollable list of event cards displayed below the Events_Calendar, filtered to show only events occurring on the currently selected date.
- **Dependent_Toggle**: A horizontal switcher rendered above the Events_Calendar showing the current user, each of their dependents, and a "Whole Crew" option. Controls whose events are visible on the calendar and list.
- **Whole_Crew**: A Dependent_Toggle option that combines events for the current user and all dependents on a single calendar view.
- **Person_Color**: A distinct color assigned to each family member (current user and each dependent) used to color-code calendar dots and event cards.
- **Color_Key**: A small legend displayed near the Dependent_Toggle showing each person's name paired with their assigned Person_Color.
- **Event_Dot**: A small colored dot rendered below a date number on the Events_Calendar indicating that one or more events exist on that date for the filtered person(s).
- **Empty_State**: A placeholder view shown in the Date_Event_List when no events exist for the selected date and active filter.
- **Guardian**: The authenticated Muster user who may have dependents. Identified via `useAuth` context.
- **Dependent**: A user record with `isDependent = true` linked to the Guardian via `guardianId`. Loaded from the `context` Redux slice's `dependents` array.
- **Active_Filter**: The currently selected option in the Dependent_Toggle — either an individual person (Guardian or a specific Dependent) or Whole_Crew.

## Requirements

### Requirement 1: Events Calendar Display

**User Story:** As a player, I want to see my events on a calendar instead of a flat list, so that I can quickly understand my schedule at a glance.

#### Acceptance Criteria

1. WHEN the Events_Tab loads, THE Events_Calendar SHALL render a month-view calendar using `react-native-calendars` with the shared `calendarTheme` configuration.
2. THE Events_Calendar SHALL display left and right month navigation arrows styled with `colors.grass`.
3. WHEN a date is selected, THE Events_Calendar SHALL highlight that date with a green circle using `colors.grass` as the background color.
4. WHEN the Events_Tab loads, THE Events_Calendar SHALL default the selected date to today's date.
5. WHEN a date has one or more events for the Active_Filter, THE Events_Calendar SHALL display an Event_Dot below that date number.
6. WHEN a date has no events for the Active_Filter, THE Events_Calendar SHALL display no Event_Dot for that date.

### Requirement 2: Date-Filtered Event List

**User Story:** As a player, I want to see events for a specific day when I tap a date on the calendar, so that I can review what is happening that day.

#### Acceptance Criteria

1. WHEN a date is selected on the Events_Calendar, THE Date_Event_List SHALL display only events whose start time falls on the selected date.
2. THE Date_Event_List SHALL render event cards using the existing `EventCard` component to maintain visual consistency.
3. THE Date_Event_List SHALL separate events into "My Events" and "Public Events" sections, matching the current section layout.
4. WHEN no events exist for the selected date and Active_Filter, THE Date_Event_List SHALL display an Empty_State with a calendar icon and a message indicating no events for that day.
5. THE Events_Tab SHALL keep the search bar and filter button accessible, positioned between the Dependent_Toggle and the Events_Calendar.

### Requirement 3: Dependent Toggle

**User Story:** As a guardian, I want to switch between my events and my dependents' events on the calendar, so that I can manage the whole family's schedule from one screen.

#### Acceptance Criteria

1. THE Dependent_Toggle SHALL render at the top of the Events_Tab, above the search bar and Events_Calendar.
2. THE Dependent_Toggle SHALL display one option for the Guardian (current user), one option for each Dependent loaded from the `context` Redux slice, and one "Whole Crew" option.
3. WHEN the Guardian has no dependents, THE Dependent_Toggle SHALL NOT be rendered.
4. WHEN an individual person is selected in the Dependent_Toggle, THE Events_Calendar and Date_Event_List SHALL display only events associated with that person.
5. WHEN "Whole Crew" is selected in the Dependent_Toggle, THE Events_Calendar and Date_Event_List SHALL display events for the Guardian and all Dependents combined.
6. THE Dependent_Toggle SHALL visually indicate the currently selected option using `colors.grass` as the active background color.
7. WHEN the Events_Tab loads, THE Dependent_Toggle SHALL default to the Guardian's own profile as the selected option.

### Requirement 4: Color Coding

**User Story:** As a guardian, I want each family member's events shown in a distinct color, so that I can tell at a glance whose event is whose.

#### Acceptance Criteria

1. THE System SHALL assign a distinct Person_Color to the Guardian and to each Dependent.
2. THE Person_Color palette SHALL use colors that are visually distinguishable from each other and from the calendar background (`colors.chalk`).
3. WHEN an Event_Dot is rendered on the Events_Calendar for an individual filter, THE Event_Dot SHALL use that person's Person_Color.
4. WHEN "Whole Crew" is selected and a date has events for multiple family members, THE Events_Calendar SHALL display multiple Event_Dots on that date, one per person who has events, each in that person's Person_Color.
5. WHEN an event card is rendered in the Date_Event_List, THE event card SHALL display a color indicator (stripe or badge) using the Person_Color of the person associated with that event.
6. THE Color_Key SHALL be displayed near the Dependent_Toggle, showing each person's first name paired with their assigned Person_Color.
7. WHEN the Guardian has no dependents, THE Color_Key SHALL NOT be rendered.

### Requirement 5: Calendar and List Data Loading

**User Story:** As a player, I want the calendar to load my events efficiently, so that I can browse dates without long waits.

#### Acceptance Criteria

1. WHEN the Events_Tab loads, THE System SHALL fetch events for the currently visible month using the existing `useGetEventsQuery` RTK Query hook with date range filters.
2. WHEN the user navigates to a different month on the Events_Calendar, THE System SHALL fetch events for that month.
3. WHILE events are loading, THE Events_Tab SHALL display a loading indicator.
4. IF the events API request fails, THEN THE Events_Tab SHALL display an error message with a retry option.
5. WHEN the user pulls down to refresh, THE Events_Tab SHALL refetch events for the current month and selected filters.

### Requirement 6: View Mode Toggle Preservation

**User Story:** As a player, I want to still be able to switch to the map view of events, so that I can find nearby events geographically.

#### Acceptance Criteria

1. THE Events_Tab SHALL retain the existing list/map `ViewToggle` component.
2. WHEN the map view is selected, THE Events_Tab SHALL display the `EventsMapViewWrapper` with all events, bypassing the calendar view.
3. WHEN the list view is selected, THE Events_Tab SHALL display the Events_Calendar with the Date_Event_List below it.

### Requirement 7: Dependent Event Association

**User Story:** As a guardian, I want the calendar to correctly show which events belong to which family member, so that the color coding is accurate.

#### Acceptance Criteria

1. THE System SHALL determine event ownership by comparing the event's `organizerId` and participant user IDs against the Guardian's user ID and each Dependent's user ID.
2. WHEN an event is organized by or has a booking for a specific person, THE System SHALL associate that event with that person for filtering and color-coding purposes.
3. WHEN an event is associated with multiple family members (e.g., Guardian organized it and a Dependent joined), THE System SHALL show the event under each associated person's filter and display multiple Person_Color indicators in Whole_Crew view.
4. WHILE the Active_Filter is set to an individual, THE Date_Event_List SHALL show only events where that individual is the organizer or a participant.
