# Implementation Plan: Dependent Accounts

## Overview

Implement dependent account management for guardians: Prisma schema changes, backend services and routes, auth middleware extension for context switching, nightly age-check job, and six frontend screens/components wired into the existing Profile flow. Each task builds incrementally — schema first, then services, then routes, then frontend — ending with integration wiring.

## Tasks

- [x] 1. Database schema and types
  - [x] 1.1 Add dependent fields to Prisma User model and run migration
    - Add `isDependent Boolean @default(false)`, `guardianId String?`, `transferNotificationSent Boolean @default(false)` to User model
    - Add self-referential relation `guardian User? @relation("GuardianDependents", fields: [guardianId], references: [id])` and `dependents User[] @relation("GuardianDependents")`
    - Make `email` field nullable (`String?`) to support dependents with no credentials
    - Generate and run Prisma migration
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 1.2 Create shared TypeScript types for dependents
    - Create `src/types/dependent.ts` with `CreateDependentInput`, `UpdateDependentInput`, `TransferCredentials`, `DependentSummary`, `DependentProfile` interfaces
    - Create corresponding server-side types in `server/src/types/dependent.ts`
    - _Requirements: 1.1, 4.1, 8.1_

- [x] 2. Age validation utility
  - [x] 2.1 Implement age calculation utility
    - Create `server/src/utils/age-validation.ts` with `calculateAge(dateOfBirth: Date): number` and `isUnder18(dateOfBirth: Date): boolean` functions
    - Handle edge cases: exact 18th birthday, leap year birthdays
    - Export a shared `validateDependentAge` function used by create, edit, and transfer flows
    - _Requirements: 1.3, 4.2, 8.5_

  - [ ]* 2.2 Write property test for age validation boundary (Property 2)
    - **Property 2: Age validation boundary**
    - Generate random dates spanning ±2 years around the 18-year boundary using fast-check
    - Verify `isUnder18` returns true iff DOB is after exactly 18 years ago from today
    - Test file: `server/src/utils/__tests__/age-validation.property.test.ts`
    - **Validates: Requirements 1.3, 4.2, 8.5**

  - [ ]* 2.3 Write unit tests for age calculation
    - Test exact boundary (18th birthday today, day before, day after), leap year birthdays, future DOB
    - Test file: `server/src/utils/__tests__/age-validation.test.ts`
    - _Requirements: 1.3, 4.2, 8.5_

- [x] 3. Checkpoint — Ensure schema and utilities are solid
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Backend DependentService
  - [x] 4.1 Implement DependentService
    - Create `server/src/services/dependent.ts` with `createDependent`, `listDependents`, `getDependentProfile`, `updateDependent` methods
    - `createDependent`: validate age < 18, create User with `isDependent=true`, `guardianId`, null email/password
    - `listDependents`: query User where `guardianId` matches and `isDependent=true`
    - `getDependentProfile`: return dependent's stats, sport ratings, event history, Salutes, Roster memberships, League memberships
    - `updateDependent`: validate ownership, validate age < 18 on DOB change, update fields
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

  - [ ]* 4.2 Write property test for dependent creation invariants (Property 1)
    - **Property 1: Dependent creation invariants**
    - Generate random valid names, DOBs (age 0–17), sport preference arrays with fast-check
    - Verify resulting User has `isDependent=true`, correct `guardianId`, `email=null`, `password=null`
    - Test file: `server/src/services/__tests__/dependent.property.test.ts`
    - **Validates: Requirements 1.2, 1.5, 10.5, 10.7**

  - [ ]* 4.3 Write property test for list dependents completeness (Property 3)
    - **Property 3: List dependents completeness**
    - Generate random guardian with 0–10 dependents, verify list returns exact set of IDs
    - Test file: `server/src/services/__tests__/dependent.property.test.ts`
    - **Validates: Requirements 2.1, 5.2**

  - [ ]* 4.4 Write property test for dependent profile data scoping (Property 4)
    - **Property 4: Dependent profile data scoping**
    - Generate dependent with mixed records, verify all returned records belong to dependent only
    - Test file: `server/src/services/__tests__/dependent.property.test.ts`
    - **Validates: Requirements 3.2**

  - [ ]* 4.5 Write property test for dependent update round-trip (Property 5)
    - **Property 5: Dependent update round-trip**
    - Generate random valid update payloads, verify read-after-write equality
    - Test file: `server/src/services/__tests__/dependent.property.test.ts`
    - **Validates: Requirements 4.3**

  - [ ]* 4.6 Write unit tests for DependentService
    - Test creation validation (missing fields, age ≥ 18 rejection, empty name)
    - Test list returns correct dependents and empty state
    - Test update ownership check and DOB validation
    - Test file: `server/src/services/__tests__/dependent.test.ts`
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 4.2, 4.3_

- [x] 5. Backend TransferService
  - [x] 5.1 Implement TransferService
    - Create `server/src/services/transfer.ts` with `transferAccount` method
    - Validate dependent is 18 or older, validate email uniqueness, hash password with bcrypt
    - Set `isDependent=false`, clear `guardianId`, set email and hashed password on User record
    - All existing relations (bookings, events, Salutes, Rosters, Leagues, ratings) remain untouched — in-place mutation preserves FK references
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 5.2 Write property test for transfer preserves history (Property 8)
    - **Property 8: Transfer produces independent account with preserved history**
    - Generate dependents with varying history counts, verify counts unchanged after transfer
    - Test file: `server/src/services/__tests__/transfer.property.test.ts`
    - **Validates: Requirements 8.2, 8.3, 8.4**

  - [ ]* 5.3 Write unit tests for TransferService
    - Test under-18 rejection, duplicate email rejection, weak password rejection, successful transfer fields
    - Test file: `server/src/services/__tests__/transfer.test.ts`
    - _Requirements: 8.1, 8.2, 8.5_

- [x] 6. Auth middleware extension for active context
  - [x] 6.1 Extend auth middleware to support X-Active-User-Id header
    - Modify existing auth middleware to read optional `X-Active-User-Id` header
    - When header present and differs from JWT user: verify target user has `guardianId === jwtUserId` and `isDependent === true`
    - Set `req.effectiveUserId` to validated active user ID; downstream handlers use `req.effectiveUserId`
    - When header absent or matches JWT user: `req.effectiveUserId = req.user.userId` (unchanged behavior)
    - Return 403 for invalid/unauthorized context headers
    - _Requirements: 5.3, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 6.2 Write property test for action scoping to active context (Property 7)
    - **Property 7: Action scoping to active context**
    - Generate random guardian + dependent pairs, verify `req.effectiveUserId` resolves correctly
    - Test file: `server/src/middleware/__tests__/active-context.property.test.ts`
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

  - [ ]* 6.3 Write unit tests for auth middleware context extension
    - Test missing header (falls through to JWT user), valid dependent header, invalid dependent header, non-dependent user header, non-existent user header
    - Test file: `server/src/middleware/__tests__/active-context.test.ts`
    - _Requirements: 5.3, 5.5, 7.1_

- [x] 7. Checkpoint — Ensure backend services and middleware are working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Backend API routes for dependents
  - [x] 8.1 Create dependent API routes
    - Create `server/src/routes/dependents.ts` with five endpoints:
      - `POST /api/dependents` — calls `DependentService.createDependent`
      - `GET /api/dependents` — calls `DependentService.listDependents`
      - `GET /api/dependents/:id` — calls `DependentService.getDependentProfile`
      - `PUT /api/dependents/:id` — calls `DependentService.updateDependent`
      - `POST /api/dependents/:id/transfer` — calls `TransferService.transferAccount`
    - Add request validation middleware for each endpoint
    - Register routes in `server/src/index.ts`
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 8.1_

  - [ ]* 8.2 Write route integration tests
    - Test all five endpoints with valid and invalid inputs
    - Test authorization (guardian can only access own dependents)
    - Test file: `server/src/routes/__tests__/dependents.test.ts`
    - _Requirements: 1.2, 1.3, 2.1, 3.1, 4.2, 8.1, 8.5_

- [x] 9. Age check job and transfer notifications
  - [x] 9.1 Implement AgeCheckJob
    - Create `server/src/jobs/age-check.ts` with `processAgeCheck` function
    - Query dependents where `isDependent=true`, DOB yields age ≥ 18, and `transferNotificationSent=false`
    - For each eligible dependent: send notification to guardian via NotificationService, set `transferNotificationSent=true`
    - Return metrics (processed count, notified count)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 9.2 Write property test for age check notification correctness (Property 9)
    - **Property 9: Age check job notification correctness**
    - Generate random sets of dependents with varying ages and notification states
    - Verify notifications sent for exactly those with age ≥ 18 and `transferNotificationSent=false`
    - Test file: `server/src/jobs/__tests__/age-check.property.test.ts`
    - **Validates: Requirements 9.1**

  - [ ]* 9.3 Write property test for age check idempotence (Property 10)
    - **Property 10: Age check job idempotence**
    - Generate random eligible dependents, run job twice, verify second run produces 0 notifications
    - Test file: `server/src/jobs/__tests__/age-check.property.test.ts`
    - **Validates: Requirements 9.4**

  - [ ]* 9.4 Write unit tests for AgeCheckJob
    - Test no dependents, all under 18, mix of eligible and already-notified, empty database
    - Test file: `server/src/jobs/__tests__/age-check.test.ts`
    - _Requirements: 9.1, 9.2, 9.4_

- [x] 10. Checkpoint — Ensure all backend work is complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Redux context slice and hooks
  - [x] 11.1 Create contextSlice and useActiveUserId hook
    - Create `src/store/slices/contextSlice.ts` with `ContextState` (`activeUserId`, `dependents` array)
    - Implement actions: `setActiveUser`, `setDependents`, `resetContext`
    - Create `src/hooks/useActiveUserId.ts` hook that reads `activeUserId` from contextSlice
    - Wire contextSlice into the existing Redux store configuration
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 11.2 Write property test for context switch preserves auth (Property 6)
    - **Property 6: Context switch preserves auth and changes active user**
    - Generate random sequences of context switches with fast-check
    - Verify auth state (JWT, guardian user) remains unchanged while `activeUserId` updates correctly
    - Test file: `tests/store/contextSlice.property.test.ts`
    - **Validates: Requirements 5.3, 5.4, 5.5, 6.3**

  - [ ]* 11.3 Write unit tests for contextSlice
    - Test initial state, setActiveUser, setDependents, resetContext actions
    - Test useActiveUserId hook returns correct value
    - Test file: `tests/store/contextSlice.test.ts`
    - _Requirements: 5.3, 5.4, 5.5_

- [x] 12. API integration — attach X-Active-User-Id header
  - [x] 12.1 Update API client to include X-Active-User-Id header
    - Modify the existing API service/RTK Query base query to read `activeUserId` from Redux store
    - Attach `X-Active-User-Id` header to all outgoing requests when `activeUserId` differs from the authenticated user's ID
    - _Requirements: 5.3, 5.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 13. Frontend screens and components
  - [x] 13.1 Create DependentsSection component
    - Create `src/components/profile/DependentsSection.tsx`
    - Display list of dependents (name + avatar/placeholder) fetched from `GET /api/dependents`
    - Show empty state message when no dependents exist
    - Include "Add Dependent" button that navigates to DependentFormScreen
    - Tapping a dependent navigates to DependentProfileScreen
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 13.2 Create DependentFormScreen
    - Create `src/screens/profile/DependentFormScreen.tsx`
    - Form fields: first name, last name, date of birth (with date picker), sport preferences, profile image
    - Client-side age validation (must be under 18)
    - Support both create mode (no `dependentId` param) and edit mode (`dependentId` param pre-fills form)
    - On submit: `POST /api/dependents` for create, `PUT /api/dependents/:id` for edit
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3_

  - [x] 13.3 Create DependentProfileScreen
    - Create `src/screens/profile/DependentProfileScreen.tsx`
    - Fetch and display dependent's stats, sport ratings, event history, Salutes, Roster memberships, League memberships via `GET /api/dependents/:id`
    - Display sport ratings using the same format as the guardian's SportRatingsSection
    - Include edit button navigating to DependentFormScreen in edit mode
    - Include transfer button (enabled only when dependent is 18+) navigating to TransferAccountScreen
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 8.1_

  - [x] 13.4 Create TransferAccountScreen
    - Create `src/screens/profile/TransferAccountScreen.tsx`
    - Form fields: email address, password, confirm password
    - Client-side validation: email format, password strength (min 8 chars), password match
    - On submit: `POST /api/dependents/:id/transfer`
    - On success: navigate back to profile, show success toast, remove dependent from context
    - _Requirements: 8.1, 8.2, 8.4_

  - [x] 13.5 Create ContextSwitcher component
    - Create `src/components/profile/ContextSwitcher.tsx`
    - Display current active user (name + avatar) on ProfileScreen
    - On tap: show bottom sheet or dropdown listing guardian's own account and all dependents
    - On selection: dispatch `setActiveUser` action to contextSlice
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 13.6 Create ContextIndicator component
    - Create `src/components/navigation/ContextIndicator.tsx`
    - Persistent badge visible at all times when guardian has ≥ 1 dependent
    - Show active user's name or avatar
    - Visually distinguish dependent context from guardian context (different badge/label)
    - Update immediately when active context changes (reads from contextSlice)
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 13.7 Write component tests for DependentsSection
    - Test renders list of dependents, renders empty state, "Add Dependent" button navigates
    - Test file: `tests/components/profile/DependentsSection.test.tsx`
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 13.8 Write component tests for ContextSwitcher and ContextIndicator
    - Test ContextSwitcher shows guardian + dependents, selection dispatches Redux action
    - Test ContextIndicator shows correct name, distinguishes dependent vs guardian context
    - Test file: `tests/components/profile/ContextSwitcher.test.tsx`, `tests/components/navigation/ContextIndicator.test.tsx`
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3_

- [x] 14. Navigation and ProfileScreen integration
  - [x] 14.1 Add navigation routes and wire into ProfileScreen
    - Add `DependentForm`, `DependentProfile`, `TransferAccount` to `ProfileStackParamList` in `src/navigation/types.ts`
    - Register new screens in the Profile stack navigator
    - Add DependentsSection and ContextSwitcher to ProfileScreen
    - Add ContextIndicator to the tab bar or header navigation
    - _Requirements: 1.1, 2.1, 5.1, 6.1_

- [x] 15. Context recovery and error handling
  - [x] 15.1 Implement context recovery middleware
    - Add Redux middleware or RTK Query error handler that detects 403 responses when active context is a dependent
    - On 403: reset `activeUserId` to guardian's own ID, show brief toast notification
    - Handle edge case where transferred dependent is still set as active context
    - _Requirements: 5.3, 8.4_

- [x] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The design uses in-place mutation for account transfer, so no data migration is needed — all FK references are preserved automatically
