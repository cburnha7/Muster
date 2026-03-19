---
inclusion: fileMatch
fileMatchPattern: "**/*{payment,stripe,escrow,cancellation,dues,balance,connect,refund,booking}*"
---

# Payments & Stripe Connect — Implementation Rules

## Architecture Principle
The platform never holds funds. All money moves through Stripe Connect. Every roster manager, league commissioner, and facility operator is a Stripe Connect Express account. Platform revenue comes exclusively from `application_fee_amount` on every charge.

## Stripe SDK
- Stripe is already initialised in `server/src/routes/stripe-webhooks.ts` — reuse the same pattern: `new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })`
- Never instantiate Stripe in more than one place per service file. Export a shared instance from a central module if needed.
- Always use `application_fee_amount` (not `application_fee_percent`) — the platform fee rate lives in `process.env.PLATFORM_FEE_RATE` and must never be hardcoded.

## Idempotency
- Every Stripe API call that creates or captures a PaymentIntent must include an `idempotencyKey`.
- Key format: `${bookingId}:${participantRole}:${actionType}` (e.g. `abc-123:home:create`, `abc-123:away:capture`).
- Use the utility at `server/src/utils/idempotency.ts` — do not generate keys inline.

## Escrow (Manual Capture)
- All court-cost escrow uses `capture_method: 'manual'`.
- Stripe's manual capture window is 7 days. A background job must re-authorise intents for games booked more than 7 days out.
- When either party's PaymentIntent fails, cancel the other via `paymentIntents.cancel()` — never leave an orphaned authorisation.
- Always set `transfer_group` to the booking ID so all charges and transfers are auditable as a unit.

## Cancellation Policy
- Facility cancellation policy fields are snapshotted onto the booking record at confirmation time. Cancellation logic must read from the booking's snapshot, never from the live facility record.
- Facility-initiated cancellations always refund 100% to all parties with `reverse_transfer: true` and refund platform fees — no policy fields consulted.
- Team-initiated cancellations check `policy_notice_window_hours`, apply `policy_team_penalty_pct`, and route the penalty per `policy_penalty_destination`.

## Webhooks
- The existing webhook endpoint at `/api/stripe/webhooks` handles subscription events. Payment-related events (`payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `transfer.reversed`) must be added to the same handler — do not create a second webhook route.
- Webhook handlers must return `200` immediately and process asynchronously where possible.
- All database updates inside webhook handlers must be atomic (use `prisma.$transaction`).

## Data Model Conventions
- The `Booking` model is being extended (not replaced) with payment fields: `bookingHostType`, `bookingHostId`, `stripeTransferGroup`, snapshotted policy fields. The existing booking flow continues as-is.
- `BookingParticipant` is a new table — each row represents one party's financial stake in a booking (escrow amount, PaymentIntent ID, payment status).
- `RosterStrike` is a new table for tracking away-confirmation timeouts per roster per season.
- `LeagueTransaction` is a new table for the league financial ledger — tracks all dues received and court costs paid with running balance.
- The existing `Team` model (roster) already has `stripeAccountId` and `balance` — use these fields, do not duplicate.
- Users who have paid for a facility rental can assign that rental to any event they have scheduling authority over (events they create, free league home games).
- Stripe Connect onboarding is managed through the user's profile page, not through separate onboarding screens.
- League dues are collected up front before the season starts.
- Average court cost for suggested dues is the average hourly court price for courts matching the league's sport type across all onboarded facilities.

## Environment Variables (server/.env)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PLATFORM_FEE_RATE=0.05
STRIPE_PRICE_ROSTER=price_...
STRIPE_PRICE_LEAGUE=price_...
STRIPE_PRICE_FACILITY_BASIC=price_...
STRIPE_PRICE_FACILITY_PRO=price_...
```

## File Locations
- Routes: `server/src/routes/connect-onboarding.ts` (Connect Express flows)
- Services: `server/src/services/stripe-connect.ts`, `escrow.ts`, `cancellation.ts`, `balance.ts`, `dues.ts`
- Utils: `server/src/utils/idempotency.ts`
- Jobs: `server/src/jobs/away-confirmation.ts`, `capture-window.ts`, `event-cutoff.ts`
- Register new routes in `server/src/index.ts` following the existing pattern.
- Register new jobs in `server/src/jobs/index.ts` following the `node-cron` pattern already in use.

## Testing
- Every Stripe service function must have unit tests that mock the Stripe SDK.
- Cancellation engine must have tests for all branches: facility cancels, team cancels in window, team cancels out of window × 3 penalty destinations.
- Use `server/src/tests/integration/` for end-to-end payment flow tests.
