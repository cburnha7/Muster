# League Screen Overhaul — Design

## Architecture Overview

The overhaul consolidates the Commissioner's league management into the LeagueDetailsScreen itself, eliminating the separate ManageLeagueScreen for editing. The screen renders differently based on the user's role:

- **Commissioner**: Sees the LeagueForm pre-populated + roster management + shell matchups + Update/Delete buttons
- **Invited (pending)**: Sees league info read-only + confirm button for their roster
- **Active member**: Sees league info read-only + Step Out option
- **Public viewer**: Sees league info read-only + Join Up if eligible

## Component Changes

### LeagueDetailsScreen.tsx (Major Rewrite)
- Commissioner view: Replace header + tabs with LeagueForm (pre-populated), League Rosters section, shell matchup list, Update/Delete buttons at bottom
- Non-commissioner view: Keep current read-only layout with tabs (standings, matches, players, rosters, info)
- Add pending roster confirmation flow for invited roster owners

### ManageLeagueScreen.tsx
- Remove the event creation form (shell matchups replace it)
- Keep document upload and certification sections (accessed via a separate route if needed)

### Backend: Shell Matchup Generation
- New endpoint `POST /api/leagues/:id/generate-matchups` — generates shell events after registration closes
- Each shell event: title = "Week N: Roster A vs Roster B", status = "unscheduled", no facility/time
- Store on existing Event model with `scheduledStatus = 'unscheduled'` and `leagueId` link
