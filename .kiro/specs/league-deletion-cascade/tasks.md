# Implementation Plan: League Deletion Cascade

## Overview

Implement a comprehensive league deletion flow that replaces the naive `prisma.league.delete()` with an atomic cascade: locking leagues after live matches, issuing Stripe refunds, crediting roster balances, detaching rentals, deleting events, and providing a Commissioner confirmation screen with a deletion impact preview.

## Tasks

- [x] 1. Add `lockedFromDeletion` field to League model and create Prisma middleware
  - [x] 1.1 Add `lockedFromDeletion` Boolean field to the League model in `server/prisma/schema.prisma`
    - Add `lockedFromDeletion Boolean @default(false)` to the League model
    - Run `npx prisma migrate dev` to generate and apply the migration
    - _Requirements: 1.1_

  - [x] 1.2 Create Prisma middleware for automatic lock on match status transition (`server/src/middleware/league-lock.ts`)
    - Intercept `Match.update` operations via `prisma.$use`
    - When `status` changes to `in_progress` or `completed`, set `League.lockedFromDeletion = true` on the parent league
    - Export the middleware function and register it in the Prisma client setup
    - _Requirements: 1.2, 1.3, 1.5_

  - [ ]* 1.3 Write property test: Match status transition locks league
    - **Property 1: Match status transition locks league**
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 1.4 Write property test: Lock permanence invariant
    - **Property 2: Lock permanence invariant**
    - **Validates: Requirements 1.5**

- [x] 2. Implement LeagueDeletionService (`server/src/services/LeagueDeletionService.ts`)
  - [x] 2.1 Create `LeagueDeletionService` class with `getDeletionPreview` method
    - Define `DeletionImpactSummary` and `DeletionResult` interfaces
    - Implement `getDeletionPreview(leagueId)` that queries seasons, matches, events, rentals, PlayerDuesPayments, and active roster memberships to compute counts and totals
    - _Requirements: 2.1, 7.5_

  - [ ]* 2.2 Write property test: Deletion preview accuracy
    - **Property 4: Deletion preview accuracy**
    - **Validates: Requirements 2.1, 7.5**

  - [x] 2.3 Implement `executeLeagueDeletion` method — Stripe refunds step
    - Within a single `prisma.$transaction`, find all `PlayerDuesPayment` records with `paymentStatus='succeeded'` and a non-null `stripePaymentIntentId`
    - Issue `stripe.refunds.create()` for each with idempotency key via `generateIdempotencyKey(paymentId, playerId, 'refund')`
    - Update `paymentStatus` to `refunded` for each successful refund
    - If any refund fails, throw to trigger full transaction rollback
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.4 Write property test: Stripe refund correctness with idempotency
    - **Property 5: Stripe refund correctness with idempotency**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [x] 2.5 Implement `executeLeagueDeletion` method — roster balance refunds step
    - For leagues with `membershipFee > 0`, find all active `LeagueMembership` records with `memberType='roster'`
    - Credit each roster's `Team.balance` by `membershipFee`
    - Create a `TeamTransaction` with `type='refund'`, correct `balanceBefore`/`balanceAfter`, and a description referencing the league
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 2.6 Write property test: Roster balance refund correctness
    - **Property 6: Roster balance refund correctness**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 2.7 Implement `executeLeagueDeletion` method — rental detachment and event cleanup
    - Nullify `Match.rentalId` and `Match.eventId` for all league matches
    - Set `Event.rentalId = null` for events linked to rentals
    - Set `FacilityRental.usedForEventId = null` for rentals linked to league events
    - Delete all Events that were linked to league matches
    - Delete the League (Prisma cascade handles Seasons, Matches, Memberships, Transactions, Documents)
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 7.1_

  - [ ]* 2.8 Write property test: Rental preservation after deletion
    - **Property 7: Rental preservation after deletion**
    - **Validates: Requirements 3.3, 4.2, 4.3, 4.4**

  - [ ]* 2.9 Write property test: Event cleanup after deletion
    - **Property 8: Event cleanup after deletion**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 2.10 Write property test: Rollback on failure preserves all state
    - **Property 9: Rollback on failure preserves all state**
    - **Validates: Requirements 5.5, 7.2, 7.3, 7.4**

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Rewrite league deletion route and add preview endpoint (`server/src/routes/leagues.ts`)
  - [x] 4.1 Add `GET /api/leagues/:id/deletion-preview` endpoint
    - Verify requesting user is `organizerId`
    - Check `lockedFromDeletion` — return 403 if locked
    - Delegate to `LeagueDeletionService.getDeletionPreview()`
    - Return `DeletionImpactSummary` as JSON
    - _Requirements: 2.1, 8.3, 9.1_

  - [x] 4.2 Rewrite `DELETE /api/leagues/:id` endpoint
    - Add `requireNonDependent` middleware guard
    - Verify requesting user is `organizerId` — return 403 if not
    - Check `lockedFromDeletion` — return 403 if locked
    - Delegate to `LeagueDeletionService.executeLeagueDeletion()`
    - Return `DeletionResult` on success, 500 with error on failure
    - _Requirements: 1.4, 7.1, 7.2, 7.3, 9.1, 9.2, 9.3, 9.4_

  - [ ]* 4.3 Write property test: Locked league rejects deletion
    - **Property 3: Locked league rejects deletion**
    - **Validates: Requirements 1.4**

  - [ ]* 4.4 Write property test: Authorization rejects non-organizers
    - **Property 10: Authorization rejects non-organizers**
    - **Validates: Requirements 9.1, 9.3**

- [x] 5. Update league detail API to include `lockedFromDeletion` field
  - Ensure `GET /api/leagues/:id` response includes `lockedFromDeletion` in the returned JSON
  - No additional query changes needed — field is on the League model and included by default
  - _Requirements: 8.3_

- [x] 6. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Build React Native confirmation screen and update league management UI
  - [-] 7.1 Create `LeagueDeletionConfirmScreen.tsx` (`src/screens/leagues/LeagueDeletionConfirmScreen.tsx`)
    - Fetch `DeletionImpactSummary` from `GET /api/leagues/:id/deletion-preview` on mount
    - Display each category (events, rentals, Stripe refunds, roster balance refunds) with counts and monetary totals
    - Render a `FormButton` with `variant="danger"` for confirmation
    - On confirm, call `DELETE /api/leagues/:id` and navigate back on success
    - Import theme tokens from `src/theme/`
    - _Requirements: 2.2, 2.3_

  - [~] 7.2 Update `ManageLeagueScreen.tsx` to conditionally render delete button
    - Render delete button only when `lockedFromDeletion === false` and current user is the Commissioner
    - When visible, navigate to `LeagueDeletionConfirmScreen` on press
    - When `lockedFromDeletion === true`, completely omit the button from the render tree (not disabled — hidden)
    - _Requirements: 2.4, 8.1, 8.2_

  - [~] 7.3 Register `LeagueDeletionConfirmScreen` in the navigation stack
    - Add the screen to the league navigation configuration
    - _Requirements: 2.3_

  - [ ]* 7.4 Write property test: UI delete button visibility follows lock state
    - **Property 11: UI delete button visibility follows lock state**
    - **Validates: Requirements 2.4, 8.1, 8.2**

- [~] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All Stripe calls must use idempotency keys via `generateIdempotencyKey` from `server/src/utils/idempotency.ts`
- The 6 pre-existing test failures (timeslot-generation, stripe-connect, ScheduleGenerator, stripe-webhooks, league-ledger) are unrelated and should be ignored
