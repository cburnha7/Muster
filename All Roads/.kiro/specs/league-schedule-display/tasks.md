# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Existing Matches Not Displayed on Mount
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Use fast-check to generate random arrays of `Match` objects (1-20 matches with random roster names, dates, statuses). For each generated array, mock `MatchService.getLeagueMatches` to return those matches, render `SchedulingScreen` with a valid `leagueId`, and assert that the rendered event list contains the same number of items as the generated matches array.
  - **Test file**: `src/screens/leagues/__tests__/SchedulingScreen.bugCondition.test.tsx`
  - Mock `MatchService.getLeagueMatches` to return generated `Match[]` for the given `leagueId`
  - Mock navigation params with a valid `leagueId`
  - Render `SchedulingScreen` and wait for mount effects to complete
  - Assert that `MatchService.getLeagueMatches` was called with the `leagueId`
  - Assert that the number of rendered event cards equals `backendMatches.length`
  - Assert that each match's roster names appear in the rendered output
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists because `clearSchedule()` wipes state and no fetch occurs)
  - Document counterexamples found: e.g., "Generated 5 matches but 0 event cards rendered; `getLeagueMatches` was never called"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Auto-Generate, Confirm, Manual Edit, and Empty State Flows Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **Test file**: `src/screens/leagues/__tests__/SchedulingScreen.preservation.test.tsx`
  - Observe on UNFIXED code: tapping "Auto Generate Schedule" calls `generateSchedule` mutation and populates events from preview response
  - Observe on UNFIXED code: tapping "Confirm Schedule" calls `confirmSchedule` mutation with correct payload, shows success alert, navigates back
  - Observe on UNFIXED code: a league with zero backend matches shows "No games scheduled yet" empty state
  - Observe on UNFIXED code: loading spinner displays while league data is being fetched
  - Write property-based tests using fast-check:
    - Generate random roster names and scheduled dates, verify auto-generate flow produces events with those values in the preview
    - Generate random event arrays, verify confirm flow sends the correct payload
    - Verify empty league (0 matches) always shows empty state text
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [-] 3. Fix league schedule display bug

  - [x] 3.1 Create `mapMatchesToScheduleEvents` mapper function
    - Create a new utility function (e.g., in `src/screens/leagues/utils/mapMatchesToScheduleEvents.ts` or inline in SchedulingScreen)
    - Map `match.homeTeamId` → `event.homeRosterId`
    - Map `match.homeTeam.name` → `event.homeRosterName`
    - Map `match.awayTeamId` → `event.awayRosterId`
    - Map `match.awayTeam.name` → `event.awayRosterName`
    - Map `match.scheduledAt` → `event.scheduledAt`
    - Map `match.id` → `event.id`
    - Derive `round` from match data or default to 1
    - Write a unit test for the mapper using fast-check: generate random `Match[]` arrays and verify all fields map correctly to `ScheduleEvent[]`
    - _Bug_Condition: isBugCondition(input) where leagueId is not null AND backendMatches.length > 0_
    - _Expected_Behavior: mapMatchesToScheduleEvents produces ScheduleEvent[] with correct roster IDs, names, dates, and rounds_
    - _Preservation: Mapper is a new function; does not modify existing code paths_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Add match fetching to SchedulingScreen mount effect
    - In `src/screens/leagues/SchedulingScreen.tsx`, modify the `useEffect` mount hook
    - After `loadLeagueData()` completes, call `MatchService.getLeagueMatches(leagueId)` to fetch existing matches
    - Map the returned `Match[]` to `ScheduleEvent[]` using `mapMatchesToScheduleEvents`
    - Dispatch `setEvents({ leagueId, events: mappedEvents })` to populate the Redux schedule state
    - If `setEvents` action does not exist in `scheduleSlice`, add it (or use existing actions like dispatching individual `addEvent` calls)
    - _Bug_Condition: isBugCondition(input) where no fetch was called on mount_
    - _Expected_Behavior: getLeagueMatches is called with leagueId on mount, results are mapped and dispatched to Redux_
    - _Preservation: loadLeagueData() call and its behavior remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Remove or reorder `clearSchedule()` call
    - In `src/screens/leagues/SchedulingScreen.tsx`, remove the standalone `dispatch(clearSchedule())` from the mount effect
    - The `setEvents` dispatch from task 3.2 will replace the events array, effectively clearing stale data and populating fresh data in one step
    - Alternatively, keep `clearSchedule()` but ensure it runs BEFORE the fetch, not as the final action
    - _Bug_Condition: clearSchedule() wipes state and no subsequent fetch repopulates it_
    - _Expected_Behavior: Stale data is replaced by fresh fetched data without a visible empty flash_
    - _Preservation: Schedule state is still reset when navigating to a new league context_
    - _Requirements: 1.1, 1.3, 2.3_

  - [x] 3.4 Handle loading state for match fetch
    - Ensure the loading spinner covers both the league data fetch AND the matches fetch
    - The user should not see a flash of "No games scheduled yet" before matches load
    - Set loading state before the fetch begins, clear it after both league data and matches are loaded
    - Handle error case: if match fetch fails, show error banner (not crash), allow retry
    - _Bug_Condition: N/A (loading state improvement)_
    - _Expected_Behavior: Loading spinner displays until all data (league + matches) is ready_
    - _Preservation: Existing loading spinner behavior for league data fetch remains unchanged_
    - _Requirements: 2.1, 3.5_

  - [ ] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Existing Matches Displayed on Mount
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior: for any league with N > 0 backend matches, the screen fetches and displays N event cards with correct roster names
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Auto-Generate, Confirm, Manual Edit, and Empty State Flows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run full test suite: `npm test`
  - Ensure bug condition exploration test (task 1) passes
  - Ensure preservation tests (task 2) pass
  - Ensure mapper unit tests (task 3.1) pass
  - Ensure no other existing tests have regressed
  - Ask the user if questions arise
