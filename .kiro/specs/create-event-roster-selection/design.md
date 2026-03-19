# Design: Create Event — Simplified Roster Selection

## Overview

This feature replaces the separate Home/Away `FormSelect` dropdowns on the Create Event screen with a unified roster search-and-add section. The search queries all rosters system-wide (public and private). Game events are limited to two rosters with an optional Home tag. Pickup and practice events retain the current behavior of expanding roster players into the invited list.

### Key Design Decisions

1. **Reuse league page roster search pattern**: The search input, result cards, and add flow match the existing `LeagueForm` roster search UX — debounced text input, shield icon, sport type + player count metadata, add-circle button.
2. **New `RosterSearchSection` component**: A self-contained component encapsulating the search input, results dropdown, added rosters list, and Home tag logic. This keeps `CreateEventScreen` clean and the component reusable.
3. **Backend search returns all rosters**: The existing `GET /search/teams` endpoint already searches all rosters by name. No `isPrivate` filter is applied — private only restricts who can *join*, not who can *invite*.
4. **Home tag is client-side state**: The Home roster selection is managed in the component's local state and mapped to `homeRosterId`/`awayRosterId` on form submission.
5. **Backend validation as a safety net**: The two-roster limit for game events is enforced on both frontend (hide search after 2) and backend (400 error).

## Architecture

```
CreateEventScreen
  └── RosterSearchSection (new component)
        ├── Search input (debounced, 300ms, 2+ chars)
        ├── Search results list (from GET /search/teams)
        ├── Added rosters list
        │     ├── Roster card with remove button
        │     └── Home tag indicator (game events only)
        └── Props: eventType, onRostersChange, onHomeRosterChange
```

## Components

### RosterSearchSection (`src/components/events/RosterSearchSection.tsx`)

A self-contained roster search and selection component.

```typescript
interface RosterSearchResult {
  id: string;
  name: string;
  sportType?: string;
  memberCount?: number;
}

interface RosterSearchSectionProps {
  eventType: string;                          // 'game' | 'pickup' | 'practice'
  selectedRosters: RosterSearchResult[];      // Currently added rosters
  homeRosterId: string | null;                // Which roster is tagged Home (game only)
  onRostersChange: (rosters: RosterSearchResult[]) => void;
  onHomeRosterChange: (rosterId: string | null) => void;
  onRosterPlayersLoaded?: (players: User[]) => void; // For pickup/practice player expansion
}
```

**Behavior by event type:**

| Event Type | Max Rosters | Search visible | Home tag | Player expansion |
|---|---|---|---|---|
| Game | 2 | Hidden when 2 added | Yes | No — show roster names only |
| Pickup | Unlimited | Always | No | Yes — expand players into invited list |
| Practice | Unlimited | Always | No | Yes — expand players into invited list |

**Search flow:**
1. User types in search input (debounced 300ms, min 2 chars)
2. Calls `GET /search/teams?query=...`
3. Results displayed as cards (shield icon, name, sport type, player count, add button)
4. Already-added rosters are filtered from results
5. Tapping add button adds roster to `selectedRosters`
6. For game events: if 2 rosters added, search input hides
7. For pickup/practice: fetch roster members and call `onRosterPlayersLoaded`

**Home tag flow (game events only):**
1. When 2 rosters are added, each roster card shows a home icon (outline by default)
2. Tapping the icon tags that roster as Home (filled icon, "Home" label)
3. Tapping again un-tags it (neutral event)
4. Tapping the other roster's icon switches the Home tag

### CreateEventScreen Changes

**State changes:**
- Remove `homeRosterId` and `awayRosterId` from `FormData` (replaced by component state)
- Add `selectedRosters: RosterSearchResult[]` local state
- Add `homeRosterId: string | null` local state
- Keep `restrictedToTeams` for backward compatibility in submission

**Submission mapping:**
```typescript
// Game events
if (eventType === 'game' && selectedRosters.length === 2) {
  const away = selectedRosters.find(r => r.id !== homeRosterId);
  eventData.homeRosterId = homeRosterId || undefined;
  eventData.awayRosterId = away?.id || undefined;
  eventData.eligibility.restrictedToTeams = selectedRosters.map(r => r.id);
}

// Pickup/Practice events
if (eventType !== 'game') {
  eventData.eligibility.restrictedToTeams = selectedRosters.map(r => r.id);
  eventData.invitedUserIds = invitedUsers.map(u => u.id);
}
```

## Backend Changes

### Event Creation/Update Validation (`server/src/routes/events.ts`)

Add validation in both `POST /` and `PUT /:id` handlers:

```typescript
// Validate game events have at most 2 rosters
if (eventData.eventType === 'game') {
  const rosterIds = eventData.eligibility?.restrictedToTeams || [];
  if (rosterIds.length > 2) {
    return res.status(400).json({ 
      error: 'Game events can have a maximum of two rosters.' 
    });
  }
}
```

### Search Endpoint (`server/src/routes/search.ts`)

The existing `GET /search/teams` endpoint already returns all rosters without filtering by `isPrivate`. No changes needed — the endpoint is already correct for this use case.

Verify the response includes `memberCount` (or `_count.members`). If not, add it:

```typescript
const teams = await prisma.team.findMany({
  where,
  include: {
    _count: { select: { members: true } },
    // ... existing includes
  },
});
```

## Styling

All styling uses theme tokens from `src/theme/`:
- Search input: matches `LeagueForm` roster search styling (same border, padding, icon placement)
- Result cards: shield icon (`colors.grass`), name in `fonts.label`, metadata in `fonts.body` + `colors.inkFaint`
- Added roster cards: white background, `Shadows.sm`, remove button with `colors.track`
- Home tag: `colors.court` (accent) for active state, `colors.inkFaint` for inactive
- Section label: `fonts.label`, uppercase, `colors.ink`

## Error Handling

| Scenario | Handling |
|---|---|
| Search fails (network) | Show inline error text below search input |
| Game event with > 2 rosters (backend) | 400 response: "Game events can have a maximum of two rosters." |
| No search results | Show "No rosters found" empty state |
| Roster already added | Filter from search results (not shown) |

## Correctness Properties

### Property 1: Game roster limit
*For any* game event, the number of rosters in `eligibilityRestrictedToTeams` shall be at most 2.

### Property 2: Home tag exclusivity
*For any* game event with a Home-tagged roster, exactly one roster shall be tagged as Home.

### Property 3: Search scope includes all rosters
*For any* search query, the results shall include matching rosters regardless of their `isPrivate` flag.

### Property 4: Pickup/practice player expansion
*For any* pickup or practice event where a roster is added, all active players of that roster shall appear in the invited list.

### Property 5: Home/away derivation
*For any* game event with two rosters where one is tagged Home, `homeRosterId` shall equal the tagged roster's ID and `awayRosterId` shall equal the other roster's ID.
