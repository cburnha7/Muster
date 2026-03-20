# Requirements Document

## Introduction

This feature replaces the existing naive `prisma.league.delete()` cascade with a comprehensive league deletion flow. The flow must atomically cascade-delete all league events, release court bookings back to users, process Stripe refunds for join fees, return membership dues to roster balances, and present the commissioner with a confirmation screen summarizing the full impact before proceeding. Leagues that have had any match go live or complete are permanently locked from deletion.

## Glossary

- **League**: An organised competition entity containing seasons, matches, memberships, and financial transactions. Identified by a unique ID and managed by a Commissioner.
- **Commissioner**: The league organizer (`League.organizerId`). The only user authorized to delete a league.
- **Roster**: A team entity (`Team` model) that participates in a league via `LeagueMembership`. Rosters have a `balance` field for financial operations.
- **Season**: A time-bounded period within a league that contains matches and tracks dues payments.
- **Match**: A scheduled game between two rosters within a league. Has a `status` field: `scheduled`, `in_progress`, `completed`, `cancelled`.
- **Event**: A calendar/scheduling entity optionally linked to a match via `Match.eventId`. Includes shell events, scheduled events, and unplayed events.
- **FacilityRental**: A court booking record linking a user to a `FacilityTimeSlot`. Can be linked to a match via `Match.rentalId` and to an event via `Event.rentalId`.
- **LeagueMembership**: A record tracking a roster's membership in a league, including stats and status.
- **LeagueTransaction**: A financial ledger entry within a league/season tracking dues received, court costs, and refunds.
- **PlayerDuesPayment**: A record of an individual player's dues payment for a specific roster and season, including the Stripe PaymentIntent ID.
- **Deletion_Impact_Summary**: A data object returned by the API describing the full scope of a pending league deletion (event count, rental count, refund totals, etc.).
- **Deletion_Service**: The backend service responsible for orchestrating the atomic league deletion flow.
- **Confirmation_Screen**: The UI screen shown to the Commissioner before deletion, displaying the Deletion_Impact_Summary.
- **Idempotency_Key**: A deterministic string passed to Stripe API calls to prevent duplicate charges or refunds on retry, generated via `generateIdempotencyKey`.

## Requirements

### Requirement 1: Lock League from Deletion After First Live Match

**User Story:** As a platform operator, I want leagues to be permanently locked from deletion once any match goes live or completes, so that active or historical league data is never accidentally destroyed.

#### Acceptance Criteria

1. THE League model SHALL include a `lockedFromDeletion` boolean field with a default value of `false`.
2. WHEN any Match belonging to the League transitions to `in_progress` status, THE Deletion_Service SHALL set `League.lockedFromDeletion` to `true`.
3. WHEN any Match belonging to the League transitions to `completed` status, THE Deletion_Service SHALL set `League.lockedFromDeletion` to `true`.
4. WHILE `League.lockedFromDeletion` is `true`, THE League deletion endpoint SHALL reject deletion requests with a 403 status code and a descriptive error message.
5. THE `lockedFromDeletion` field SHALL remain `true` permanently once set and SHALL NOT be reversible through any API endpoint.

### Requirement 2: Commissioner Confirmation Screen with Deletion Impact Summary

**User Story:** As a Commissioner, I want to see a detailed summary of everything that will happen when I delete my league, so that I can make an informed decision before proceeding.

#### Acceptance Criteria

1. WHEN the Commissioner requests a deletion preview for a league, THE API SHALL return a Deletion_Impact_Summary containing: the count of events to delete, the count of FacilityRentals to release, the count and total amount of Stripe refunds to process, and the count and total amount of roster balance refunds to process.
2. THE Confirmation_Screen SHALL display each category from the Deletion_Impact_Summary with its count and monetary total where applicable.
3. THE Confirmation_Screen SHALL require the Commissioner to explicitly confirm the deletion before the API processes the request.
4. WHILE `League.lockedFromDeletion` is `true`, THE Confirmation_Screen SHALL NOT be accessible and the delete button SHALL NOT render in the UI.

### Requirement 3: Cascade Delete All League Events

**User Story:** As a Commissioner, I want all events associated with my league to be removed when I delete the league, so that no orphaned events remain on the platform.

#### Acceptance Criteria

1. WHEN a league deletion is confirmed, THE Deletion_Service SHALL identify all Events linked to Matches belonging to the League via `Match.eventId`.
2. WHEN a league deletion is confirmed, THE Deletion_Service SHALL delete all identified Events within the same atomic transaction as the league deletion.
3. IF an Event is linked to a FacilityRental, THEN THE Deletion_Service SHALL detach the Event from the FacilityRental before deleting the Event.

### Requirement 4: Release Court Bookings as Unassigned Reservations

**User Story:** As a user who booked a court for a league match, I want my court reservation returned to me as a standalone booking when the league is deleted, so that I do not lose my reservation.

#### Acceptance Criteria

1. WHEN a league deletion is confirmed, THE Deletion_Service SHALL identify all FacilityRentals linked to Matches belonging to the League via `Match.rentalId`.
2. THE Deletion_Service SHALL set `FacilityRental.usedForEventId` to `null` for each identified FacilityRental, detaching the rental from the league event.
3. THE Deletion_Service SHALL nullify the `Match.rentalId` and `Match.eventId` foreign keys before deleting the Match, preserving the FacilityRental record for the original user.
4. THE Deletion_Service SHALL NOT delete or cancel any FacilityRental records during league deletion.

### Requirement 5: Refund Join Fees via Stripe

**User Story:** As a player who paid a join fee to enter a league, I want my fee refunded through Stripe when the league is deleted, so that I am not charged for a league that no longer exists.

#### Acceptance Criteria

1. WHEN a league deletion is confirmed for a paid league, THE Deletion_Service SHALL identify all PlayerDuesPayment records with `paymentStatus` of `succeeded` for all seasons belonging to the League.
2. FOR EACH identified PlayerDuesPayment with a valid `stripePaymentIntentId`, THE Deletion_Service SHALL issue a full refund via the Stripe Refund API.
3. WHEN issuing a Stripe refund, THE Deletion_Service SHALL include an Idempotency_Key generated using `generateIdempotencyKey` with the PlayerDuesPayment ID, the player ID, and the `refund` action type.
4. WHEN a Stripe refund succeeds, THE Deletion_Service SHALL update the `PlayerDuesPayment.paymentStatus` to `refunded`.
5. IF a Stripe refund API call fails, THEN THE Deletion_Service SHALL halt the entire deletion and roll back all changes made within the transaction.

### Requirement 6: Refund League Membership Fees to Roster Balance

**User Story:** As a roster manager, I want my roster's membership fee returned to the roster balance when the league is deleted, so that the roster is not financially penalized.

#### Acceptance Criteria

1. WHEN a league deletion is confirmed for a league with a `membershipFee` greater than zero, THE Deletion_Service SHALL identify all active LeagueMemberships with `memberType` of `roster`.
2. FOR EACH identified roster, THE Deletion_Service SHALL credit the `Team.balance` by the `League.membershipFee` amount.
3. FOR EACH balance credit, THE Deletion_Service SHALL create a TeamTransaction record with `type` of `refund`, the credited amount, the balance before and after, and a description referencing the deleted league.
4. THE Deletion_Service SHALL perform all roster balance credits within the same atomic transaction as the league deletion.

### Requirement 7: Atomic Deletion with Rollback on Failure

**User Story:** As a platform operator, I want the entire league deletion to be atomic, so that no partial deletions leave the system in an inconsistent state.

#### Acceptance Criteria

1. THE Deletion_Service SHALL execute all deletion steps (Stripe refunds, roster balance credits, rental detachment, event deletion, and league deletion) within a single Prisma interactive transaction.
2. IF any Stripe refund call fails, THEN THE Deletion_Service SHALL throw an error that causes the Prisma transaction to roll back all database changes.
3. IF any database operation within the transaction fails, THEN THE Deletion_Service SHALL roll back all preceding database changes and return a 500 status code with a descriptive error message.
4. WHEN a deletion transaction is rolled back, THE Deletion_Service SHALL NOT leave any FacilityRentals detached, any roster balances modified, or any PlayerDuesPayment statuses changed.
5. THE deletion endpoint SHALL return the Deletion_Impact_Summary with actual counts of processed items upon successful completion.

### Requirement 8: Hide Delete Button When League Is Locked

**User Story:** As a Commissioner viewing a locked league, I want the delete button to be completely absent from the UI, so that there is no confusion about whether deletion is possible.

#### Acceptance Criteria

1. WHILE `League.lockedFromDeletion` is `true`, THE league management screen SHALL NOT render the delete button.
2. WHILE `League.lockedFromDeletion` is `false`, THE league management screen SHALL render the delete button for the Commissioner.
3. THE league detail API response SHALL include the `lockedFromDeletion` field so the client can determine button visibility.

### Requirement 9: Authorization and Guard Rails

**User Story:** As a platform operator, I want league deletion restricted to authorized non-dependent commissioners, so that only the right person can trigger this destructive action.

#### Acceptance Criteria

1. THE league deletion endpoint SHALL verify that the requesting user is the League's `organizerId` before proceeding.
2. THE league deletion endpoint SHALL be guarded by the `requireNonDependent` middleware to prevent dependent accounts from initiating deletion.
3. IF the requesting user is not the League's `organizerId`, THEN THE league deletion endpoint SHALL return a 403 status code.
4. IF the League does not exist, THEN THE league deletion endpoint SHALL return a 404 status code.
