# Tasks: League Schedule Management

## Task 1: Prisma Schema — Add new fields to League and Event models
- [x] Add `minimumRosterSize`, `registrationCloseDate`, `preferredGameDays`, `preferredTimeWindowStart`, `preferredTimeWindowEnd`, `seasonGameCount`, `scheduleGenerated` to League model
- [x] Add `scheduledStatus` field to Event model with default "scheduled"
- [x] Create and apply migration

## Task 2: TypeScript Types — Update frontend types
- [x] Add new fields to `League` interface in `src/types/league.ts`
- [x] Add new fields to `CreateLeagueData` and `UpdateLeagueData` interfaces

## Task 3: Backend — Update league create/update endpoints
- [x] Accept and validate new fields in `POST /api/leagues`
- [x] Accept and validate new fields in `PUT /api/leagues/:id`
- [x] Validate HH:MM format for time windows
- [x] Validate registrationCloseDate is in the future on create

## Task 4: Backend — Enforce join restrictions
- [x] Add registration close date check to `POST /api/leagues/:id/join`
- [x] Add minimum roster size check to `POST /api/leagues/:id/join` (team leagues)

## Task 5: Backend — Schedule Generator Service
- [x] Create `server/src/services/ScheduleGeneratorService.ts`
- [x] Implement round-robin pairing algorithm
- [x] Create shell events and matches in a transaction
- [x] Set `scheduleGenerated = true` on league after generation
- [x] `markEventScheduled()` method for facility assignment notifications

## Task 6: Backend — Manual schedule generation endpoint
- [x] Add `POST /api/leagues/:id/generate-schedule` route
- [x] Commissioner-only authorization
- [x] Validate prerequisites (2+ rosters, config complete, no registrationCloseDate)
- [x] Call ScheduleGeneratorService

## Task 7: Backend — Auto-generation background job
- [x] Create `server/src/scripts/generate-league-schedules.ts`
- [x] Find eligible leagues (registrationCloseDate passed, not yet generated, config complete)
- [x] Generate schedules and log results

## Task 8: Backend — Facility assignment updates scheduledStatus
- [x] When an event gets a facility assigned, update scheduledStatus to "scheduled"
- [x] Send notifications to roster players

## Task 9: Frontend — LeagueForm updates
- [x] Add minimumRosterSize number input
- [x] Add registrationCloseDate date picker
- [x] Add preferredGameDays multi-select (Sun-Sat chips)
- [x] Add time window start/end inputs
- [x] Add seasonGameCount number input

## Task 10: Frontend — LeagueDetailsScreen updates
- [x] Display minimum roster size in league info
- [x] Display registration close date with closed indicator
- [x] Show "Generate Schedule" button for commissioner
- [x] Show unscheduled events with "Facility TBD" indicator
- [x] Add `generateSchedule` method to frontend LeagueService
