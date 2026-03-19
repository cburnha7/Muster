# League Schedule Display Bugfix Design

## Overview

The SchedulingScreen dispatches `clearSchedule()` on mount and never fetches existing confirmed matches from the backend. This means any league with previously confirmed games shows "No games scheduled yet" until the commissioner generates a new schedule. The fix adds a fetch of existing matches via `MatchService.getLeagueMatches` on mount and maps the results into the Redux `scheduleSlice`, while preserving all existing auto-generate, confirm, and manual-edit flows.

## Glossary

- **Bug_Condition (C)**: The SchedulingScreen is opened for a league that has existing confirmed/scheduled matches in the backend database
- **Property (P)**: Existing matches are fetched from the backend and displayed in the event list on mount
- **Preservation**: Auto-generate, confirm schedule, manual add/edit, empty state for truly empty leagues, and loading spinner behavior must remain unchanged
- **SchedulingScreen**: The screen component at `src/screens/leagues/SchedulingScreen.tsx` that manages league schedule viewing and editing
- **scheduleSlice**: Redux slice at `src/store/slices/scheduleSlice.ts` that holds the `events` array, `leagueId`, and UI flags (`isGenerating`, `isReviewing`, `error`)
- **MatchService**: API service at `src/services/api/MatchService.ts` with `getLeagueMatches(leagueId)` that returns paginated `Match[]` from `GET /matches?leagueId=...`
- **Match**: Backend data type with `homeTeamId`, `awayTeamId`, `homeTeam.name`, `awayTeam.name`, `scheduledAt`, `status`
- **ScheduleEvent**: Redux state type with `homeRosterId`, `homeRosterName`, `awayRosterId`, `awayRosterName`, `scheduledAt`, `round`

## Bug Details

### Bug Condition

The bug manifests when a user navigates to the SchedulingScreen for a league that has existing confirmed or scheduled matches stored in the backend. The `useEffect` on mount dispatches `clearSchedule()` which resets the Redux `events` array to `[]`, and no subsequent API call is made to fetch existing matches. The `events` array stays empty, so the FlatList renders the empty state.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { leagueId: string, backendMatches: Match[] }
  OUTPUT: boolean

  RETURN input.leagueId IS NOT NULL
         AND input.backendMatches.length > 0
         AND screenMountOccurred(input.leagueId)
         AND NOT fetchExistingMatchesCalled(input.leagueId)
END FUNCTION
```

### Examples

- A commissioner opens SchedulingScreen for "Sunday Soccer League" which has 12 confirmed matches. Expected: 12 match cards displayed. Actual: "No games scheduled yet" empty state.
- A commissioner navigates away from SchedulingScreen and returns. Expected: matches reload from backend. Actual: `clearSchedule()` wipes state, no fetch occurs, empty state shown.
- A commissioner opens SchedulingScreen for a league with 3 scheduled and 2 completed matches. Expected: all 5 matches displayed. Actual: empty state.
- A commissioner opens SchedulingScreen for a league with zero matches. Expected: "No games scheduled yet" empty state. Actual: same (correct behavior, not a bug case).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Tapping "Auto Generate Schedule" must continue to call `generateSchedule` mutation and display preview events for review
- Tapping "Confirm Schedule" must continue to call `confirmSchedule` mutation, clear state, show success alert, and navigate back
- Tapping "Add Game" must continue to open the ScheduleEventEditor for manual event creation
- Editing or removing events in the list must continue to dispatch `updateEvent`/`removeEvent` actions
- A league with zero matches must continue to show the "No games scheduled yet" empty state
- The loading spinner must continue to display while league data is being fetched
- Error states and retry behavior must continue to work as before

**Scope:**
All inputs that do NOT involve the initial mount fetch of existing matches should be completely unaffected by this fix. This includes:
- Auto-generate schedule flow
- Confirm schedule flow
- Manual add/edit/remove game flow
- Error banner display and dismissal
- Navigation back behavior

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Missing Fetch on Mount**: The `useEffect` in `SchedulingScreen` (line ~119) calls `loadLeagueData()` and `dispatch(clearSchedule())` but never fetches existing matches. The `loadLeagueData` function only fetches league metadata and roster memberships — it does not fetch matches.

2. **Unconditional clearSchedule()**: `clearSchedule()` resets the entire schedule state to `initialState` (empty events array). This is dispatched every time the screen mounts, wiping any previously loaded data. While clearing stale state is reasonable, it must be followed by a fresh fetch.

3. **No RTK Query Endpoint for Match Fetching**: The `api.ts` file has `generateSchedule` and `confirmSchedule` mutations but no query endpoint for fetching existing league matches. The `MatchService.getLeagueMatches` exists as a standalone service but is never called from SchedulingScreen.

4. **No Match-to-ScheduleEvent Mapping**: Even if matches were fetched, there is no mapping function to convert backend `Match` objects (with `homeTeamId`/`awayTeamId`/`homeTeam.name`/`awayTeam.name`) into Redux `ScheduleEvent` objects (with `homeRosterId`/`homeRosterName`/`awayRosterId`/`awayRosterName`).

## Correctness Properties

Property 1: Bug Condition - Existing Matches Displayed on Mount

_For any_ navigation to SchedulingScreen where the league has N > 0 existing matches in the backend, the fixed screen SHALL fetch those matches via the matches API and display N match cards in the event list, with correct roster names, scheduled dates, and round numbers.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Auto-Generate and Confirm Flows Unchanged

_For any_ interaction with the "Auto Generate Schedule" or "Confirm Schedule" buttons, the fixed code SHALL produce exactly the same behavior as the original code, preserving the generate-preview-confirm workflow, success alerts, and navigation.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/screens/leagues/SchedulingScreen.tsx`

**Function**: `SchedulingScreen` component and `useEffect` mount hook

**Specific Changes**:

1. **Add Match Fetching to Mount Effect**: After `loadLeagueData()` completes, call `MatchService.getLeagueMatches(leagueId)` (or add an RTK Query endpoint) to fetch existing matches from the backend.

2. **Add Match-to-ScheduleEvent Mapper**: Create a `mapMatchesToScheduleEvents` function that converts backend `Match[]` into `ScheduleEvent[]`:
   - `match.homeTeamId` → `event.homeRosterId`
   - `match.homeTeam.name` → `event.homeRosterName`
   - `match.awayTeamId` → `event.awayRosterId`
   - `match.awayTeam.name` → `event.awayRosterName`
   - `match.scheduledAt` → `event.scheduledAt`
   - `match.id` → `event.id` (use real backend ID instead of client-generated)
   - Derive `round` from match data or default to 1

3. **Dispatch Fetched Events to Redux**: After mapping, dispatch `setEvents({ leagueId, events: mappedEvents })` to populate the schedule state.

4. **Remove or Reorder clearSchedule()**: Remove the standalone `dispatch(clearSchedule())` from the mount effect. The `setEvents` dispatch will replace the events array, effectively clearing stale data and populating fresh data in one step. Alternatively, keep `clearSchedule()` but ensure it runs before the fetch, not after.

5. **Handle Loading State**: Ensure the loading spinner covers both the league data fetch and the matches fetch, so the user doesn't see a flash of empty state before matches load.

**File**: `src/store/api.ts` (optional)

**Specific Changes**:
- Optionally add a `getLeagueMatches` query endpoint to RTK Query for cache management and tag invalidation. This would allow the matches list to auto-refresh when `confirmSchedule` invalidates the `'League'` tag.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that render SchedulingScreen with a mocked `MatchService.getLeagueMatches` returning matches, and assert that match cards appear. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Mount With Existing Matches**: Render SchedulingScreen for a league with 5 backend matches. Assert that 5 ScheduleEventCards are rendered (will fail on unfixed code — shows 0).
2. **Re-navigation Fetch**: Navigate away and back to SchedulingScreen. Assert matches are re-fetched and displayed (will fail on unfixed code — clearSchedule wipes state).
3. **Mixed Status Matches**: Render with a mix of scheduled and completed matches. Assert all are displayed (will fail on unfixed code).
4. **Single Match**: Render with exactly 1 backend match. Assert 1 card is rendered with correct roster names (will fail on unfixed code).

**Expected Counterexamples**:
- The events FlatList renders 0 items despite the backend having matches
- `MatchService.getLeagueMatches` is never called during mount
- `clearSchedule()` is dispatched but no subsequent `setEvents` populates the list

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderSchedulingScreen_fixed(input.leagueId)
  ASSERT matchService.getLeagueMatches WAS CALLED WITH input.leagueId
  ASSERT result.displayedEvents.length = input.backendMatches.length
  FOR EACH match IN input.backendMatches DO
    ASSERT result.displayedEvents CONTAINS eventMatchingMatch(match)
  END FOR
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderSchedulingScreen_original(input) = renderSchedulingScreen_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for auto-generate, confirm, and manual-edit flows, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Auto-Generate Preservation**: Verify that tapping "Auto Generate Schedule" still calls `generateSchedule` mutation and populates events from the preview response, both before and after the fix
2. **Confirm Schedule Preservation**: Verify that tapping "Confirm Schedule" still calls `confirmSchedule` mutation with the correct event payload, shows success alert, and navigates back
3. **Manual Add/Edit Preservation**: Verify that adding or editing a game via ScheduleEventEditor still dispatches `addEvent`/`updateEvent` correctly
4. **Empty League Preservation**: Verify that a league with zero backend matches still shows "No games scheduled yet"

### Unit Tests

- Test `mapMatchesToScheduleEvents` mapper: correct field mapping from `Match` to `ScheduleEvent`
- Test that `MatchService.getLeagueMatches` is called with the correct `leagueId` on mount
- Test that `setEvents` is dispatched with mapped events after fetch completes
- Test error handling when match fetch fails (should show error, not crash)
- Test that loading state covers both league data and match fetch

### Property-Based Tests

- Generate random arrays of `Match` objects and verify `mapMatchesToScheduleEvents` produces correct `ScheduleEvent[]` with matching roster IDs, names, and dates
- Generate random league states (with/without matches) and verify the screen renders the correct number of event cards
- Generate random sequences of user actions (auto-generate, add game, remove game) and verify they produce the same Redux state changes as the unfixed code

### Integration Tests

- Test full flow: open SchedulingScreen → see existing matches → tap Auto Generate → see preview → confirm → navigate back
- Test re-navigation: open screen → see matches → go back → reopen → matches reload from backend
- Test that confirmed schedule matches appear on subsequent SchedulingScreen visits
