# Requirements Document

## Introduction

A promo code system that grants users a free trial of any membership tier (Player, Host, or Facility) for a configurable duration (default 30 days). Users redeem codes from the profile screen, select a tier, and receive an immediate upgrade with no payment. When the trial expires, the user reverts to their previous paid tier or the base standard tier. Platform admins create and manage promo codes. A nightly job handles trial expiry, and users receive advance notifications before their trial ends.

## Glossary

- **Promo_Code_System**: The backend and frontend components responsible for creating, validating, and redeeming promotional codes that grant free tier trials.
- **Profile_Screen**: The existing user profile screen (`src/screens/profile/ProfileScreen.tsx`) where the Redeem Code option is displayed.
- **Tier_Selector**: A UI component presented after a valid promo code is entered, allowing the user to choose which membership tier (Player, Host, or Facility) to activate.
- **Trial_Period**: The duration of free tier access granted by a promo code redemption, measured in days from the redemption date.
- **Trial_Expiry_Job**: A nightly cron job that checks for expired trials and reverts user tiers accordingly.
- **Notification_Service**: The existing notification service (`server/src/services/NotificationService.ts`) used to send trial expiry reminders.
- **Admin**: A platform administrator with the role "admin" who can create and manage promo codes.
- **User_Record**: The `users` table row for a given user, including the `trialTier` and `trialExpiry` fields.
- **Promo_Codes_Table**: The `promo_codes` database table storing code strings, trial duration, creation date, and the creating admin's ID.
- **Redemption_Log**: A database table recording each promo code redemption event, linking a user, a promo code, the selected tier, and the redemption timestamp.

## Requirements

### Requirement 1: Redeem Code Entry Point on Profile Screen

**User Story:** As a user, I want to see a "Redeem Code" option on my profile screen, so that I can enter a promo code to activate a free trial.

#### Acceptance Criteria

1. THE Profile_Screen SHALL display a "Redeem Code" row below the existing sections and above the "Log Out" button.
2. WHEN the user taps the "Redeem Code" row, THE Promo_Code_System SHALL navigate to a Redeem Code screen with a text input for the code and a submit button.
3. THE Redeem Code screen SHALL use theme tokens from `src/theme/` for all colors, fonts, and spacing.

### Requirement 2: Promo Code Validation

**User Story:** As a user, I want the system to validate my promo code before proceeding, so that I know immediately whether the code is valid.

#### Acceptance Criteria

1. WHEN the user submits a promo code, THE Promo_Code_System SHALL send a validation request to the backend API.
2. WHEN the submitted code matches an existing record in the Promo_Codes_Table, THE Promo_Code_System SHALL return a success response containing the trial duration in days.
3. IF the submitted code does not match any record in the Promo_Codes_Table, THEN THE Promo_Code_System SHALL return an error response with the message "Invalid promo code".
4. THE Promo_Code_System SHALL perform case-insensitive matching when looking up promo codes.

### Requirement 3: Tier Selection After Validation

**User Story:** As a user, I want to choose which tier to upgrade to after entering a valid code, so that I can pick the tier that suits my needs.

#### Acceptance Criteria

1. WHEN a promo code is validated successfully, THE Tier_Selector SHALL display the three available tiers: Player, Host, and Facility.
2. THE Tier_Selector SHALL display a description for each tier so the user can make an informed choice.
3. WHEN the user selects a tier and confirms, THE Promo_Code_System SHALL send a redemption request to the backend API with the promo code and the selected tier.

### Requirement 4: Promo Code Redemption and Trial Activation

**User Story:** As a user, I want my tier to be upgraded immediately upon redemption, so that I can start using premium features right away.

#### Acceptance Criteria

1. WHEN a redemption request is received with a valid code and a selected tier, THE Promo_Code_System SHALL set the `trialTier` field on the User_Record to the selected tier.
2. WHEN a redemption request is received with a valid code and a selected tier, THE Promo_Code_System SHALL set the `trialExpiry` field on the User_Record to the current date plus the trial duration from the Promo_Codes_Table.
3. WHEN a redemption request is received, THE Promo_Code_System SHALL create a record in the Redemption_Log with the user ID, promo code ID, selected tier, and redemption timestamp.
4. WHEN the same user redeems the same code again with a higher tier, THE Promo_Code_System SHALL update the `trialTier` to the new tier and reset the `trialExpiry` to a fresh trial duration from the redemption date.
5. THE Promo_Code_System SHALL allow any number of users to redeem the same promo code with no per-user or per-account limit.
6. WHEN a redemption is successful, THE Promo_Code_System SHALL return the updated user record including the new `trialTier` and `trialExpiry` values.

### Requirement 5: Trial Expiry and Tier Reversion

**User Story:** As a user, I want my tier to revert gracefully when my trial ends, so that I am not left in an inconsistent state.

#### Acceptance Criteria

1. THE Trial_Expiry_Job SHALL run nightly as a cron job registered in `server/src/jobs/index.ts`.
2. WHEN the Trial_Expiry_Job runs, THE Trial_Expiry_Job SHALL query all users where `trialExpiry` is in the past and `trialTier` is not null.
3. WHEN an expired trial is found and the user has an active Subscription, THE Trial_Expiry_Job SHALL set the user's `membershipTier` to the Subscription plan value and clear `trialTier` and `trialExpiry`.
4. WHEN an expired trial is found and the user has no active Subscription, THE Trial_Expiry_Job SHALL set the user's `membershipTier` to "standard" and clear `trialTier` and `trialExpiry`.
5. THE Trial_Expiry_Job SHALL log the number of trials expired and any errors encountered during execution.

### Requirement 6: Trial Expiry Notifications

**User Story:** As a user, I want to be notified before my trial expires, so that I have time to subscribe and keep my tier.

#### Acceptance Criteria

1. WHEN a user's trial expiry is exactly 7 days away, THE Notification_Service SHALL send a notification informing the user that their trial expires in 7 days with an option to subscribe.
2. WHEN a user's trial expiry is exactly 1 day away, THE Notification_Service SHALL send a notification informing the user that their trial expires in 1 day with an option to subscribe.
3. THE Trial_Expiry_Job SHALL handle sending both the 7-day and 1-day notifications during its nightly run.
4. THE Notification_Service SHALL not send duplicate notifications for the same trial expiry milestone (7-day or 1-day).

### Requirement 7: Promo Code Administration

**User Story:** As a platform admin, I want to create and manage promo codes, so that I can run promotional campaigns.

#### Acceptance Criteria

1. THE Promo_Code_System SHALL provide an API endpoint for creating promo codes, restricted to users with the "admin" role.
2. WHEN an admin creates a promo code, THE Promo_Code_System SHALL store the code string, trial duration in days (default 30), created date, and the admin's user ID in the Promo_Codes_Table.
3. THE Promo_Code_System SHALL enforce unique code strings in the Promo_Codes_Table (case-insensitive).
4. THE Promo_Code_System SHALL provide an API endpoint for listing all promo codes, restricted to users with the "admin" role.

### Requirement 8: Database Schema for Promo Codes

**User Story:** As a developer, I want a well-defined database schema for promo codes and trial state, so that the data model supports all promo code operations.

#### Acceptance Criteria

1. THE Promo_Codes_Table SHALL contain the following columns: `id` (UUID primary key), `code` (unique string), `trialDurationDays` (integer, default 30), `createdAt` (timestamp), and `createdByAdminId` (foreign key to users table).
2. THE User_Record SHALL include a nullable `trialTier` string field for storing the active trial tier.
3. THE User_Record SHALL include a nullable `trialExpiry` datetime field for storing the trial expiration date.
4. THE Redemption_Log SHALL contain the following columns: `id` (UUID primary key), `userId` (foreign key to users table), `promoCodeId` (foreign key to promo_codes table), `selectedTier` (string), and `redeemedAt` (timestamp).
5. THE Promo_Codes_Table SHALL store the `code` field in uppercase to support case-insensitive matching.

### Requirement 9: Effective Tier Resolution

**User Story:** As a developer, I want a single source of truth for a user's effective tier, so that all tier-gated features use consistent logic.

#### Acceptance Criteria

1. WHILE a user has a non-null `trialTier` and the `trialExpiry` is in the future, THE Promo_Code_System SHALL resolve the user's effective tier as the `trialTier` value.
2. WHILE a user has a null `trialTier` or the `trialExpiry` is in the past, THE Promo_Code_System SHALL resolve the user's effective tier as the `membershipTier` value.
3. THE Promo_Code_System SHALL expose the effective tier resolution as a shared utility usable by both backend services and API responses.
