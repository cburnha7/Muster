# Design Document: League Schedule Distribution

## Overview

Refactor the `ScheduleGeneratorService.distributeMatchups` method to become format-aware, respecting the league's `gameFrequency`, `startDate`, and `endDate`. The current implementation schedules forward from a start date using only preferred game days with no upper bound. The new implementation introduces three distribution strategies (all-at-once, weekly, monthly) and enforces the start–end date window as a hard boundary.

### Key Design Decisions

1. **Strategy pattern inside `distributeMatchups`**: Rather than creating separate methods per format, the existing `distributeMatchups` gains a `gameFrequency` parameter and branches internally. This keeps the call sites unchanged (single method) while the logic diverges per format.
2. **Slot collection first, then assignment**: Each strategy first collects all available date+time slots within the window, then assigns matchups to slots. This makes boundary enforcement trivial — only slots within [startDate, endDate] are ever created.
3. **Backward-compatible defaults**: When `endDate` is null, behavior falls back to the current unbounded forward scheduling. When `gameFrequency` is null or unrecognized, defaults to `"weekly"` (current behavior).
4. **No frontend changes**: The schedule preview already displays `scheduledAt` with date and time. The only changes are in the backend service and route handler.

## Architecture

```
generate-schedule route
        │
        ▼
LeagueWithRosters (now includes endDate, gameFrequency)
        │
        ▼
generateSchedulePreview / generateTournamentBracket
        │
        ▼
distributeMatchups(matchups, config)
        │
        ├─ gameFrequency === 'all_at_once'  → collectAllAtOnceSlots()
        ├─ gameFrequency === 'weekly'       → collectWeeklySlots()
        └─ gameFrequency === 'monthly'      → collectMonthlySlots()
        │
        ▼
assignMatchupsToSlots(matchups, slots)
        │
        ▼
validateNoDoubleBooking(events)
        │
        ▼
SchedulePreviewEvent[]
```

## Detailed Design

### 1. Interface Changes

#### `LeagueWithRosters` (server/src/services/ScheduleGeneratorService.ts)

Add two fields:

```typescript
export interface LeagueWithRosters {
  // ... existing fields ...
  endDate?: Date | null;
  gameFrequency?: string | null; // 'all_at_once' | 'weekly' | 'monthly'
}
```

#### `DistributeConfig` (new internal type)

```typescript
interface DistributeConfig {
  preferredGameDays: number[];
  timeWindowStart: string; // "HH:MM"
  timeWindowEnd: string;   // "HH:MM"
  startDate: Date;
  endDate: Date | null;
  gameFrequency: string;   // 'all_at_once' | 'weekly' | 'monthly'
}
```

#### Updated `distributeMatchups` signature

```typescript
private static distributeMatchups(
  matchups: Array<{ home: RosterInfo; away: RosterInfo; round: number }>,
  config: DistributeConfig
): ShellEvent[]
```

_Requirements: 7.1, 7.3_

### 2. Slot Collection Strategies

Each strategy produces an ordered array of `Date` objects representing available game start times.

#### 2a. `collectAllAtOnceSlots(startDate, endDate, timeWindowStart, timeWindowEnd)`

- Iterate consecutive days from `startDate` to `endDate` (or up to 365 days if no endDate).
- On each day, generate time slots spaced 2 hours apart within the time window.
- Preferred game days are ignored.
- Returns: `Date[]` of all available start times.

_Requirements: 2.1, 2.2, 2.3, 2.4_

#### 2b. `collectWeeklySlots(startDate, endDate, preferredGameDays, timeWindowStart, timeWindowEnd)`

- Iterate from `startDate` to `endDate` (or up to 365 days if no endDate).
- Only include days whose `getDay()` is in `preferredGameDays`.
- On each matching day, generate time slots spaced 2 hours apart within the time window.
- Returns: `Date[]` of all available start times.

_Requirements: 3.1, 3.3_

#### 2c. `collectMonthlySlots(startDate, endDate, preferredGameDays, timeWindowStart, timeWindowEnd)`

- Group the date range by calendar month.
- Within each month, find all occurrences of `preferredGameDays`.
- On each matching day, generate time slots spaced 2 hours apart within the time window.
- Returns: `{ month: string; slots: Date[] }[]` — grouped by month for even distribution.

_Requirements: 4.1, 4.3_

### 3. Matchup Assignment

#### 3a. Weekly and All-at-Once Assignment

`assignMatchupsToSlots(matchups, slots)`:
- Walk through `slots` in order, assigning one matchup per slot.
- If `matchups.length > slots.length`, throw an error: "Insufficient dates to schedule all games within the configured window."
- For weekly: distribute evenly so no single game-day occurrence gets more than 1 extra game vs any other. This is naturally achieved by round-robin assignment across all slots in chronological order.

_Requirements: 1.4, 3.2, 3.4_

#### 3b. Monthly Assignment

`assignMatchupsMonthly(matchups, monthlySlots)`:
- Calculate `gamesPerMonth = Math.floor(totalGames / totalMonths)` and `remainder = totalGames % totalMonths`.
- First `remainder` months get `gamesPerMonth + 1` games, rest get `gamesPerMonth`.
- Within each month, assign games to the month's slots in order.
- If a month has zero slots (no preferred game days fall in that month within the window), redistribute its share to adjacent months.
- If total slots across all months < total matchups, throw an error.

_Requirements: 4.2, 4.4, 1.4_

### 4. Double-Booking Validation

The existing `validateNoDoubleBooking` method already checks for roster conflicts. It runs after slot assignment. No changes needed to the validation logic itself — it already throws if a roster appears in two overlapping games.

_Requirements: 5.1, 5.2_

### 5. Route Handler Changes

#### `POST /api/leagues/:id/generate-schedule` (server/src/routes/leagues.ts)

Update the `leagueWithRosters` object construction to include:

```typescript
endDate: league.endDate,
gameFrequency: league.gameFrequency,
```

Update all call sites of `distributeMatchups` to pass the new `DistributeConfig` object instead of individual parameters.

_Requirements: 7.2_

### 6. Call Site Updates

The following methods call `distributeMatchups` and need updating:
- `generateSchedulePreview` — passes config object instead of individual args
- `generateRoundRobin` — passes config object instead of individual args
- `generateSingleElimination` — passes config object (with `gameFrequency: 'all_at_once'` for tournaments)
- `generateDoubleElimination` — passes config object (with `gameFrequency: 'all_at_once'` for tournaments)
- `generatePlayoffRounds` — passes config object

### 7. Boundary Enforcement

All three slot collection strategies enforce the boundary by construction:
- Slots are only generated for dates `>= startDate` and `<= endDate`.
- No post-hoc filtering needed.
- The `scheduledAt` field on each returned event is guaranteed to be within the window.

_Requirements: 1.1, 1.2, 1.3_

### 8. Preview Display

No frontend changes required. The existing `ScheduleEventCard` component already renders `scheduledAt` as a formatted date and time. The `SchedulingScreen` FlatList already shows all events with their dates.

_Requirements: 6.1, 6.2_

## Correctness Properties

1. **Window boundary**: For every generated event `e`, `e.scheduledAt >= startDate` and (if endDate is set) `e.scheduledAt <= endDate + timeWindowEnd`.
2. **All-at-once ignores game days**: When `gameFrequency === 'all_at_once'`, generated events may fall on any day of the week, not just `preferredGameDays`.
3. **Weekly respects game days**: When `gameFrequency === 'weekly'`, every generated event falls on a day whose `getDay()` is in `preferredGameDays`.
4. **Monthly respects game days**: When `gameFrequency === 'monthly'`, every generated event falls on a day whose `getDay()` is in `preferredGameDays`.
5. **Time window respected**: For every generated event, the time component of `scheduledAt` is `>= timeWindowStart` and `< timeWindowEnd`.
6. **Even weekly distribution**: For weekly format, the difference in game count between any two game-day occurrences is at most 1.
7. **Even monthly distribution**: For monthly format, the difference in game count between any two months is at most 1 (excluding months with zero available slots).
8. **No double-booking**: No roster appears in two events whose time ranges overlap on the same day.
9. **Total game count preserved**: The number of generated events equals the number of input matchups (unless insufficient slots, in which case an error is thrown).
10. **Backward compatibility**: When `endDate` is null and `gameFrequency` is null, behavior matches the current implementation (weekly-style forward scheduling from startDate).
11. **Error on overflow**: When matchups exceed available slots, the service throws a descriptive error rather than silently dropping games.
12. **Deterministic output**: Given the same inputs, the service produces the same schedule.
