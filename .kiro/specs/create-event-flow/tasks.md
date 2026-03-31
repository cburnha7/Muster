# Implementation Plan: Create Event Flow

## Overview

Replace the existing `CreateEventScreen.tsx` (which uses `CreationWizard`) with a new five-screen full-screen progressive slide flow. Implementation proceeds bottom-up: shared types and context first, then the container, then each screen component, then backend endpoints, then wiring and integration.

## Tasks

- [x] 1. Create shared types and CreateEventContext with reducer
  - [x] 1.1 Create shared type definitions for the wizard
    - Create `src/screens/events/create-flow/types.ts`
    - Define `WizardState`, `WizardAction`, `SlotData`, `InviteItem`, `CourtForEvent`, `DateForCourt`, `SlotForDate` interfaces per design
    - Export initial state factory function
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Create CreateEventContext and wizard reducer
    - Create `src/screens/events/create-flow/CreateEventContext.tsx`
    - Implement `wizardReducer` handling all action types from the design (`SET_SPORT`, `SET_EVENT_TYPE`, `SET_FIELD`, `SET_FACILITY`, `SET_COURT`, `RESET_COURT`, `SET_DATE`, `TOGGLE_SLOT`, `SET_VISIBILITY`, `ADD_INVITE`, `REMOVE_INVITE`, `GO_TO_STEP`, `NEXT_STEP`, `PREV_STEP`, `SUBMIT_START`, `SUBMIT_SUCCESS`, `SUBMIT_FAIL`)
    - `SET_SPORT` must also dispatch `NEXT_STEP` (auto-advance from Screen 1)
    - `SET_FACILITY` must reset `courtId`, `selectedDate`, `selectedSlots` (Property 6)
    - `TOGGLE_SLOT` must enforce contiguous slot selection
    - Export `CreateEventProvider`, `useCreateEvent` hook
    - _Requirements: 1.2, 1.3, 2.2, 4.5_

  - [x] 1.3 Create step validation helper
    - Create `src/screens/events/create-flow/validation.ts`
    - Implement `canContinue(state: WizardState, step: number): boolean` per design validation rules
    - Step 0: always false (auto-advance, no Continue button)
    - Step 1: `eventType` is set (Property 4)
    - Step 2: `facilityId` and `courtId` are non-empty (Property 7)
    - Step 3: `selectedDate` non-empty and `selectedSlots.length >= 1` (Property 10)
    - Step 4: always true (invites are optional)
    - _Requirements: 3.9, 4.8, 5.10_

  - [ ]* 1.4 Write property tests for wizard reducer
    - **Property 2: Sport selection auto-advances to Step 2**
    - **Property 6: Ground change resets downstream selections**
    - Create `tests/properties/create-event-flow/wizard-reducer.property.test.ts`
    - Use `fast-check` with `fc.assert(fc.property(...), { numRuns: 100 })`
    - **Validates: Requirements 2.2, 4.5**

  - [ ]* 1.5 Write property tests for step validation
    - **Property 4: Step 2 Continue button requires event type**
    - **Property 7: Step 3 Continue button requires ground and court**
    - **Property 10: Step 4 Continue button requires date and slot**
    - Create `tests/properties/create-event-flow/wizard-validation.property.test.ts`
    - **Validates: Requirements 3.9, 4.8, 5.10**

- [x] 2. Create EventFlowContainer with slide animation and progress indicator
  - [x] 2.1 Create EventFlowContainer component
    - Create `src/screens/events/create-flow/EventFlowContainer.tsx`
    - Render full-screen view with no header bar or back arrow
    - Read `currentStep` from `CreateEventContext`
    - Render `WizardProgressDots` (existing component) with `current={currentStep}` and `total={5}` (Property 1)
    - Animate `translateX` on step transitions (200ms duration)
    - Render bottom-pinned button: hidden on Step 0 (sport auto-advance), "Continue" on Steps 1–3, "Create Event" on Step 4
    - Button enabled/disabled state driven by `canContinue(state, currentStep)`
    - Use `colors.cobalt` for active button background
    - Import colors from `src/theme/colors.ts` and fonts from `src/theme/typography.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.4, 7.5, 7.6_

  - [ ]* 2.2 Write property test for progress indicator
    - **Property 1: Progress indicator reflects current step**
    - Create `tests/properties/create-event-flow/progress-indicator.property.test.ts`
    - **Validates: Requirements 1.6**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Step 1 — Sport Selection (What?)
  - [x] 4.1 Create Step1Sport component
    - Create `src/screens/events/create-flow/Step1Sport.tsx`
    - Render `SportIconGrid` (existing component) with sport tiles showing emoji and label
    - On sport tile tap: dispatch `SET_SPORT` action (which auto-advances to Step 2 via reducer)
    - Highlight selected sport tile with `colors.cobalt` background
    - Do NOT render a Continue button on this screen
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Implement Step 2 — Event Details (How?)
  - [x] 5.1 Create Step2Details component
    - Create `src/screens/events/create-flow/Step2Details.tsx`
    - Render Event Type dropdown with options: Game, Practice, Pickup using `FormSelect`
    - Render Age Limit inputs (min age, max age) as numeric `TextInput` fields
    - Render Gender dropdown with options: All, Male, Female using `FormSelect`
    - Render Skill Level dropdown with available skill level options using `FormSelect`
    - Render Max Participants numeric input — label "Max Rosters" when eventType is Game, "Max Players" when Practice or Pickup (Property 3)
    - Render Price input prefixed with dollar sign ($)
    - Continue button enabled when `eventType` is set (handled by container via validation)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ]* 5.2 Write property test for Max Participants label
    - **Property 3: Max Participants label matches event type**
    - Create `tests/properties/create-event-flow/step2-details.property.test.ts`
    - **Validates: Requirements 3.6, 3.7**

- [x] 6. Implement Step 3 — Ground and Court Selection (Where?)
  - [x] 6.1 Create Step3Ground component
    - Create `src/screens/events/create-flow/Step3Ground.tsx`
    - Render searchable Ground dropdown listing available Grounds via `FormSelect`
    - On Ground selection: reveal Court dropdown below, dispatch `SET_FACILITY`
    - Court dropdown filtered by reservations (non-owner) or all available courts (owner) — data from new backend endpoint
    - On Ground change: reset court selection (dispatches `RESET_COURT` via `SET_FACILITY`)
    - Render persistent "Book Court Time" button that navigates to Grounds tab with `{ screen: 'FacilitiesList', params: { openSearch: true } }`
    - Continue enabled when both `facilityId` and `courtId` are set
    - Use "Ground" terminology (never "Facility" in UI labels)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 7.3_

- [x] 7. Implement Step 4 — Date and Time Selection (When?)
  - [x] 7.1 Create Step4When component
    - Create `src/screens/events/create-flow/Step4When.tsx`
    - Render Date dropdown showing available dates (filtered by ownership/reservations from backend)
    - On date selection: reveal Time slot selector below
    - Time slots filtered by ownership/reservations from backend
    - Enforce contiguous time slot selection (non-adjacent slots disabled)
    - Render Recurring toggle; when enabled, reveal Frequency dropdown (Weekly, Bi-Weekly, Monthly) and Series End Date input
    - Continue enabled when date + at least one slot selected
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

- [x] 8. Implement Step 5 — Visibility and Invitations (Who's Invited?)
  - [x] 8.1 Create Step5Invite component
    - Create `src/screens/events/create-flow/Step5Invite.tsx`
    - Render Private/Public side-by-side buttons, both unselected by default
    - On "Private" tap: reveal Invite_Search below
    - When eventType is Game + Private: search bar queries roster names only, display selected rosters without "Team A"/"Team B" labels (Property 11)
    - When eventType is Practice/Pickup + Private: unified search bar for both players and rosters, three-person icon for rosters, profile pic or single-person icon for players
    - On "Public" tap: reveal minimum player rating filter
    - "Create Event" button pinned at bottom (handled by container on Step 4)
    - On submit: collect all wizard data from Screens 1–5, call `eventService.createEvent` (Property 12)
    - On API error: display error message, stay on Step 5 (Property 13)
    - Use "Roster" and "Players" terminology (never "Team" or "Members")
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 7.1, 7.2_

  - [ ]* 8.2 Write property test for invite search entity types
    - **Property 11: Invite search entity types match event type**
    - Create `tests/properties/create-event-flow/invite-search.property.test.ts`
    - **Validates: Requirements 6.4, 6.6**

  - [ ]* 8.3 Write property test for submission payload
    - **Property 12: Event submission payload contains all wizard fields**
    - Create `tests/properties/create-event-flow/submit-payload.property.test.ts`
    - **Validates: Requirements 6.11**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement backend endpoints for reservation-aware filtering
  - [x] 10.1 Add `GET /facilities/:facilityId/courts-for-event` endpoint
    - Add route in `server/src/routes/facilities.ts`
    - Accept query params: `userId`, `sportType` (optional)
    - If user is facility owner: return all active courts with at least one available future time slot
    - If user is not owner: return only courts where user has a confirmed future `FacilityRental`
    - Return `CourtForEvent[]` shape with `availableSlotCount`
    - _Requirements: 4.3, 4.4_

  - [x] 10.2 Add `GET /facilities/:facilityId/courts/:courtId/dates` endpoint
    - Add route in `server/src/routes/facilities.ts`
    - Accept query params: `userId`
    - If user is facility owner: return all future dates with available slots on this court
    - If user is not owner: return only dates where user has a confirmed rental on this court
    - Return `DateForCourt[]` shape with `slotCount`
    - _Requirements: 5.2, 5.3_

  - [x] 10.3 Add `GET /facilities/:facilityId/courts/:courtId/slots` endpoint
    - Add route in `server/src/routes/facilities.ts`
    - Accept query params: `userId`, `date` (YYYY-MM-DD)
    - If user is facility owner: return all available time slots on this court for this date
    - If user is not owner: return only time slots where user has a confirmed rental
    - Return `SlotForDate[]` shape
    - _Requirements: 5.5, 5.6_

  - [ ]* 10.4 Write property tests for court filtering endpoint
    - **Property 5: Court filtering by ownership status**
    - Create `tests/properties/create-event-flow/court-filtering.property.test.ts`
    - **Validates: Requirements 4.3, 4.4**

  - [ ]* 10.5 Write property tests for date filtering endpoint
    - **Property 8: Date filtering by ownership status**
    - Create `tests/properties/create-event-flow/date-filtering.property.test.ts`
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 10.6 Write property tests for slot filtering endpoint
    - **Property 9: Time slot filtering by ownership status**
    - Create `tests/properties/create-event-flow/slot-filtering.property.test.ts`
    - **Validates: Requirements 5.5, 5.6**

- [x] 11. Wire frontend API calls to new backend endpoints
  - [x] 11.1 Add new methods to FacilityService
    - Add `getCourtsForEvent(facilityId, userId, sportType?)` method to `src/services/api/FacilityService.ts`
    - Add `getDatesForCourt(facilityId, courtId, userId)` method
    - Add `getSlotsForDate(facilityId, courtId, userId, date)` method
    - Add corresponding endpoint constants to `src/services/api/config.ts` under `API_ENDPOINTS.FACILITIES`
    - _Requirements: 4.3, 4.4, 5.2, 5.3, 5.5, 5.6_

  - [x] 11.2 Wire Step3Ground and Step4When to new API methods
    - Update `Step3Ground` to call `getCourtsForEvent` instead of bulk `getAvailableSlots`
    - Update `Step4When` to call `getDatesForCourt` and `getSlotsForDate`
    - Handle loading states and error states per design error handling table
    - _Requirements: 4.3, 4.4, 5.2, 5.3, 5.5, 5.6_

- [x] 12. Replace CreateEventScreen with new flow and integrate navigation
  - [x] 12.1 Create new CreateEventScreen entry point
    - Replace `src/screens/events/CreateEventScreen.tsx` with new implementation
    - Wrap `EventFlowContainer` with `CreateEventProvider`
    - Render all five step components inside the container
    - Render `WizardSuccessScreen` on successful submission
    - Ensure bottom tab bar remains visible throughout all screens
    - _Requirements: 1.1, 1.4, 1.5_

  - [ ]* 12.2 Write property test for brand vocabulary compliance
    - **Property 14: Brand vocabulary compliance**
    - Create `tests/properties/create-event-flow/brand-vocabulary.property.test.ts`
    - Scan rendered text for forbidden terms ("Team" for roster, "Members" for players, "Facility" for ground)
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [ ]* 12.3 Write unit tests for error handling and edge cases
    - Test API error displays error message and stays on Step 5 (Property 13)
    - Test contiguous slot selection enforcement
    - Test age validation (`minAge > maxAge`)
    - Test "Book Court Time" navigation target
    - Create `tests/screens/create-event-flow/create-event-flow.test.tsx`
    - **Validates: Requirements 6.12, 4.7**

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementation uses TypeScript/React Native
- Existing components reused: `SportIconGrid`, `FormSelect`, `WizardProgressDots`, `WizardSuccessScreen`
- `CreationWizard` is replaced by the new `EventFlowContainer`
