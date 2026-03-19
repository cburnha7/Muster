# Payments Spec — Dependency Analysis

## What Already Exists

### Stripe Integration
- `stripe` v20.4.1 already in `server/package.json`
- Webhook endpoint wired at `/api/stripe/webhooks` with `express.raw()` body parser (correct for signature verification)
- Existing webhook handler processes subscription lifecycle events (`customer.subscription.created/updated/deleted`, `invoice.payment_failed`)
- `Subscription` model tracks `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`

### Data Models (Prisma)
- `Team` (roster) already has: `balance`, `joinFee`, `joinFeeType`, `stripeAccountId`, `lastBalanceUpdate`
- `TeamTransaction` tracks financial activity with `stripePaymentId`, `paymentStatus`, types: `join_fee`, `top_up`, `booking_debit`, `refund`
- `Booking` has `totalPrice` and `paymentStatus` but is user-centric (no host/participant model)
- `FacilityRental` has `totalPrice`, `paymentStatus`, cancellation fields, `bookingSessionId` for bulk grouping
- `Facility` has no `stripeAccountId` or cancellation policy fields
- `League` has `membershipFee` but no `stripeAccountId` or free/paid type distinction
- `Season` exists but lacks `type` (free/paid), `dues_amount`, `avg_court_cost`, `suggested_min_dues`
- `Match` exists with home/away team references but no booking/payment linkage

### Auth & Middleware
- JWT-based `authMiddleware` and `optionalAuthMiddleware` in place
- Subscription-tier middleware exists for plan-based access control

### Routes
- Rentals: `/api/facilities/:facilityId/courts/:courtId/slots/:slotId/rent` and `/api/rentals/bulk`
- Bookings: `/api/bookings` (basic retrieval)
- Teams, Leagues, Matches, Seasons all have route files

### Environment
- `server/.env.example` has no Stripe keys listed (but code references `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and price IDs)

---

## What's Missing (Grouped by Task Area)

### 1. Stripe Connect Infrastructure (Tasks 1.1–1.7)

| Dependency | Status | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` in env config | ⚠️ Used in code but not in `.env.example` | Add to `server/.env.example` |
| `STRIPE_WEBHOOK_SECRET` in env config | ⚠️ Same | Add to `server/.env.example` |
| `PLATFORM_FEE_RATE` env variable | ❌ Missing | Needed per design — must not be hardcoded |
| Connect Express onboarding endpoints | ❌ Missing | Need new route file: `server/src/routes/connect-onboarding.ts` |
| `Facility.stripeConnectAccountId` | ❌ Missing | Schema migration needed |
| `League.stripeConnectAccountId` | ❌ Missing | Schema migration needed |
| `Team.stripeAccountId` | ✅ Exists | Already on the Team model |
| Connect webhook events (`payment_intent.succeeded`, etc.) | ❌ Missing | Existing webhook handler only covers subscription events — needs expansion |
| Idempotency key utility | ❌ Missing | New utility: `server/src/utils/idempotency.ts` |

### 2. Facility Cancellation Policy (Tasks 2.1–2.6)

| Dependency | Status | Notes |
|---|---|---|
| `Facility` cancellation policy fields | ❌ Missing | Need: `noticeWindowHours`, `teamPenaltyPct`, `penaltyDestination`, `policyVersion` |
| `Booking` policy snapshot fields | ❌ Missing | Need: `policyNoticeWindowHours`, `policyTeamPenaltyPct`, `policyPenaltyDestination`, `policyVersion` |
| `snapshotPolicy` service function | ❌ Missing | New service |
| Policy display component (frontend) | ❌ Missing | New component |
| Policy acknowledgement on booking | ❌ Missing | New field on Booking + UI checkbox |

### 3. Booking Data Model Overhaul (Tasks 3.1–3.7)

| Dependency | Status | Notes |
|---|---|---|
| Current `Booking` model | ⚠️ Exists but wrong shape | Current model is user-centric. Spec needs `booking_host_type`, `booking_host_id`, `stripe_transfer_group`, status enum, snapshotted policy fields |
| `BookingParticipant` model | ❌ Missing | Entirely new table: `booking_id`, `roster_id`, `role`, `escrow_amount`, `stripe_payment_intent_id`, `payment_status`, `confirmed_at`, `confirmation_deadline` |
| `checkBalance` service | ❌ Missing | Queries Stripe Connect account balance |
| `createEscrowIntent` service | ❌ Missing | Creates PaymentIntent with manual capture |
| `captureEscrow` service | ❌ Missing | Captures all participant intents |
| `releaseEscrow` service | ❌ Missing | Cancels a single PaymentIntent |

**Migration risk:** The existing `Booking` model is used by current rental/event flows. The spec's booking model is structurally different. Options:
1. Extend existing `Booking` with new optional fields (safer, backward-compatible)
2. Create a new `PaymentBooking` model alongside existing (avoids breaking changes)
3. Migrate existing `Booking` to new shape (risky, breaks existing flows)

Recommendation: Option 1 — extend `Booking` with new nullable fields and add `BookingParticipant` as a new table.

### 4. Free League Flow (Tasks 4.1–4.8)

| Dependency | Status | Notes |
|---|---|---|
| `League.type` (free/paid) | ❌ Missing | Need to add field — `League` currently has `membershipFee` but no explicit type |
| `Season` extended fields | ❌ Missing | Need: `type`, `duesAmount`, `gamesPerTeam`, `avgCourtCost`, `suggestedMinDues`, `stripeConnectAccountId` |
| `RosterStrike` model | ❌ Missing | New table: `roster_id`, `league_season_id`, `reason`, `booking_id`, `created_at`, `count` |
| Away confirmation background job | ❌ Missing | Needs a job runner — no existing background job infrastructure found |
| Push notification service | ⚠️ Partial | `expo-notifications` in frontend deps, but no server-side push sending found |

### 5. Paid League Flow (Tasks 5.1–5.5)

| Dependency | Status | Notes |
|---|---|---|
| League Connect account balance check | ❌ Missing | Depends on `League.stripeConnectAccountId` |
| Suggested dues calculator | ❌ Missing | Pure math, no external deps |
| Single-payer PaymentIntent flow | ❌ Missing | Simpler variant of the two-party escrow |

### 6–7. Pickup Game & Public Event (Tasks 6.1–7.5)

| Dependency | Status | Notes |
|---|---|---|
| Game challenge flow | ❌ Missing | New route + UI |
| Public event attendee escrow | ❌ Missing | Variant of escrow flow with N participants |
| Event cutoff background job | ❌ Missing | Same job runner dependency as task 4.7 |

### 8. Cancellation Engine (Tasks 8.1–8.5)

| Dependency | Status | Notes |
|---|---|---|
| `processCancellation` service | ❌ Missing | Core business logic — depends on snapshotted policy fields on Booking |
| Stripe refund + reverse_transfer calls | ❌ Missing | New Stripe integration code |
| Penalty routing logic | ❌ Missing | Depends on `penalty_destination` enum |

### 9. Season Dues (Tasks 9.1–9.3)

| Dependency | Status | Notes |
|---|---|---|
| Player-to-roster dues payment | ⚠️ Partial | `TeamTransaction` with `join_fee` type exists, but not wired to Stripe Connect transfers |
| Roster-to-league dues payment | ❌ Missing | New flow |
| Dues status display | ❌ Missing | Frontend component |

### 10. Balance Status & Notifications (Tasks 10.1–10.5)

| Dependency | Status | Notes |
|---|---|---|
| `getBalanceStatus` service | ❌ Missing | Depends on Stripe Connect balance API |
| Push notification sending (server-side) | ❌ Missing | Need Expo push notification server integration |
| Balance status UI indicators | ❌ Missing | Frontend component |

### 11. 7-Day Capture Window (Tasks 11.1–11.3)

| Dependency | Status | Notes |
|---|---|---|
| Background job scheduler | ❌ Missing | No cron/job infrastructure exists. Need something like `node-cron`, `bull`, or a simple `setInterval`-based runner |
| Re-authorization logic | ❌ Missing | Cancel + recreate PaymentIntents |

---

## Critical Path Dependencies

The implementation order in the tasks file is mostly correct. Here's the dependency chain:

```
Environment config (1.1)
  → Connect onboarding (1.2–1.4)
    → Webhook expansion (1.5–1.6)
    → Idempotency utility (1.7)

Facility policy schema (2.1)
  → Booking schema overhaul (3.1–3.2)
    → Core escrow services (3.3–3.6)
      → Free league flow (4.x)
      → Paid league flow (5.x)
      → Pickup game flow (6.x)
      → Public event flow (7.x)
      → Cancellation engine (8.x)

Season schema extension (4.1)
  → Dues flows (9.x)
  → Balance status (10.x)

Background job infrastructure
  → Away confirmation timeout (4.7)
  → Event cutoff (7.4)
  → 7-day capture window (11.x)
```

### Blockers Before Any Task Can Start
1. Stripe Connect platform account must be configured (real or test keys)
2. `PLATFORM_FEE_RATE` must be defined in env
3. Prisma schema migrations for new fields and tables
4. Background job infrastructure decision (recommend `node-cron` for simplicity)

### Schema Migrations Needed (All at Once or Phased)
1. Add to `Facility`: `stripeConnectAccountId`, `noticeWindowHours`, `teamPenaltyPct`, `penaltyDestination`, `policyVersion`
2. Add to `League`: `stripeConnectAccountId`, `leaguePricingType` (free/paid)
3. Extend `Season`: `type`, `duesAmount`, `gamesPerTeam`, `avgCourtCost`, `suggestedMinDues`, `stripeConnectAccountId`
4. Extend `Booking`: `bookingHostType`, `bookingHostId`, `stripeTransferGroup`, snapshotted policy fields, new status values
5. New table: `BookingParticipant`
6. New table: `RosterStrike`

### New Server Files Needed
- `server/src/routes/connect-onboarding.ts` — Stripe Connect Express onboarding endpoints
- `server/src/services/stripe-connect.ts` — Connect account management
- `server/src/services/escrow.ts` — PaymentIntent creation, capture, release
- `server/src/services/cancellation.ts` — Policy enforcement and refund routing
- `server/src/services/balance.ts` — Balance checking and status calculation
- `server/src/services/dues.ts` — Player and roster dues payment
- `server/src/utils/idempotency.ts` — Idempotency key generation
- `server/src/jobs/index.ts` — Background job runner setup
- `server/src/jobs/away-confirmation.ts` — 48h timeout checker
- `server/src/jobs/capture-window.ts` — 7-day re-authorization
- `server/src/jobs/event-cutoff.ts` — Public event minimum attendee check

### Frontend Files Needed
- Connect onboarding screens (roster manager, facility, commissioner)
- Cancellation policy display component
- Policy acknowledgement in booking flow
- Balance status indicators
- Dues payment screens
- Suggested dues calculator widget
- Game challenge flow screens
- Public event creation with pricing
