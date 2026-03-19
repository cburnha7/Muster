# Requirements Document

## Introduction

This feature adds three interconnected capabilities to Muster: user insurance document management, ground-level insurance requirements for court reservations, and an escrow-based payment flow for insurance-required reservations. Users upload proof-of-insurance documents to their profile, grounds can require valid insurance before accepting a reservation, and reservation approval flows through the ground owner with escrowed join fees funding the rental charge inside the cancellation window.

## Glossary

- **Insurance_Document**: A record in the `insuranceDocuments` table representing a user's uploaded proof-of-insurance file, including policy name, expiry date, document URL, and status (active or expired).
- **Ground**: A `Facility` record — the physical venue containing one or more courts.
- **Ground_Owner**: The `User` who owns a `Facility` (referenced by `Facility.ownerId`).
- **Renter**: The `User` who submits a court reservation request at an insurance-required ground.
- **Reservation**: A `FacilityRental` record representing a time-slot booking at a ground.
- **Reservation_Approval_Flow**: The process by which a ground owner reviews and approves or denies a pending reservation that requires insurance.
- **Escrow_Balance**: The cumulative amount of join fees held via Stripe manual-capture PaymentIntents against a reservation, tracked by the `escrowBalance` field on the reservation record.
- **Cancellation_Window**: The period defined by `Facility.cancellationPolicyHours` before the reservation start time, inside which the rental fee becomes non-refundable and is charged.
- **Nightly_Expiry_Job**: A scheduled cron job that runs once per night to detect and mark newly expired insurance documents.
- **Notification_Service**: The existing `NotificationService` used to send push notifications and in-app alerts to users.
- **Profile_Screen**: The existing `ProfileScreen` where users manage their account, now extended with an Insurance Documents section.
- **Pending_Reservations_List**: A new section on the ground owner's Home Screen showing reservations awaiting approval.
- **Escrow_Transaction_Log**: A list of all escrow-related financial events (authorisations, captures, payouts, shortfall charges) visible to the ground owner from the ground management screen.

## Requirements

### Requirement 1: Upload Insurance Documents

**User Story:** As a user, I want to upload proof-of-insurance documents to my profile, so that I can attach them to court reservation requests at grounds that require insurance.

#### Acceptance Criteria

1. THE Profile_Screen SHALL display an "Insurance Documents" section listing all Insurance_Documents belonging to the authenticated user.
2. WHEN the user taps "Add Insurance Document", THE Profile_Screen SHALL present a form requiring a document file, a policy name, and an expiry date.
3. WHEN the user submits a valid insurance document form, THE System SHALL create an Insurance_Document record with status "active" and store the uploaded file.
4. THE System SHALL accept document files in PDF, JPEG, and PNG formats with a maximum file size of 10 MB.
5. IF the user submits a form with a missing document file, missing policy name, or missing expiry date, THEN THE System SHALL display a validation error identifying the missing field and prevent submission.
6. IF the user submits a document with an expiry date in the past, THEN THE System SHALL reject the upload and display an error stating the expiry date must be in the future.

### Requirement 2: Insurance Document Expiry Management

**User Story:** As a user, I want expired insurance documents to be clearly marked and unusable for new reservations, so that I always attach valid coverage.

#### Acceptance Criteria

1. THE Nightly_Expiry_Job SHALL run once per day and update the status of every Insurance_Document whose expiry date has passed from "active" to "expired".
2. WHILE an Insurance_Document has status "expired", THE Profile_Screen SHALL display the document with a grayed-out appearance and an "Expired" label.
3. WHILE an Insurance_Document has status "expired", THE System SHALL exclude the document from the insurance document selector during reservation submission.
4. WHEN an Insurance_Document is within 30 days of its expiry date, THE Notification_Service SHALL send a push notification to the owning user warning that the document is approaching expiry.
5. THE Nightly_Expiry_Job SHALL send the 30-day expiry warning notification only once per Insurance_Document.

### Requirement 3: Ground Insurance Requirement Toggle

**User Story:** As a ground owner, I want to optionally require proof of insurance for court reservations at my ground, so that I can enforce my venue's liability policy.

#### Acceptance Criteria

1. THE Create_Facility_Screen SHALL display an optional "Requires Proof of Insurance" toggle.
2. THE Edit_Facility_Screen SHALL display the "Requires Proof of Insurance" toggle reflecting the current value of `Facility.requiresInsurance`.
3. WHEN the ground owner enables the toggle and saves, THE System SHALL set `Facility.requiresInsurance` to true on the ground record.
4. WHEN the ground owner disables the toggle and saves, THE System SHALL set `Facility.requiresInsurance` to false on the ground record.
5. THE `requiresInsurance` field SHALL default to false for all new and existing ground records.

### Requirement 4: Insurance Attachment During Reservation

**User Story:** As a renter, I want to attach a valid insurance document when reserving a court at an insurance-required ground, so that the ground owner can verify my coverage.

#### Acceptance Criteria

1. WHEN a renter initiates a reservation at a ground where `requiresInsurance` is true, THE System SHALL display a selector listing only the renter's Insurance_Documents with status "active".
2. WHEN the renter selects an Insurance_Document and submits the reservation, THE System SHALL store the selected document's ID as `attachedInsuranceDocumentId` on the reservation record.
3. WHEN a renter initiates a reservation at a ground where `requiresInsurance` is true and the renter has zero active Insurance_Documents, THE System SHALL block submission, display a message stating "You need a valid insurance document to reserve this court", and provide a link to the Insurance Documents section of the Profile_Screen.
4. WHEN a renter initiates a reservation at a ground where `requiresInsurance` is false, THE System SHALL proceed with the standard reservation flow without displaying the insurance selector.
5. THE System SHALL validate at submission time that the selected Insurance_Document still has status "active" and reject the reservation if the document has expired between selection and submission.

### Requirement 5: Pending Reservation Approval State

**User Story:** As a renter, I want my reservation at an insurance-required ground to enter a pending state until the ground owner reviews it, so that the time slot is held while awaiting approval.

#### Acceptance Criteria

1. WHEN a reservation is submitted at a ground where `requiresInsurance` is true, THE System SHALL create the reservation with status "pending_approval" and hold the time slot.
2. WHILE a reservation has status "pending_approval", THE System SHALL prevent other renters from reserving the same time slot.
3. WHILE a reservation has status "pending_approval", THE System SHALL display the reservation to the renter with a "Pending Approval" badge.

### Requirement 6: Ground Owner Reservation Approval Flow

**User Story:** As a ground owner, I want to review pending reservations with attached insurance documents and approve or deny them, so that I can verify coverage before confirming a reservation.

#### Acceptance Criteria

1. THE Home_Screen SHALL display a "Pending Reservations" section for ground owners listing all reservations with status "pending_approval" across the owner's grounds.
2. WHEN the ground owner taps a pending reservation, THE System SHALL display the reservation details: renter name, court, date, time, and event details.
3. WHEN the ground owner taps the attached insurance document, THE System SHALL open the document for inline viewing.
4. WHEN the ground owner taps "Approve", THE System SHALL update the reservation status from "pending_approval" to "confirmed" and send a confirmation notification to the renter via the Notification_Service.
5. WHEN the ground owner taps "Deny", THE System SHALL update the reservation status from "pending_approval" to "cancelled", release the held time slot, and send a denial notification to the renter via the Notification_Service.
6. WHEN the ground owner denies a reservation, THE System SHALL process zero payment — no charges are created or captured.

### Requirement 7: Escrow Hold for Join Fees

**User Story:** As a ground owner, I want join fees from event participants to be held in escrow until the reservation is inside the cancellation window, so that funds are available to cover the rental fee.

#### Acceptance Criteria

1. WHEN a participant pays a join fee for an event linked to a reservation, THE System SHALL create a Stripe PaymentIntent with `capture_method: 'manual'` to hold the join fee amount in escrow.
2. THE System SHALL set `transfer_group` on every escrow PaymentIntent to the reservation ID so all charges are auditable as a unit.
3. THE System SHALL include an `idempotencyKey` on every Stripe API call that creates or captures a PaymentIntent, using the format defined in `server/src/utils/idempotency.ts`.
4. THE System SHALL update the `escrowBalance` field on the reservation record to reflect the cumulative total of all held join-fee PaymentIntents.
5. THE System SHALL route all escrow funds through Stripe Connect — the platform never holds funds directly.

### Requirement 8: Rental Fee Charge Inside Cancellation Window

**User Story:** As a ground owner, I want the rental fee to be automatically charged when the reservation enters the cancellation window, so that I am guaranteed payment for confirmed reservations.

#### Acceptance Criteria

1. WHEN a confirmed reservation enters the cancellation window (current time is within `cancellationPolicyHours` of the reservation start time), THE System SHALL automatically initiate the rental fee charge.
2. WHEN the escrow balance equals or exceeds the rental fee, THE System SHALL capture escrowed join-fee PaymentIntents to cover the rental fee and set `rentalFeeCharged` to true on the reservation record.
3. WHEN the escrow balance exceeds the rental fee, THE System SHALL pay out the surplus amount to the host via Stripe Connect transfer.
4. WHEN the escrow balance is less than the rental fee, THE System SHALL capture all escrowed join-fee PaymentIntents and automatically charge the host for the shortfall amount.
5. THE System SHALL include `application_fee_amount` on every charge, calculated using the `PLATFORM_FEE_RATE` environment variable.
6. IF a PaymentIntent capture fails during rental fee charging, THEN THE System SHALL log the failure, cancel all successfully captured intents for the reservation, and retry the entire charge operation.

### Requirement 9: Escrow Transaction Logging

**User Story:** As a ground owner, I want to see a log of all escrow transactions for my reservations, so that I can track the financial status of each reservation.

#### Acceptance Criteria

1. THE System SHALL log every escrow-related financial event: join-fee authorisation, join-fee capture, surplus payout, shortfall charge, and refund.
2. THE Ground_Management_Screen SHALL display the Escrow_Transaction_Log for each reservation, showing transaction type, amount, timestamp, and status.
3. THE Escrow_Transaction_Log SHALL be visible only to the Ground_Owner of the associated ground.

### Requirement 10: Database Schema Extensions

**User Story:** As a developer, I want the database schema extended with insurance and escrow fields, so that the system can persist all data required by this feature.

#### Acceptance Criteria

1. THE System SHALL add an `insuranceDocuments` table with columns: `id` (UUID primary key), `userId` (foreign key to users), `documentUrl` (string), `policyName` (string), `expiryDate` (DateTime), `status` (string, default "active"), `expiryNotificationSent` (boolean, default false), `createdAt` (DateTime), and `updatedAt` (DateTime).
2. THE System SHALL add a `requiresInsurance` boolean column (default false) to the `facilities` table.
3. THE System SHALL add an `attachedInsuranceDocumentId` foreign key column (nullable) to the `facility_rentals` table referencing the `insuranceDocuments` table.
4. THE System SHALL add an `escrowBalance` float column (default 0) to the `facility_rentals` table.
5. THE System SHALL add a `rentalFeeCharged` boolean column (default false) to the `facility_rentals` table.
6. THE System SHALL add a `status` value "pending_approval" as a valid reservation status alongside existing values ("confirmed", "cancelled", "completed", "no_show").
