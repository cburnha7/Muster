# Requirements Document

## Introduction

Overhaul the league event scheduling flow in Muster. This feature removes the auto-generate matchups toggle from the league create/edit form, introduces a Commissioner notification when a league is ready to schedule, and adds a dedicated League Scheduling screen where the Commissioner can auto-generate or manually build the event schedule. The scheduling logic supports season (round robin), season with playoffs, and tournament formats. After review and confirmation, shell events are saved and all roster players are notified.

## Glossary

- **Commissioner**: The user who created and manages a league (the league organizer).
- **Roster**: A group of players registered to compete in a league. Never referred to as "Team", "Group", or "Outfit".
- **League**: An organised competition. Never referred to as "Competition", "Tournament", or "Division".
- **Shell_Event**: An event record linked to a league that has no facility or confirmed time assigned yet, marked as "Unscheduled".
- **Scheduling_Screen**: A dedicated screen within the Leagues navigation stack where the Commissioner builds and reviews the league event schedule.
- **Round_Robin**: A scheduling format where every roster plays every other roster at least once, minimizing repeat matchups.
- **Playoff_Round**: An additional round of games appended after the regular season, with roster slots marked as TBD until standings determine advancement.
- **Tournament_Bracket**: A single- or double-elimination bracket where first-round matchups are seeded from registered rosters and subsequent rounds use placeholder names until results are entered.
- **Schedule_Generator**: The backend service (`ScheduleGeneratorService`) responsible for computing matchups and distributing games across configured game days and time windows.
- **Home_Screen**: The main screen of the app displaying upcoming events, debrief items, and invitations.
- **League_Form**: The create/edit form for leagues (`LeagueForm.tsx`).
- **Player**: A member of a roster. Never referred to as "Member".

## Requirements

### Requirement 1: Remove Auto Generate Matchups Toggle

**User Story:** As a Commissioner, I want the auto-generate matchups toggle removed from the league create and edit forms, so that schedule generation is handled exclusively from the dedicated Scheduling Screen.

#### Acceptance Criteria

1. THE League_Form SHALL render without the auto-generate matchups toggle on both create and edit modes.
2. THE League_Form SHALL exclude the `autoGenerateMatchups` field from the submitted form data.
3. WHEN a league is created, THE System SHALL store `autoGenerateMatchups` as `false` by default.

### Requirement 2: League Ready Notification

**User Story:** As a Commissioner, I want to receive a notification when my league is ready to schedule, so that I know when to build the event schedule.

#### Acceptance Criteria

1. WHEN a league's registration close date passes, THE System SHALL generate a "ready to schedule" notification for the Commissioner.
2. WHEN all invited rosters have confirmed their participation before the registration close date, THE System SHALL generate a "ready to schedule" notification for the Commissioner.
3. THE System SHALL trigger the notification based on whichever condition is satisfied first: registration close date passing or all invited rosters confirming.
4. THE Home_Screen SHALL display the "ready to schedule" notification in the action items section alongside Debrief and Invitations.
5. THE Home_Screen SHALL display the notification text as "[League Name] is ready to schedule."
6. WHEN the Commissioner taps the "ready to schedule" notification, THE Home_Screen SHALL navigate the Commissioner to the Scheduling_Screen for that league.
7. IF the league has zero registered rosters when the ready condition is met, THEN THE System SHALL not generate a "ready to schedule" notification.

### Requirement 3: League Scheduling Screen

**User Story:** As a Commissioner, I want a dedicated scheduling screen for my league, so that I can build, review, and manage the event schedule in one place.

#### Acceptance Criteria

1. THE Scheduling_Screen SHALL display an "Auto Generate Schedule" button at the top of the screen.
2. THE Scheduling_Screen SHALL display an event list below the auto-generate button.
3. WHEN no events have been generated or added, THE Scheduling_Screen SHALL display the event list as empty with a placeholder message.
4. THE Scheduling_Screen SHALL display each event in the list showing: Home Roster name, Away Roster name, Date, and Time.
5. WHEN the Commissioner taps an event in the list, THE Scheduling_Screen SHALL allow the Commissioner to edit the Home Roster, Away Roster, Date, and Time fields for that event.
6. THE Scheduling_Screen SHALL provide a control to add an individual game manually.
7. WHEN the Commissioner adds a game manually, THE Scheduling_Screen SHALL add the new event to the event list with Commissioner-specified Home Roster, Away Roster, Date, and Time.
8. THE Scheduling_Screen SHALL be accessible from the Leagues navigation stack with the league ID as a parameter.
9. THE Scheduling_Screen SHALL display playoff events with a "Playoffs" flag in the event list.
10. THE Scheduling_Screen SHALL display tournament events with a "Tournament" flag in the event list.

### Requirement 4: Auto Generate Schedule — Season (Round Robin)

**User Story:** As a Commissioner, I want to auto-generate a round-robin schedule for a season league, so that every roster plays every other roster with balanced home and away assignments.

#### Acceptance Criteria

1. WHEN the Commissioner taps "Auto Generate Schedule" for a season-format league, THE Schedule_Generator SHALL produce a round-robin schedule where every roster plays every other roster.
2. THE Schedule_Generator SHALL minimize repeat matchups across the generated schedule.
3. THE Schedule_Generator SHALL assign each roster an equal number of home and away games, with a maximum difference of one game when the total is odd.
4. THE Schedule_Generator SHALL generate the number of games configured in the league's `seasonGameCount` setting.
5. THE Schedule_Generator SHALL distribute games across the league's configured preferred game days.
6. THE Schedule_Generator SHALL schedule games within the league's configured preferred time window (start and end times).
7. THE Schedule_Generator SHALL verify that no roster is double-booked in two overlapping games on the same day.
8. WHEN the schedule is generated, THE Scheduling_Screen SHALL present the generated schedule to the Commissioner for review before saving.
9. IF fewer than two rosters are registered in the league, THEN THE Schedule_Generator SHALL display an error message indicating that at least two rosters are required.

### Requirement 5: Auto Generate Schedule — Season with Playoffs

**User Story:** As a Commissioner, I want to auto-generate a schedule that includes both regular season and playoff rounds, so that the league has a complete competitive structure.

#### Acceptance Criteria

1. WHEN the Commissioner taps "Auto Generate Schedule" for a season-with-playoffs-format league, THE Schedule_Generator SHALL generate regular season games using round-robin format.
2. THE Schedule_Generator SHALL generate playoff games as additional rounds after the regular season games.
3. THE Schedule_Generator SHALL set roster assignments for playoff games as "TBD" until standings determine which rosters advance.
4. THE Schedule_Generator SHALL generate the number of playoff slots matching the league's `playoffTeamCount` setting.
5. THE Scheduling_Screen SHALL flag all playoff games with a "Playoffs" label in the event list.

### Requirement 6: Auto Generate Schedule — Tournament

**User Story:** As a Commissioner, I want to auto-generate a tournament bracket, so that registered rosters are seeded into an elimination-style competition.

#### Acceptance Criteria

1. WHEN the Commissioner taps "Auto Generate Schedule" for a tournament-format league, THE Schedule_Generator SHALL generate first-round matchups based on registered rosters.
2. THE Schedule_Generator SHALL assign placeholder names for second-round and subsequent matchups using the format "Winner of Game N" where N is the game number from the previous round.
3. THE Scheduling_Screen SHALL flag all tournament games with a "Tournament" label in the event list.
4. THE Schedule_Generator SHALL support the league's configured elimination format (single elimination or double elimination).

### Requirement 7: Schedule Review and Confirmation

**User Story:** As a Commissioner, I want to review, edit, and confirm the auto-generated schedule before it is published, so that I have full control over the final event lineup.

#### Acceptance Criteria

1. WHILE the schedule is in review state, THE Scheduling_Screen SHALL allow the Commissioner to edit any game's Home Roster, Away Roster, Date, and Time.
2. WHILE the schedule is in review state, THE Scheduling_Screen SHALL allow the Commissioner to remove individual games from the schedule.
3. WHILE the schedule is in review state, THE Scheduling_Screen SHALL allow the Commissioner to add new games to the schedule.
4. WHEN the Commissioner confirms the schedule, THE System SHALL save all games as Shell_Events linked to the league.
5. WHEN the Commissioner confirms the schedule, THE System SHALL mark each Shell_Event with a status of "Unscheduled" until a facility and time are assigned.
6. WHEN the Commissioner confirms the schedule, THE System SHALL display the Shell_Events in the league's Upcoming Events list.
7. WHEN the Commissioner confirms the schedule, THE System SHALL send a notification to all confirmed roster players that the league schedule has been published.
8. IF the Commissioner has not confirmed the schedule, THEN THE System SHALL not save any events or send any notifications.

### Requirement 8: Schedule Generation Round-Trip Integrity

**User Story:** As a developer, I want to verify that the schedule generation logic produces consistent and correct output, so that the scheduling system is reliable.

#### Acceptance Criteria

1. FOR ALL valid sets of rosters and league configurations, generating a schedule and then reading back the generated matchups SHALL produce an equivalent set of matchups (round-trip property).
2. FOR ALL generated round-robin schedules, the total number of unique matchups SHALL equal the expected combinatorial count based on the number of rosters.
3. FOR ALL generated schedules, no roster SHALL appear in two games with overlapping time slots (double-booking invariant).
4. FOR ALL generated schedules with an even number of rosters, each roster's home game count and away game count SHALL differ by at most one (home/away balance invariant).
