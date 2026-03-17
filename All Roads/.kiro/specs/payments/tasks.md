# Tasks

## Implementation Plan

- [x] 1. Stripe Connect infrastructure
  - [x] 1.1 Add Stripe Connect environment variables to `server/.env.example`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PLATFORM_FEE_RATE`, and price IDs — update `server/src/index.ts` to validate these are set on startup
  - [x] 1.2 Create shared Stripe instance module at `server/src/services/stripe-connect.ts` — export initialised Stripe client and Connect account helper functions (create account link, check account status, retrieve balance)
  - [x] 1.3 Add `stripeConnectAccountId` field to `Facility` model in Prisma schema — run migration
  - [x] 1.4 Add `stripeConnectAccountId` field to `League` model in Prisma schema — run migration
  - [x] 1.5 Build Connect Express onboarding API endpoints in `server/src/routes/connect-onboarding.ts` — generate account links for roster managers (using existing `Team.stripeAccountId`), facilities, and league commissioners; handle return/refresh redirects; store Connect account IDs on respective records
  - [x] 1.6 Add Connect onboarding section to user profile page (frontend) — display onboarding status for each entity the user manages (rosters, facilities, leagues); link to Stripe onboarding flow
  - [x] 1.7 Extend existing Stripe webhook handler in `server/src/routes/stripe-webhooks.ts` — add cases for `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `transfer.reversed`; update booking and participant records atomically using `prisma.$transaction`
  - [x] 1.8 Add idempotency key generation utility at `server/src/utils/idempotency.ts` — keys derived from `booking_id + participant_role + action_type`

- [x] 2. Facility cancellation policy
  - [x] 2.1 Add cancellation policy fields to `Facility` model: `noticeWindowHours` (Int), `teamPenaltyPct` (Int, 0–100), `penaltyDestination` (String enum: facility/opposing_team/split), `policyVersion` (String) — run migration
  - [x] 2.2 Build cancellation policy form in facility settings — required before facility can be listed in booking flows; validate all fields present
  - [x] 2.3 Add policy snapshot fields to `Booking` model: `policyNoticeWindowHours`, `policyTeamPenaltyPct`, `policyPenaltyDestination`, `policyVersion` — all nullable, written once at confirmation — run migration
  - [x] 2.4 Write `snapshotPolicy(bookingId, facilityId)` service function in `server/src/services/cancellation.ts` — copies current facility policy fields onto the booking record at confirmation time
  - [x] 2.5 Display cancellation policy in plain language on facility detail screen and booking confirmation screen (frontend)
  - [x] 2.6 Add explicit policy acknowledgement checkbox to booking confirmation flow — store `policyAcknowledgedAt` timestamp on booking record

- [x] 3. Booking data model extensions and core services
  - [x] 3.1 Extend existing `Booking` model with new nullable fields: `bookingHostType` (String), `bookingHostId` (String), `stripeTransferGroup` (String), snapshotted policy fields from task 2.3 — preserve all existing fields and relations — run migration
  - [x] 3.2 Create `BookingParticipant` table: `id`, `bookingId` (FK to Booking), `rosterId` (String), `role` (enum: home/away/host/participant), `escrowAmount` (Float), `stripePaymentIntentId` (String?), `paymentStatus` (enum: pending/authorized/captured/refunded/forfeited), `confirmedAt` (DateTime?), `confirmationDeadline` (DateTime?) — run migration
  - [x] 3.3 Implement `checkBalance(entityId, requiredAmount)` in `server/src/services/balance.ts` — queries Stripe Connect account balance via API, returns `{ sufficient: boolean, shortfall: number }`
  - [x] 3.4 Implement `createEscrowIntent(participantId, amount, facilityConnectId, bookingId, role)` in `server/src/services/escrow.ts` — creates Stripe PaymentIntent with `capture_method: manual`, `application_fee_amount`, `transfer_data.destination`, `transfer_group`, and idempotency key
  - [x] 3.5 Implement `captureEscrow(bookingId)` — captures all participant intents simultaneously, marks booking as confirmed, calls `snapshotPolicy`
  - [x] 3.6 Implement `releaseEscrow(intentId)` — cancels a single PaymentIntent, used when the other party's charge fails
  - [x] 3.7 Write integration tests for the two-party escrow flow: both succeed, A fails, B fails, both fail

- [x] 4. Free league — home books, away confirms
  - [x] 4.1 Add `pricingType` field to `League` model (String: 'free' or 'paid', default 'free') — run migration
  - [x] 4.2 Extend `Season` model with: `pricingType` (String), `duesAmount` (Float?), `gamesPerTeam` (Int?), `avgCourtCost` (Float?), `suggestedMinDues` (Float?) — run migration
  - [x] 4.3 Create `RosterStrike` table: `id`, `rosterId` (FK to Team), `seasonId` (FK to Season), `reason` (String), `matchId` (String?), `createdAt`, `count` (Int) — run migration
  - [x] 4.4 When commissioner assigns a game in a free league, notify the home roster manager that they need to book a facility — home manager uses existing rental flow to book and assigns the rental to the game
  - [x] 4.5 Build facility assignment UI for home roster manager — allow selecting from their existing confirmed rentals or booking a new one; link the rental to the Match record
  - [x] 4.6 Send away roster manager a confirmation request notification with venue details and 48h deadline
  - [x] 4.7 On away manager confirmation, mark the game as confirmed
  - [x] 4.8 Implement background job in `server/src/jobs/away-confirmation.ts` — runs every hour, finds games past `confirmationDeadline` that are still pending, lapses them, records a `RosterStrike`, notifies commissioner and home manager
  - [x] 4.9 Implement strike count logic — when a roster reaches 3 strikes in a season, notify commissioner and surface removal option in league roster management UI

- [x] 5. Paid league — commissioner books court
  - [x] 5.1 When commissioner schedules a game in a paid league, run `checkBalance` against the league Connect account for the full court cost — block and display shortfall if insufficient
  - [x] 5.2 Commissioner books facility using existing rental flow, charged to the league's Connect account — link rental to the Match record
  - [x] 5.3 Record the court cost transaction in the league ledger (`LeagueTransaction` table)
  - [x] 5.4 Implement `calculateAvgCourtCost(sportType)` in `server/src/services/balance.ts` — queries average hourly court price for courts matching the sport type across all onboarded facilities
  - [x] 5.5 Implement suggested dues calculator — exposed as a UI widget on the season creation screen: `ceil((games_per_team × avg_court_cost) / roster_count)`, updates live as inputs change

- [x] 6. Pickup game challenge flow
  - [x] 6.1 Build game challenge flow — challenging manager selects opponent roster, facility, court, time slot
  - [x] 6.2 On opponent acceptance, run `checkBalance` against both managers — block with per-roster shortfall display if either is insufficient
  - [x] 6.3 On both balances confirmed, create two PaymentIntents (manual capture), attempt simultaneous capture, transition booking to `confirmed` on success

- [x] 7. Public event flow
  - [x] 7.1 Build public event creation — roster manager sets per-person price, minimum attendee count, facility, court, time slot
  - [x] 7.2 On attendee registration, create a PaymentIntent held in escrow
  - [x] 7.3 When minimum attendee count is reached, capture all attendee intents, pay facility court cost, transfer remainder to roster manager's Connect account minus platform fee
  - [x] 7.4 Implement event cutoff job in `server/src/jobs/event-cutoff.ts` — if minimum not reached by event start time, refund all attendees including platform fees
  - [x] 7.5 On facility cancellation of a public event, refund all attendees including platform fees with `reverse_transfer: true`

- [x] 8. Season dues flows
  - [x] 8.1 Build player dues payment flow — player pays roster manager's Connect account, platform fee deducted at charge time, payment recorded against player + season
  - [x] 8.2 Build roster-to-league dues payment flow — roster manager pays league commissioner's Connect account up front before season starts, platform fee deducted, roster marked active member of season on success
  - [x] 8.3 Record all dues payments in the league ledger (`LeagueTransaction` table) with source roster, amount, and timestamp
  - [x] 8.4 Add dues payment status to roster member list — unpaid players visible to roster manager, unpaid rosters visible to commissioner

- [x] 9. League financial ledger
  - [x] 9.1 Create `LeagueTransaction` table: `id`, `leagueId` (FK), `seasonId` (FK), `type` (String: dues_received/court_cost/refund), `amount` (Float), `balanceAfter` (Float), `description` (String), `rosterId` (String?), `facilityId` (String?), `rentalId` (String?), `matchId` (String?), `stripePaymentId` (String?), `createdAt` — run migration
  - [x] 9.2 Build league ledger API endpoint — returns all transactions for a league season, ordered by date, with running balance
  - [x] 9.3 Build league ledger UI on commissioner's league management screen — display inflows (dues) and outflows (court costs) with running balance; read-only, no manual adjustments

- [x] 10. Balance status and notifications
  - [x] 10.1 Implement `getBalanceStatus(entityId, avgCourtCost)` in `server/src/services/balance.ts` — returns `funded | low | blocked` based on thresholds from design doc
  - [x] 10.2 Display balance status indicator per roster on commissioner's league roster management screen
  - [x] 10.3 Send low balance push notification to roster manager when status transitions to `low`
  - [x] 10.4 Send blocked notification to roster manager when status transitions to `blocked` — include exact top-up amount required
  - [x] 10.5 Trigger balance status recalculation after every booking confirmation, refund, or dues payment

- [x] 11. 7-day capture window management
  - [x] 11.1 Implement background job in `server/src/jobs/capture-window.ts` — runs daily, finds confirmed bookings with manual-capture intents where game date is between 6 and 7 days away
  - [x] 11.2 For each such booking, cancel existing intents and re-create new ones with fresh 7-day windows — use idempotency keys to prevent duplicates
  - [x] 11.3 On re-authorization failure (manager balance now insufficient), transition booking to a `payment_hold` status, notify both managers and commissioner

- [x] 12. Platform application fee
  - [x] 12.1 Ensure all PaymentIntent and Transfer creation calls include `application_fee_amount` calculated from `PLATFORM_FEE_RATE` env variable — audit all Stripe calls in escrow, dues, and rental services
  - [x] 12.2 Write unit tests verifying platform fee is attached to every charge type: escrow, dues, rental
