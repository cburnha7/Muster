# Design Document: League Schedule Management

## Overview

Extends the League model with three capabilities: minimum roster size enforcement, registration close dates, and automated round-robin schedule generation with shell events.

## Data Model Changes

### League Model (new fields)

```prisma
model League {
  // ... existing fields ...

  // Schedule management
  minimumRosterSize        Int?
  registrationCloseDate    DateTime?
  preferredGameDays        Int[]      @default([])
  preferredTimeWindowStart String?
  preferredTimeWindowEnd   String?
  seasonGameCount          Int?
  scheduleGenerated        Boolean    @default(false)
}
```

### Event Model (new field)

```prisma
model Event {
  // ... existing fields ...
  scheduledStatus String @default("scheduled") // "unscheduled" | "scheduled"
}
```

## API Changes

### Modified Endpoints

#### `POST /api/leagues` and `PUT /api/leagues/:id`
- Accept new fields: `minimumRosterSize`, `registrationCloseDate`, `preferredGameDays`, `preferredTimeWindowStart`, `preferredTimeWindowEnd`, `seasonGameCount`
- Validate HH:MM format for time windows
- Validate `registrationCloseDate` is in the future (on create)

#### `POST /api/leagues/:id/join`
- Before existing join logic, check:
  1. If `registrationCloseDate` is set and has passed → 400 "Registration has closed"
  2. If `minimumRosterSize` is set (team league) → count active players on roster → 400 if below minimum

### New Endpoints

#### `POST /api/leagues/:id/generate-schedule`
- Commissioner-only (check `organizerId`)
- Reject if `registrationCloseDate` is non-null (auto-generation handles it)
- Reject if fewer than 2 active roster memberships
- Reject if `preferredGameDays` or `seasonGameCount` not configured
- Generate round-robin shell events using `ScheduleGeneratorService`

### Round-Robin Algorithm

```
Input: rosters[], seasonGameCount, preferredGameDays[], timeWindowStart, timeWindowEnd, leagueStartDate
Output: shell events with home/away rosters, scheduled dates/times

1. Generate all unique pairings: n*(n-1)/2 matchups
2. Create round-robin rounds ensuring each roster plays once per round
3. Repeat rounds until seasonGameCount total matches reached
4. Distribute matches across preferredGameDays starting from league startDate (or registration close date + 7 days)
5. Assign times within the preferred time window
6. Create Event records with scheduledStatus = "unscheduled", facilityId = null
7. Create corresponding Match records linked to events
8. Set league.scheduleGenerated = true
```

## Frontend Changes

### League Types (`src/types/league.ts`)
- Add new fields to `League`, `CreateLeagueData`, `UpdateLeagueData` interfaces

### LeagueForm (`src/components/league/LeagueForm.tsx`)
- Add form fields for: minimumRosterSize, registrationCloseDate, preferredGameDays (multi-select chips), time window (start/end pickers), seasonGameCount

### LeagueDetailsScreen (`src/screens/leagues/LeagueDetailsScreen.tsx`)
- Display minimum roster size, registration close date (with closed indicator), schedule config in the header/info section
- Show "Generate Schedule" button for commissioner when: no registrationCloseDate, schedule config complete, scheduleGenerated is false

### Upcoming Events Section
- Shell events (unscheduled) show "Facility TBD" indicator with an orange dot

## Service Layer

### `ScheduleGeneratorService` (`server/src/services/ScheduleGeneratorService.ts`)
- `generateRoundRobin(leagueId)`: core generation logic
- Creates Events + Matches in a transaction
- Sends notifications to roster players when events become scheduled

### Notification Flow
- When commissioner assigns facility to shell event → update `scheduledStatus` to "scheduled" → notify all players on both rosters

## Background Job

### Auto-generation trigger (`server/src/scripts/generate-league-schedules.ts`)
- Runs as cron job (daily)
- Finds leagues where `registrationCloseDate` has passed, `scheduleGenerated` is false, and schedule config is complete
- Calls `ScheduleGeneratorService.generateRoundRobin()` for each
