# Requirements Document

## Introduction

This feature extends the court booking flow in Muster to support bulk day booking and persistent multi-day, multi-court selections within a single transaction. Today, users select time slots for one court on one day and each slot is booked via an independent API call. This update introduces a "Book the Whole Day" toggle, cross-navigation selection persistence, a running selection summary, atomic multi-slot submission, conflict resolution, and grouped reservation display — all tied together by a new `bookingSessionId` on the rental record.

## Glossary

- **Ground**: A Facility in Muster that contains one or more Courts
- **Court**: A `FacilityCourt` — a bookable playing surface within a Ground
- **Slot**: A `FacilityTimeSlot` — a date + time range on a specific Court with a status of `available`, `blocked`, or `rented`
- **Rental**: A `FacilityRental` record created when a user books a Slot
- **Booking_Session**: A logical grouping of Rentals created in a single transaction, identified by `bookingSessionId`
- **Selection_Cart**: The in-memory collection of Slots the user has picked across Courts and days before confirming
- **Whole_Day_Toggle**: A UI toggle that auto-selects all available Slots for the current Court and day
- **Court_Availability_Screen**: The `CourtAvailabilityScreen` component where users pick Slots
- **Selection_Summary**: A persistent UI element showing the total count and cost of all Slots in the Selection_Cart
- **Conflict_Slot**: A Slot that was available at selection time but became unavailable before submission

## Requirements

### Requirement 1: Book the Whole Day Toggle — UI

**User Story:** As a user, I want a toggle to select all available time slots for a court on a given day, so that I can quickly book an entire day without tapping each slot individually.

#### Acceptance Criteria

1. THE Court_Availability_Screen SHALL display a "Book the Whole Day" toggle above the time slot grid, below the date selector
2. THE toggle SHALL default to the off position each time the user navigates to a new Court or day
3. WHEN the toggle is turned on, THE system SHALL add all Slots with status `available` for the currently selected Court and day to the Selection_Cart
4. WHEN the toggle is turned on, THE system SHALL skip Slots with status `blocked` or `rented` — these are not added to the Selection_Cart
5. WHEN the toggle is turned off, THE system SHALL remove all Slots for the current Court and day from the Selection_Cart, including any that were manually selected before the toggle was turned on
6. WHILE the toggle is on, THE individual Slot tap interaction SHALL remain functional — the user can deselect individual Slots, which turns the toggle off automatically

### Requirement 2: Persistent Selections Across Navigation

**User Story:** As a user, I want my selected time slots to persist when I switch between days or courts, so that I can build a booking across multiple days and courts without losing my selections.

#### Acceptance Criteria

1. WHEN the user changes the selected date on the calendar, THE Selection_Cart SHALL retain all previously selected Slots from other dates
2. WHEN the user changes the selected Court, THE Selection_Cart SHALL retain all previously selected Slots from other Courts
3. THE Court_Availability_Screen SHALL visually indicate which Slots on the current Court and day are already in the Selection_Cart when the user navigates back to a previously visited Court or day
4. WHEN the user leaves the Court_Availability_Screen entirely (navigates away from the screen), THE Selection_Cart SHALL be cleared

### Requirement 3: Selection Summary

**User Story:** As a user, I want to see a running summary of all my selected slots, so that I always know how many slots I'm about to book and the total cost.

#### Acceptance Criteria

1. THE Court_Availability_Screen SHALL display a sticky footer summary whenever the Selection_Cart contains one or more Slots
2. THE summary SHALL show the total number of Slots in the Selection_Cart across all Courts and days
3. THE summary SHALL show the total price of all Slots in the Selection_Cart
4. THE summary SHALL show the number of distinct Courts represented in the Selection_Cart
5. THE summary SHALL show the number of distinct days represented in the Selection_Cart
6. THE summary SHALL include a "Book N Slots" button that opens the confirmation flow
7. WHEN the Selection_Cart is empty, THE sticky footer SHALL be hidden

### Requirement 4: Confirmation Flow — Multi-Slot Review

**User Story:** As a user, I want to review all my selected slots grouped by court and day before confirming, so that I can verify my booking before committing.

#### Acceptance Criteria

1. WHEN the user taps the "Book N Slots" button, THE system SHALL display a confirmation view listing all Slots in the Selection_Cart grouped by Court, then by date within each Court
2. THE confirmation view SHALL show the Court name, date, time range, and price for each Slot
3. THE confirmation view SHALL show the grand total price at the bottom
4. THE confirmation view SHALL include a "Confirm Booking" button and a "Cancel" button

### Requirement 5: Single Transaction Submission

**User Story:** As a user, I want all my selected slots to be booked in a single transaction, so that either all succeed or I can handle failures cleanly.

#### Acceptance Criteria

1. WHEN the user confirms the booking, THE system SHALL submit all Slots in the Selection_Cart to a new backend endpoint `POST /api/rentals/bulk` in a single HTTP request
2. THE backend SHALL process all Slot bookings within a single database transaction
3. THE backend SHALL generate a unique `bookingSessionId` (UUID) and assign it to every `FacilityRental` record created in the transaction
4. THE backend SHALL verify each Slot is still `available` before creating the Rental — if a Slot's status has changed, it is flagged as a Conflict_Slot
5. IF all Slots are still available, THEN THE backend SHALL create all Rentals, update all Slot statuses to `rented`, and return a success response with the `bookingSessionId` and all created Rental records
6. IF one or more Conflict_Slots are detected, THEN THE backend SHALL NOT create any Rentals and SHALL return a conflict response listing the Conflict_Slots

### Requirement 6: Conflict Resolution

**User Story:** As a user, I want to know which slots became unavailable and decide whether to proceed with the remaining slots, so that I don't lose my entire booking due to a few conflicts.

#### Acceptance Criteria

1. WHEN the backend returns a conflict response, THE Court_Availability_Screen SHALL display a conflict dialog listing the Conflict_Slots with their Court name, date, and time
2. THE conflict dialog SHALL offer two options: "Book Available Slots" (proceed without the Conflict_Slots) and "Cancel" (abandon the entire booking)
3. WHEN the user chooses "Book Available Slots", THE system SHALL resubmit only the non-conflicting Slots to `POST /api/rentals/bulk`
4. WHEN the user chooses "Cancel", THE system SHALL return to the Court_Availability_Screen with the Selection_Cart intact so the user can adjust

### Requirement 7: Database Schema — bookingSessionId

**User Story:** As a developer, I need a field to link rentals from the same bulk booking transaction, so that the system can group and display them together.

#### Acceptance Criteria

1. THE `FacilityRental` model SHALL include a nullable `bookingSessionId` field of type String
2. THE `bookingSessionId` SHALL be indexed for query performance
3. WHEN a bulk booking is created, THE backend SHALL assign the same UUID to `bookingSessionId` on all Rentals in the transaction
4. WHEN a single-slot booking is created via the existing endpoint, THE `bookingSessionId` SHALL be null (backward compatible)

### Requirement 8: My Reservations — Grouped Display

**User Story:** As a user, I want to see reservations from the same booking session grouped together in My Reservations, so that I can tell which slots were booked together.

#### Acceptance Criteria

1. WHEN displaying reservations in the MyReservationsSection, THE system SHALL group Rentals that share the same non-null `bookingSessionId` under a single collapsible header
2. THE group header SHALL show the booking date, total number of slots in the session, and total price
3. WHEN expanded, THE group SHALL list each individual Rental with its Court name, date, and time
4. Rentals with a null `bookingSessionId` (single bookings) SHALL continue to display as individual entries with no grouping
5. THE existing cancellation flow SHALL continue to work on individual Rentals within a group — cancelling one Rental does not cancel the others in the same session

### Requirement 9: Backend — Bulk Rental Endpoint

**User Story:** As a developer, I need a bulk rental API endpoint that atomically books multiple slots across courts and days.

#### Acceptance Criteria

1. THE system SHALL expose `POST /api/rentals/bulk` accepting a JSON body with `userId` (string) and `slots` (array of `{ facilityId, courtId, slotId }`)
2. THE endpoint SHALL validate that all `slotId` values exist and belong to the specified `courtId` and `facilityId`
3. THE endpoint SHALL reject the request with HTTP 400 if the `slots` array is empty
4. THE endpoint SHALL reject the request with HTTP 400 if `userId` is missing
5. THE endpoint SHALL reject past-dated Slots with HTTP 400
6. IF all Slots are available, THE endpoint SHALL return HTTP 201 with `{ bookingSessionId, rentals: [...] }`
7. IF any Slots have conflicts, THE endpoint SHALL return HTTP 409 with `{ conflicts: [{ slotId, courtId, courtName, date, startTime, endTime, reason }], availableSlots: [{ slotId, courtId, ... }] }`

