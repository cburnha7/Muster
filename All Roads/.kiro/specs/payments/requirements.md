# Requirements Document

## Introduction

This document defines the requirements for the payment and financial system of a sports booking platform. The system supports players, roster managers (coaches), league commissioners, and facility operators. All money movement is handled through Stripe Connect — the platform never holds funds. Roster managers are merchants of record for their events. Leagues can be free or paid. Court booking costs are escrowed at confirmation and paid to facilities immediately.

---

## Requirements

### Requirement 1: Stripe Connect Onboarding — Roster Managers

**User Story:** As a roster manager, I want to onboard as a Stripe Connect Express account so that I can collect dues from my players, receive event revenue, and escrow court costs.

**Acceptance Criteria:**

1. WHEN a user creates a roster and assumes the manager role THE SYSTEM SHALL prompt them to complete Stripe Connect Express onboarding before they can collect payments or book courts
2. WHEN a roster manager has not completed Stripe Connect onboarding THE SYSTEM SHALL block them from booking facilities or scheduling games
3. WHEN a roster manager completes Stripe Connect onboarding THE SYSTEM SHALL store their Stripe Connect account ID against their roster record
4. WHEN a roster manager's Stripe account requires re-verification THE SYSTEM SHALL notify them and block payment actions until resolved

---

### Requirement 2: Stripe Connect Onboarding — Facilities

**User Story:** As a facility operator, I want to onboard as a Stripe Connect Express account so that I can receive court rental payments directly.

**Acceptance Criteria:**

1. WHEN a facility is created THE SYSTEM SHALL require the operator to complete Stripe Connect Express onboarding before the facility can be booked
2. WHEN a facility has not completed Stripe Connect onboarding THE SYSTEM SHALL hide it from booking flows
3. WHEN a facility completes onboarding THE SYSTEM SHALL store their Stripe Connect account ID against the facility record

---

### Requirement 3: Stripe Connect Onboarding — League Commissioners

**User Story:** As a league commissioner, I want to onboard as a Stripe Connect Express account so that I can collect season dues from member rosters and pay for league-scheduled court bookings.

**Acceptance Criteria:**

1. WHEN a user creates a paid league THE SYSTEM SHALL require them to complete Stripe Connect Express onboarding before the league can accept roster registrations
2. WHEN a league is set to free THE SYSTEM SHALL NOT require the commissioner to have a Stripe Connect account
3. WHEN a paid league commissioner completes onboarding THE SYSTEM SHALL store their Stripe Connect account ID against the league record

---

### Requirement 4: Facility Cancellation Policy

**User Story:** As a facility operator, I want to define my own cancellation policy so that my business rules are enforced automatically for all bookings at my facility.

**Acceptance Criteria:**

1. WHEN a facility completes onboarding THE SYSTEM SHALL require them to define a cancellation policy with the following fields: notice_window_hours (integer), team_penalty_pct (0–100), and penalty_destination (facility, opposing_team, or split)
2. WHEN a facility updates their cancellation policy THE SYSTEM SHALL apply the new policy only to future bookings, never to existing confirmed bookings
3. WHEN a booking is confirmed THE SYSTEM SHALL snapshot the facility's current cancellation policy fields onto the booking record
4. WHEN a facility cancels a booking THE SYSTEM SHALL always refund 100% to all parties including platform fees regardless of the facility's cancellation policy settings
5. WHEN a manager views a facility before booking THE SYSTEM SHALL display the facility's current cancellation policy in plain language
6. WHEN a manager confirms a booking THE SYSTEM SHALL require them to explicitly acknowledge the cancellation policy

---

### Requirement 5: Player Season Dues

**User Story:** As a player, I want to pay season dues to my roster manager so that I can participate in the roster's events and games.

**Acceptance Criteria:**

1. WHEN a roster manager sets a season dues amount THE SYSTEM SHALL allow players to pay via Stripe directly to the roster manager's Connect account
2. WHEN a player pays dues THE SYSTEM SHALL deduct the platform application fee automatically at charge time
3. WHEN a player pays dues THE SYSTEM SHALL record the payment against the player and season
4. WHEN a player has not paid dues for the current season THE SYSTEM SHALL allow the roster manager to restrict their participation

---

### Requirement 6: Roster Season Dues to a Paid League

**User Story:** As a roster manager, I want to pay season dues to join a paid league so that my roster can participate in league-scheduled games.

**Acceptance Criteria:**

1. WHEN a roster manager attempts to join a paid league THE SYSTEM SHALL present the season dues amount set by the commissioner
2. WHEN a roster manager pays league dues THE SYSTEM SHALL charge their Stripe Connect account and transfer funds to the league's Connect account minus the platform application fee
3. WHEN league dues payment succeeds THE SYSTEM SHALL mark the roster as an active member of the league season
4. WHEN league dues payment fails THE SYSTEM SHALL not admit the roster to the league and notify the manager
5. WHEN a roster manager views a paid league THE SYSTEM SHALL display the season dues amount before prompting to join

---

### Requirement 7: Free League

**User Story:** As a commissioner, I want to create a free league so that rosters can join without paying dues and book their own courts.

**Acceptance Criteria:**

1. WHEN a commissioner creates a league THE SYSTEM SHALL offer a free or paid option
2. WHEN a league is set to free THE SYSTEM SHALL allow any roster manager to join without payment
3. WHEN a game is scheduled in a free league THE SYSTEM SHALL designate the home team roster manager as the booking host
4. WHEN a game is scheduled in a free league THE SYSTEM SHALL require the away team roster manager to confirm within 48 hours
5. WHEN the away team roster manager does not confirm within 48 hours THE SYSTEM SHALL lapse the booking, notify the commissioner, and record a strike against the away roster
6. WHEN a roster accumulates three confirmation strikes in a season THE SYSTEM SHALL notify the commissioner and allow them to remove that roster from the league

---

### Requirement 8: Paid League Court Booking

**User Story:** As a league commissioner, I want to book courts for league games from the league's account so that season dues fund the court costs automatically.

**Acceptance Criteria:**

1. WHEN a commissioner schedules a league game in a paid league THE SYSTEM SHALL check that the league's Stripe Connect account balance covers the full court cost before allowing the assignment
2. WHEN the league account has insufficient balance THE SYSTEM SHALL block the scheduling and display how much additional balance is needed
3. WHEN a paid league game is confirmed THE SYSTEM SHALL charge the league's Connect account the full court cost and pay the facility immediately
4. WHEN a commissioner creates a season THE SYSTEM SHALL display a suggested minimum dues amount calculated as (games_per_team × avg_court_cost) / number_of_teams
5. WHEN a roster cancels out of a paid league game THE SYSTEM SHALL apply the facility's cancellation policy with any penalty going to the league account

---

### Requirement 9: Free League Court Booking — Home/Away Escrow

**User Story:** As a home team roster manager in a free league, I want to book the court and split the cost with the away team so that neither team bears the full cost alone.

**Acceptance Criteria:**

1. WHEN the home roster manager initiates a court booking for a free league game THE SYSTEM SHALL verify both the home and away manager's Stripe balances cover 50% of the court cost before proceeding
2. WHEN either manager has insufficient balance THE SYSTEM SHALL block the booking and display which roster is under-funded and by how much
3. WHEN both managers have sufficient balance and the away manager confirms THE SYSTEM SHALL simultaneously create two Stripe PaymentIntents with capture_method manual — one per manager for 50% each
4. WHEN both PaymentIntents are successfully authorized THE SYSTEM SHALL capture both and pay the facility the full court cost immediately
5. WHEN either PaymentIntent fails THE SYSTEM SHALL release the other and notify both managers
6. WHEN the platform application fee is applied THE SYSTEM SHALL deduct it from each manager's PaymentIntent at capture time

---

### Requirement 10: Pickup Game Court Booking — Two Roster Managers

**User Story:** As a roster manager, I want to challenge another roster to a pickup game and split the court cost so that neither team pays the full amount.

**Acceptance Criteria:**

1. WHEN a roster manager issues a game challenge they SHALL select a facility, court, and time slot
2. WHEN the opposing roster manager accepts the challenge THE SYSTEM SHALL verify both managers have sufficient Stripe balance to cover 50% of the court cost
3. WHEN either manager has insufficient balance THE SYSTEM SHALL block confirmation and notify the challenging manager which roster is under-funded
4. WHEN both balances are sufficient THE SYSTEM SHALL create two PaymentIntents with capture_method manual and capture both on mutual confirmation
5. WHEN the facility is paid THE SYSTEM SHALL use a Stripe transfer_group tagged with the booking ID to link both charges to the facility transfer

---

### Requirement 11: Public Event Booking

**User Story:** As a roster manager, I want to post a public event at a facility and charge attendees a per-person fee so that I can earn revenue and cover court costs.

**Acceptance Criteria:**

1. WHEN a roster manager creates a public event THE SYSTEM SHALL require them to set a per-person price and a minimum attendee count
2. WHEN an attendee registers and pays THE SYSTEM SHALL charge them and hold funds in escrow until the event is confirmed to proceed
3. WHEN the event reaches minimum attendee count THE SYSTEM SHALL release escrow, pay the facility court cost, deduct the platform fee, and transfer remainder to the roster manager
4. WHEN the event does not reach minimum attendee count by the cutoff time THE SYSTEM SHALL refund all attendees in full including platform fees
5. WHEN the facility cancels THE SYSTEM SHALL refund all attendees in full including platform fees

---

### Requirement 12: Cancellation by a Team — Policy Enforcement

**User Story:** As a platform, I want to enforce the facility's snapshotted cancellation policy automatically so that all parties are treated fairly and consistently.

**Acceptance Criteria:**

1. WHEN a cancellation is requested THE SYSTEM SHALL check the current time against the booking's snapshotted notice_window_hours
2. WHEN the cancellation is within the notice window THE SYSTEM SHALL apply the snapshotted team_penalty_pct to the cancelling team's escrowed amount
3. WHEN the penalty_destination is facility THE SYSTEM SHALL retain the penalty in the facility's payout
4. WHEN the penalty_destination is opposing_team THE SYSTEM SHALL transfer the penalty to the opposing roster manager's Connect account
5. WHEN the penalty_destination is split THE SYSTEM SHALL divide the penalty 50/50 between facility and opposing roster manager
6. WHEN any cancellation occurs THE SYSTEM SHALL refund the non-penalised portion to the cancelling team and 100% to the opposing team
7. WHEN the facility cancels THE SYSTEM SHALL refund 100% to all parties including platform fees and issue a reverse_transfer on the facility payout regardless of the facility's own policy settings

---

### Requirement 13: Commissioner Balance Visibility and Scheduling Gate

**User Story:** As a league commissioner, I want to see each roster's payment status at a glance so that I can schedule games without hitting funding blocks.

**Acceptance Criteria:**

1. WHEN a commissioner views the league roster list THE SYSTEM SHALL display a funding status indicator per roster: funded, low (within one game's court cost), or blocked
2. WHEN a commissioner attempts to assign a blocked roster to a game THE SYSTEM SHALL prevent the assignment and display the roster's funding shortfall
3. WHEN a roster manager's balance drops below one game's court cost worth of escrow THE SYSTEM SHALL send them a low balance notification
4. WHEN a roster is marked blocked THE SYSTEM SHALL notify the roster manager with the exact top-up amount required

---

### Requirement 14: Platform Application Fee

**User Story:** As the platform, I want to automatically collect an application fee on every charge so that platform revenue is captured without manual intervention.

**Acceptance Criteria:**

1. WHEN any charge is created THE SYSTEM SHALL attach an application_fee_amount to the Stripe PaymentIntent or Transfer
2. WHEN a facility cancellation refund is issued THE SYSTEM SHALL refund the platform application fee in full
3. WHEN a team forfeit penalty is applied THE SYSTEM SHALL retain the platform fee on the forfeited amount and refund the fee on the refunded amount
4. THE SYSTEM SHALL never require platform staff to manually collect or reconcile application fees
