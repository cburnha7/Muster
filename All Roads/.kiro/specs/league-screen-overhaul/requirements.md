# League Screen — Full Overhaul

## Requirements

### R1: Commissioner View — Edit-in-Place
- REQUIREMENT: When a Commissioner opens a league, the detail screen loads the same form as Create League, pre-populated with all existing league data
- REQUIREMENT: Update League and Delete League buttons sit at the bottom, styled to match the edit event screen
- REQUIREMENT: No separate ManageLeague edit flow — the detail screen IS the edit screen for the Commissioner
- REQUIREMENT: League Rosters section appears above the Update League button

### R2: Shell Matchup Event Generation
- REQUIREMENT: Once a league passes its registration close date, a list of shell matchup events is automatically generated — one per game per round labeled by frequency (Week 1, Week 2, etc.)
- REQUIREMENT: Commissioner can tap any matchup to open a pre-populated edit event screen with assigned rosters, league, and sport filled in; date, time, and facility left empty
- REQUIREMENT: Inside the create/edit event screen, the grounds picker popup includes a "Find a Grounds" link that navigates to the Grounds tab to browse and book a court, then returns with that booking pre-applied

### R3: Player and Roster Management Fixes
- REQUIREMENT: Fix Remove Player — removing a player or roster must take effect immediately without a refresh
- REQUIREMENT: Fix Add Player — added players must appear in the list immediately without requiring a hard refresh
- REQUIREMENT: Show a joined/pending indicator next to each invited player and roster (Joined = confirmed, Pending = invited but not confirmed)

### R4: Invitation and Visibility
- REQUIREMENT: Invited rosters and players can see the league screen but are in a pending state until they confirm — they cannot participate in league events until confirmed
- REQUIREMENT: If a person is invited to a league they can add a roster to the league from the league screen
- REQUIREMENT: If a roster is invited to a league, that league appears in the Leagues section on the roster detail screen with a pending flag until the roster Manager/Owner confirms
- REQUIREMENT: Only the roster Manager/Owner can confirm a league invitation — confirmation works like the Join Up flow for events
- REQUIREMENT: The roster Manager taps a confirm button on the league screen and the roster moves from pending to active

### R5: Read-Only View
- REQUIREMENT: Non-commissioner users who are not invited see the league screen as fully read-only
- REQUIREMENT: No edit controls, no add buttons, no action buttons beyond joining if eligible
