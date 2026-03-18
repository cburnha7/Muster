# Implementation Plan: Reservation Cancellation Policy

## Overview

Add a configurable cancellation policy system to grounds. Ground owners set a cancellation window (hours). Cancellations outside the window are automatic with full Stripe refund. Cancellations inside the window create a cancel request routed to the ground owner for approval/denial on the Home Screen.

## Tasks

- [x] 1. Database schema and migration
  - [x] 1.1 Update Prisma schema and generate migration
    - Add `cancellationPolicyHours Int?` column to the `Facility` model in `server/prisma/schema.prisma`
    - Add `cancellationStatus String?` to `FacilityRental` model if not already present (allowed values: null, "pending", "approved", "denied")
    - Create `CancelRequest` model with fields: `id` (UUID), `status` (String, default "pending"), `requestedAt` (DateTime), `resolvedAt` (DateTime?), `userId`, `reservationId`, `groundId`
    - Add relations: `CancelRequest` → `User`, `FacilityRental`, `Facility` with `onDelete: Cascade`
    - Add `@@unique([reservationId, status])` and `@@index([groundId, status])`, `@@index([userId])` on `CancelRequest`
    - Add `@@map("cancel_requests")` to `CancelRequest`
    - Add `cancelRequests CancelRequest[]` relation on `User`, `FacilityRental`, and `Facility` models
    - Run `npx prisma migrate dev --name add-cancellation-policy` to generate and apply migration
    - Add data migration SQL to update existing `cancellationStatus = 'pending_cancellation'` rows to `'pending'`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Cancellation window service (pure function)
  - [x] 2.1 Create `server/src/services/cancellation-window.ts`
    - Export `WindowResult` type: `'inside' | 'outside'`
    - Export `ALLOWED_POLICY_HOURS` constant: `[0, 12, 24, 48, 72]`
    - Export `isValidPolicyHours(value: unknown): boolean` — returns true if value is null or one of the allowed integers
    - Export `evaluateCancellationWindow(currentTime: Date, bookingStartTime: Date, cancellationPolicyHours: number | null): WindowResult`
    - If `cancellationPolicyHours` is null → return `'outside'`
    - Compute boundary: `bookingStartTime.getTime() - cancellationPolicyHours * 60 * 60 * 1000`
    - If `currentTime.getTime() < boundary` → return `'outside'`, else → return `'inside'`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 2.2 Write property tests for cancellation policy validation
    - **Property 1: Cancellation policy hours validation**
    - **Validates: Requirements 1.3, 1.4**
    - Test file: `server/src/services/__tests__/cancellation-window.test.ts`
    - Use fast-check to generate arbitrary integers and verify `isValidPolicyHours` accepts only `[null, 0, 12, 24, 48, 72]`

  - [ ]* 2.3 Write property tests for window calculator
    - **Property 2: Window calculator correctness**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
    - Test file: `server/src/services/__tests__/cancellation-window.test.ts`
    - Use fast-check to generate random `currentTime`, `bookingStartTime`, and `cancellationPolicyHours` values
    - Verify: null policy → always `'outside'`
    - Verify: `currentTime < bookingStart - policyHours` → `'outside'`, otherwise → `'inside'`
    - Verify: deterministic (same inputs → same output)

- [x] 3. Cancel request service
  - [x] 3.1 Create `server/src/services/cancel-request.ts`
    - Export `createCancelRequest(rentalId, userId, prismaClient)` — creates a CancelRequest with status "pending", updates rental `cancellationStatus` to "pending", validates no existing pending request
    - Export `approveCancelRequest(cancelRequestId, ownerId, prismaClient)` — in a transaction: update CancelRequest to "approved" with `resolvedAt`, update rental to "cancelled" with `cancellationStatus = "approved"` and `cancelledAt`, set time slot to "available", issue Stripe refund with idempotency key, create notification for user
    - Export `denyCancelRequest(cancelRequestId, ownerId, prismaClient)` — update CancelRequest to "denied" with `resolvedAt`, update rental `cancellationStatus` to "denied", create notification for user
    - Validate ownership: only the ground owner can approve/deny
    - Validate state: reject if cancel request already resolved
    - Use Stripe refund pattern from `server/src/services/public-event-escrow.ts` with idempotency key `{rentalId}:refund`
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 3.2 Write property tests for cancel request creation
    - **Property 5: Cancel request creation invariants**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Test file: `server/src/services/__tests__/cancel-request.test.ts`
    - Use mocked Prisma client; verify CancelRequest fields and rental `cancellationStatus` update

  - [ ]* 3.3 Write property test for duplicate prevention
    - **Property 6: Duplicate cancel request prevention**
    - **Validates: Requirements 3.5**
    - Test file: `server/src/services/__tests__/cancel-request.test.ts`
    - Verify second request for same rental with pending status is rejected

  - [ ]* 3.4 Write property tests for approval flow
    - **Property 3: Automatic cancellation state invariants**
    - **Property 4: Full Stripe refund on completed cancellation**
    - **Property 8: Approval state transitions**
    - **Property 9: Approval triggers user notification**
    - **Validates: Requirements 2.2, 2.3, 2.5, 2.4, 5.1, 5.2, 5.3, 5.4, 5.6**
    - Test file: `server/src/services/__tests__/cancel-request.test.ts`
    - Verify: after approval, CancelRequest status is "approved", rental is "cancelled", slot is "available", Stripe refund called, notification created

  - [ ]* 3.5 Write property tests for denial flow
    - **Property 7: Pending cancel request preserves reservation state**
    - **Property 10: Denial state transitions**
    - **Property 11: Denial triggers user notification**
    - **Validates: Requirements 3.6, 6.1, 6.2, 6.3, 6.4**
    - Test file: `server/src/services/__tests__/cancel-request.test.ts`
    - Verify: after denial, CancelRequest status is "denied", rental remains "confirmed", `cancellationStatus` is "denied", notification created

- [x] 4. Checkpoint — Backend services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Cancel request API routes
  - [x] 5.1 Create `server/src/routes/cancel-requests.ts`
    - `GET /cancel-requests/pending` — fetch pending cancel requests for the authenticated owner's grounds, include user name, reservation details (date, time, court name, facility name, totalPrice)
    - `POST /cancel-requests/:id/approve` — call `approveCancelRequest`, return updated cancel request
    - `POST /cancel-requests/:id/deny` — call `denyCancelRequest`, return updated cancel request
    - All routes require authentication middleware
    - Register routes in `server/src/index.ts`
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.7, 6.1, 6.5_

  - [x] 5.2 Modify `DELETE /rentals/:rentalId` in `server/src/routes/rentals.ts`
    - After fetching the rental, also fetch the facility's `cancellationPolicyHours`
    - Call `evaluateCancellationWindow(new Date(), slotStartTime, cancellationPolicyHours)`
    - If `'outside'` → proceed with existing immediate cancellation logic + add Stripe refund
    - If `'inside'` → call `createCancelRequest()` and return `{ pendingApproval: true, cancelRequest }` response
    - Handle error cases: rental not found (404), not owner (403), already cancelled (400), already pending (400)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 5.3 Modify facility create/update in `server/src/routes/facilities.ts`
    - Accept `cancellationPolicyHours` in request body for create and update endpoints
    - Validate value is null or one of `[0, 12, 24, 48, 72]` using `isValidPolicyHours`
    - Return 400 with "Invalid cancellation policy value" if validation fails
    - Persist value to the facility record
    - _Requirements: 1.5, 1.6_

  - [ ]* 5.4 Write unit tests for cancel request routes
    - Test `GET /cancel-requests/pending` returns correct shape and filters by owner
    - Test `POST /cancel-requests/:id/approve` returns 200 on success, 403 for non-owner, 400 for already resolved
    - Test `POST /cancel-requests/:id/deny` returns 200 on success, 403 for non-owner, 400 for already resolved
    - Test modified `DELETE /rentals/:rentalId` returns automatic cancellation outside window and pending response inside window
    - Test file: `server/src/routes/__tests__/cancel-requests.test.ts`
    - _Requirements: 2.1, 2.2, 3.1, 5.1, 6.1_

- [x] 6. Checkpoint — Backend API complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. CancellationPolicyPicker component
  - [x] 7.1 Create `src/components/facilities/CancellationPolicyPicker.tsx`
    - Render a picker/selector with options: "None" (null), "0 hours", "12 hours", "24 hours", "48 hours", "72 hours"
    - Accept `value: number | null` and `onChange: (value: number | null) => void` props
    - Use theme tokens: `colors`, `fonts.label` for option labels, `fonts.ui` for selected state
    - Include accessible labels for each option
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 7.2 Integrate CancellationPolicyPicker into ground create/edit screens
    - Add `CancellationPolicyPicker` to the ground create screen with label "Cancellation Policy"
    - Add `CancellationPolicyPicker` to the ground edit screen, pre-populated with current value
    - Wire picker value into form submission payload as `cancellationPolicyHours`
    - _Requirements: 1.1, 1.2, 1.5, 1.6_

  - [ ]* 7.3 Write unit tests for CancellationPolicyPicker
    - Verify all 6 options render (None, 0h, 12h, 24h, 48h, 72h)
    - Verify onChange fires with correct value on selection
    - Test file: `src/components/facilities/__tests__/CancellationPolicyPicker.test.tsx`
    - _Requirements: 1.3, 1.4_

- [x] 8. CancelRequestCard component
  - [x] 8.1 Create `src/components/home/CancelRequestCard.tsx`
    - Display requesting user's name, court/field name, booking date and time
    - Render "Approve" button (`colors.grass` background, `fonts.ui`) and "Deny" button (`colors.track` background, `fonts.ui`)
    - Accept `cancelRequest` data prop and `onApprove`/`onDeny` callbacks
    - Use `fonts.label` for card text, theme spacing and shadows
    - _Requirements: 4.3, 4.4_

  - [ ]* 8.2 Write property test for CancelRequestCard
    - **Property 12: Cancel request card displays all required fields**
    - **Validates: Requirements 4.3**
    - Test file: `src/components/home/__tests__/CancelRequestCard.test.tsx`
    - Use fast-check to generate cancel request data objects and verify all fields render

- [x] 9. RTK Query API slice for cancel requests
  - [x] 9.1 Create `src/store/api/cancelRequestsApi.ts`
    - Define `cancelRequestsApi` using `createApi` from RTK Query
    - `useGetPendingCancelRequestsQuery` — `GET /cancel-requests/pending`
    - `useApproveCancelRequestMutation` — `POST /cancel-requests/:id/approve`
    - `useDenyCancelRequestMutation` — `POST /cancel-requests/:id/deny`
    - Register the API slice in `src/store/store.ts`
    - _Requirements: 4.1, 5.1, 6.1_

- [x] 10. HomeScreen cancel requests section
  - [x] 10.1 Modify `src/screens/home/HomeScreen.tsx`
    - Import `useGetPendingCancelRequestsQuery` from the new API slice
    - Add "Cancel Requests" section after the existing notification sections (order: Live Events, Upcoming, Debrief, Invitations, Pending Leagues, Cancel Requests)
    - Render `CancelRequestCard` for each pending request
    - Wire Approve/Deny buttons to `useApproveCancelRequestMutation` / `useDenyCancelRequestMutation`
    - Hide the section when no pending cancel requests exist
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.7, 6.5_

  - [ ]* 10.2 Write unit tests for HomeScreen cancel requests section
    - Verify "Cancel Requests" section renders when pending requests exist
    - Verify section is hidden when no pending requests
    - Verify section ordering matches requirement
    - Test file: `src/screens/home/__tests__/HomeScreen.test.tsx`
    - _Requirements: 4.1, 4.2, 4.5_

- [x] 11. MyRentalsScreen cancellation flow updates
  - [x] 11.1 Modify `src/screens/facilities/MyRentalsScreen.tsx`
    - Show "Cancellation Pending" badge on rentals with `cancellationStatus === 'pending'` (use `colors.court` background, `fonts.label`)
    - Disable the cancel button while `cancellationStatus === 'pending'`
    - Remove the "Cancellation Pending" badge when `cancellationStatus` changes to "denied"
    - Remove the rental from the list when `cancellationStatus` changes to "approved" (rental is cancelled)
    - Update the cancel action to handle the new API response: show confirmation for automatic cancellation, show "Cancellation request submitted" message for pending approval
    - _Requirements: 3.4, 3.5, 2.6, 5.5, 6.6_

  - [ ]* 11.2 Write unit tests for MyRentalsScreen cancellation badges
    - Verify "Cancellation Pending" badge renders for pending status
    - Verify cancel button is disabled when pending
    - Verify badge removed after denial
    - Test file: `src/screens/facilities/__tests__/MyRentalsScreen.test.tsx`
    - _Requirements: 3.4, 6.6_

- [x] 12. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check (already in dev dependencies)
- Stripe refund pattern follows `server/src/services/public-event-escrow.ts`
- Brand vocabulary: "Ground" not "Facility" in UI, "Cancel" for abandoning bookings
- All UI must use theme tokens from `src/theme/`
- Checkpoints ensure incremental validation
