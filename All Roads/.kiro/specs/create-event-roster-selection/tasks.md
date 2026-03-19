# Implementation Plan: Create Event — Simplified Roster Selection

## Overview

Replace the separate Home/Away roster selectors on the Create Event screen with a unified roster search section matching the league page pattern. Add event-type-specific roster limits, a Home tag for game events, and backend validation.

## Tasks

- [x] 1. Create the RosterSearchSection component
  - [x] 1.1 Create `src/components/events/RosterSearchSection.tsx`
    - Debounced search input (300ms, 2+ chars) matching the LeagueForm roster search style
    - Calls `GET /search/teams?query=...` for results
    - Displays results as cards: shield icon, roster name, sport type, player count, add button
    - Filters already-added rosters from results
    - Added rosters list with remove button
    - For game events: hide search input when 2 rosters are added; show Home tag indicator on each roster
    - For pickup/practice: no roster limit; fetch and emit roster players via `onRosterPlayersLoaded`
    - Home tag: tappable house icon, `colors.court` when active, only one roster tagged at a time, optional
    - All styling uses theme tokens from `src/theme/`
    - _Requirements: 1.1, 2.1, 4.1, 4.2_

  - [ ]* 1.2 Write unit tests for RosterSearchSection
    - Verify search input hidden after 2 rosters for game events
    - Verify Home tag toggle behavior
    - Verify no roster limit for pickup/practice
    - Test file: `tests/unit/components/RosterSearchSection.test.tsx`
    - _Requirements: 1.1, 2.1, 4.1, 4.2_

- [x] 2. Integrate RosterSearchSection into CreateEventScreen
  - [x] 2.1 Replace the existing roster selection UI in `src/screens/events/CreateEventScreen.tsx`
    - Remove the `homeRosterId` and `awayRosterId` fields from `FormData`
    - Remove the Home/Away `FormSelect` dropdowns for game events
    - Remove the checkbox-style roster toggle list for pickup/practice events
    - Add `selectedRosters` and `homeRosterId` local state
    - Render `RosterSearchSection` for all event types, passing `eventType`, `selectedRosters`, `homeRosterId`, and callbacks
    - For pickup/practice: wire `onRosterPlayersLoaded` to merge players into `invitedUsers` (existing behavior)
    - For game events: show added roster names in the invited section (not individual players)
    - _Requirements: 1.1, 2.1, 4.1, 4.2_

  - [x] 2.2 Update form submission mapping in `CreateEventScreen`
    - For game events with 2 rosters: derive `homeRosterId` and `awayRosterId` from the Home tag state, set `eligibility.restrictedToTeams` to both roster IDs
    - For pickup/practice: set `eligibility.restrictedToTeams` to all selected roster IDs, keep `invitedUserIds` from expanded players
    - If no Home tag is set on a game event, omit both `homeRosterId` and `awayRosterId`
    - _Requirements: 6.1_

  - [ ]* 2.3 Write unit tests for CreateEventScreen roster integration
    - Verify RosterSearchSection renders for all event types
    - Verify submission payload maps correctly for game vs pickup/practice
    - Test file: `tests/unit/screens/CreateEventScreen.test.tsx`
    - _Requirements: 1.1, 6.1_

- [x] 3. Update roster search API to include member count
  - [x] 3.1 Update `GET /search/teams` in `server/src/routes/search.ts` to include member count in response
    - Add `_count: { select: { members: true } }` to the Prisma query if not already present
    - Map `_count.members` to `memberCount` in the response
    - Verify no `isPrivate` filter is applied (search returns all rosters)
    - _Requirements: 3.1_

- [x] 4. Add backend validation for game roster limit
  - [x] 4.1 Add validation to `POST /events` in `server/src/routes/events.ts`
    - If `eventType === 'game'` and `eligibility.restrictedToTeams` has more than 2 entries, return 400 with error "Game events can have a maximum of two rosters."
    - _Requirements: 5.1_

  - [x] 4.2 Add validation to `PUT /events/:id` in `server/src/routes/events.ts`
    - Same validation as POST: reject game events with more than 2 rosters
    - _Requirements: 5.1_

  - [ ]* 4.3 Write unit tests for game roster limit validation
    - Test 400 for game event with 3+ rosters on POST and PUT
    - Test non-game events are not subject to the limit
    - Test file: `tests/unit/server/event-roster-limit.test.ts`
    - _Requirements: 5.1_

- [x] 5. Checkpoint — Verify all changes work together
  - Run diagnostics on modified files
  - Run backend tests if applicable
  - Ensure no regressions in existing event creation flow

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The existing `GET /search/teams` endpoint already searches all rosters without `isPrivate` filtering — requirement 3.1 is already satisfied at the query level
- The `teamOptions` filtering by captain/co-captain role is removed — the new search returns all rosters system-wide
- Brand vocabulary: "Roster" not "Team", "Players" not "Members"
- All UI must use theme tokens from `src/theme/`
