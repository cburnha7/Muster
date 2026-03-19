# Design Document

## Overview

The payment system uses Stripe Connect as the sole money movement layer. The platform acts as a Connect platform account — it never holds user funds. Every roster manager, league commissioner, and facility is a Stripe Connect Express account. The platform collects revenue via Stripe's `application_fee_amount` parameter on every charge.

The core principle: **the booking host pays the facility, and the booking host is whoever created the event.**

The existing facility rental flow continues as-is. Users who pay for a facility rental up front can assign that rental to any event they have scheduling authority over. This means the payment system layers on top of the existing rental infrastructure rather than replacing it.

Stripe Connect onboarding for all entity types is managed through the user's profile page.

---

## Architecture

### Entity Model

```
Platform (Stripe Platform Account)
├── Facility          → Stripe Connect Express account
├── League            → Stripe Connect Express account (paid leagues only)
│   └── Roster        → Stripe Connect Express account (member)
│       └── Player    → pays dues to roster manager
└── Roster            → Stripe Connect Express account (standalone)
    └── Player        → pays dues to roster manager
```

A league is structurally identical to a roster — it has a manager (commissioner), members (rosters), and a Connect account. The only differences are: members are rosters not players, dues are per-season at the league level, and the commissioner has scheduling authority over member rosters.

---

### Booking Host Rules

| Scenario | Booking Host | Court Cost Source | How Facility Is Booked |
|---|---|---|---|
| Paid league game | Commissioner | League Connect account (funded by up-front dues) | Commissioner uses existing rental flow, charges league account |
| Free league game | Home roster manager | Home roster manager pays | Home manager uses existing rental flow, assigns rental to game |
| Pickup game | Challenging roster manager | Split 50/50 | Both roster managers |
| Public event | Roster manager | Full amount from attendee fees | Roster manager uses existing rental flow |
| Tournament (paid league) | Commissioner | League Connect account | Commissioner uses existing rental flow |
| Tournament (free / no league) | Host roster manager | Split N ways | All participating roster managers |

---

### Data Models

#### `facility_cancellation_policy` (stored on Facility, snapshotted onto Booking)

```typescript
{
  notice_window_hours: number        // hours required for penalty-free cancellation
  team_penalty_pct: number           // 0–100, % of cancelling team's escrow forfeited
  penalty_destination: 'facility' | 'opposing_team' | 'split'
  policy_version: string             // timestamp of last update
}
```

#### `booking`

```typescript
{
  id: string
  booking_host_type: 'roster_manager' | 'league_commissioner'
  booking_host_id: string
  facility_id: string
  court_id: string
  scheduled_at: datetime
  court_cost: number
  stripe_transfer_group: string      // = booking ID, links all charges + facility transfer

  // Snapshotted at confirmation — never references live policy
  policy_notice_window_hours: number
  policy_team_penalty_pct: number
  policy_penalty_destination: 'facility' | 'opposing_team' | 'split'
  policy_version: string

  status: 'pending_away_confirm' | 'escrow_collecting' | 'confirmed' | 'cancelled' | 'played' | 'forfeited'

  participants: BookingParticipant[]
}
```

#### `booking_participant`

```typescript
{
  booking_id: string
  roster_id: string                  // or league_id for paid league bookings
  role: 'home' | 'away' | 'host' | 'participant'
  escrow_amount: number              // their share of court cost
  stripe_payment_intent_id: string
  payment_status: 'pending' | 'authorized' | 'captured' | 'refunded' | 'forfeited'
  confirmed_at: datetime | null      // for away team confirmation
  confirmation_deadline: datetime | null
}
```

#### `league_season`

```typescript
{
  id: string
  league_id: string
  type: 'free' | 'paid'
  dues_amount: number | null         // null for free leagues — collected up front before season starts
  games_per_team: number
  avg_court_cost: number             // average hourly court price for courts matching the league's sport type across all onboarded facilities
  suggested_min_dues: number         // = (games_per_team × avg_court_cost) / roster_count
  stripe_connect_account_id: string | null  // null for free leagues
}
```

#### `roster_strike`

```typescript
{
  roster_id: string
  league_season_id: string
  reason: 'failed_away_confirmation'
  booking_id: string
  created_at: datetime
  count: number                      // running total for the season
}
```

#### `league_transaction` (league financial ledger)

```typescript
{
  id: string
  league_id: string
  season_id: string
  type: 'dues_received' | 'court_cost' | 'refund'
  amount: number                     // positive for inflows, negative for outflows
  balance_after: number              // running balance after this transaction
  description: string
  roster_id: string | null           // source roster for dues payments
  facility_id: string | null         // facility for court cost payments
  rental_id: string | null           // linked facility rental
  match_id: string | null            // linked game
  stripe_payment_id: string | null
  created_at: datetime
}
```

---

## Stripe Implementation

### PaymentIntent Configuration

All escrow charges use manual capture:

```typescript
const intent = await stripe.paymentIntents.create({
  amount: escrow_amount_cents,
  currency: 'usd',
  payment_method: manager.default_payment_method,
  customer: manager.stripe_customer_id,
  capture_method: 'manual',              // holds funds, does not charge yet
  application_fee_amount: platform_fee_cents,
  transfer_data: {
    destination: facility.stripe_connect_account_id,
  },
  transfer_group: booking.id,            // links all intents + transfer for audit
  metadata: {
    booking_id: booking.id,
    participant_role: 'home' | 'away',
    roster_id: manager.roster_id,
  }
});
```

### Escrow Capture Flow (Two-Party)

```
1. Both PaymentIntents created with capture_method: 'manual'
2. Both authorized successfully → proceed
   Either fails → release the other via paymentIntents.cancel(), block booking
3. Both captured simultaneously
4. Stripe auto-transfers court_cost to facility via transfer_data.destination
5. Platform fee auto-deducted via application_fee_amount
```

Note: Stripe's manual capture window is 7 days. For games booked more than 7 days out, a background job must re-authorize the intents 7 days before game day. Alternatively, use immediate capture and issue refunds if the game is cancelled — simpler operationally.

### Facility Payment

The facility receives the full court cost immediately on booking confirmation via `transfer_data.destination`. No separate transfer call is needed — Stripe handles this automatically when both intents are captured within the same `transfer_group`.

### Facility Cancellation Refund

```typescript
// Refund both managers fully
await stripe.refunds.create({ payment_intent: intent_a.id, reverse_transfer: true });
await stripe.refunds.create({ payment_intent: intent_b.id, reverse_transfer: true });
// reverse_transfer: true claws back the facility payout automatically
```

### Team Forfeit (Late Cancellation)

```typescript
const penalty = Math.floor(escrow_amount × (policy_team_penalty_pct / 100));
const refund_amount = escrow_amount - penalty;

// Refund non-penalised portion to cancelling team
await stripe.refunds.create({
  payment_intent: cancelling_intent.id,
  amount: refund_amount,
  reverse_transfer: false,   // facility already paid — do not claw back
});

// Route penalty per policy
if (penalty_destination === 'opposing_team') {
  await stripe.transfers.create({
    amount: penalty,
    currency: 'usd',
    destination: opposing_manager.stripe_connect_account_id,
    transfer_group: booking.id,
  });
}
// 'facility' → no action, facility keeps it (already in their payout)
// 'split'    → transfer half to opposing team, facility keeps half

// Refund opposing team 100%
await stripe.refunds.create({
  payment_intent: opposing_intent.id,
  reverse_transfer: false,
});
```

### League Dues Payment

Roster managers pay league dues up front before the season begins. Funds transfer directly to the league commissioner's Connect account.

```typescript
const charge = await stripe.paymentIntents.create({
  amount: dues_amount_cents,
  currency: 'usd',
  payment_method: roster_manager.default_payment_method,
  customer: roster_manager.stripe_customer_id,
  application_fee_amount: platform_fee_cents,
  transfer_data: {
    destination: league.stripe_connect_account_id,
  },
  metadata: {
    league_season_id: season.id,
    roster_id: roster.id,
    type: 'league_dues',
  }
});
```

All dues payments and court cost debits are recorded in a league ledger (`LeagueTransaction` table) for transparency.

---

## Key Flows

### Flow 1: Free League Game — Home Books, Away Confirms

```
Commissioner assigns home/away rosters
→ Home roster manager books facility using existing rental flow (pays up front)
→ Home manager assigns rental to the scheduled game
→ Away roster manager receives confirmation request (48h window)
  → Away confirms → game CONFIRMED
  → Away does not confirm within 48h → game LAPSES
    → Strike recorded against away roster
    → Commissioner notified
    → Home manager prompted to rebook or reassign rental
```

### Flow 2: Paid League Game — Commissioner Books

```
Commissioner assigns game (home/away rosters)
→ System checks league Connect account balance ≥ full court cost
  → Insufficient → block scheduling, display shortfall
  → Sufficient → commissioner books facility using existing rental flow, charged to league account
→ Rental linked to game → game CONFIRMED
→ Transaction recorded in league ledger
```

### Flow 3: Pickup Game Challenge

```
Roster manager A challenges roster manager B
→ B accepts
→ System checks both balances ≥ 50% court cost
  → Either insufficient → block, display which roster and shortfall
  → Both sufficient → two PaymentIntents (manual capture)
→ Both captured → facility paid → booking CONFIRMED
```

### Flow 4: Cancellation Decision Tree

```
Cancellation requested
→ Is it the facility cancelling?
  YES → Full refund all parties + reverse_transfer facility payout + refund platform fees → DONE
  NO  → Check hours until game start vs policy.notice_window_hours
    → Within window (≥ notice_window_hours)?
      YES → 0% penalty → refund cancelling team 100%, refund opposing team 100% → DONE
      NO  → Apply team_penalty_pct to cancelling team's escrow
          → Route penalty per policy.penalty_destination
          → Refund remainder to cancelling team
          → Refund 100% to opposing team → DONE
```

---

## Balance Status Indicators

Displayed on the commissioner's league roster view per roster:

| Status | Condition |
|---|---|
| Funded | balance ≥ 2× (court_cost × 0.50) |
| Low | balance between 1× and 2× (court_cost × 0.50) |
| Blocked | balance < 1× (court_cost × 0.50) |

Thresholds use `avg_court_cost` from the league season record.

---

## Away Confirmation Strike System

- Each failed confirmation (timeout) = 1 strike recorded on `roster_strike`
- At 3 strikes in a season: commissioner notified, removal option surfaced
- Strikes are per-season, per-league — they do not carry across seasons or leagues

---

## Suggested Dues Calculation

Displayed to commissioner when creating a paid season:

```
avg_court_cost = average hourly court price for courts matching the league's sport type across all onboarded facilities
suggested_min_dues = ceil((games_per_team × avg_court_cost) / enrolled_roster_count)
```

This is advisory only — commissioner can set any amount. The margin above `suggested_min_dues` is the commissioner's earnings for running the league.

---

## Non-Functional Considerations

- **Idempotency:** All Stripe API calls must use idempotency keys derived from `booking_id` + `participant_role` to prevent double-charges on retries
- **Webhook handling:** Stripe webhooks for `payment_intent.succeeded`, `payment_intent.payment_failed`, and `transfer.reversed` must update booking and participant records atomically
- **Audit trail:** All `stripe_payment_intent_id` and `stripe_transfer_id` values stored on records for dispute resolution
- **7-day capture window:** Background job required to re-authorize manual-capture intents for games booked more than 7 days out
- **Platform fee rate:** Stored in environment config, not hardcoded — allows adjustment without deployment
