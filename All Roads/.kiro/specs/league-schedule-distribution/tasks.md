# Implementation Plan: League Schedule Distribution

## Overview

Refactor the `ScheduleGeneratorService.distributeMatchups` method to become format-aware, respecting the league's `gameFrequency`, `startDate`, and `endDate`. Implement three distribution strategies (all-at-once, weekly, monthly) and enforce the start–end date window as a hard boundary. Backend-only changes — no new UI screens.

## Tasks

- [x] 1. Update `LeagueWithRosters` interface and `DistributeConfig` type
  - [x] 1.1 Modify `server/src/services/ScheduleGeneratorService.ts`
    - Add `endDate?: Date | null` and `gameFrequency?: string | null` to the `LeagueWithRosters` interface
    - Add new internal `DistributeConfig` interface: `{ preferredGameDays: number[]; timeWindowStart: string; timeWindowEnd: string; startDate: Date; endDate: Date | null; gameFrequency: string; }`
    - Update `distributeMatchups` signature to accept `config: DistributeConfig` instead of individual parameters
    - _Requirements: 7.1, 7.3_

- [x] 2. Implement slot collection strategies
  - [x] 2.1 Add `collectAllAtOnceSlots` private static method
    - Iterate consecutive days from `startDate` to `endDate` (or up to 365 days if no endDate)
    - On each day, generate time slots spaced 2 hours apart within the time window
    - Ignore `preferredGameDays` entirely
    - Return `Date[]` of all available start times
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.2 Add `collectWeeklySlots` private static method
    - Iterate from `startDate` to `endDate` (or up to 365 days if no endDate)
    - Only include days whose `getDay()` is in `preferredGameDays`
    - On each matching day, generate time slots spaced 2 hours apart within the time window
    - Return `Date[]` of all available start times
    - _Requirements: 3.1, 3.3_

  - [x] 2.3 Add `collectMonthlySlots` private static method
    - Group the date range by calendar month
    - Within each month, find all occurrences of `preferredGameDays`
    - On each matching day, generate time slots spaced 2 hours apart within the time window
    - Return `{ month: string; slots: Date[] }[]` grouped by month
    - _Requirements: 4.1, 4.3_

- [x] 3. Implement matchup assignment logic
  - [x] 3.1 Rewrite `distributeMatchups` method body
    - Branch on `config.gameFrequency`:
      - `'all_at_once'` → call `collectAllAtOnceSlots`, assign matchups to slots in order
      - `'weekly'` (or null/default) → call `collectWeeklySlots`, assign matchups to slots in order
      - `'monthly'` → call `collectMonthlySlots`, use monthly-even assignment
    - For weekly/all-at-once: walk through slots in chronological order, one matchup per slot
    - For monthly: calculate `gamesPerMonth = floor(total / months)`, distribute remainder to first N months, assign within each month's slots in order; if a month has zero slots, redistribute to adjacent months
    - If `matchups.length > availableSlots`, throw error: "Insufficient dates to schedule all games within the configured window"
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.2, 3.4, 4.2, 4.4_

- [x] 4. Update all call sites of `distributeMatchups`
  - [x] 4.1 Update `generateSchedulePreview` in `ScheduleGeneratorService`
    - Build a `DistributeConfig` object from the `LeagueWithRosters` fields
    - Pass config object to `distributeMatchups` instead of individual args
    - _Requirements: 7.3_

  - [x] 4.2 Update `generateRoundRobin` in `ScheduleGeneratorService`
    - Build a `DistributeConfig` object from the fetched league fields
    - Pass config object to `distributeMatchups` instead of individual args
    - _Requirements: 7.3_

  - [x] 4.3 Update `generateSingleElimination` and `generateDoubleElimination`
    - Build a `DistributeConfig` with `gameFrequency: 'all_at_once'` for tournament brackets
    - Pass config object to `distributeMatchups` instead of individual args
    - _Requirements: 2.1, 7.3_

  - [x] 4.4 Update `generatePlayoffRounds` call sites
    - Build a `DistributeConfig` from the playoff parameters
    - Pass config object to `distributeMatchups` instead of individual args
    - _Requirements: 7.3_

- [x] 5. Update route handler to pass new fields
  - [x] 5.1 Modify `POST /api/leagues/:id/generate-schedule` in `server/src/routes/leagues.ts`
    - Add `endDate: league.endDate` and `gameFrequency: league.gameFrequency` to the `leagueWithRosters` object
    - Pass `endDate` and `gameFrequency` to `generateTournamentBracket` call (update its signature to accept config or pass through)
    - _Requirements: 7.2_

- [x] 6. Checkpoint — Backend compilation and validation
  - Run diagnostics on `server/src/services/ScheduleGeneratorService.ts` and `server/src/routes/leagues.ts`
  - Ensure no TypeScript errors
  - Verify backward compatibility: null endDate and null gameFrequency should produce same behavior as before

- [ ]*  7. Property tests for slot collection
  - [ ]* 7.1 Write property tests for `collectAllAtOnceSlots`
    - **Property 1: All slots fall within [startDate, endDate]**
    - **Property 2: Slots may fall on any day of the week**
    - **Property 5: All slot times are within the time window**
    - Test file: `server/src/services/__tests__/schedule-distribution.test.ts`
    - _Requirements: 1.1, 1.2, 2.1, 2.3_

  - [ ]* 7.2 Write property tests for `collectWeeklySlots`
    - **Property 3: All slots fall on preferred game days**
    - **Property 5: All slot times are within the time window**
    - **Property 6: Even distribution — max 1 game difference between any two game-day occurrences**
    - Test file: `server/src/services/__tests__/schedule-distribution.test.ts`
    - _Requirements: 3.1, 3.3, 3.4_

  - [ ]* 7.3 Write property tests for `collectMonthlySlots`
    - **Property 4: All slots fall on preferred game days**
    - **Property 5: All slot times are within the time window**
    - **Property 7: Even monthly distribution — max 1 game difference between any two months**
    - Test file: `server/src/services/__tests__/schedule-distribution.test.ts`
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 7.4 Write property tests for double-booking and overflow
    - **Property 8: No roster appears in two overlapping games**
    - **Property 9: Total game count equals input matchup count**
    - **Property 11: Error thrown when matchups exceed available slots**
    - Test file: `server/src/services/__tests__/schedule-distribution.test.ts`
    - _Requirements: 5.1, 1.4_

  - [ ]* 7.5 Write property test for backward compatibility
    - **Property 10: Null endDate + null gameFrequency produces same output as current implementation**
    - **Property 12: Deterministic output for same inputs**
    - Test file: `server/src/services/__tests__/schedule-distribution.test.ts`
    - _Requirements: 1.3_

- [x] 8. Final checkpoint — Full integration
  - Run diagnostics on all modified files
  - Ensure no regressions in existing schedule generation

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The existing `validateNoDoubleBooking` method is unchanged — it already handles conflict detection
- Tournament format (`generateTournamentBracket`) always uses `all_at_once` distribution internally
- Playoff rounds use the same distribution config as the parent league
- The 2-hour game spacing is preserved from the current implementation
- No frontend changes needed — `ScheduleEventCard` already displays date and time
- Brand vocabulary: "League" not "Competition", "Roster" not "Team"
