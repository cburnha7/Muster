# Requirements Document

## Introduction

This document defines the requirements for the payment and financial system of a sports booking platform. The system supports players, roster managers (coaches), league commissioners, and facility operators. All money movement is handled through Stripe Connect — the platform never holds funds. Roster managers are merchants of record for their events. Leagues can be free (rosters book their own courts) or paid (registration fee — commissioner books courts from pooled dues). Court booking costs are escrowed at confirmation and paid to facilities immediately.

The existing facility rental flow (user pays booking fee up front) continues as-is. A user who has paid for a facility rental can assign that facility to any event they have scheduling authority over — events they create, and free league home games where they are the home roster manager.

Stripe Connect onboarding for all entity types (roster managers, facility operators, league commissioners) is handled through the user's profile page — not through separate onboarding screens.

### Requirement 1: Stripe Connect Onboarding — Roster Managers

**User Story:** As a roster manager, I want to onboard as a Stripe Connect Express account so that I can collect dues from my players, receive event revenue, and escrow court costs.

**Acceptance Criteria:**

1. WHEN a user views their profile page THE SYSTEM SHALL display a Stripe Connect onboarding section where they can link their roster's Connect account
2. WHEN a roster manager has not completed Stripe Connect onboarding THE SYSTEM SHALL block them from collecting payments, booking facilities, or scheduling games
3. WHEN a roster manager completes Stripe Connect onboarding THE SYSTEM SHALL store their Stripe Connect account ID against their roster record
4. WHEN a roster manager's Stripe account requires re-verification THE SYSTEM SHALL notify them and block payment actions until resolved
**Acceptance Criteria:**

1. WHEN a user creates a roster and assumes the manager role THE SYSTEM SHALL prompt them to complete Stripe Connect Express onboarding before they can collect payments or book courts
### Requirement 2: Stripe Connect Onboarding — Facilities

**User Story:** As a facility operator, I want to onboard as a Stripe Connect Express account so that I can receive court rental payments directly.

**Acceptance Criteria:**

1. WHEN a facility operator views their profile page THE SYSTEM SHALL display a Stripe Connect onboarding section for their facility
2. WHEN a facility has not completed Stripe Connect onboarding THE SYSTEM SHALL hide it from booking flows
3. WHEN a facility completes onboarding THE SYSTEM SHALL store their Stripe Connect account ID against the facility recordrental payments directly.

**Acceptance Criteria:**

### Requirement 3: Stripe Connect Onboarding — League Commissioners

**User Story:** As a league commissioner, I want to onboard as a Stripe Connect Express account so that I can collect season dues from member rosters and pay for league-scheduled court bookings.

**Acceptance Criteria:**

1. WHEN a league commissioner views their profile page THE SYSTEM SHALL display a Stripe Connect onboarding section for their paid league
2. WHEN a league is set to free THE SYSTEM SHALL NOT require the commissioner to have a Stripe Connect account
3. WHEN a paid league commissioner completes onboarding THE SYSTEM SHALL store their Stripe Connect account ID against the league record
4. WHEN a commissioner attempts to accept roster registrations for a paid league without completing Stripe Connect onboarding THE SYSTEM SHALL block the action and direct them to their profile pageember rosters and pay for league-scheduled court bookings.

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

### Requirement 6: Roster Season Dues to a Paid League

**User Story:** As a roster manager, I want to pay season dues up front to join a paid league so that my roster can participate in league-scheduled games.

**Acceptance Criteria:**

1. WHEN a roster manager attempts to join a paid league THE SYSTEM SHALL present the season dues amount set by the commissioner
2. WHEN a roster manager pays league dues THE SYSTEM SHALL charge their Stripe Connect account and transfer funds to the league commissioner's Connect account minus the platform application fee — payment is collected up front before the season begins
3. WHEN league dues payment succeeds THE SYSTEM SHALL mark the roster as an active member of the league season
4. WHEN league dues payment fails THE SYSTEM SHALL not admit the roster to the league and notify the manager
5. WHEN a roster manager views a paid league THE SYSTEM SHALL display the season dues amount before prompting to join
6. THE SYSTEM SHALL log all league dues received and court costs paid from the league account to provide a transparent ledger visible to the commissioner — this mitigates fund misuse risk
**Acceptance Criteria:**

### Requirement 7: Free League

**User Story:** As a commissioner, I want to create a free league so that rosters can join without paying dues and book their own courts.

**Acceptance Criteria:**

1. WHEN a commissioner creates a league THE SYSTEM SHALL offer a free or paid (registration fee) option
2. WHEN a league is set to free THE SYSTEM SHALL allow any roster manager to join without payment
3. WHEN a game is scheduled in a free league THE SYSTEM SHALL designate the home roster manager as the booking host — the home roster manager books the facility using the existing facility rental flow
4. WHEN a game is scheduled in a free league THE SYSTEM SHALL require the away roster manager to confirm within 48 hours
5. WHEN the away roster manager does not confirm within 48 hours THE SYSTEM SHALL lapse the booking, notify the commissioner, and record a strike against the away roster
6. WHEN a roster accumulates three confirmation strikes in a season THE SYSTEM SHALL notify the commissioner and allow them to remove that roster from the league
**Acceptance Criteria:**

1. WHEN a commissioner creates a league THE SYSTEM SHALL offer a free or paid option
### Requirement 8: Paid League Court Booking

**User Story:** As a league commissioner, I want to book courts for league games from the league's account so that season dues fund the court costs automatically.

**Acceptance Criteria:**

1. WHEN a commissioner schedules a league game in a paid league THE SYSTEM SHALL check that the league commissioner's Stripe Connect account balance covers the full court cost before allowing the assignment
2. WHEN the league account has insufficient balance THE SYSTEM SHALL block the scheduling and display how much additional balance is needed
3. WHEN a paid league game is confirmed THE SYSTEM SHALL charge the league commissioner's Connect account the full court cost and pay the facility immediately using the existing facility rental flow
4. WHEN a commissioner creates a season THE SYSTEM SHALL display a suggested minimum dues amount calculated as (games_per_team × avg_court_cost) / number_of_rosters — where avg_court_cost is the average hourly court price for courts matching the league's sport type across all onboarded facilities
5. THE SYSTEM SHALL maintain a transparent ledger of all league account transactions (dues received, court costs paid) visible to the commissioneratically.

**Acceptance Criteria:**

### Requirement 9: Free League Court Booking — Home Roster Books

**User Story:** As a home roster manager in a free league, I want to book the court for a scheduled game so that the game has a venue.

**Acceptance Criteria:**

1. WHEN the home roster manager is assigned a free league game THE SYSTEM SHALL allow them to book a facility using the existing facility rental flow
2. WHEN the home roster manager has an existing facility rental THE SYSTEM SHALL allow them to assign it to the scheduled game
3. WHEN the home roster manager books a facility THE SYSTEM SHALL link the rental to the scheduled game record
4. WHEN the away roster manager confirms the game THE SYSTEM SHALL mark the game as confirmed
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
### Requirement 11: Public Event Booking

**User Story:** As a roster manager, I want to post a public event at a facility and charge attendees a per-person fee so that I can earn revenue and cover court costs.

**Acceptance Criteria:**

1. WHEN a roster manager creates a public event THE SYSTEM SHALL require them to set a per-person price and a minimum attendee count
2. WHEN an attendee registers and pays THE SYSTEM SHALL charge them and hold funds in escrow until the event is confirmed to proceed
3. WHEN the event reaches minimum attendee count THE SYSTEM SHALL release escrow, pay the facility court cost, deduct the platform fee, and transfer remainder to the roster manager
4. WHEN the event does not reach minimum attendee count by the event start time THE SYSTEM SHALL refund all attendees in full including platform fees — the cutoff is determined by the event's scheduled start time
5. WHEN the facility cancels THE SYSTEM SHALL refund all attendees in full including platform fees

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
### Requirement 14: Platform Application Fee

**User Story:** As the platform, I want to automatically collect an application fee on every charge so that platform revenue is captured without manual intervention.

**Acceptance Criteria:**

1. WHEN any charge is created THE SYSTEM SHALL attach an application_fee_amount to the Stripe PaymentIntent or Transfer
2. WHEN a facility cancellation refund is issued THE SYSTEM SHALL refund the platform application fee in full
3. WHEN a team forfeit penalty is applied THE SYSTEM SHALL retain the platform fee on the forfeited amount and refund the fee on the refunded amount
4. THE SYSTEM SHALL never require platform staff to manually collect or reconcile application fees

---

### Requirement 15: Existing Facility Rental Flow Preservation

**User Story:** As a user, I want to continue booking facility time slots directly so that I can reserve courts for any purpose.

**Acceptance Criteria:**

1. THE SYSTEM SHALL preserve the existing facility rental flow — users pay the booking fee up front and receive a confirmed rental
2. WHEN a user has a confirmed facility rental THE SYSTEM SHALL allow them to assign that rental to any event they have scheduling authority over — events they create, and free league home games where they are the home roster manager
3. WHEN a rental is assigned to an event THE SYSTEM SHALL link the rental record to the event record
4. THE SYSTEM SHALL NOT require a separate payment flow for facility bookings that go through the existing rental system

---

### Requirement 16: League Financial Ledger

**User Story:** As a league commissioner, I want to see a transparent record of all money flowing through my league account so that I can verify dues are being used for court costs.

**Acceptance Criteria:**

1. WHEN a roster pays league dues THE SYSTEM SHALL record the transaction in the league ledger with amount, source roster, and timestamp
2. WHEN the commissioner pays for a court booking THE SYSTEM SHALL record the transaction in the league ledger with amount, facility, and game reference
3. WHEN a commissioner views the league management screen THE SYSTEM SHALL display the ledger showing all inflows (dues) and outflows (court costs) with running balance
4. THE SYSTEM SHALL make the ledger read-only — no manual adjustments allowed
**Acceptance Criteria:**

1. WHEN any charge is created THE SYSTEM SHALL attach an application_fee_amount to the Stripe PaymentIntent or Transfer
2. WHEN a facility cancellation refund is issued THE SYSTEM SHALL refund the platform application fee in full
3. WHEN a team forfeit penalty is applied THE SYSTEM SHALL retain the platform fee on the forfeited amount and refund the fee on the refunded amount
4. THE SYSTEM SHALL never require platform staff to manually collect or reconcile application fees
