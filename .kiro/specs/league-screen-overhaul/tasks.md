# League Screen Overhaul — Tasks

## Task 1: Commissioner Edit-in-Place on LeagueDetailsScreen
- [x] When `isOperator` is true, render LeagueForm pre-populated with league data instead of the read-only header
- [x] Add League Rosters section below the form showing all members with status badges (Joined/Pending)
- [x] Add Update League and Delete League buttons at the bottom styled like edit event screen
- [x] Wire Update to `leagueService.updateLeague()` and Delete to `leagueService.deleteLeague()` with confirmation
- [x] Remove the settings gear icon that navigated to ManageLeagueScreen for commissioners
- Files: `src/screens/leagues/LeagueDetailsScreen.tsx`

## Task 2: Remove Event Creation from ManageLeagueScreen
- [x] Remove the "Event Scheduling" section entirely from ManageLeagueScreen
- [x] Keep document upload and certification sections
- Files: `src/screens/leagues/ManageLeagueScreen.tsx`

## Task 3: Shell Matchup Event Generation (Backend)
- [x] Backend endpoint already exists at `POST /api/leagues/:id/generate-schedule`
- [x] Frontend wired via `leagueService.generateSchedule()` → Generate Schedule button on commissioner view
- Files: `server/src/routes/leagues.ts`

## Task 4: Shell Matchup List on Commissioner View
- [x] After registration closes and schedule is generated, show matchup list on commissioner view
- [x] Each matchup card shows round label, roster names, and status (unscheduled/scheduled)
- [x] Tapping a matchup navigates to EditEvent screen with rosters, league, sport pre-filled
- Files: `src/screens/leagues/LeagueDetailsScreen.tsx`

## Task 5: Fix Remove Player/Roster — Immediate State Update
- [x] After `leagueService.leaveLeague()` succeeds, remove the member from local `members` state immediately
- [x] Optimistic update via `setMembers(prev => prev.filter(...))`
- Files: `src/screens/leagues/LeagueDetailsScreen.tsx`

## Task 6: Fix Add Player — Immediate State Update
- [x] After invite/join succeeds, append the new membership to local `members` state immediately
- [x] `handleJoinTeamLeague`, `handleJoinPickupLeague`, `handleAddRosterToLeague` all do optimistic updates
- Files: `src/screens/leagues/LeagueDetailsScreen.tsx`

## Task 7: Joined/Pending Status Indicators
- [x] Show status badge next to each roster and player in the League Rosters section
- [x] "Joined" badge (green) for `status === 'active'`
- [x] "Pending" badge (amber) for `status === 'pending'`
- Files: `src/screens/leagues/LeagueDetailsScreen.tsx`

## Task 8: Roster Invitation Confirmation Flow
- [x] Invited roster owners see a "Confirm" button on the league screen for their pending roster
- [x] Only roster Manager/Owner can confirm (check `captainId` match)
- [x] Uses existing `PUT /api/leagues/:id/invitations/:invitationId` endpoint via `respondToInvitation`
- [x] On confirm, membership moves from pending to active (optimistic update)
- [x] Invitation banner shown on non-commissioner view for pending roster invitations
- Files: `src/screens/leagues/LeagueDetailsScreen.tsx`

## Task 9: Invited User Can Add Roster
- [x] If a user is invited to a league, show an "Add Roster" option on the league screen
- [x] User can select from their owned rosters to add to the league
- Files: `src/screens/leagues/LeagueDetailsScreen.tsx`

## Task 10: Read-Only View for Non-Commissioner Non-Invited Users
- [x] Non-commissioner, non-invited users see fully read-only league screen
- [x] No edit controls, no add buttons — only Join Up if eligible
- [x] Tab-based view with standings, matches, players, rosters, info
- Files: `src/screens/leagues/LeagueDetailsScreen.tsx`
