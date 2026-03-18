# Implementation Plan: League Scheduling

## Overview

Overhaul the league scheduling flow by removing the auto-generate toggle from LeagueForm, adding a "ready to schedule" notification for Commissioners, building a dedicated Scheduling Screen, and extending the ScheduleGeneratorService with preview-only generation, playoff rounds, and tournament brackets. Confirmed schedules persist as shell events and notify all roster players.

## Tasks

- [x] 1. Remove auto-generate matchups toggle from LeagueForm
  - [x] 1.1 Remove the `autoGenerateMatchups` toggle from `src/components/league/LeagueForm.tsx` in both create and edit modes
    - Remove the toggle UI element and any associated state/handlers
    - Ensure the `autoGenerateMatchups` field is excluded from submitted form data
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Update the league creation endpoint in `server/src/routes/leagues.ts` to default `autoGenerateMatchups` to `false`
    - Ensure the field is always stored as `false` regardless of any value sent from the client
    - _Requirements: 1.3_

  - [ ]* 1.3 Write unit tests for LeagueForm toggle removal
    - Verify the toggle is not rendered in create and edit modes
    - Verify form submission payload excludes `autoGenerateMatchups`
    - Test file: `tests/unit/components/LeagueForm.test.tsx`
    - _Requirements: 1.1, 1.2_

- [x] 2. Define shared TypeScript types for scheduling
  - [x] 2.1 Create shared scheduling types in `src/types/scheduling.ts`
    - Define `RosterInfo`, `SchedulePreview`, `SchedulePreviewEvent`, `PlayoffEvent`, `TournamentEvent`, `ConfirmableEvent` interfaces
    - Export from `src/types/index.ts`
    - _Requirements: 3.4, 4.1, 5.1, 6.1_

- [x] 3. Extend ScheduleGeneratorService with preview and new formats
  - [x] 3.1 Add `generateSchedulePreview` method to `server/src/services/ScheduleGeneratorService.ts`
    - Implement preview-only generation (no DB writes) that returns a `SchedulePreview` object
    - Reuse existing `generateMatchups` and `distributeMatchups` for round-robin logic
    - Validate at least 2 rosters, return 400-style error if not
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [x] 3.2 Add `generatePlayoffRounds` method to `server/src/services/ScheduleGeneratorService.ts`
    - Generate playoff events after regular season with TBD roster assignments
    - Use `playoffTeamCount` to determine number of playoff slots
    - Distribute playoff games on preferred days within time window
    - Flag all playoff events with `flag: 'playoffs'`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 3.3 Add `generateTournamentBracket` method to `server/src/services/ScheduleGeneratorService.ts`
    - Generate first-round matchups from registered rosters (with byes for non-power-of-2 counts)
    - Use "Winner of Game N" placeholder format for subsequent rounds
    - Support single and double elimination via `eliminationFormat` config
    - Flag all tournament events with `flag: 'tournament'`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 3.4 Add `confirmSchedule` method to `server/src/services/ScheduleGeneratorService.ts`
    - Persist confirmed events as `Event` + `Match` records in a transaction
    - Set `scheduledStatus: 'unscheduled'` on all created events
    - Set `league.scheduleGenerated = true`
    - Send push notification to all confirmed roster players via `NotificationService`
    - _Requirements: 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 3.5 Write property tests for round-robin generation
    - **Property 10: Round-robin matchup completeness** — For N rosters (N ≥ 2), verify at least N×(N−1)/2 unique pairings
    - **Validates: Requirements 4.1, 8.2**
    - Test file: `tests/property/schedule-generator.property.test.ts`

  - [ ]* 3.6 Write property tests for home/away balance and game count
    - **Property 12: Home/away balance** — Verify each roster's home/away difference ≤ 1
    - **Validates: Requirements 4.3, 8.4**
    - **Property 13: Game count matches configuration** — Verify output length equals `seasonGameCount`
    - **Validates: Requirements 4.4**
    - Test file: `tests/property/schedule-generator.property.test.ts`

  - [ ]* 3.7 Write property tests for scheduling constraints
    - **Property 14: Games scheduled on preferred days only** — Verify all events land on preferred days
    - **Validates: Requirements 4.5**
    - **Property 15: Games within time window** — Verify all events are within configured time bounds
    - **Validates: Requirements 4.6**
    - **Property 16: No double-booking** — Verify no roster appears in overlapping games on the same day
    - **Validates: Requirements 4.7, 8.3**
    - Test file: `tests/property/schedule-generator.property.test.ts`

  - [ ]* 3.8 Write property tests for playoff generation
    - **Property 17: Playoff rounds follow regular season** — Verify playoff dates are after all regular season dates
    - **Validates: Requirements 5.2**
    - **Property 18: Playoff roster assignments are TBD** — Verify placeholder roster names in playoff events
    - **Validates: Requirements 5.3**
    - **Property 19: Playoff slot count matches configuration** — Verify playoff bracket accommodates exactly `playoffTeamCount` slots
    - **Validates: Requirements 5.4**
    - Test file: `tests/property/schedule-generator.property.test.ts`

  - [ ]* 3.9 Write property tests for tournament bracket generation
    - **Property 20: Tournament first-round uses registered rosters** — Verify all rosters appear in first round
    - **Validates: Requirements 6.1**
    - **Property 21: Tournament placeholder naming** — Verify "Winner of Game N" format for round 2+
    - **Validates: Requirements 6.2**
    - **Property 22: Elimination format determines bracket structure** — Verify game count matches elimination type
    - **Validates: Requirements 6.4**
    - Test file: `tests/property/schedule-generator.property.test.ts`

  - [ ]* 3.10 Write property test for schedule round-trip integrity
    - **Property 26: Schedule generation round-trip** — Generate preview, serialize, deserialize, verify equivalence
    - **Validates: Requirements 8.1**
    - Test file: `tests/property/schedule-roundtrip.property.test.ts`

- [x] 4. Checkpoint — Ensure all backend service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add backend API endpoints for schedule generation and confirmation
  - [x] 5.1 Add `POST /api/leagues/:id/generate-schedule` endpoint to `server/src/routes/leagues.ts`
    - Validate league exists (404), user is Commissioner (403), at least 2 rosters (400)
    - Call `ScheduleGeneratorService.generateSchedulePreview` and return events for review
    - _Requirements: 4.1, 4.8, 4.9, 5.1, 6.1_

  - [x] 5.2 Add `POST /api/leagues/:id/confirm-schedule` endpoint to `server/src/routes/leagues.ts`
    - Validate league exists, user is Commissioner, schedule not already generated (409)
    - Call `ScheduleGeneratorService.confirmSchedule` to persist events and notify players
    - _Requirements: 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 5.3 Add `POST /api/leagues/:id/check-ready` endpoint to `server/src/routes/leagues.ts`
    - Check if registration close date has passed OR all invited rosters confirmed
    - Skip notification if zero registered rosters
    - Send "ready to schedule" notification to Commissioner via `NotificationService`
    - Ensure at most one notification per league
    - _Requirements: 2.1, 2.2, 2.3, 2.7_

  - [ ]* 5.4 Write unit tests for generate-schedule endpoint
    - Test 400 for < 2 rosters, 403 for non-Commissioner, 404 for missing league
    - Test file: `tests/unit/server/generate-schedule.test.ts`
    - _Requirements: 4.9_

  - [ ]* 5.5 Write unit tests for confirm-schedule endpoint
    - Test Event and Match creation, `scheduledStatus: 'unscheduled'`, notification dispatch
    - Test file: `tests/unit/server/confirm-schedule.test.ts`
    - _Requirements: 7.4, 7.5, 7.7_

  - [ ]* 5.6 Write property test for notification text format
    - **Property 6: Notification text format** — For any league name, verify text equals `"${leagueName} is ready to schedule."`
    - **Validates: Requirements 2.5**
    - Test file: `tests/property/notification-format.property.test.ts`

- [x] 6. Create Redux scheduleSlice for frontend state management
  - [x] 6.1 Create `src/store/slices/scheduleSlice.ts`
    - Define `ScheduleEvent` and `ScheduleState` interfaces
    - Implement reducers: `setEvents`, `addEvent`, `updateEvent`, `removeEvent`, `clearSchedule`, `setReviewing`, `setGenerating`, `setError`
    - Export selectors for events, isReviewing, isGenerating, error
    - _Requirements: 3.2, 3.5, 3.6, 3.7_

  - [x] 6.2 Add RTK Query endpoints to the existing leagues API slice
    - Add `generateSchedule` mutation (POST `/api/leagues/:id/generate-schedule`)
    - Add `confirmSchedule` mutation (POST `/api/leagues/:id/confirm-schedule`)
    - _Requirements: 4.8, 7.4_

  - [x] 6.3 Register `scheduleSlice` in the Redux store configuration
    - Import and add the reducer to the store in `src/store/index.ts` or equivalent
    - _Requirements: 3.2_

  - [ ]* 6.4 Write unit tests for scheduleSlice reducers
    - Test `addEvent`, `updateEvent`, `removeEvent`, `clearSchedule` reducers
    - Test file: `tests/unit/store/scheduleSlice.test.ts`
    - _Requirements: 3.5, 3.6, 3.7_

- [x] 7. Build the Scheduling Screen and components
  - [x] 7.1 Create `src/components/league/ScheduleEventCard.tsx`
    - Render home roster name, away roster name, date, time
    - Display "Playoffs" or "Tournament" flag when applicable
    - Use theme tokens from `src/theme/` for all styling
    - _Requirements: 3.4, 3.9, 3.10_

  - [x] 7.2 Create `src/components/league/ScheduleEventEditor.tsx`
    - Modal editor for creating/editing a single game
    - Fields: Home Roster (picker), Away Roster (picker), Date, Time
    - Disable save until all fields are filled
    - Support both create (new game) and edit (existing game) modes
    - _Requirements: 3.5, 3.6, 3.7_

  - [x] 7.3 Create `src/screens/leagues/SchedulingScreen.tsx`
    - Header with league name
    - "Auto Generate Schedule" button that calls the generate-schedule API and populates Redux state
    - FlatList of `ScheduleEventCard` components showing generated/manual events
    - Empty state placeholder when no events exist
    - FAB or button to add a manual game (opens `ScheduleEventEditor`)
    - Tap event to edit (opens `ScheduleEventEditor` with existing data)
    - Swipe or button to remove individual events
    - "Confirm Schedule" button (disabled until events exist) that calls confirm-schedule API
    - Display inline error banner for < 2 rosters error
    - Use theme tokens from `src/theme/` for all styling
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 7.1, 7.2, 7.3, 7.4, 7.8_

  - [ ]* 7.4 Write unit tests for ScheduleEventCard
    - Verify rendering of home/away roster names, date, time, and flags
    - Test file: `tests/unit/components/ScheduleEventCard.test.tsx`
    - _Requirements: 3.4, 3.9, 3.10_

  - [ ]* 7.5 Write property test for event card display and flags
    - **Property 7: Event card displays all required fields** — Verify all four fields are present for any event
    - **Validates: Requirements 3.4**
    - **Property 9: Playoff and tournament events display correct flags** — Verify correct flag labels
    - **Validates: Requirements 3.9, 3.10, 5.5, 6.3**
    - Test file: `tests/property/schedule-generator.property.test.ts`

  - [ ]* 7.6 Write unit tests for SchedulingScreen
    - Verify empty state placeholder, "Auto Generate Schedule" button presence, navigation params
    - Test file: `tests/unit/screens/SchedulingScreen.test.tsx`
    - _Requirements: 3.1, 3.2, 3.3, 3.8_

  - [ ]* 7.7 Write unit tests for ScheduleEventEditor
    - Verify field validation (all fields required), save/cancel behavior
    - Test file: `tests/unit/components/ScheduleEventEditor.test.tsx`
    - _Requirements: 3.5, 3.7_

  - [ ]* 7.8 Write property test for manual game addition
    - **Property 8: Manual game addition grows event list** — Verify adding a game increases list length by one
    - **Validates: Requirements 3.7**
    - Test file: `tests/property/schedule-generator.property.test.ts`

- [x] 8. Checkpoint — Ensure all frontend component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Add navigation and "ready to schedule" notification integration
  - [x] 9.1 Add `LeagueScheduling` route to the Leagues stack navigator
    - Register the route with param `{ leagueId: string }` in the leagues navigation config
    - Add navigation from League Details screen (Commissioner-only "Schedule" button)
    - _Requirements: 3.8_

  - [x] 9.2 Add "ready to schedule" notification display on the Home Screen
    - Display notification in the action items section alongside Debrief and Invitations
    - Show text as "[League Name] is ready to schedule."
    - On tap, navigate to `LeagueScheduling` screen with the league's ID
    - _Requirements: 2.4, 2.5, 2.6_

  - [ ]* 9.3 Write unit tests for ready notification on Home Screen
    - Verify notification renders with correct text format
    - Verify tap navigates to SchedulingScreen with correct leagueId
    - Test file: `tests/unit/screens/SchedulingScreen.test.tsx`
    - _Requirements: 2.4, 2.5, 2.6_

- [x] 10. Wire up the ready-to-schedule background check
  - [x] 10.1 Create a scheduled job or event handler that calls `check-ready` for leagues without a generated schedule
    - Check on registration close date passing (cron or event-driven)
    - Check on roster confirmation events (event-driven hook in roster confirmation flow)
    - Ensure no notification is sent if zero rosters are registered
    - _Requirements: 2.1, 2.2, 2.3, 2.7_

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All UI components must use theme tokens from `src/theme/` — never hardcode colors or fonts
- Use brand vocabulary: "Roster" not "Team", "League" not "Competition", "Players" not "Members"
