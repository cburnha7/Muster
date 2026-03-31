# Requirements Document

## Introduction

Redesign the Create Event screen as a full-screen progressive slide flow consisting of five screens (What, How, Where, When, Who's Invited). Each screen occupies the full viewport and slides horizontally to the next as the user completes each step. The existing header and back arrow are removed; navigation relies on the bottom tab bar. The flow replaces the current `CreateEventScreen` and its `CreationWizard` usage.

## Glossary

- **Event_Flow**: The full-screen five-step progressive slide wizard for creating an event.
- **Sport_Selector**: A visual grid of sport tiles displayed on Screen 1.
- **Event_Details_Form**: The collection of inputs on Screen 2 (event type, age limit, gender, skill level, max participants, price).
- **Ground_Selector**: The dropdown on Screen 3 that lets the user search and pick a Ground (facility).
- **Court_Selector**: The dropdown on Screen 3 that shows courts filtered by the user's reservations or facility ownership.
- **Date_Selector**: The dropdown on Screen 4 that shows dates filtered by the user's reservations on the selected court.
- **Time_Selector**: The dropdown on Screen 4 that shows time slots filtered by the user's reservations on the selected court and date.
- **Recurring_Controls**: The toggle and associated fields (frequency, series end date) on Screen 4.
- **Visibility_Picker**: The Private / Public side-by-side buttons on Screen 5.
- **Invite_Search**: The search bar and results list on Screen 5 for inviting rosters or players.
- **Organizer**: The currently authenticated user creating the event.
- **Facility_Owner**: A user who owns the Ground (facility) being selected.
- **Roster**: A named group of players (never "Team").
- **Players**: Individual users in the context of a roster or event (never "Members").
- **Ground**: A facility or venue where events take place.

## Requirements

### Requirement 1: Full-Screen Slide Flow Container

**User Story:** As an Organizer, I want the create event experience to be a full-screen progressive slide flow, so that each step feels focused and distraction-free.

#### Acceptance Criteria

1. THE Event_Flow SHALL render each step as a full-screen view occupying the entire viewport below the status bar.
2. WHEN the Organizer completes a step, THE Event_Flow SHALL animate a horizontal slide transition to the next screen.
3. WHEN the Organizer navigates backward, THE Event_Flow SHALL animate a horizontal slide transition to the previous screen.
4. THE Event_Flow SHALL NOT render a header bar or back arrow at the top of any screen.
5. THE Event_Flow SHALL remain accessible via the bottom tab bar throughout all five screens.
6. THE Event_Flow SHALL display a progress indicator showing the current step out of five total steps.

### Requirement 2: Screen 1 — Sport Selection (What?)

**User Story:** As an Organizer, I want to pick a sport from a visual grid of tiles, so that I can quickly identify and select the sport for my event.

#### Acceptance Criteria

1. THE Sport_Selector SHALL display all available sports as a visual grid of tappable tiles, each showing the sport emoji and label.
2. WHEN the Organizer taps a sport tile, THE Event_Flow SHALL automatically advance to Screen 2 without requiring a Continue button.
3. THE Sport_Selector SHALL visually highlight the selected sport tile using `colors.cobalt` as the active background color.
4. THE Event_Flow SHALL NOT display a Continue button on Screen 1.

### Requirement 3: Screen 2 — Event Details (How?)

**User Story:** As an Organizer, I want to configure the event type, age limits, gender, skill level, max participants, and price, so that the event has the correct parameters.

#### Acceptance Criteria

1. THE Event_Details_Form SHALL display an Event Type dropdown with options: Game, Practice, Pickup.
2. THE Event_Details_Form SHALL display Age Limit inputs for minimum age and maximum age as numeric fields.
3. THE Event_Details_Form SHALL display a Gender dropdown with options: All, Male, Female.
4. THE Event_Details_Form SHALL display a Skill Level dropdown with the available skill level options.
5. THE Event_Details_Form SHALL display a Max Participants numeric input field.
6. WHILE the Event Type is set to Game, THE Event_Details_Form SHALL label the Max Participants field as "Max Rosters".
7. WHILE the Event Type is set to Practice or Pickup, THE Event_Details_Form SHALL label the Max Participants field as "Max Players".
8. THE Event_Details_Form SHALL display a Price input field prefixed with a dollar sign ($).
9. WHEN the Organizer has selected an Event Type, THE Event_Flow SHALL enable the Continue button on Screen 2.

### Requirement 4: Screen 3 — Ground and Court Selection (Where?)

**User Story:** As an Organizer, I want to select a Ground and court for my event, so that the event is tied to a specific location and playing surface.

#### Acceptance Criteria

1. THE Ground_Selector SHALL display a searchable dropdown listing available Grounds.
2. WHEN the Organizer selects a Ground, THE Event_Flow SHALL reveal the Court_Selector dropdown below the Ground_Selector.
3. WHILE the Organizer is NOT a Facility_Owner of the selected Ground, THE Court_Selector SHALL show only courts on which the Organizer has a future reservation.
4. WHILE the Organizer IS the Facility_Owner of the selected Ground, THE Court_Selector SHALL show all courts that have available time slots.
5. WHEN the Organizer changes the selected Ground, THE Event_Flow SHALL reset and reload the Court_Selector, clearing any previously selected court.
6. THE Event_Flow SHALL display a "Book Court Time" button that is always visible on Screen 3.
7. WHEN the Organizer taps the "Book Court Time" button, THE Event_Flow SHALL navigate to the Grounds tab and open the "Need a Spot?" search modal.
8. WHEN the Organizer has selected both a Ground and a Court, THE Event_Flow SHALL enable the Continue button on Screen 3.

### Requirement 5: Screen 4 — Date and Time Selection (When?)

**User Story:** As an Organizer, I want to pick a date and time for my event based on my reservations, so that the event is scheduled at a time I have court access.

#### Acceptance Criteria

1. THE Date_Selector SHALL display a dropdown of available dates.
2. WHILE the Organizer is NOT a Facility_Owner of the selected Ground, THE Date_Selector SHALL show only dates on which the Organizer has a reservation on the selected court.
3. WHILE the Organizer IS the Facility_Owner of the selected Ground, THE Date_Selector SHALL show all dates that have available time slots on the selected court.
4. WHEN the Organizer selects a date, THE Event_Flow SHALL reveal the Time_Selector dropdown below the Date_Selector.
5. WHILE the Organizer is NOT a Facility_Owner of the selected Ground, THE Time_Selector SHALL show only time slots for which the Organizer has a reservation on the selected court and date.
6. WHILE the Organizer IS the Facility_Owner of the selected Ground, THE Time_Selector SHALL show all available time slots on the selected court and date.
7. THE Event_Flow SHALL display a Recurring toggle on Screen 4.
8. WHEN the Organizer enables the Recurring toggle, THE Recurring_Controls SHALL reveal a Frequency dropdown with options: Weekly, Bi-Weekly, Monthly.
9. WHEN the Organizer enables the Recurring toggle, THE Recurring_Controls SHALL reveal a Series End Date input specifying when the recurring series stops.
10. WHEN the Organizer has selected a date and at least one time slot, THE Event_Flow SHALL enable the Continue button on Screen 4.

### Requirement 6: Screen 5 — Visibility and Invitations (Who's Invited?)

**User Story:** As an Organizer, I want to set the event as Private or Public and invite specific rosters or players, so that I control who can join the event.

#### Acceptance Criteria

1. THE Visibility_Picker SHALL display two side-by-side buttons labeled "Private" and "Public".
2. THE Visibility_Picker SHALL render both buttons in an unselected state by default.
3. WHEN the Organizer taps "Private", THE Event_Flow SHALL reveal the Invite_Search below the Visibility_Picker.
4. WHILE the Event Type is Game AND visibility is Private, THE Invite_Search SHALL display a roster search bar that queries roster names only.
5. WHILE the Event Type is Game AND visibility is Private, THE Invite_Search SHALL display selected rosters below the search bar without any labeling such as "Team A" or "Team B".
6. WHILE the Event Type is Practice or Pickup AND visibility is Private, THE Invite_Search SHALL display a unified search bar querying both player names and roster names.
7. WHILE the Event Type is Practice or Pickup AND visibility is Private, THE Invite_Search SHALL display a three-person group icon next to roster results and a profile picture or single-person icon next to player results.
8. WHILE the Event Type is Practice or Pickup AND visibility is Private, THE Invite_Search SHALL display selected players and rosters below the search bar.
9. WHEN the Organizer taps "Public", THE Event_Flow SHALL reveal a minimum player rating filter below the Visibility_Picker.
10. THE Event_Flow SHALL display a "Create Event" button pinned at the bottom of Screen 5.
11. WHEN the Organizer taps the "Create Event" button, THE Event_Flow SHALL submit the event with all collected data from Screens 1 through 5.
12. IF the event creation request fails, THEN THE Event_Flow SHALL display an error message describing the failure.

### Requirement 7: Brand Vocabulary Compliance

**User Story:** As a product stakeholder, I want all UI text to follow Muster brand vocabulary, so that the experience is consistent with the brand identity.

#### Acceptance Criteria

1. THE Event_Flow SHALL use the term "Roster" in all UI labels and text where a group of players is referenced, and SHALL NOT use "Team", "Group", or "Outfit".
2. THE Event_Flow SHALL use the term "Players" in all UI labels and text where individual roster participants are referenced, and SHALL NOT use "Members".
3. THE Event_Flow SHALL use the term "Ground" in all UI labels and text where a facility or venue is referenced.
4. THE Event_Flow SHALL import all color values from `src/theme/colors.ts` and SHALL NOT hardcode color hex values.
5. THE Event_Flow SHALL import all font family values from `src/theme/typography.ts` and SHALL NOT hardcode font names.
6. THE Event_Flow SHALL use `colors.cobalt` for primary action buttons and active states.
