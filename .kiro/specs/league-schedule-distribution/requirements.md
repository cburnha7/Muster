# Requirements Document

## Introduction

Update the league auto-generate schedule logic to correctly distribute games between the league's configured start date and end date based on the selected game frequency format (all at once, weekly, monthly). The current `distributeMatchups` method in `ScheduleGeneratorService` only uses preferred game days and schedules forward indefinitely from the start date. This feature constrains all generated games to the start–end date window and implements format-specific distribution strategies. This is a backend-only logic change with no new UI screens — the existing schedule preview already displays each game's date and time.

## Glossary

- **Commissioner**: The user who created and manages a league.
- **Roster**: A group of players registered to compete in a league.
- **League**: An organised competition.
- **Schedule_Generator**: The backend service (`ScheduleGeneratorService`) responsible for computing matchups and distributing games across configured game days and time windows.
- **Game_Frequency**: The `gameFrequency` field on the League model — one of `"all_at_once"`, `"weekly"`, or `"monthly"`.
- **Start_Date**: The league's `startDate` field — the earliest date games may be scheduled.
- **End_Date**: The league's `endDate` field — the latest date games may be scheduled.
- **Preferred_Game_Days**: The league's `preferredGameDays` array — day-of-week integers (0=Sunday through 6=Saturday) on which games should be scheduled.
- **Time_Window**: The league's `preferredTimeWindowStart` and `preferredTimeWindowEnd` fields — the daily time range within which games must be scheduled.
- **Double_Booking**: A state where the same roster appears in two overlapping games.

## Requirements

### Requirement 1: Date Window Boundary

**User Story:** As a Commissioner, I want all generated games to fall between my league's start date and end date, so that no games are scheduled outside the season window.

#### Acceptance Criteria

1. THE Schedule_Generator SHALL NOT schedule any game before the league's Start_Date.
2. THE Schedule_Generator SHALL NOT schedule any game after the league's End_Date.
3. IF the league has no End_Date configured, THEN THE Schedule_Generator SHALL fall back to the current behavior (schedule forward from Start_Date without an upper bound).
4. IF the total number of games cannot fit within the Start_Date–End_Date window given the format constraints, THEN THE Schedule_Generator SHALL return an error indicating insufficient dates to schedule all games.

### Requirement 2: All At Once (Tournament) Distribution

**User Story:** As a Commissioner, I want the "all at once" format to pack games into consecutive days starting from the start date, ignoring the day-of-week selector, so that a tournament can run over a compact window.

#### Acceptance Criteria

1. WHEN Game_Frequency is `"all_at_once"`, THE Schedule_Generator SHALL ignore the Preferred_Game_Days selector and schedule games on any day within the Start_Date–End_Date window.
2. THE Schedule_Generator SHALL distribute games across consecutive days starting from Start_Date, fitting as many games per day as the Time_Window allows given a 2-hour game duration.
3. THE Schedule_Generator SHALL schedule all games within the configured Time_Window (start time and end time) on each day.
4. THE Schedule_Generator SHALL NOT schedule any game after End_Date even if games remain unscheduled.

### Requirement 3: Weekly Distribution

**User Story:** As a Commissioner, I want the "weekly" format to spread games evenly across the configured game days each week between start and end date, so that the season has a balanced weekly cadence.

#### Acceptance Criteria

1. WHEN Game_Frequency is `"weekly"`, THE Schedule_Generator SHALL only schedule games on the Preferred_Game_Days within the Start_Date–End_Date window.
2. THE Schedule_Generator SHALL distribute the total number of games as evenly as possible across the available game-day occurrences within the window.
3. THE Schedule_Generator SHALL schedule all games within the configured Time_Window on each game day.
4. THE Schedule_Generator SHALL NOT schedule more games on one week's game day than another by more than one game (even distribution).

### Requirement 4: Monthly Distribution

**User Story:** As a Commissioner, I want the "monthly" format to spread games evenly across months between start and end date, scheduling on the configured game days within each month.

#### Acceptance Criteria

1. WHEN Game_Frequency is `"monthly"`, THE Schedule_Generator SHALL distribute games across the Preferred_Game_Days within each calendar month between Start_Date and End_Date.
2. THE Schedule_Generator SHALL give each month an approximately equal share of games, with no month having more than one extra game compared to any other month.
3. THE Schedule_Generator SHALL schedule all games within the configured Time_Window on each game day.
4. IF a month has no occurrences of any Preferred_Game_Day within the window, THEN THE Schedule_Generator SHALL skip that month and redistribute its share to adjacent months.

### Requirement 5: Double-Booking Prevention

**User Story:** As a Commissioner, I want the schedule generator to prevent any roster from being double-booked in overlapping games, regardless of format.

#### Acceptance Criteria

1. THE Schedule_Generator SHALL verify that no roster appears in two games with overlapping time slots on the same day, across all formats.
2. IF a double-booking conflict is detected during generation, THEN THE Schedule_Generator SHALL rearrange the conflicting game to the next available slot before returning an error.

### Requirement 6: Schedule Preview Display

**User Story:** As a Commissioner, I want the auto-generated schedule preview to show each game's assigned date and time, so that I can verify the distribution before confirming.

#### Acceptance Criteria

1. THE Schedule_Generator SHALL return each generated game with a `scheduledAt` ISO date-time string that includes both the date and time.
2. THE existing Scheduling_Screen SHALL continue to display each game's date and time in the preview list without modification (already implemented).

### Requirement 7: Service Interface Update

**User Story:** As a developer, I want the `LeagueWithRosters` interface and route handler to pass `endDate` and `gameFrequency` to the schedule generator, so that the distribution logic has access to the required fields.

#### Acceptance Criteria

1. THE `LeagueWithRosters` interface SHALL include `endDate: Date | null` and `gameFrequency: string | null` fields.
2. THE `generate-schedule` route handler SHALL pass the league's `endDate` and `gameFrequency` values to the `LeagueWithRosters` object.
3. THE `distributeMatchups` method SHALL accept `endDate` and `gameFrequency` as parameters.
