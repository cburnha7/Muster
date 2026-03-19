# Roster Balance System Implementation

## Overview
This document describes the implementation of the Roster Join Fee, Roster Balance, and Group Fee Event Coverage system. This feature enables rosters to pool funds from player join fees and use those funds to book court time and cover event costs for their players.

## Key Terminology
Following Muster brand guidelines:
- **Roster** (not "Team") - A group of players
- **Players** (not "Members") - People in a roster
- **Join Up** (not "Register" or "Book") - Action to join

## Features Implemented

### 1. Database Schema Updates

#### Team/Roster Table Updates
**File**: `server/prisma/schema.prisma`

Added fields to Team model:
- `balance`: Float (default 0) - Current roster balance in USD
- `joinFee`: Float (optional) - Join fee amount
- `joinFeeType`: String (optional) - 'one_time' or 'monthly'
- `stripeAccountId`: String (optional) - Stripe Connect account
- `lastBalanceUpdate`: DateTime - Last balance modification timestamp

#### Event Table Updates
Added fields for group fee coverage:
- `isGroupFeeCovered`: Boolean (default false) - Event cost covered by roster
- `coveringTeamId`: String (optional) - Which roster is covering

#### New TeamTransaction Model
Tracks all roster balance changes:
```prisma
model TeamTransaction {
  id              String
  type            String // 'join_fee', 'top_up', 'booking_debit', 'refund'
  amount          Float // Positive for credits, negative for debits
  balanceBefore   Float
  balanceAfter    Float
  description     String
  stripePaymentId String?
  paymentStatus   String // 'pending', 'completed', 'failed', 'refunded'
  userId          String?
  rentalId        String?
  teamId          String
  createdAt       DateTime
}
```

**Migration**: `server/prisma/migrations/add_team_balance_system/migration.sql`

### 2. TypeScript Type Updates
**File**: `src/types/index.ts`

Added enums:
```typescript
enum TeamTransactionType {
  JOIN_FEE = 'join_fee',
  TOP_UP = 'top_up',
  BOOKING_DEBIT = 'booking_debit',
  REFUND = 'refund',
}

enum JoinFeeType {
  ONE_TIME = 'one_time',
  MONTHLY = 'monthly',
}
```

Updated Team interface with balance fields.
Added TeamTransaction interface.
Updated Event interface with group fee coverage fields.

### 3. Roster Join Fee System

#### Setting Join Fee
**Location**: Roster creation/edit screens

Roster owners can:
- Set optional join fee amount
- Choose fee type: one-time or monthly
- Fee is enforced when players attempt to join

#### Payment Flow
1. Player requests to join roster (or is invited)
2. If join fee is set, payment screen is shown
3. Player pays via Stripe
4. Payment is recorded as TeamTransaction (type: 'join_fee')
5. Roster balance is credited
6. Player membership is activated

#### Monthly Fee Handling
- Monthly fees require recurring payment setup
- Stripe subscription created for player
- Failed payments result in membership suspension
- Grace period before removal (configurable)

### 4. Roster Balance Management

#### Balance Display
**Location**: Roster management screen

Shows:
- Current balance prominently displayed
- Recent transactions list
- Balance history chart (optional)
- Available for booking indicator

#### Top-Up Functionality
**Location**: Roster management screen

Roster owners/admins can:
- Manually add funds to roster balance
- Enter amount and pay via Stripe
- Transaction recorded (type: 'top_up')
- Balance updated immediately

#### Transaction History
**Location**: Roster management screen

Displays:
- All balance changes chronologically
- Transaction type, amount, date
- Associated player (for join fees)
- Associated booking (for debits)
- Running balance after each transaction

### 5. Court Booking with Roster Balance

#### Payment Method Selection
**Location**: Court booking flow

When booking court time, roster owners/admins see:
- Personal payment method option
- Roster balance payment option (if sufficient funds)
- Current roster balance displayed
- Shortfall calculation if insufficient

#### Sufficient Balance Flow
1. Select time slot(s)
2. Choose "Pay with Roster Balance"
3. Confirm booking
4. Balance debited (type: 'booking_debit')
5. Booking confirmed
6. Transaction recorded with rental ID

#### Insufficient Balance Flow
1. Select time slot(s)
2. Choose "Pay with Roster Balance"
3. System shows shortfall amount
4. Options presented:
   - Pay shortfall personally
   - Top up roster balance first
   - Cancel and choose different payment

#### Split Payment
If shortfall exists:
- Roster balance applied first
- Remaining amount charged to personal card
- Two transactions recorded:
  - Roster balance debit
  - Personal payment

### 6. Group Fee Event Coverage

#### Event Creation with Coverage
**Location**: Event creation screen

When creating event at roster-booked court:
- Toggle: "Included with group fee"
- Only available if:
  - Court was booked using roster balance
  - User is roster owner/admin
  - Roster has sufficient balance

#### Coverage Behavior
When "Included with group fee" is enabled:
- `isGroupFeeCovered` set to true
- `coveringTeamId` set to roster ID
- Roster players join for free
- Non-roster players pay standard fee (if event is public)

#### Player Join Flow
**Roster Players**:
1. See event marked as "Covered by roster"
2. Join Up button (no payment required)
3. Participation confirmed immediately
4. No charge to player or roster balance

**Non-Roster Players** (if event is public):
1. See standard event fee
2. Pay individually via Stripe
3. Payment goes to event organizer
4. Not covered by roster balance

### 7. Balance Validation & Safeguards

#### Booking Validation
Before allowing roster balance payment:
- Verify user is owner/admin
- Check balance >= booking cost
- Validate roster is active
- Ensure no pending failed payments

#### Concurrent Booking Protection
- Optimistic locking on balance updates
- Transaction isolation level: SERIALIZABLE
- Retry logic for race conditions
- Balance check immediately before debit

#### Refund Handling
When booking is cancelled:
- Refund amount calculated based on cancellation policy
- Refund credited back to roster balance
- Transaction recorded (type: 'refund')
- All roster players notified

### 8. Stripe Integration

#### Payment Processing
**Service**: `server/src/services/StripeService.ts` (to be created)

Handles:
- Join fee payments (one-time and recurring)
- Top-up payments
- Refund processing
- Webhook handling for payment events

#### Stripe Connect (Future)
For roster-to-roster payments:
- Roster owners can connect Stripe account
- Enables receiving payments from other rosters
- Required for inter-roster transactions

### 9. UI Components

#### Roster Balance Card
**Component**: `src/components/teams/RosterBalanceCard.tsx` (to be created)

Displays:
- Current balance (large, prominent)
- Last updated timestamp
- Quick actions: Top Up, View History
- Low balance warning (if < $50)

#### Transaction List
**Component**: `src/components/teams/TransactionList.tsx` (to be created)

Shows:
- Transaction type icon
- Description
- Amount (color-coded: green for credits, red for debits)
- Date/time
- Associated player/booking
- Running balance

#### Payment Method Selector
**Component**: `src/components/bookings/PaymentMethodSelector.tsx` (to be created)

For court bookings:
- Radio buttons: Personal Card / Roster Balance
- Balance display with availability indicator
- Shortfall calculation and options
- Payment confirmation

#### Group Fee Toggle
**Component**: `src/components/events/GroupFeeCoverageToggle.tsx` (to be created)

In event creation:
- Toggle switch with explanation
- Eligibility check (roster-booked court)
- Preview of who pays what
- Warning if balance insufficient

### 10. Business Logic Services

#### RosterBalanceService
**File**: `server/src/services/RosterBalanceService.ts` (to be created)

Methods:
- `creditBalance(teamId, amount, type, userId?, description)` - Add funds
- `debitBalance(teamId, amount, type, rentalId?, description)` - Remove funds
- `getBalance(teamId)` - Get current balance
- `getTransactions(teamId, filters)` - Get transaction history
- `validateSufficientFunds(teamId, amount)` - Check if balance adequate
- `processJoinFeePayment(teamId, userId, paymentIntentId)` - Handle join fee
- `processTopUp(teamId, userId, amount, paymentIntentId)` - Handle top-up
- `processRefund(teamId, rentalId, amount)` - Handle refund

#### RosterJoinService
**File**: `server/src/services/RosterJoinService.ts` (to be created)

Methods:
- `initiateJoin(teamId, userId)` - Start join process
- `requiresPayment(teamId)` - Check if join fee exists
- `createPaymentIntent(teamId, userId)` - Create Stripe payment
- `confirmJoin(teamId, userId, paymentIntentId?)` - Complete join
- `handleFailedPayment(teamId, userId)` - Handle payment failure

### 11. API Endpoints

#### Roster Balance Endpoints
```
GET    /api/teams/:teamId/balance
GET    /api/teams/:teamId/transactions
POST   /api/teams/:teamId/top-up
POST   /api/teams/:teamId/join-fee-payment
```

#### Booking with Balance Endpoints
```
POST   /api/rentals/book-with-team-balance
GET    /api/teams/:teamId/available-for-booking
```

#### Event Coverage Endpoints
```
POST   /api/events/:eventId/set-group-coverage
GET    /api/events/:eventId/coverage-eligibility
```

### 12. Notifications

#### Balance Notifications
- Low balance alert (< $50) to owners/admins
- Balance credited (join fee received)
- Balance debited (booking made)
- Refund processed

#### Join Fee Notifications
- Payment required to join roster
- Payment successful, membership activated
- Payment failed, retry required
- Monthly payment upcoming (3 days before)

#### Event Coverage Notifications
- Event covered by roster balance
- Non-roster players: standard fee applies

### 13. Security & Permissions

#### Balance Access
- View balance: Roster owners, admins, players (read-only)
- Modify balance: Roster owners, admins only
- Transaction history: All roster players can view

#### Booking with Balance
- Only roster owners and admins can use balance for bookings
- Validated server-side on every request
- Audit log of all balance usage

#### Join Fee Management
- Only roster owner can set/modify join fee
- Fee changes don't affect existing players
- New fee applies to future joins only

### 14. Edge Cases & Error Handling

#### Insufficient Balance During Booking
- Show shortfall amount
- Offer split payment option
- Suggest top-up amount
- Allow cancellation

#### Failed Join Fee Payment
- Player membership stays pending
- Retry payment option
- Expires after 24 hours
- Notification to player and owner

#### Concurrent Balance Modifications
- Database-level locking
- Retry logic with exponential backoff
- Error message if balance changed
- Refresh and retry option

#### Roster Deletion with Balance
- Prevent deletion if balance > 0
- Require balance distribution first
- Option to refund to players proportionally
- Admin override with audit trail

### 15. Testing Strategy

#### Unit Tests
- Balance credit/debit calculations
- Transaction recording accuracy
- Permission validation
- Refund amount calculations

#### Integration Tests
- End-to-end join fee payment flow
- Court booking with roster balance
- Event creation with group coverage
- Balance insufficient scenarios

#### Stripe Integration Tests
- Payment intent creation
- Webhook handling
- Refund processing
- Subscription management (monthly fees)

### 16. Monitoring & Analytics

#### Metrics to Track
- Total roster balance across platform
- Average roster balance
- Join fee conversion rate
- Bookings paid with roster balance vs personal
- Balance top-up frequency
- Failed payment rate

#### Alerts
- Low balance warnings
- Failed payment spikes
- Unusual balance changes
- Refund request volume

### 17. Future Enhancements

#### Balance Sharing
- Allow rosters to share balance with partner rosters
- Inter-roster transfers
- Balance pooling for tournaments

#### Automated Top-Ups
- Auto-top-up when balance falls below threshold
- Scheduled recurring top-ups
- Player-contributed auto-top-ups

#### Balance Rewards
- Cashback on bookings
- Referral bonuses added to balance
- Loyalty rewards for active rosters

#### Advanced Reporting
- Balance forecast based on usage
- Cost per player analytics
- ROI on join fees
- Booking pattern analysis

### 18. Configuration

#### Environment Variables
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ROSTER_BALANCE_LOW_THRESHOLD=50.00
JOIN_FEE_PAYMENT_EXPIRY_HOURS=24
MONTHLY_FEE_GRACE_PERIOD_DAYS=7
```

#### Feature Flags
- `ENABLE_ROSTER_BALANCE`: Master toggle
- `ENABLE_MONTHLY_FEES`: Recurring payments
- `ENABLE_GROUP_FEE_COVERAGE`: Event coverage
- `ENABLE_BALANCE_SHARING`: Inter-roster transfers

### 19. Deployment Checklist

- [ ] Run database migration
- [ ] Set up Stripe webhook endpoints
- [ ] Configure environment variables
- [ ] Test payment flows in Stripe test mode
- [ ] Enable feature flags gradually
- [ ] Monitor error rates and payment success
- [ ] Train support team on new features
- [ ] Update user documentation
- [ ] Announce feature to users

### 20. Rollback Plan

If critical issues arise:
1. Disable feature flags
2. Prevent new join fee payments
3. Allow existing balances to be used
4. Process pending refunds
5. Revert database migration if necessary
6. Communicate with affected rosters

### 21. Support & Troubleshooting

#### Common Issues

**Balance not updating after payment**
- Check Stripe webhook delivery
- Verify transaction was recorded
- Check for database locks
- Review error logs

**Join fee payment failing**
- Verify Stripe API keys
- Check card details
- Review Stripe dashboard for errors
- Test with Stripe test cards

**Group fee coverage not working**
- Verify court was booked with roster balance
- Check user is roster owner/admin
- Ensure roster has sufficient balance
- Verify event eligibility settings

### 22. Related Files

#### Frontend
- `src/screens/teams/TeamDetailsScreen.tsx` - Roster details with balance
- `src/screens/teams/RosterBalanceScreen.tsx` - Balance management (new)
- `src/screens/teams/TopUpBalanceScreen.tsx` - Top-up flow (new)
- `src/screens/teams/JoinTeamScreen.tsx` - Join with fee payment (updated)
- `src/screens/events/CreateEventScreen.tsx` - Group fee toggle (updated)
- `src/components/teams/RosterBalanceCard.tsx` - Balance display (new)
- `src/components/teams/TransactionList.tsx` - Transaction history (new)
- `src/components/bookings/PaymentMethodSelector.tsx` - Payment selection (new)

#### Backend
- `server/prisma/schema.prisma` - Database schema
- `server/src/services/RosterBalanceService.ts` - Balance operations (new)
- `server/src/services/RosterJoinService.ts` - Join fee handling (new)
- `server/src/services/StripeService.ts` - Payment processing (new)
- `server/src/controllers/TeamBalanceController.ts` - API endpoints (new)
- `server/src/middleware/RosterPermissions.ts` - Permission checks (new)

#### Documentation
- `ROSTER_BALANCE_SYSTEM_IMPLEMENTATION.md` - This file
- `docs/roster-balance-api.md` - API documentation (to be created)
- `docs/stripe-integration-guide.md` - Stripe setup guide (to be created)

## Summary

This implementation creates a comprehensive pooled funding system for rosters, enabling:
- Optional join fees (one-time or monthly)
- Centralized roster balance management
- Court bookings paid from roster balance
- Group fee coverage for events
- Complete transaction history and audit trail
- Stripe integration for all payments

The system provides flexibility for rosters to manage their finances collectively while maintaining individual player accountability and transparent fund tracking.
