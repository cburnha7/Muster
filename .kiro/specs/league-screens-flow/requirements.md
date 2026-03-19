# Requirements Document: League Screens and Flow

## Introduction

This feature extends Muster's league system to support two distinct league types: Team Leagues (roster-based competition) and Pickup Leagues (individual player pools). It adds a `leagueType` field to the League model, introduces a `visibility` field for Team Leagues, refactors the `LeagueMembership` model to support both roster-level and individual-user membership, and builds out the League Detail Screen modeled after the existing Roster Detail Screen. The feature covers creation, joining, event scheduling, standings, and management flows for both league types.

## Glossary

- **League**: An organised competition in Muster where rosters or individual players compete
- **Team_League**: A league type where rosters compete against each other; standings are tracked per roster
- **Pickup_League**: A league type where individual players join and compete with no roster requirement; standings are tracked per player
- **League_Detail_Screen**: The screen displaying league information, upcoming events, members, and standings
- **Create_League_Screen**: The form screen for organizers to create a new league with type selection
- **League_Management_Screen**: The organizer/admin screen for managing league rosters/players, scheduling events, and entering results
- **Organizer**: The user who created a league and has full administrative control
- **Admin**: A user granted administrative privileges on a league by the organizer
- **Roster**: A group of players in Muster (never "Team" or "Outfit")
- **Player**: An individual user participating in a league, roster, or event (never "Member" in roster context)
- **Join_Up**: The action of joining a league or event (never "Book" or "Register")
- **Step_Out**: The action of leaving a league, roster, or event the user is part of (never "Leave" or "Quit")
- **Update_League**: The action of editing league details (never "Edit League")
- **Standings_Section**: A ranked display of rosters (Team League) or players (Pickup League) on the League Detail Screen
- **Upcoming_Events_Section**: A chronologically sorted list of future league events on the League Detail Screen
- **Members_Section**: A list of rosters (Team League) or individual players (Pickup League) on the League Detail Screen
- **Join_Request_Queue**: A list of pending roster join requests visible to league owners and admins for public Team Leagues
- **Membership_Fee**: An optional fee set by the league organizer, deducted from the roster balance upon acceptance into a Team League
- **Double_Booking**: A scheduling conflict where a roster is assigned to two or more overlapping events

## Requirements

### Requirement 1: League Type Selection at Creation

**User Story:** As an organizer, I want to select a league type when creating a league, so that the league operates with the correct membership and competition structure.

#### Acceptance Criteria

1. WHEN an organizer opens the Create_League_Screen, THE Create_League_Screen SHALL display a league type selector with two options: "Team League" and "Pickup League".
2. WHEN the organizer selects a league type and submits the form, THE System SHALL persist the selected `leagueType` value ("team" or "pickup") on the League record.
3. WHEN a League record has been created, THE System SHALL prevent modification of the `leagueType` field on that League record.
4. WHEN the organizer selects "Team League", THE Create_League_Screen SHALL display a visibility selector with options "Public" and "Private".
5. WHEN the organizer selects "Pickup League", THE Create_League_Screen SHALL set visibility to "public" and hide the visibility selector.

### Requirement 2: Database Schema Updates

**User Story:** As a developer, I want the database schema to support both league types and flexible membership, so that the system can store and query league data correctly.

#### Acceptance Criteria

1. THE League model SHALL include a `leagueType` field of type String with allowed values "team" or "pickup".
2. THE League model SHALL include a `visibility` field of type String with allowed values "public" or "private", defaulting to "public".
3. THE LeagueMembership model SHALL include a `memberType` field of type String with allowed values "roster" or "user".
4. THE LeagueMembership model SHALL include a `memberId` field of type String that references either a Roster ID (when `memberType` is "roster") or a User ID (when `memberType` is "user").
5. THE LeagueMembership model SHALL retain the existing `teamId` field as nullable for backward compatibility and add a nullable `userId` field for individual player membership.
6. WHEN a LeagueMembership record has `memberType` "roster", THE System SHALL store the Roster ID in the `memberId` field.
7. WHEN a LeagueMembership record has `memberType` "user", THE System SHALL store the User ID in the `memberId` field.

### Requirement 3: Team League — Private Roster Addition

**User Story:** As a league owner, I want to add rosters to my private Team League by searching for them, so that I can control which rosters participate.

#### Acceptance Criteria

1. WHILE the league `visibility` is "private" AND the league `leagueType` is "team", THE League_Detail_Screen SHALL display an "Add Rosters" button visible to the league owner and admins.
2. WHEN the league owner or admin taps "Add Rosters", THE System SHALL display a search interface that allows searching existing rosters by name.
3. WHEN the league owner or admin selects a roster from search results, THE System SHALL send a notification to the selected roster's owner with the league invitation.
4. WHEN a roster owner receives a league invitation, THE System SHALL allow the roster owner to accept or decline the invitation on behalf of the roster.
5. WHEN a roster owner accepts an invitation AND the league has a membership fee configured, THE System SHALL deduct the membership fee from the roster balance before completing the acceptance.
6. IF a roster owner accepts an invitation AND the roster balance is insufficient to cover the membership fee, THEN THE System SHALL display an error message indicating insufficient roster balance and prevent the acceptance.
7. WHEN a roster owner accepts an invitation AND no membership fee is configured or the fee is successfully deducted, THE System SHALL create a LeagueMembership record with status "active" and `memberType` "roster".
8. WHEN a roster owner declines an invitation, THE System SHALL remove the pending invitation and notify the league owner.

### Requirement 4: Team League — Public Join Request Flow

**User Story:** As a roster owner, I want to request to join a public Team League, so that my roster can compete in open leagues.

#### Acceptance Criteria

1. WHILE the league `visibility` is "public" AND the league `leagueType` is "team", THE League_Detail_Screen SHALL display a "Join Up" button visible to roster owners whose rosters are not already in the league.
2. WHEN a roster owner taps "Join Up", THE System SHALL create a LeagueMembership record with status "pending" and `memberType` "roster".
3. WHILE a public Team League has pending join requests, THE League_Detail_Screen SHALL display a join requests queue visible to the league owner and admins.
4. WHEN the league owner or admin approves a pending join request, THE System SHALL update the LeagueMembership status to "active" and notify the roster owner.
5. WHEN the league owner or admin declines a pending join request, THE System SHALL update the LeagueMembership status to "withdrawn" and notify the roster owner.
6. WHEN a join request is approved AND the league has a membership fee configured, THE System SHALL deduct the membership fee from the roster balance before completing the approval.
7. IF a join request is approved AND the roster balance is insufficient to cover the membership fee, THEN THE System SHALL display an error message indicating insufficient roster balance and prevent the approval.

### Requirement 5: Pickup League — Open Individual Join

**User Story:** As a player, I want to join a Pickup League directly without needing a roster, so that I can compete as an individual.

#### Acceptance Criteria

1. WHILE the league `leagueType` is "pickup", THE League_Detail_Screen SHALL display a "Join Up" button visible to any authenticated user who is not already a league participant.
2. WHEN a user taps "Join Up" on a Pickup League, THE System SHALL immediately create a LeagueMembership record with status "active", `memberType` "user", and the user's ID as `memberId`.
3. THE Pickup_League SHALL always have `visibility` set to "public" with no option for private access.
4. WHEN a user has joined a Pickup League, THE League_Detail_Screen SHALL replace the "Join Up" button with a "Step Out" button for that user.
5. WHEN a user taps "Step Out" on a Pickup League, THE System SHALL update the LeagueMembership status to "withdrawn" and set the `leftAt` timestamp.

### Requirement 6: League Detail Screen — Upcoming Events Section

**User Story:** As a league participant, I want to see upcoming league events on the League Detail Screen, so that I can plan my schedule and join events.

#### Acceptance Criteria

1. THE League_Detail_Screen SHALL display an Upcoming_Events_Section showing all league events with a start time in the future.
2. THE Upcoming_Events_Section SHALL sort events by start time in ascending order (soonest first).
3. THE Upcoming_Events_Section SHALL display for each event: event name, date, time, ground name, and assigned rosters (for Team Leagues).
4. WHEN a user taps an event entry in the Upcoming_Events_Section, THE System SHALL navigate to the Event Detail Screen for that event.
5. WHEN a Team League event has rosters assigned, THE Upcoming_Events_Section SHALL display the names of the assigned rosters for that event.
6. WHEN a Pickup League event is listed, THE Upcoming_Events_Section SHALL display the event as an open game without roster assignments.

### Requirement 7: League Detail Screen — Members Section

**User Story:** As a league participant, I want to see who is in the league, so that I can know the competition.

#### Acceptance Criteria

1. WHILE the league `leagueType` is "team", THE Members_Section SHALL display a list of rosters with each entry showing roster name, player count, and win/loss record.
2. WHILE the league `leagueType` is "pickup", THE Members_Section SHALL display a list of individual players.
3. THE Members_Section SHALL only display members with an "active" LeagueMembership status.
4. WHEN a Team League roster entry has completed matches, THE Members_Section SHALL display the roster's win/loss record from the LeagueMembership statistics.
5. WHEN a Team League roster has zero completed matches, THE Members_Section SHALL display "0-0" as the win/loss record.

### Requirement 8: League Detail Screen — Standings Section

**User Story:** As a league participant, I want to see current standings, so that I can track competitive progress.

#### Acceptance Criteria

1. WHILE the league `leagueType` is "team", THE Standings_Section SHALL display roster standings ranked by points, showing roster name, matches played, wins, losses, draws, and total points.
2. WHILE the league `leagueType` is "pickup", THE Standings_Section SHALL display individual player rankings.
3. THE Standings_Section SHALL calculate roster points using the league's `pointsConfig` values (win, draw, loss point allocations).
4. WHEN two or more rosters have equal points, THE Standings_Section SHALL use goal difference as the first tiebreaker and goals scored as the second tiebreaker.

### Requirement 9: Team League Event Scheduling with Roster Assignment

**User Story:** As a league organizer, I want to create events and assign rosters from the league, so that I can schedule competitive matches.

#### Acceptance Criteria

1. WHEN a league owner or admin creates an event for a Team League, THE System SHALL display a roster assignment interface showing all active rosters in the league.
2. WHEN a league owner or admin assigns rosters to an event, THE System SHALL assign two or more rosters from the league to that event.
3. WHEN rosters are assigned to a Team League event, THE System SHALL send notifications to all players of the assigned rosters.
4. WHEN a player of an assigned roster receives an event notification, THE System SHALL require the player to individually Join Up to confirm attendance.
5. WHEN a league owner or admin attempts to assign a roster to an event, THE System SHALL check for scheduling conflicts with other league events.
6. IF a roster is already assigned to another event with overlapping time, THEN THE System SHALL display an error message identifying the conflicting event and prevent the double-booking.

### Requirement 10: Pickup League Event Scheduling

**User Story:** As a league organizer, I want to create open events for my Pickup League, so that individual players can join games.

#### Acceptance Criteria

1. WHEN a league owner or admin creates an event for a Pickup League, THE System SHALL create the event as an open game with no roster assignment.
2. WHEN a Pickup League event is created, THE System SHALL make the event available for any active league participant to Join Up individually.
3. THE System SHALL NOT display a roster assignment interface when creating events for a Pickup League.

### Requirement 11: Update League Vocabulary

**User Story:** As a user, I want consistent vocabulary throughout the league screens, so that the experience aligns with Muster's brand.

#### Acceptance Criteria

1. THE System SHALL use "Update League" in all UI labels, buttons, and screen titles where league editing functionality is presented (never "Edit League").
2. THE System SHALL use "Roster" in all UI labels referring to groups of players (never "Team", "Group", or "Outfit").
3. THE System SHALL use "Join Up" for all join actions (never "Book", "Register", or "Join").
4. THE System SHALL use "Step Out" for all actions where a user leaves a league or event they are part of (never "Leave" or "Quit").
5. THE System SHALL use "Players" when referring to individuals within a roster context (never "Members").
6. THE System SHALL use "League" for all organised competition references (never "Competition", "Tournament", or "Division").
