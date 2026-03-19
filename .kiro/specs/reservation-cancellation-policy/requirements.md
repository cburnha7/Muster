# Requirements Document — Reservation Cancellation Policy

## Introduction

This feature adds a configurable cancellation policy system to grounds in Muster. Ground owners set a cancellation window (in hours) on their ground. When a user cancels a reservation, the system checks whether the cancellation falls inside or outside that window. Outside the window, cancellation is automatic with a full Stripe refund. Inside the window, a cancel request is created and routed to the ground owner for approval or denial. Cancel requests appear on the owner's home screen alongside existing notification lists.

## Glossary

- **Ground**: A bookable sports facility (maps to the `Facility` model in the database). Never use "Facility" in user-facing UI.
- **Reservation**: A confirmed rental of a court/field time slot (maps to the `FacilityRental` model). Displayed in the user's My Reservations list.
- **Cancellation_Policy**: A ground-level setting defining the number of hours before a booking start time within which cancellations require owner approval.
- **Cancellation_Window**: The time period before a booking's start time, measured in hours, defined by the ground's Cancellation_Policy. Inside the window means the booking starts within that many hours.
- **Cancel_Request**: A record created when a user requests cancellation inside the Cancellation_Window. Stored in the `cancel_requests` table with status pending, approved, or denied.
- **Ground_Owner**: The user who owns and manages a ground. Responsible for approving or denying cancel requests.
- **Cancellation_Status**: A field on the Reservation record tracking the state of a cancellation request: null (no request), "pending", "approved", or "denied".
- **My_Reservations**: The user-facing list of their current and upcoming reservations.
- **Home_Screen**: The main screen showing notification lists for the logged-in user.

## Requirements

### Requirement 1: Ground Cancellation Policy Configuration

**User Story:** As a ground owner, I want to set a cancellation policy window on my ground, so that I can control whether late cancellations require my approval.

#### Acceptance Criteria

1. WHEN a ground owner creates a ground, THE Ground_Create_Screen SHALL display a Cancellation Policy field that accepts a nullable integer value representing hours.
2. WHEN a ground owner edits a ground, THE Ground_Edit_Screen SHALL display the current Cancellation Policy value and allow the ground owner to update the value.
3. THE Ground_Create_Screen SHALL accept cancellation policy values of 0, 12, 24, 48, or 72 hours, or null (no policy).
4. THE Ground_Edit_Screen SHALL accept cancellation policy values of 0, 12, 24, 48, or 72 hours, or null (no policy).
5. WHEN the ground owner saves a ground with a Cancellation Policy value, THE System SHALL persist the value as `cancellationPolicyHours` on the ground record.
6. WHEN the ground owner saves a ground without setting a Cancellation Policy, THE System SHALL store null for `cancellationPolicyHours`, indicating all cancellations are automatic.

### Requirement 2: Automatic Cancellation Outside the Window

**User Story:** As a user, I want my reservation to be cancelled immediately with a full refund when I cancel well before the booking start time, so that I do not have to wait for owner approval.

#### Acceptance Criteria

1. WHEN a user initiates cancellation of a Reservation AND the ground has no Cancellation_Policy (cancellationPolicyHours is null), THE System SHALL cancel the Reservation immediately.
2. WHEN a user initiates cancellation of a Reservation AND the current time is outside the Cancellation_Window, THE System SHALL cancel the Reservation immediately.
3. WHEN the System cancels a Reservation automatically, THE System SHALL update the Reservation status to "cancelled" and set the cancelledAt timestamp.
4. WHEN the System cancels a Reservation automatically, THE System SHALL issue a full Stripe refund for the Reservation payment.
5. WHEN the System cancels a Reservation automatically, THE System SHALL return the associated time slot status to "available".
6. WHEN the System cancels a Reservation automatically, THE System SHALL remove the Reservation from the user's My_Reservations list.

### Requirement 3: Cancel Request Creation Inside the Window

**User Story:** As a user, I want to request cancellation when I am inside the cancellation window, so that the ground owner can review my request.

#### Acceptance Criteria

1. WHEN a user initiates cancellation of a Reservation AND the current time is inside the Cancellation_Window, THE System SHALL create a Cancel_Request record with status "pending".
2. WHEN the System creates a Cancel_Request, THE System SHALL store the userId, reservationId, groundId, requestedAt timestamp, and status "pending" on the Cancel_Request record.
3. WHEN the System creates a Cancel_Request, THE System SHALL update the Reservation's Cancellation_Status to "pending".
4. WHILE a Reservation has Cancellation_Status "pending", THE My_Reservations_List SHALL display the Reservation with a "Cancellation Pending" badge.
5. WHILE a Reservation has Cancellation_Status "pending", THE System SHALL prevent the user from submitting a second Cancel_Request for the same Reservation.
6. WHILE a Reservation has Cancellation_Status "pending", THE Reservation SHALL remain active and the associated time slot SHALL remain in its current status.

### Requirement 4: Cancel Request Display on Home Screen

**User Story:** As a ground owner, I want to see pending cancel requests on my home screen, so that I can review and respond to cancellation requests promptly.

#### Acceptance Criteria

1. THE Home_Screen SHALL display a "Cancel Requests" section for ground owners who have pending Cancel_Request records.
2. THE Home_Screen SHALL order notification sections as: Live Events, Upcoming, Debrief, Invitations, Pending Leagues, Cancel Requests.
3. WHEN the Home_Screen displays a Cancel_Request, THE Cancel_Request_Card SHALL show the requesting user's name, the court/field name, and the booking date and time.
4. WHEN the Home_Screen displays a Cancel_Request, THE Cancel_Request_Card SHALL show an "Approve" button and a "Deny" button.
5. WHEN no pending Cancel_Request records exist for the ground owner's grounds, THE Home_Screen SHALL hide the "Cancel Requests" section.

### Requirement 5: Approve Cancel Request

**User Story:** As a ground owner, I want to approve a cancel request, so that the user's reservation is cancelled and refunded.

#### Acceptance Criteria

1. WHEN a ground owner presses the "Approve" button on a Cancel_Request, THE System SHALL update the Cancel_Request status to "approved" and set the resolvedAt timestamp.
2. WHEN a Cancel_Request is approved, THE System SHALL update the Reservation status to "cancelled" and set the Cancellation_Status to "approved".
3. WHEN a Cancel_Request is approved, THE System SHALL issue a full Stripe refund for the Reservation payment.
4. WHEN a Cancel_Request is approved, THE System SHALL return the associated time slot status to "available".
5. WHEN a Cancel_Request is approved, THE System SHALL remove the Reservation from the user's My_Reservations list.
6. WHEN a Cancel_Request is approved, THE System SHALL send a notification to the requesting user indicating the cancellation was approved.
7. WHEN a Cancel_Request is approved, THE System SHALL remove the Cancel_Request from the ground owner's Home_Screen Cancel Requests section.

### Requirement 6: Deny Cancel Request

**User Story:** As a ground owner, I want to deny a cancel request, so that the reservation remains active and the user is informed.

#### Acceptance Criteria

1. WHEN a ground owner presses the "Deny" button on a Cancel_Request, THE System SHALL update the Cancel_Request status to "denied" and set the resolvedAt timestamp.
2. WHEN a Cancel_Request is denied, THE System SHALL update the Reservation's Cancellation_Status to "denied".
3. WHEN a Cancel_Request is denied, THE Reservation SHALL remain active with its original status and the time slot SHALL remain unchanged.
4. WHEN a Cancel_Request is denied, THE System SHALL send a notification to the requesting user indicating the cancellation request was denied.
5. WHEN a Cancel_Request is denied, THE System SHALL remove the Cancel_Request from the ground owner's Home_Screen Cancel Requests section.
6. WHEN a Cancel_Request is denied, THE My_Reservations_List SHALL remove the "Cancellation Pending" badge from the Reservation.

### Requirement 7: Database Schema Updates

**User Story:** As a developer, I want the database schema to support cancellation policies and cancel requests, so that the feature has proper data persistence.

#### Acceptance Criteria

1. THE Database SHALL add a nullable integer column `cancellationPolicyHours` to the Facility table.
2. THE Database SHALL create a `cancel_requests` table with columns: id (UUID, primary key), userId (foreign key to users), reservationId (foreign key to facility_rentals), groundId (foreign key to facilities), requestedAt (timestamp), status (enum: "pending", "approved", "denied"), and resolvedAt (nullable timestamp).
3. THE Database SHALL add a nullable string column `cancellationStatus` to the facility_rentals table, accepting values: null, "pending", "approved", or "denied".
4. THE cancel_requests table SHALL enforce a unique constraint on (reservationId, status) where status is "pending", preventing duplicate pending requests for the same Reservation.
5. THE cancel_requests table SHALL define foreign key relationships with cascade delete to the users, facility_rentals, and facilities tables.

### Requirement 8: Cancellation Window Calculation

**User Story:** As a developer, I want a reliable method to determine whether a cancellation falls inside or outside the window, so that the correct cancellation flow is triggered.

#### Acceptance Criteria

1. WHEN the System evaluates a cancellation request, THE Cancellation_Window_Calculator SHALL compute the window boundary as: booking start time minus cancellationPolicyHours.
2. WHEN the current time is before the window boundary (current time < booking start time - cancellationPolicyHours), THE Cancellation_Window_Calculator SHALL return "outside" the window.
3. WHEN the current time is at or after the window boundary (current time >= booking start time - cancellationPolicyHours), THE Cancellation_Window_Calculator SHALL return "inside" the window.
4. WHEN cancellationPolicyHours is null, THE Cancellation_Window_Calculator SHALL return "outside" the window for all cancellation requests.
5. FOR ALL valid booking start times and cancellationPolicyHours values, computing the window boundary then checking a cancellation time against the boundary SHALL produce a deterministic and consistent result (idempotence of the pure calculation).
