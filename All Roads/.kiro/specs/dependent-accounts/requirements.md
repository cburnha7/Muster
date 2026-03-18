# Requirements Document

## Introduction

Dependent Accounts allows a parent or guardian to create, manage, and act on behalf of under-18 player accounts within Muster. Dependents are full user records with no login credentials, linked to their guardian via a `guardianId` foreign key. A context switcher on the profile screen lets the guardian seamlessly toggle the active user context so that all app actions (joining events, bookings, Salutes, Rosters, Leagues) are recorded against the selected dependent. When a dependent turns 18, the guardian is notified and can transfer the account to an independent user with full login credentials, preserving all history.

## Glossary

- **Guardian**: An authenticated Muster user who has created one or more dependent accounts. The guardian's user ID is stored as `guardianId` on each dependent's user record.
- **Dependent**: A user record with `isDependent = true` and a non-null `guardianId`. Dependents are under 18, have no login credentials, and are accessible only through their guardian's context switcher.
- **Context_Switcher**: A UI control on the profile screen that displays the currently active user (guardian or a dependent) and allows the guardian to switch the active context.
- **Active_Context**: The user identity currently in effect across the app. All screens, lists, bookings, events, Rosters, Leagues, and ratings reflect the active context's data.
- **Context_Indicator**: A persistent visual element (avatar or name) visible on screen at all times, showing which user context is currently active.
- **Account_Transfer**: The process of converting a dependent account into an independent user account when the dependent turns 18, detaching the `guardianId`, creating login credentials, and preserving all history.
- **Transfer_Notification**: A notification sent to the guardian when a dependent turns 18, informing the guardian that the account is eligible for transfer.
- **Age_Check_Job**: A nightly scheduled job that scans dependent accounts for users who have turned 18 and triggers a Transfer_Notification to the guardian.
- **Profile_Screen**: The existing Muster screen where the guardian views their own profile, and from which dependent management and the Context_Switcher are accessed.
- **Dependent_Profile**: A view showing a dependent's stats, ratings, event history, debrief records, and Salutes, scoped to that dependent's account.

## Requirements

### Requirement 1: Add Dependent

**User Story:** As a guardian, I want to add a dependent from my profile screen, so that I can create an account for my child to participate in Muster events.

#### Acceptance Criteria

1. WHEN the guardian taps the "Add Dependent" option on the Profile_Screen, THE Profile_Screen SHALL navigate to a dependent creation form requesting name, date of birth, and sport preferences.
2. WHEN the guardian submits the dependent creation form with a valid name, date of birth, and sport preferences, THE System SHALL create a new User record with `isDependent` set to true, `guardianId` set to the guardian's user ID, and no login credentials (null email, null password).
3. WHEN the guardian submits a date of birth that indicates the dependent is 18 or older at the time of creation, THE System SHALL reject the submission and display a validation error stating the dependent must be under 18.
4. THE System SHALL store the dependent's date of birth as a required field on the User record.
5. THE System SHALL link the dependent's User record to the guardian's User record via the `guardianId` foreign key.

### Requirement 2: List Dependents

**User Story:** As a guardian, I want to see a list of my dependents on my profile screen, so that I can manage their accounts.

#### Acceptance Criteria

1. WHEN the guardian views the Profile_Screen, THE Profile_Screen SHALL display a list of all User records where `guardianId` matches the guardian's user ID.
2. WHEN the guardian has no dependents, THE Profile_Screen SHALL display an empty state message indicating no dependents have been added, along with the "Add Dependent" option.
3. THE Profile_Screen SHALL display each dependent's name and profile image (or a placeholder) in the dependents list.

### Requirement 3: View Dependent Profile

**User Story:** As a guardian, I want to view a dependent's full profile, so that I can review their activity and stats.

#### Acceptance Criteria

1. WHEN the guardian taps a dependent in the dependents list, THE Profile_Screen SHALL navigate to the Dependent_Profile screen showing the dependent's stats, ratings, event history, debrief records, and Salutes.
2. THE Dependent_Profile SHALL scope all displayed data to the selected dependent's User record.
3. THE Dependent_Profile SHALL display the dependent's sport ratings using the same format as the guardian's own sport ratings section.

### Requirement 4: Edit Dependent Profile

**User Story:** As a guardian, I want to edit my dependent's profile details, so that I can keep their information up to date.

#### Acceptance Criteria

1. WHEN the guardian taps the edit option on the Dependent_Profile screen, THE Dependent_Profile SHALL allow the guardian to modify the dependent's name, date of birth, sport preferences, and profile image.
2. WHEN the guardian submits an edited date of birth that indicates the dependent is 18 or older, THE System SHALL reject the edit and display a validation error stating the dependent must be under 18.
3. WHEN the guardian saves valid edits, THE System SHALL update the dependent's User record with the new values.

### Requirement 5: Context Switcher

**User Story:** As a guardian, I want to switch the app context to a dependent's account, so that I can perform actions on their behalf.

#### Acceptance Criteria

1. THE Context_Switcher SHALL be accessible from the Profile_Screen and display the currently active user (guardian or a dependent) with their name and avatar.
2. WHEN the guardian taps the Context_Switcher, THE Context_Switcher SHALL display a list of the guardian's own account and all linked dependents.
3. WHEN the guardian selects a different user from the Context_Switcher, THE System SHALL change the Active_Context to the selected user without logging out or interrupting the session.
4. WHEN the Active_Context changes, THE System SHALL update all screens, lists, bookings, events, Rosters, Leagues, and ratings to reflect the selected user's data.
5. THE System SHALL maintain the guardian's authentication session when switching to a dependent's context; switching context SHALL NOT require re-authentication.

### Requirement 6: Context Indicator

**User Story:** As a guardian, I want a persistent indicator showing which account is currently active, so that I always know whose account I am acting on.

#### Acceptance Criteria

1. THE Context_Indicator SHALL be visible on screen at all times when the guardian has at least one dependent, displaying the active user's name or avatar.
2. WHEN the Active_Context is a dependent, THE Context_Indicator SHALL visually distinguish the dependent context from the guardian's own context (e.g., different badge or label).
3. WHEN the Active_Context changes, THE Context_Indicator SHALL update immediately to reflect the newly selected user.

### Requirement 7: Actions Scoped to Active Context

**User Story:** As a guardian, I want all actions taken in a dependent's context to be recorded against the dependent's account, so that the dependent's history is accurate.

#### Acceptance Criteria

1. WHILE the Active_Context is set to a dependent, THE System SHALL record all bookings against the dependent's User record.
2. WHILE the Active_Context is set to a dependent, THE System SHALL record all event participations (Join Up) against the dependent's User record.
3. WHILE the Active_Context is set to a dependent, THE System SHALL record all Salutes received against the dependent's User record.
4. WHILE the Active_Context is set to a dependent, THE System SHALL associate all Roster memberships with the dependent's User record.
5. WHILE the Active_Context is set to a dependent, THE System SHALL associate all League memberships with the dependent's User record.
6. WHILE the Active_Context is set to a dependent, THE System SHALL attribute all ratings and game participations to the dependent's User record.

### Requirement 8: Account Transfer on Turning 18

**User Story:** As a guardian, I want to transfer a dependent's account to an independent account when the dependent turns 18, so that the dependent can manage their own Muster account.

#### Acceptance Criteria

1. WHEN the guardian initiates an Account_Transfer for a dependent who is 18 or older, THE System SHALL prompt the guardian to provide an email address and password for the dependent's new independent account.
2. WHEN the guardian submits valid transfer credentials, THE System SHALL set `isDependent` to false, remove the `guardianId`, store the provided email and password (hashed) on the dependent's User record, and mark the account as independent.
3. WHEN an Account_Transfer completes, THE System SHALL preserve all existing history on the transferred account, including ratings, event participations, debrief records, Salutes, Roster memberships, League memberships, and bookings.
4. WHEN an Account_Transfer completes, THE System SHALL remove the transferred user from the guardian's dependents list and Context_Switcher.
5. IF the guardian attempts to transfer a dependent who is under 18, THEN THE System SHALL reject the transfer and display a validation error stating the dependent must be 18 or older to transfer.

### Requirement 9: Transfer Notification

**User Story:** As a guardian, I want to be notified when a dependent turns 18, so that I know the account is eligible for transfer.

#### Acceptance Criteria

1. WHEN the Age_Check_Job detects a dependent whose date of birth indicates the dependent has turned 18, THE Age_Check_Job SHALL send a Transfer_Notification to the guardian.
2. THE Age_Check_Job SHALL run once per day (nightly).
3. THE Transfer_Notification SHALL include the dependent's name and a prompt to initiate the Account_Transfer.
4. THE Age_Check_Job SHALL send the Transfer_Notification only once per dependent; subsequent runs SHALL NOT send duplicate notifications for the same dependent.

### Requirement 10: Database Schema Updates

**User Story:** As a developer, I want the User model updated with dependent-related fields, so that the system can distinguish and link dependent accounts.

#### Acceptance Criteria

1. THE System SHALL add a nullable `guardianId` foreign key field on the User record, referencing another User record's ID.
2. THE System SHALL add an `isDependent` boolean field on the User record, defaulting to false.
3. THE System SHALL enforce a self-referential relation on the User model where `guardianId` references the `id` field of the same User table.
4. THE System SHALL ensure that the existing `dateOfBirth` field on the User record remains required for all users.
5. WHEN a User record has `isDependent` set to true, THE System SHALL require `guardianId` to be non-null.
6. WHEN a User record has `isDependent` set to false and `guardianId` set to null, THE System SHALL allow the `email` field to remain required as normal for independent users.
7. WHEN a User record has `isDependent` set to true, THE System SHALL allow the `email` and `password` fields to be null.
