# Requirements Document

## Introduction

This feature adds a Schedule Import capability to the Muster roster detail screen. A roster manager can upload a CSV, Excel, or PDF file containing a game schedule. The app parses the file, presents each game as a swipeable review card, and creates Events for confirmed games linked to the roster. The feature handles automatic opponent identification, facility matching, and distinguishes between fully scheduled and pending (time TBD) events.

## Glossary

- **Roster**: A group of Players in Muster; the unit that competes in games (the `Team` model in the database, never called "Team" in user-facing copy)
- **Roster_Manager**: A user who has a manager-level role (`captain` or `owner`) on a Roster's `TeamMember` record
- **Roster_Detail_Screen**: The `TeamDetailsScreen` component at `src/screens/teams/TeamDetailsScreen.tsx` that displays Roster information
- **Schedule_File**: A CSV, Excel (.xlsx/.xls), or PDF file uploaded by the Roster_Manager containing game schedule rows
- **File_Parser**: A frontend service that extracts structured game data from a Schedule_File
- **PDF_Parser**: A server-side endpoint that extracts structured game data from a PDF Schedule_File, since PDF parsing requires server-side libraries
- **Game_Row**: A single parsed record from a Schedule_File containing: Game Number, Date, Time, Home Team, Away Team, Location, and Division
- **Review_Card**: A full-screen swipeable card displaying a single parsed Game_Row for user confirmation
- **Confirmed_Event**: An Event created from a confirmed Game_Row with `scheduledStatus` set to `scheduled` (has both date and time)
- **Pending_Event**: An Event created from a confirmed Game_Row that has a date but no time, with `scheduledStatus` set to `unscheduled` and time marked as TBD
- **Muster_Ground**: A Facility record in the database (`facilities` table) that can be linked to an Event via `facilityId`
- **Open_Ground**: A free-text location stored on the Event using `locationName` and `locationAddress` fields when no matching Muster_Ground exists
- **Opponent**: The team in a Game_Row that is not the current Roster; identified by comparing Home Team and Away Team against the Roster name
- **Upcoming_Events_List**: The section of the Roster_Detail_Screen that displays future Events linked to the Roster

## Requirements

### Requirement 1: Import Schedule Button Visibility

**User Story:** As a Roster_Manager, I want to see an "Import Schedule" button on my Roster's detail screen, so that I can initiate a schedule import.

#### Acceptance Criteria

1. WHILE the current user is a Roster_Manager of the displayed Roster, THE Roster_Detail_Screen SHALL display an "Import Schedule" button
2. WHILE the current user is not a Roster_Manager of the displayed Roster, THE Roster_Detail_Screen SHALL hide the "Import Schedule" button
3. WHEN the Roster_Manager taps the "Import Schedule" button, THE Roster_Detail_Screen SHALL open a file picker restricted to CSV, Excel (.xlsx, .xls), and PDF file types

### Requirement 2: CSV and Excel File Parsing

**User Story:** As a Roster_Manager, I want the app to parse my uploaded CSV or Excel file immediately, so that I can review the extracted games without extra steps.

#### Acceptance Criteria

1. WHEN the Roster_Manager selects a CSV or Excel Schedule_File, THE File_Parser SHALL parse the file on the frontend without uploading the file to the server
2. WHEN the File_Parser processes a Schedule_File, THE File_Parser SHALL extract the following fields from each row: Game Number, Date, Time, Home Team, Away Team, Location, and Division
3. WHEN the File_Parser encounters a row with an empty Time field, THE File_Parser SHALL set the Time value to null for that Game_Row
4. WHEN the File_Parser encounters a row with an empty Location field, THE File_Parser SHALL set the Location value to null for that Game_Row
5. IF the File_Parser cannot extract any valid Game_Rows from the Schedule_File, THEN THE File_Parser SHALL display an error message indicating the file could not be parsed
6. FOR ALL valid Game_Row objects, parsing a Schedule_File then formatting the Game_Rows back into tabular data then parsing again SHALL produce equivalent Game_Row objects (round-trip property)

### Requirement 3: PDF File Parsing

**User Story:** As a Roster_Manager, I want to upload a PDF schedule and have the app extract game data from the PDF, so that I can import schedules distributed as PDF documents.

#### Acceptance Criteria

1. WHEN the Roster_Manager selects a PDF Schedule_File, THE app SHALL upload the PDF to the PDF_Parser server endpoint for processing
2. WHEN the PDF_Parser receives a PDF file, THE PDF_Parser SHALL extract Game_Row data with the same fields as the File_Parser: Game Number, Date, Time, Home Team, Away Team, Location, and Division
3. WHEN the PDF_Parser completes extraction, THE PDF_Parser SHALL return the parsed Game_Rows to the frontend
4. IF the PDF_Parser cannot extract any valid Game_Rows from the PDF, THEN THE PDF_Parser SHALL return an error response and the app SHALL display an error message indicating the PDF could not be parsed

### Requirement 4: Review Flow — Swipeable Event Cards

**User Story:** As a Roster_Manager, I want to swipe through each parsed game on a full-screen card, so that I can review and confirm games one at a time.

#### Acceptance Criteria

1. WHEN the File_Parser or PDF_Parser returns parsed Game_Rows, THE app SHALL present a full-screen Review_Card for each Game_Row, one card at a time
2. THE Review_Card SHALL display: Game Number, Date, the Roster name versus the Opponent name (with the current Roster identified automatically), Time (or "Time TBD" when Time is null), and Location (or "Location TBD" when Location is null)
3. THE Review_Card SHALL display a "Confirm" button and a "Skip" button at the bottom of the card
4. WHEN the Roster_Manager taps "Confirm" on a Review_Card, THE app SHALL mark the Game_Row as confirmed and advance to the next Review_Card
5. WHEN the Roster_Manager taps "Skip" on a Review_Card, THE app SHALL discard the Game_Row and advance to the next Review_Card
6. WHEN the Roster_Manager swipes through all Review_Cards, THE app SHALL proceed to create Events for all confirmed Game_Rows

### Requirement 5: Opponent Identification

**User Story:** As a Roster_Manager, I want the app to automatically identify which team is my Roster and label the other as the opponent, so that I do not have to manually assign sides.

#### Acceptance Criteria

1. WHEN a Game_Row is parsed, THE app SHALL compare the Home Team and Away Team values against the current Roster name to identify which is the current Roster
2. WHEN the current Roster name matches the Home Team, THE Review_Card SHALL label the Away Team as the Opponent
3. WHEN the current Roster name matches the Away Team, THE Review_Card SHALL label the Home Team as the Opponent
4. IF neither the Home Team nor the Away Team matches the current Roster name, THEN THE Review_Card SHALL display both team names as provided and label the game as "Unmatched — select your Roster side" with a toggle for the Roster_Manager to pick Home or Away

### Requirement 6: Confirmed Event Creation — With Date and Time

**User Story:** As a Roster_Manager, I want confirmed games with a date and time to be created as fully scheduled events, so that they appear on the Roster's calendar with complete details.

#### Acceptance Criteria

1. WHEN a confirmed Game_Row has both a Date and a Time, THE app SHALL create a Confirmed_Event via `POST /api/events` with `scheduledStatus` set to `scheduled`
2. THE Confirmed_Event SHALL have `startTime` set to the Date and Time from the Game_Row
3. THE Confirmed_Event SHALL have `title` set to the Roster name versus the Opponent name
4. THE Confirmed_Event SHALL have `sportType` set to the Roster's `sportType`
5. THE Confirmed_Event SHALL have `organizerId` set to the current user's ID
6. THE Confirmed_Event SHALL have the Roster's ID included in `eligibilityRestrictedToTeams`

### Requirement 7: Pending Event Creation — Date Only, No Time

**User Story:** As a Roster_Manager, I want confirmed games with a date but no time to be created as pending events, so that they appear on the Roster's schedule and can be updated later when the time is known.

#### Acceptance Criteria

1. WHEN a confirmed Game_Row has a Date but a null Time, THE app SHALL create a Pending_Event via `POST /api/events` with `scheduledStatus` set to `unscheduled`
2. THE Pending_Event SHALL have `startTime` set to the Date from the Game_Row with a placeholder time (e.g., midnight of that date)
3. THE Pending_Event SHALL store the Opponent name, Roster ID in `eligibilityRestrictedToTeams`, and all other available fields from the Game_Row
4. THE Upcoming_Events_List SHALL display Pending_Events with a "Pending — Time TBD" label

### Requirement 8: Location Matching — Muster Ground and Open Ground

**User Story:** As a Roster_Manager, I want the app to automatically link known facilities and store unknown locations as free-text, so that event locations are captured without manual lookup.

#### Acceptance Criteria

1. WHEN a confirmed Game_Row has a Location value, THE app SHALL search existing Muster_Ground records by name for a match
2. WHEN a matching Muster_Ground is found, THE app SHALL set the Event's `facilityId` to the matched Muster_Ground's ID
3. WHEN no matching Muster_Ground is found, THE app SHALL store the Location value in the Event's `locationName` field and any address data in the `locationAddress` field as an Open_Ground
4. WHEN a confirmed Game_Row has a null Location, THE app SHALL create the Event with `facilityId` as null and `locationName` as null

### Requirement 9: Opponent Linking

**User Story:** As a Roster_Manager, I want the app to automatically link known opponent Rosters and store unknown opponents as text, so that opponent information is preserved on the event.

#### Acceptance Criteria

1. WHEN a confirmed Game_Row has an Opponent name, THE app SHALL search existing Roster records by name for a match
2. WHEN a matching Roster is found, THE app SHALL include the matched Roster's ID in the Event's `eligibilityRestrictedToTeams` array alongside the current Roster's ID
3. WHEN no matching Roster is found, THE app SHALL store the Opponent name in the Event's `title` field (e.g., "Roster Name vs Opponent Name") without linking a second Roster

### Requirement 10: Upcoming Events List — Pending Event Display

**User Story:** As a Roster_Manager, I want pending events to appear at the top of the upcoming events list with a distinct badge, so that I can easily identify games that still need a time assigned.

#### Acceptance Criteria

1. WHILE an Event linked to the Roster has `scheduledStatus` of `unscheduled`, THE Upcoming_Events_List SHALL display the Event at the top of the list above all scheduled events
2. WHILE an Event has `scheduledStatus` of `unscheduled`, THE Upcoming_Events_List SHALL display a "Pending" badge on the Event card using a visually distinct style
3. WHEN a Pending_Event is edited and a time is assigned (changing `scheduledStatus` to `scheduled`), THE Upcoming_Events_List SHALL remove the "Pending" badge and reposition the Event into its correct chronological position among scheduled events

### Requirement 11: File Format Validation

**User Story:** As a Roster_Manager, I want the app to reject unsupported file types, so that I receive clear feedback when I select the wrong file.

#### Acceptance Criteria

1. WHEN the Roster_Manager selects a file that is not CSV, Excel (.xlsx, .xls), or PDF, THE app SHALL display an error message stating the supported file formats
2. THE app SHALL not attempt to parse an unsupported file type
3. WHEN the file picker is opened, THE file picker SHALL filter visible files to CSV, Excel, and PDF formats only
