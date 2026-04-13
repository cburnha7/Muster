# Implementation Plan: Schedule Import

## Overview

Implement the Schedule Import feature that allows Roster Managers to upload CSV, Excel, or PDF game schedules, review parsed games on swipeable cards, and create Events for confirmed games. Frontend parsing for CSV/Excel, server-side PDF parsing, and integration with the existing event creation API.

## Tasks

- [x] 1. Define types and install dependencies
  - [x] 1.1 Create `src/types/scheduleImport.ts` with `GameRow`, `ParseResult`, `ConfirmedGame`, and `ImportResult` interfaces
    - Define all shared types used across parsing, review, and import services
    - _Requirements: 2.2, 3.2, 4.2, 6.1, 7.1_
  - [x] 1.2 Install frontend dependencies: `npx expo install expo-document-picker papaparse xlsx` and `npm install --save-dev @types/papaparse`
    - _Requirements: 1.3, 2.1_
  - [x] 1.3 Install backend dependencies: `cd server && npm install pdf-parse multer @types/multer`
    - _Requirements: 3.1_

- [x] 2. Implement ScheduleParserService (frontend CSV/Excel parsing)
  - [x] 2.1 Create `src/services/ScheduleParserService.ts` with `detectColumns`, `normalizeRow`, `parseCSV`, and `parseExcel` methods
    - Implement fuzzy header matching for column detection (e.g., "Game #", "Game No", "Number" → gameNumber)
    - Use `papaparse` for CSV parsing and `xlsx` for Excel parsing
    - Normalize dates to ISO format (YYYY-MM-DD), set null for empty Time/Location fields
    - Return `{ success: false, errors: [...] }` when no valid rows can be extracted
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [ ]\* 2.2 Write property test: CSV round-trip (Property 1)
    - **Property 1: Parsing round-trip**
    - For any array of valid GameRow objects, serializing to CSV and parsing back produces equivalent GameRow objects
    - **Validates: Requirements 2.6**
  - [ ]\* 2.3 Write property test: Field extraction from raw rows (Property 2)
    - **Property 2: Field extraction from raw rows**
    - For any raw row with optional empty Time/Location, `normalizeRow` preserves non-empty fields and sets empty ones to null
    - **Validates: Requirements 2.2, 2.3, 2.4**
  - [ ]\* 2.4 Write unit tests for ScheduleParserService
    - Test `parseCSV` with specific CSV samples and known output
    - Test `parseExcel` with specific Excel buffer and known output
    - Test `detectColumns` with header variations
    - Test error case when no valid rows are found
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Implement opponent identification and event payload logic
  - [x] 3.1 Add `identifyOpponent` function to `src/services/ScheduleImportService.ts`
    - Compare Home Team and Away Team against roster name using case-insensitive substring matching
    - Return `{ opponentName, isHomeTeam, matched }` — `matched: false` when neither team matches
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 3.2 Add `buildEventPayload` method to `ScheduleImportService`
    - Set `scheduledStatus` to `scheduled` when time is non-null, `unscheduled` when time is null
    - Set `startTime` from date+time or midnight when time is null
    - Set title as "Roster vs Opponent", sportType from team, organizerId from userId
    - Include team ID in `eligibilityRestrictedToTeams`, add opponent roster ID if matched
    - Default 2-hour event duration for scheduled events
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3_
  - [ ]\* 3.3 Write property test: Opponent identification correctness (Property 4)
    - **Property 4: Opponent identification correctness**
    - For any GameRow and rosterName matching exactly one team, returns the other as opponent with correct home/away flag; returns `matched: false` when neither matches
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
  - [ ]\* 3.4 Write property test: Event payload correctness (Property 5)
    - **Property 5: Event payload correctness**
    - For any ConfirmedGame, team, and userId: scheduledStatus is correct based on time, startTime uses date+time or midnight, title contains both names, sportType matches team, organizerId equals userId, team ID is in eligibilityRestrictedToTeams
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3**
  - [ ]\* 3.5 Write unit tests for identifyOpponent and buildEventPayload
    - Test edge cases: partial name matches, case insensitivity, whitespace
    - Test specific confirmed game → expected payload
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 7.1_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement ScheduleImportService (facility matching, opponent linking, event creation)
  - [x] 5.1 Add `matchFacility` method to `ScheduleImportService`
    - Search existing Muster Grounds by name using `facilityService.searchFacilities`
    - Return first matching facility ID or null
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 5.2 Add `matchOpponentRoster` method to `ScheduleImportService`
    - Search existing rosters by name using `teamService.searchTeams`
    - Return first matching roster ID or null
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 5.3 Add `createEventsFromGames` method to `ScheduleImportService`
    - Iterate confirmed games, resolve facility and opponent for each
    - Call `POST /api/events` for each confirmed game
    - Continue on individual failures, track created/failed counts
    - Return `ImportResult` with created, failed, and errors
    - _Requirements: 6.1, 7.1, 8.1, 9.1_

- [x] 6. Implement PDF parse endpoint (server-side)
  - [x] 6.1 Create `server/src/routes/schedule.ts` with `POST /api/schedule/parse-pdf`
    - Accept multipart/form-data with a single PDF file using multer
    - Use `pdf-parse` to extract text from the PDF
    - Apply regex/heuristic line parsing to extract tabular game data
    - Return `ParseResult` shape: `{ success, gameRows, errors }`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 6.2 Mount schedule router in `server/src/routes/index.ts` or main Express app
    - _Requirements: 3.1_
  - [ ]\* 6.3 Write unit tests for PDF parse endpoint
    - Test with sample PDF text extraction
    - Test error response when no valid rows found
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 7. Implement ScheduleReviewScreen (swipeable review cards)
  - [x] 7.1 Create `src/screens/teams/ScheduleReviewScreen.tsx`
    - Receive `gameRows` and `team` as route params
    - Display one ReviewCard at a time with game details: Game Number, Date, Time (or "Time TBD"), Roster vs Opponent (or both names if unmatched), Location (or "Location TBD"), Division
    - Use `Animated` from React Native for card fade/slide transitions
    - Show "Confirm" and "Skip" buttons at the bottom of each card
    - Track confirmed games in local state
    - When unmatched, show toggle for user to pick Home or Away
    - After all cards reviewed, call `ScheduleImportService.createEventsFromGames` for confirmed games
    - Show summary alert: "Created X of Y events. Z failed."
    - Navigate back to Roster Detail Screen on completion
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.4_
  - [ ]\* 7.2 Write property test: Review card displays all required information (Property 3)
    - **Property 3: Review card displays all required information**
    - For any GameRow and roster name, the rendered ReviewCard contains date, roster name, opponent name (or both if unmatched), time (or "Time TBD"), and location (or "Location TBD")
    - **Validates: Requirements 4.2**
  - [ ]\* 7.3 Write component tests for ScheduleReviewScreen
    - Test renders first card, advances on Confirm/Skip, shows summary at end
    - Test unmatched opponent toggle display
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Wire up Import Schedule button and file picker
  - [x] 9.1 Add "Import Schedule" button to `src/screens/teams/TeamDetailsScreen.tsx`
    - Show button only when current user is a Roster Manager (captain or owner)
    - On tap, open file picker via `expo-document-picker` restricted to CSV, Excel, and PDF types
    - Validate file type — reject unsupported types with error alert
    - For CSV/Excel: parse with `ScheduleParserService`, navigate to `ScheduleReviewScreen` with parsed rows
    - For PDF: upload to `POST /api/schedule/parse-pdf`, navigate to `ScheduleReviewScreen` with returned rows
    - Handle errors: empty file, parse failure, network error — show appropriate alerts
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 11.1, 11.2, 11.3_
  - [x] 9.2 Register `ScheduleReviewScreen` in the teams navigation stack
    - Add screen to the navigation configuration with proper typing
    - _Requirements: 4.1_

- [x] 10. Add Pending badge to EventCard and update event sorting
  - [x] 10.1 Modify `src/components/ui/EventCard.tsx` to show "Pending" badge for `unscheduled` events
    - Display "Pending" badge with visually distinct style when `scheduledStatus` is `unscheduled`
    - Hide badge for `scheduled` events
    - _Requirements: 7.4, 10.2_
  - [x] 10.2 Update Upcoming Events List sorting to place unscheduled events at the top
    - Ensure events with `scheduledStatus: 'unscheduled'` appear before all scheduled events
    - When a pending event gets a time assigned, it repositions into chronological order
    - _Requirements: 10.1, 10.3_
  - [ ]\* 10.3 Write property test: Pending events sort before scheduled events (Property 6)
    - **Property 6: Pending events sort before scheduled events**
    - For any list of Events with mixed scheduledStatus values, after sorting, all unscheduled events appear before all scheduled events
    - **Validates: Requirements 10.1**
  - [ ]\* 10.4 Write component tests for EventCard Pending badge
    - Test "Pending" badge shown for unscheduled events, hidden for scheduled events
    - _Requirements: 10.2_

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- No database schema changes are needed — uses existing Event model fields
