# Requirements Document

## Introduction

This feature extends the Muster League model with three capabilities: minimum roster size enforcement, registration close dates, and automated round-robin schedule generation. Together these allow a Commissioner (league organizer) to configure roster eligibility rules, control registration windows, and auto-generate shell events that can later be assigned to facilities through the standard booking flow.

## Glossary

- **League**: An organised competition in Muster where Rosters compete across a season
- **Roster**: A group of Players; the unit that joins a League (never "Team" in user-facing copy)
- **Commissioner**: The League organizer (`League.organizerId`); the user who created and manages the League
- **Player**: A member of a Roster (never "Member" in roster context)
- **Shell_Event**: An Event created by schedule generation that has Rosters assigned but no Facility; its `scheduledStatus` is `unscheduled`
- **Join_API**: The `POST /api/leagues/:id/join` endpoint that handles Roster and user join requests
- **Schedule_Generator**: A backend service that produces round-robin Shell_Events for a League season
- **League_Detail_Screen**: The `LeagueDetailsScreen` component that displays League information to users
- **Registration_Window**: The period during which Rosters may join a League, ending at `registrationCloseDate`

## Requirements

### Requirement 1: Minimum Roster Size — Data Model

**User Story:** As a Commissioner, I want to set a minimum roster size on my League, so that only Rosters with enough Players can join.

#### Acceptance Criteria

1. THE League model SHALL include a nullable integer field `minimumRosterSize`
2. WHEN `minimumRosterSize` is provided during League creation or update, THE League model SHALL store the value as a positive integer greater than or equal to 1
3. WHEN `minimumRosterSize` is not provided, THE League model SHALL default the field to null, indicating no minimum is enforced

### Requirement 2: Minimum Roster Size — Join Enforcement

**User Story:** As a Commissioner, I want the system to reject Rosters that do not meet the minimum player count, so that all competing Rosters are adequately staffed.

#### Acceptance Criteria

1. WHEN a Roster attempts to join a League via the Join_API AND the League has a non-null `minimumRosterSize`, THE Join_API SHALL count the number of active Players on the Roster
2. IF the Roster's active Player count is less than the League's `minimumRosterSize`, THEN THE Join_API SHALL reject the request with HTTP 400 and an error message stating the minimum requirement and the Roster's current Player count
3. WHILE `minimumRosterSize` is null on a League, THE Join_API SHALL skip the minimum roster size check entirely
4. WHEN a Roster meets or exceeds the `minimumRosterSize`, THE Join_API SHALL proceed with the existing join flow without modification

### Requirement 3: Minimum Roster Size — Display

**User Story:** As a Player, I want to see the minimum roster size on the League detail screen, so that I know how many Players my Roster needs before joining.

#### Acceptance Criteria

1. WHEN a League has a non-null `minimumRosterSize`, THE League_Detail_Screen SHALL display the minimum roster size value in the League info section
2. WHILE `minimumRosterSize` is null on a League, THE League_Detail_Screen SHALL omit the minimum roster size from the display

### Requirement 4: Registration Close Date — Data Model

**User Story:** As a Commissioner, I want to set a registration close date on my League, so that Rosters cannot join after a deadline.

#### Acceptance Criteria

1. THE League model SHALL include a nullable datetime field `registrationCloseDate`
2. WHEN `registrationCloseDate` is provided during League creation or update, THE League model SHALL store the value as a valid UTC datetime
3. WHEN `registrationCloseDate` is not provided, THE League model SHALL default the field to null, indicating registration has no deadline

### Requirement 5: Registration Close Date — Join Enforcement

**User Story:** As a Commissioner, I want the system to reject join attempts after the registration close date, so that the League roster is locked before the season begins.

#### Acceptance Criteria

1. WHEN a Roster or user attempts to join a League via the Join_API AND the League has a non-null `registrationCloseDate`, THE Join_API SHALL compare the current server time against the `registrationCloseDate`
2. IF the current server time is after the `registrationCloseDate`, THEN THE Join_API SHALL reject the request with HTTP 400 and an error message stating that registration has closed
3. WHILE `registrationCloseDate` is null on a League, THE Join_API SHALL skip the registration close date check entirely
4. WHEN the current server time is before or equal to the `registrationCloseDate`, THE Join_API SHALL proceed with the existing join flow without modification

### Requirement 6: Registration Close Date — Display

**User Story:** As a Player, I want to see the registration close date on the League detail screen, so that I know the deadline to join.

#### Acceptance Criteria

1. WHEN a League has a non-null `registrationCloseDate`, THE League_Detail_Screen SHALL display the registration close date formatted in the user's locale
2. WHEN the `registrationCloseDate` has passed, THE League_Detail_Screen SHALL display a visual indicator that registration is closed
3. WHILE `registrationCloseDate` is null on a League, THE League_Detail_Screen SHALL omit the registration close date from the display


### Requirement 7: Schedule Configuration — Data Model

**User Story:** As a Commissioner, I want to configure preferred game days, time windows, and season game count, so that the schedule generator can create events that fit my League's needs.

#### Acceptance Criteria

1. THE League model SHALL include a `preferredGameDays` field stored as an integer array, where each integer represents a day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
2. THE League model SHALL include `preferredTimeWindowStart` and `preferredTimeWindowEnd` fields stored as strings in HH:MM 24-hour format
3. THE League model SHALL include a `seasonGameCount` integer field representing the total number of games each Roster plays in the season
4. WHEN `preferredTimeWindowStart` is provided, THE League model SHALL validate that the value matches the HH:MM 24-hour format
5. WHEN `preferredTimeWindowEnd` is provided, THE League model SHALL validate that the value matches the HH:MM 24-hour format
6. WHEN schedule configuration fields are not provided, THE League model SHALL default each field to null, indicating no schedule preferences are set

### Requirement 8: Scheduled Status on Events

**User Story:** As a Commissioner, I want events to have a scheduled status, so that I can distinguish between shell events awaiting facility assignment and fully scheduled events.

#### Acceptance Criteria

1. THE Event model SHALL include a `scheduledStatus` field with allowed values `unscheduled` and `scheduled`
2. THE Event model SHALL default `scheduledStatus` to `scheduled` for all existing and manually created events
3. WHEN the Schedule_Generator creates a Shell_Event, THE Schedule_Generator SHALL set the `scheduledStatus` to `unscheduled`

### Requirement 9: Round-Robin Schedule Generation — Automatic Trigger

**User Story:** As a Commissioner, I want the system to automatically generate a round-robin schedule after registration closes, so that all Rosters are paired for the season without manual effort.

#### Acceptance Criteria

1. WHEN a League's `registrationCloseDate` passes AND the League has at least 2 active Roster memberships AND schedule configuration fields (`preferredGameDays`, `seasonGameCount`) are set, THE Schedule_Generator SHALL produce Shell_Events using a round-robin algorithm
2. THE Schedule_Generator SHALL assign exactly two Rosters (home and away) to each Shell_Event
3. THE Schedule_Generator SHALL create Shell_Events with no Facility assigned (`facilityId` = null)
4. THE Schedule_Generator SHALL distribute Shell_Events across the `preferredGameDays` within the `preferredTimeWindowStart` and `preferredTimeWindowEnd` window
5. THE Schedule_Generator SHALL generate a total number of Shell_Events consistent with the `seasonGameCount` and the number of active Rosters in the League
6. IF the League has fewer than 2 active Roster memberships at the time of generation, THEN THE Schedule_Generator SHALL skip generation and log a warning

### Requirement 10: Round-Robin Schedule Generation — Manual Trigger

**User Story:** As a Commissioner, I want to manually trigger schedule generation when no registration close date is set, so that I can control when the schedule is created.

#### Acceptance Criteria

1. WHILE a League has a null `registrationCloseDate`, THE system SHALL expose an API endpoint `POST /api/leagues/:id/generate-schedule` accessible to the Commissioner
2. WHEN the Commissioner calls the generate-schedule endpoint, THE Schedule_Generator SHALL produce Shell_Events using the same round-robin algorithm as the automatic trigger
3. IF the League has a non-null `registrationCloseDate`, THEN THE generate-schedule endpoint SHALL reject the request with HTTP 400 and an error message stating that schedule generation is handled automatically
4. IF the League has fewer than 2 active Roster memberships, THEN THE generate-schedule endpoint SHALL reject the request with HTTP 400 and an error message stating the minimum Roster requirement
5. IF the League does not have `preferredGameDays` or `seasonGameCount` configured, THEN THE generate-schedule endpoint SHALL reject the request with HTTP 400 and an error message stating the missing configuration

### Requirement 11: Facility Assignment and Event Scheduling

**User Story:** As a Commissioner, I want to assign a facility to a shell event through the standard booking flow, so that the event becomes fully scheduled and Roster Players are notified.

#### Acceptance Criteria

1. WHEN a Commissioner assigns a Facility to a Shell_Event via the standard booking flow, THE system SHALL update the Shell_Event's `scheduledStatus` from `unscheduled` to `scheduled`
2. WHEN a Shell_Event's `scheduledStatus` changes to `scheduled`, THE system SHALL send a notification to all Players on both assigned Rosters informing them of the scheduled event details
3. THE notification SHALL include the event date, time, Facility name, and Facility location
4. WHILE a Shell_Event has `scheduledStatus` of `unscheduled`, THE League_Detail_Screen SHALL display the event with a visual indicator that a Facility has not yet been assigned

### Requirement 12: Schedule Configuration — Commissioner UI

**User Story:** As a Commissioner, I want to configure schedule settings when creating or editing a League, so that the schedule generator uses my preferences.

#### Acceptance Criteria

1. THE League creation and edit forms SHALL include fields for `minimumRosterSize`, `registrationCloseDate`, `preferredGameDays`, `preferredTimeWindowStart`, `preferredTimeWindowEnd`, and `seasonGameCount`
2. WHEN the Commissioner selects preferred game days, THE form SHALL allow multiple day selections from Sunday through Saturday
3. WHEN the Commissioner sets a time window, THE form SHALL validate that `preferredTimeWindowStart` is before `preferredTimeWindowEnd`
4. WHEN the Commissioner sets a `registrationCloseDate`, THE form SHALL validate that the date is in the future at the time of submission
5. WHILE a League has a null `registrationCloseDate` AND schedule configuration is complete, THE League_Detail_Screen SHALL display a "Generate Schedule" button visible only to the Commissioner
