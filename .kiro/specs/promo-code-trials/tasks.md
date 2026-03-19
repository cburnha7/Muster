# Implementation Plan: Promo Code Trials

## Overview

Implement a promotional code system that grants users free tier trials. The implementation proceeds bottom-up: database schema first, then shared utilities, backend service and routes, nightly job with notifications, and finally the React Native frontend screens wired into the Profile tab.

## Tasks

- [x] 1. Database schema and shared utility
  - [x] 1.1 Add Prisma schema for PromoCode, PromoCodeRedemption models and User trial fields
    - Add `PromoCode` model with `id`, `code` (unique, uppercase), `trialDurationDays` (default 30), `createdAt`, `createdByAdminId` (FK to users)
    - Add `PromoCodeRedemption` model with `id`, `userId`, `promoCodeId`, `selectedTier`, `redeemedAt`, indexes on `userId` and `promoCodeId`
    - Add `trialTier` (String?), `trialExpiry` (DateTime?), `trialNotified7d` (Boolean, default false), `trialNotified1d` (Boolean, default false) fields to User model
    - Add relations: `User.promoCodesCreated`, `User.redemptions`, `PromoCode.redemptions`, `PromoCode.createdByAdmin`
    - Run `npx prisma migrate dev --name add-promo-code-trials`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 1.2 Implement `getEffectiveTier` shared utility in `server/src/utils/effective-tier.ts`
    - Export function that returns `trialTier` when non-null and `trialExpiry` is in the future, otherwise returns `membershipTier`
    - Export `TIER_HIERARCHY` constant: `{ standard: 0, player: 1, host: 2, facility: 3 }`
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 1.3 Write property tests for `getEffectiveTier`
    - **Property 1: Effective tier resolution**
    - **Validates: Requirements 9.1, 9.2**

- [x] 2. Backend promo code service
  - [x] 2.1 Implement `PromoCodeService` in `server/src/services/promo-code.ts`
    - `validate(code)`: lookup by `code.toUpperCase()`, return `{ valid: true, trialDurationDays }` or `{ valid: false, error: "Invalid promo code" }`
    - `redeem(userId, code, selectedTier)`: validate tier is one of player/host/facility, check re-redemption upgrade logic using `TIER_HIERARCHY`, set `trialTier`/`trialExpiry` on user, create redemption log, reset `trialNotified7d`/`trialNotified1d` to false, use Prisma `$transaction`
    - `create(code, trialDurationDays, adminId)`: store code uppercase, enforce unique constraint
    - `list()`: return all promo codes ordered by `createdAt` desc
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.2, 7.3_

  - [ ]* 2.2 Write property tests for PromoCodeService validation
    - **Property 2: Case-insensitive code validation**
    - **Property 3: Valid code returns success with duration**
    - **Property 4: Invalid code returns error**
    - **Validates: Requirements 2.2, 2.3, 2.4, 8.5**

  - [ ]* 2.3 Write property tests for PromoCodeService redemption
    - **Property 5: Redemption sets trial state and creates log**
    - **Property 6: Re-redemption with higher tier upgrades and resets expiry**
    - **Property 7: Multiple users can redeem the same code**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [x] 3. Backend API routes
  - [x] 3.1 Create user-facing promo code routes in `server/src/routes/promo-codes.ts`
    - `POST /api/promo-codes/validate` — accepts `{ code }`, calls `PromoCodeService.validate`, returns result
    - `POST /api/promo-codes/redeem` — accepts `{ code, selectedTier }`, calls `PromoCodeService.redeem` with user ID from `X-User-Id` header, returns updated user record with effective tier
    - Input validation: reject empty/whitespace codes (400), reject invalid tier values (400)
    - _Requirements: 2.1, 3.3, 4.6_

  - [x] 3.2 Add admin promo code endpoints to `server/src/routes/admin.ts`
    - `POST /api/admin/promo-codes` — admin-only, accepts `{ code, trialDurationDays? }`, calls `PromoCodeService.create`
    - `GET /api/admin/promo-codes` — admin-only, calls `PromoCodeService.list`
    - Check `req.headers['x-user-id']` user has role "admin", return 403 if not
    - _Requirements: 7.1, 7.2, 7.4_

  - [x] 3.3 Register promo code routes in `server/src/index.ts`
    - Import and mount `promoCodeRoutes` at `/api/promo-codes`
    - _Requirements: 2.1, 3.3_

  - [ ]* 3.4 Write property tests for admin route authorization
    - **Property 11: Admin-only access to promo code management**
    - **Property 12: Admin code creation stores all fields**
    - **Property 13: Unique code enforcement is case-insensitive**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Trial expiry job and notifications
  - [x] 5.1 Add notification methods to `NotificationService`
    - Add `static async notifyTrialExpiring7d(userId, trialTier, expiryDate)` to `server/src/services/NotificationService.ts`
    - Add `static async notifyTrialExpiring1d(userId, trialTier, expiryDate)` to `server/src/services/NotificationService.ts`
    - Follow existing pattern: queue notification with type, title, body, and data payload
    - _Requirements: 6.1, 6.2_

  - [x] 5.2 Implement `processTrialExpiry` job in `server/src/jobs/trial-expiry.ts`
    - Query users where `trialExpiry` is in the past and `trialTier` is not null → revert tier: if user has active `Subscription`, set `membershipTier` to subscription plan; otherwise set to "standard"; clear `trialTier`, `trialExpiry`, `trialNotified7d`, `trialNotified1d`
    - Query users where `trialExpiry` is exactly 7 days away (same calendar day) and `trialNotified7d` is false → send 7-day notification, set `trialNotified7d` to true
    - Query users where `trialExpiry` is exactly 1 day away (same calendar day) and `trialNotified1d` is false → send 1-day notification, set `trialNotified1d` to true
    - Log metrics: `usersChecked`, `trialsExpired`, `notificationsSent7d`, `notificationsSent1d`, `errors`
    - Wrap each user operation in try/catch — log error and continue processing remaining users
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4_

  - [x] 5.3 Register trial expiry job in `server/src/jobs/index.ts`
    - Import `processTrialExpiry` from `./trial-expiry`
    - Schedule with `cron.schedule('0 4 * * *', ...)` — daily at 04:00 UTC
    - Follow existing job registration pattern with logging and error handling
    - _Requirements: 5.1_

  - [ ]* 5.4 Write property tests for trial expiry job
    - **Property 8: Trial expiry reverts tier correctly**
    - **Property 9: Advance notifications sent at correct milestones**
    - **Property 10: No duplicate notifications**
    - **Validates: Requirements 5.2, 5.3, 5.4, 6.1, 6.2, 6.4**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Frontend screens and navigation
  - [x] 7.1 Add `RedeemCode` to `ProfileStackParamList` in `src/navigation/types.ts`
    - Add `RedeemCode: undefined` to the `ProfileStackParamList` type
    - _Requirements: 1.2_

  - [x] 7.2 Add RTK Query endpoints for promo code validation and redemption in `src/store/api.ts`
    - Add `validatePromoCode` mutation: `POST /promo-codes/validate` with `{ code }` body
    - Add `redeemPromoCode` mutation: `POST /promo-codes/redeem` with `{ code, selectedTier }` body, invalidates `['User']` tag
    - Export `useValidatePromoCodeMutation` and `useRedeemPromoCodeMutation` hooks
    - _Requirements: 2.1, 3.3_

  - [x] 7.3 Create `RedeemCodeScreen` in `src/screens/profile/RedeemCodeScreen.tsx`
    - Text input for promo code with submit button
    - On submit: call `validatePromoCode` mutation; show error inline if invalid
    - On valid code: show `TierSelector` section with Player, Host, Facility options — each with a description
    - On tier confirm: call `redeemPromoCode` mutation; on success navigate back to ProfileScreen with success feedback
    - Use theme tokens from `src/theme/` (`colors.chalkWarm` background, `colors.grass` primary, `fonts.heading`, `fonts.body`, `fonts.ui`)
    - Handle loading and error states
    - _Requirements: 1.2, 1.3, 2.1, 3.1, 3.2, 3.3_

  - [x] 7.4 Add "Redeem Code" row to `ProfileScreen`
    - Add a "Redeem Code" touchable row below the Sport Ratings section and above the Log Out button
    - On tap: navigate to `RedeemCode` screen
    - Style with theme tokens, use `Ionicons` icon (e.g., `gift-outline`)
    - _Requirements: 1.1_

  - [x] 7.5 Register `RedeemCodeScreen` in the Profile stack navigator
    - Import `RedeemCodeScreen` and add it as a screen in the Profile stack
    - _Requirements: 1.2_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The implementation follows existing codebase patterns: jobs mirror `event-cutoff.ts`, routes use `X-User-Id` auth, frontend uses RTK Query with theme tokens
