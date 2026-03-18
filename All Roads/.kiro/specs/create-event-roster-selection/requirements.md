# Requirements: Create Event — Simplified Roster Selection

## Overview

Replace the separate Home/Away roster selectors on the Create Event screen with a unified roster search section. Add event-type-specific roster limits and a Home tag for game events. Update the roster search to return all rosters system-wide.

## Requirements

### 1. Unified Roster Search Section
1.1 As an organizer, I want a single "Rosters" section on the Create Event screen that uses the same search-and-add pattern as the league page roster search, so I can find and invite rosters from one place.
- Acceptance Criteria:
  - The separate Home Roster and Away Roster `FormSelect` dropdowns are removed for game events.
  - A single "Rosters" section appears for all event types (game, pickup, practice).
  - The section contains a debounced text search input (300ms, minimum 2 characters) with a search icon.
  - Search results display roster name, sport type, and player count with an add button.
  - Added rosters appear in a list below the search input.

### 2. Home Roster Tag (Game Events Only)
2.1 As an organizer creating a game event, I want to tag one of the added rosters as the Home roster, so the matchup has a clear home/away designation.
- Acceptance Criteria:
  - When the event type is "Game" and two rosters are added, each roster entry shows a tappable home indicator (e.g., house icon or "Home" badge).
  - Tapping the indicator on a roster tags it as Home and removes the tag from any other roster.
  - Only one roster can be tagged as Home at a time.
  - The Home tag is optional — if no roster is tagged, the event is treated as neutral.
  - The Home tag indicator is not shown for pickup or practice events.

### 3. Roster Search Scope — All Rosters
3.1 As an organizer, I want the roster search to return all rosters in the system (public and private), so I can invite any roster to my event.
- Acceptance Criteria:
  - The search API endpoint returns all rosters matching the query regardless of the roster's `isPrivate` flag.
  - Private rosters appear in search results the same as public rosters.
  - The search does not filter by the organizer's membership or captaincy.

### 4. Event Type Roster Limits
4.1 As an organizer creating a game event, I want the roster selection to enforce a maximum of two rosters, so the game has exactly two sides.
- Acceptance Criteria:
  - For game events, once two rosters are added the search input is hidden.
  - The invited list shows the two roster names only — not individual player names.
  - Removing a roster re-shows the search input.

4.2 As an organizer creating a pickup or practice event, I want no limit on the number of rosters I can add, and each roster's players are expanded into the invited list.
- Acceptance Criteria:
  - For pickup and practice events, there is no roster count limit.
  - When a roster is added, its individual players are automatically expanded into the invited list.
  - The organizer can remove individual players from the invited list.
  - Behavior matches the current pickup/practice roster invite flow.

### 5. Backend Validation — Game Roster Limit
5.1 As a system, I want the create/update event API to reject game events with more than two rosters, so the constraint is enforced server-side.
- Acceptance Criteria:
  - The `POST /events` endpoint returns 400 if `eventType === 'game'` and `eligibilityRestrictedToTeams` contains more than 2 roster IDs.
  - The `PUT /events/:id` endpoint returns 400 under the same condition.
  - The error message is: "Game events can have a maximum of two rosters."
  - Non-game event types are not subject to this limit.

### 6. Home Roster ID Persistence
6.1 As a system, I want the home roster ID to be persisted when a game event is created or updated, so the home/away designation is stored.
- Acceptance Criteria:
  - The `homeRosterId` field is sent in the create/update event payload when a roster is tagged as Home.
  - The `awayRosterId` is derived as the other roster in the pair (if two rosters are present and one is tagged Home).
  - If no roster is tagged Home, both `homeRosterId` and `awayRosterId` are omitted (neutral event).
