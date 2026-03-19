# Implementation Plan: League Screens and Flow

## Overview

This plan implements dual league types (Team League and Pickup League) across the full stack: Prisma schema updates, Express API endpoints, TypeScript types, Redux state, and React Native screens. Each task builds incrementally, wiring components together as we go. All UI uses Muster brand vocabulary (Roster, League, Join Up, Step Out, Players).

## Tasks

- [x] 1. Database schema and type updates
  - [x] 1.1 Add `leagueType` and `visibility` fields to the League Prisma model, and `memberType`, `memberId`, `userId` fields to the LeagueMembership model
    - Update `server/prisma/schema.prisma`: add `leagueType String @default("team")`, `visibility String @default("public")`, `membershipFee Float?` to League model
    - Update `LeagueMembership` model: add `memberType String @default("roster")`, `memberId String`, make `teamId` nullable (`String?`), add `userId String?`, add `user User? @relation(fields: [userId], references: [id])` relation
    - Update unique constraint on LeagueMembership to accommodate new fields
    - Add `leagueMemberships LeagueMembership[]` relation to User model
    - Run `npx prisma migrate dev` to generate migration
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 1.2 Update TypeScript type definitions in `src/types/league.ts`
    - Add `leagueType: 'team' | 'pickup'` and `visibility: 'public' | 'private'` and `membershipFee?: number` to `League` interface
    - Add `leagueType` and `visibility` to `CreateLeagueData` interface
    - Add `memberType: 'roster' | 'user'`, `memberId: string`, `userId?: string`, `user?: User` to `LeagueMembership` interface
    - Add `CreateLeagueEventData` and `ConflictResult` interfaces as defined in design
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 1.3 Write property tests for league creation persistence (Properties 1-3)
    - **Property 1: League type and visibility persistence** — verify persisted League record has matching `leagueType` and valid `visibility` defaulting to "public"
    - **Validates: Requirements 1.2, 2.1, 2.2**
    - **Property 2: League type immutability** — verify update requests cannot change `leagueType`
    - **Validates: Requirements 1.3**
    - **Property 3: Pickup leagues are always public** — verify pickup leagues always have `visibility` "public"
    - **Validates: Requirements 1.5, 5.3**
    - Create test file `tests/properties/league-screens-flow/league-creation.property.test.ts`

- [x] 2. Checkpoint - Ensure schema migration and types compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Backend API — League creation and update endpoints
  - [x] 3.1 Update POST `/api/leagues` to accept `leagueType` and `visibility`, enforce pickup leagues are always public
    - Update `server/src/routes/leagues.ts` POST `/` handler
    - Validate `leagueType` is "team" or "pickup"
    - Force `visibility` to "public" when `leagueType` is "pickup"
    - Persist `leagueType`, `visibility`, and optional `membershipFee`
    - _Requirements: 1.2, 1.5, 2.1, 2.2_

  - [x] 3.2 Update PUT `/api/leagues/:id` to prevent `leagueType` modification and enforce pickup visibility
    - Reject requests that attempt to change `leagueType` with 400 error
    - Prevent setting `visibility` to "private" on pickup leagues
    - _Requirements: 1.3, 5.3_

  - [x] 3.3 Update GET `/api/leagues/:id` to return `leagueType`, `visibility`, and polymorphic memberships
    - Include `leagueType` and `visibility` in response
    - Conditionally include user relations for pickup league memberships
    - _Requirements: 2.1, 2.2_

- [x] 4. Backend API — Join flows (Team League and Pickup League)
  - [x] 4.1 Update POST `/api/leagues/:id/join` to handle both roster joins (pending for public team leagues) and direct user joins (active for pickup leagues)
    - For team leagues: accept `rosterId`, create membership with `status: "pending"`, `memberType: "roster"`, `memberId: rosterId`
    - For pickup leagues: accept `userId`, create membership with `status: "active"`, `memberType: "user"`, `memberId: userId`
    - Check for existing active/pending membership to prevent duplicates
    - _Requirements: 4.2, 5.2_

  - [x] 4.2 Implement GET `/api/leagues/:id/join-requests` and PUT `/api/leagues/:id/join-requests/:requestId` for public team league approval/decline
    - GET returns pending memberships for the league (owner/admin only)
    - PUT with `action: "approve"` checks membership fee, deducts from roster balance, sets status to "active"
    - PUT with `action: "decline"` sets status to "withdrawn"
    - Return 400 with insufficient balance error when roster balance < fee
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 4.3 Implement POST `/api/leagues/:id/invite-roster` and PUT `/api/leagues/:id/invitations/:invitationId` for private team league invitations
    - POST creates a pending membership as an invitation (owner/admin only, private team leagues)
    - PUT with `accept: true` checks fee, deducts balance, activates membership
    - PUT with `accept: false` sets status to "withdrawn"
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 4.4 Update POST `/api/leagues/:id/leave` to handle individual user Step Out for pickup leagues
    - For pickup leagues: accept `userId`, set membership status to "withdrawn" and `leftAt` timestamp
    - Keep existing roster leave logic for team leagues
    - _Requirements: 5.5_

  - [ ]* 4.5 Write property tests for membership flows (Properties 4-11)
    - **Property 4: Membership type consistency** — `memberType` is "roster" or "user" with correct `memberId` reference
    - **Validates: Requirements 2.3, 2.4, 2.6, 2.7**
    - **Property 5: Public team league join creates pending membership**
    - **Validates: Requirements 4.2**
    - **Property 6: Join request approval activates membership**
    - **Validates: Requirements 4.4**
    - **Property 7: Join request decline withdraws membership**
    - **Validates: Requirements 4.5**
    - **Property 8: Membership fee deduction on activation** — roster balance decreases by exactly the fee amount
    - **Validates: Requirements 3.5, 4.6**
    - **Property 9: Invitation acceptance creates active roster membership**
    - **Validates: Requirements 3.7**
    - **Property 10: Pickup league join is immediate and active**
    - **Validates: Requirements 5.2**
    - **Property 11: Step Out sets withdrawn status and timestamp**
    - **Validates: Requirements 5.5**
    - Create test file `tests/properties/league-screens-flow/membership.property.test.ts`

- [x] 5. Checkpoint - Ensure all backend join flow tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Backend API — Members, standings, and events endpoints
  - [x] 6.1 Update GET `/api/leagues/:id/members` to return rosters (team league) or individual players (pickup league) based on `leagueType`
    - Team league: return roster name, player count, win/loss record for active memberships
    - Pickup league: return user details for active memberships
    - Display "0-0" for rosters with zero completed matches
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.2 Update GET `/api/leagues/:id/standings` to return roster standings (team league) or player rankings (pickup league) with tiebreaker logic
    - Team league: rank by points, tiebreak by goal difference then goals scored
    - Pickup league: return individual player rankings
    - Calculate points using league's `pointsConfig`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 6.3 Implement GET `/api/leagues/:id/events` and POST `/api/leagues/:id/events` for league event management
    - GET returns future events sorted by `startTime` ascending
    - POST for team leagues: accept `rosterIds` (minimum 2), check scheduling conflicts, assign rosters
    - POST for pickup leagues: create open event with no roster assignment
    - Return 409 with conflict details when double-booking detected
    - _Requirements: 6.1, 6.2, 9.1, 9.2, 9.5, 9.6, 10.1, 10.2_

  - [ ]* 6.4 Write property tests for events and standings (Properties 12-21)
    - **Property 12: Upcoming events contain only future events**
    - **Validates: Requirements 6.1**
    - **Property 13: Upcoming events are sorted by start time ascending**
    - **Validates: Requirements 6.2**
    - **Property 14: Event display contains required fields**
    - **Validates: Requirements 6.3, 6.5, 6.6**
    - **Property 15: Members section shows only active memberships**
    - **Validates: Requirements 7.3**
    - **Property 16: Team league member display includes required fields**
    - **Validates: Requirements 7.1, 7.4, 7.5**
    - **Property 17: Standings points calculation** — points = (wins × config.win) + (draws × config.draw) + (losses × config.loss)
    - **Validates: Requirements 8.3**
    - **Property 18: Standings tiebreaker ordering** — goal difference first, goals scored second
    - **Validates: Requirements 8.4**
    - **Property 19: Scheduling conflict detection prevents double-booking**
    - **Validates: Requirements 9.5, 9.6**
    - **Property 20: Team league events require at least two rosters**
    - **Validates: Requirements 9.2**
    - **Property 21: Pickup league events have no roster assignment**
    - **Validates: Requirements 10.1, 10.2**
    - Create test files: `tests/properties/league-screens-flow/events-display.property.test.ts`, `tests/properties/league-screens-flow/members-display.property.test.ts`, `tests/properties/league-screens-flow/standings.property.test.ts`, `tests/properties/league-screens-flow/scheduling.property.test.ts`

- [x] 7. Checkpoint - Ensure all backend API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Frontend — Redux state and service layer updates
  - [x] 8.1 Update `src/store/slices/leaguesSlice.ts` to add `joinRequests`, `upcomingEvents` state fields and corresponding reducers/selectors
    - Add `joinRequests: LeagueMembership[]` and `upcomingEvents: Event[]` to state
    - Add `setJoinRequests`, `setUpcomingEvents`, `addJoinRequest`, `removeJoinRequest` reducers
    - Add corresponding selectors
    - _Requirements: 4.3, 6.1_

  - [x] 8.2 Update `src/services/api/LeagueService.ts` with new methods for join flows, invitations, events, and members
    - Add `joinLeagueAsRoster(leagueId, rosterId, userId)` method
    - Add `joinLeagueAsUser(leagueId, userId)` method
    - Add `stepOutOfLeague(leagueId, userId)` method
    - Add `getJoinRequests(leagueId)` method
    - Add `approveJoinRequest(leagueId, requestId)` and `declineJoinRequest(leagueId, requestId)` methods
    - Add `inviteRoster(leagueId, rosterId)` and `respondToInvitation(leagueId, invitationId, accept)` methods
    - Add `getLeagueEvents(leagueId)` and `createLeagueEvent(leagueId, data)` methods
    - Add `checkSchedulingConflicts(leagueId, rosterIds, startTime, endTime)` method
    - _Requirements: 3.2, 3.4, 4.2, 5.2, 5.5, 6.1, 9.1, 9.5_

- [x] 9. Frontend — CreateLeagueScreen updates
  - [x] 9.1 Update `src/screens/leagues/CreateLeagueScreen.tsx` to add league type selector and conditional visibility selector
    - Add league type selector with "Team League" and "Pickup League" options at top of form
    - Show visibility selector ("Public" / "Private") only when "Team League" is selected
    - Auto-set visibility to "public" and hide selector for Pickup Leagues
    - Pass `leagueType` and `visibility` to API on submit
    - Use brand vocabulary: "League" (never "Competition"), "Roster" (never "Team")
    - Import all theme tokens from `src/theme/`
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [ ]* 9.2 Write unit tests for CreateLeagueScreen
    - Test league type selector renders with "Team League" and "Pickup League" options
    - Test selecting "Team League" shows visibility selector
    - Test selecting "Pickup League" hides visibility selector
    - Test form submission includes `leagueType` and `visibility`
    - Create test file `tests/screens/leagues/CreateLeagueScreen.test.tsx`
    - _Requirements: 1.1, 1.4, 1.5_

- [x] 10. Frontend — LeagueDetailsScreen updates
  - [x] 10.1 Update `src/screens/leagues/LeagueDetailsScreen.tsx` action bar with contextual buttons based on league type and user role
    - Public Team League: show "Join Up" button for roster owners not in the league
    - Private Team League: show "Add Rosters" button for owner/admins
    - Pickup League: show "Join Up" / "Step Out" toggle for authenticated users
    - Use brand vocabulary throughout: "Join Up", "Step Out", "Roster", "Players"
    - _Requirements: 3.1, 4.1, 5.1, 5.4, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 10.2 Implement Upcoming Events Section in LeagueDetailsScreen
    - Display future events sorted by start time ascending
    - Show event name, date, time, ground name for all events
    - For Team League events: display assigned roster names
    - For Pickup League events: display as open game without roster assignments
    - Tapping an event navigates to Event Detail Screen
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 10.3 Implement Members Section in LeagueDetailsScreen
    - Team League: display roster list with name, player count, win/loss record
    - Pickup League: display individual player list
    - Only show active memberships
    - Display "0-0" for rosters with zero completed matches
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 10.4 Implement Standings Section in LeagueDetailsScreen
    - Team League: display roster standings ranked by points (matches played, W/L/D, points, GD)
    - Pickup League: display individual player rankings
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 10.5 Implement Join Request Queue for public Team Leagues (owner/admin only)
    - Display pending roster join requests with approve/decline actions
    - Show roster name and request date
    - Handle membership fee validation on approval
    - Display insufficient balance error when applicable
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 10.6 Write unit tests for LeagueDetailsScreen
    - Test private Team League shows "Add Rosters" button for owner
    - Test public Team League shows "Join Up" button for non-member roster owners
    - Test Pickup League shows "Join Up" / "Step Out" toggle
    - Test tapping event navigates to Event Detail Screen
    - Test all UI labels use correct Muster vocabulary (no "Team", "Book", "Leave", "Members")
    - Create test file `tests/screens/leagues/LeagueDetailsScreen.test.tsx`
    - _Requirements: 3.1, 4.1, 5.1, 5.4, 6.4, 11.1-11.6_

- [x] 11. Checkpoint - Ensure all frontend screen tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Frontend — ManageLeagueScreen and event scheduling
  - [x] 12.1 Update `src/screens/leagues/ManageLeagueScreen.tsx` with league event creation and conditional roster assignment
    - Team League: show roster assignment interface with all active league rosters, require minimum 2 rosters
    - Pickup League: create open events with no roster assignment interface
    - Display scheduling conflict errors with conflicting event details
    - Use "Update League" label (never "Edit League")
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 10.1, 10.2, 10.3, 11.1_

  - [x] 12.2 Implement roster search and invitation UI for private Team Leagues
    - Add "Add Rosters" flow with search interface for finding rosters by name
    - Send invitation on roster selection
    - Display invitation status (pending/accepted/declined)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 12.3 Write unit tests for ManageLeagueScreen
    - Test Team League event creation shows roster assignment interface
    - Test Pickup League event creation hides roster assignment interface
    - Test scheduling conflict error display
    - Test roster search and invitation flow for private leagues
    - Create test file `tests/screens/leagues/ManageLeagueScreen.test.tsx`
    - _Requirements: 9.1, 10.3_

- [x] 13. Integration wiring and notifications
  - [x] 13.1 Wire notification triggers for join requests, approvals, declines, and invitations
    - Notify league owner on new join request (public Team League)
    - Notify roster owner on join request approval/decline
    - Notify roster owner on invitation (private Team League)
    - Notify roster players on event assignment (Team League)
    - _Requirements: 3.3, 3.8, 4.4, 4.5, 9.3, 9.4_

  - [x] 13.2 Wire navigation flows between league screens
    - CreateLeagueScreen → LeagueDetailsScreen on successful creation
    - LeagueDetailsScreen → Event Detail Screen on event tap
    - ManageLeagueScreen → LeagueDetailsScreen on save
    - Ensure all navigation params include `leagueType` context
    - _Requirements: 6.4_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (21 properties total)
- Unit tests validate specific UI rendering examples and edge cases
- All UI must import theme tokens from `src/theme/` — never hardcode colors or fonts
- Brand vocabulary is enforced: Roster (not Team), League (not Competition), Join Up (not Book), Step Out (not Leave), Players (not Members in roster context), Update League (not Edit League)
