# Requirements Document

## Introduction

This document defines the requirements for the authentication and registration system for Muster, a sports booking and event management platform. The system enables users to create accounts, authenticate securely, and manage their sessions across multiple platforms (iOS, Android, Web). The authentication system supports both manual email/password registration and Single Sign-On (SSO) via Apple and Google, with secure account linking capabilities.

## Glossary

- **Auth_System**: The authentication and registration system responsible for user identity management
- **User**: A person who registers and authenticates with the Muster platform
- **SSO_Provider**: External authentication service (Apple Sign In or Google Sign In)
- **Account_Link**: The process of connecting an SSO provider to an existing user account
- **Session**: An authenticated user's active connection to the system
- **JWT**: JSON Web Token used for secure authentication
- **Token_Store**: Secure storage mechanism for authentication tokens (SecureStore on mobile, secure cookies on web)
- **Registration_Form**: User interface for creating a new account
- **Login_Form**: User interface for authenticating an existing user
- **Validator**: Component that validates user input against defined rules
- **Password_Hash**: Encrypted password using bcrypt algorithm
- **Rate_Limiter**: Component that restricts the number of authentication attempts
- **Email_Service**: Service that sends password reset emails
- **Backend_API**: Express.js server with Prisma ORM and PostgreSQL database
- **Frontend_App**: React Native Expo application with Redux state management

## Requirements

### Requirement 1: Manual User Registration

**User Story:** As a new user, I want to register with my email and password, so that I can create a Muster account and access the platform.

#### Acceptance Criteria

1. THE Registration_Form SHALL display fields for First Name, Last Name, Email, Username, Password, and Confirm Password
2. WHEN a user enters a First Name with fewer than 2 characters, THE Validator SHALL display an inline error message "First name must be at least 2 characters"
3. WHEN a user enters a Last Name with fewer than 2 characters, THE Validator SHALL display an inline error message "Last name must be at least 2 characters"
4. WHEN a user enters an Email that does not match valid email format, THE Validator SHALL display an inline error message "Please enter a valid email address"
5. WHEN a user enters a Username with fewer than 3 characters, THE Validator SHALL display an inline error message "Username must be at least 3 characters"
6. WHEN a user enters a Username containing characters other than alphanumeric, underscore, or dash, THE Validator SHALL display an inline error message "Username can only contain letters, numbers, underscores, and dashes"
7. WHEN a user enters a Password with fewer than 8 characters, THE Validator SHALL display an inline error message "Password must be at least 8 characters"
8. WHEN a user enters a Password without an uppercase letter, THE Validator SHALL display an inline error message "Password must contain at least one uppercase letter"
9. WHEN a user enters a Password without a lowercase letter, THE Validator SHALL display an inline error message "Password must contain at least one lowercase letter"
10. WHEN a user enters a Password without a number, THE Validator SHALL display an inline error message "Password must contain at least one number"
11. WHEN a user enters a Password without a special character, THE Validator SHALL display an inline error message "Password must contain at least one special character"
12. WHEN a user enters a Confirm Password that does not match the Password field, THE Validator SHALL display an inline error message "Passwords do not match"
13. WHEN a user submits the Registration_Form with valid data, THE Auth_System SHALL create a new user account in the Backend_API
14. WHEN a user submits the Registration_Form with valid data, THE Auth_System SHALL hash the password using bcrypt before storing
15. WHEN registration succeeds, THE Auth_System SHALL generate a JWT token and refresh token
16. WHEN registration succeeds, THE Auth_System SHALL store tokens in the Token_Store
17. WHEN registration succeeds, THE Frontend_App SHALL navigate the user to the home screen
18. WHEN registration succeeds, THE Frontend_App SHALL display a success message "Welcome to Muster"


### Requirement 2: Email and Username Uniqueness Validation

**User Story:** As a new user, I want to be notified if my email or username is already taken, so that I can choose a different one.

#### Acceptance Criteria

1. WHEN a user submits the Registration_Form with an email that already exists in the Backend_API, THE Auth_System SHALL return an error response with status code 409
2. WHEN the Auth_System returns an email conflict error, THE Registration_Form SHALL display an inline error message "This email is already registered"
3. WHEN a user submits the Registration_Form with a username that already exists in the Backend_API, THE Auth_System SHALL return an error response with status code 409
4. WHEN the Auth_System returns a username conflict error, THE Registration_Form SHALL display an inline error message "This username is taken"
5. WHEN a uniqueness validation error occurs, THE Registration_Form SHALL keep all other field values populated

### Requirement 3: Apple Sign In Integration

**User Story:** As a new user, I want to register using my Apple account, so that I can quickly create an account without entering a password.

#### Acceptance Criteria

1. THE Registration_Form SHALL display a "Sign in with Apple" button
2. WHEN a user taps the "Sign in with Apple" button, THE Frontend_App SHALL initiate the Apple Sign In OAuth flow
3. WHEN Apple Sign In succeeds, THE Auth_System SHALL receive the user's First Name, Last Name, and Email from the SSO_Provider
4. WHEN Apple Sign In succeeds, THE Registration_Form SHALL pre-populate First Name, Last Name, and Email fields
5. WHEN Apple Sign In succeeds, THE Registration_Form SHALL display a Username input field as required
6. WHEN Apple Sign In succeeds, THE Registration_Form SHALL hide Password and Confirm Password fields
7. WHEN a user completes Apple Sign In registration with a valid username, THE Auth_System SHALL create a new user account with SSO provider type "apple"
8. WHEN Apple Sign In registration succeeds, THE Auth_System SHALL generate a JWT token and refresh token
9. WHEN Apple Sign In registration succeeds, THE Auth_System SHALL store tokens in the Token_Store
10. WHEN Apple Sign In registration succeeds, THE Frontend_App SHALL navigate the user to the home screen
11. IF Apple Sign In fails, THEN THE Frontend_App SHALL display an error message "Sign in with Apple failed. Please try again"

### Requirement 4: Google Sign In Integration

**User Story:** As a new user, I want to register using my Google account, so that I can quickly create an account without entering a password.

#### Acceptance Criteria

1. THE Registration_Form SHALL display a "Sign in with Google" button
2. WHEN a user taps the "Sign in with Google" button, THE Frontend_App SHALL initiate the Google Sign In OAuth flow
3. WHEN Google Sign In succeeds, THE Auth_System SHALL receive the user's First Name, Last Name, and Email from the SSO_Provider
4. WHEN Google Sign In succeeds, THE Registration_Form SHALL pre-populate First Name, Last Name, and Email fields
5. WHEN Google Sign In succeeds, THE Registration_Form SHALL display a Username input field as required
6. WHEN Google Sign In succeeds, THE Registration_Form SHALL hide Password and Confirm Password fields
7. WHEN a user completes Google Sign In registration with a valid username, THE Auth_System SHALL create a new user account with SSO provider type "google"
8. WHEN Google Sign In registration succeeds, THE Auth_System SHALL generate a JWT token and refresh token
9. WHEN Google Sign In registration succeeds, THE Auth_System SHALL store tokens in the Token_Store
10. WHEN Google Sign In registration succeeds, THE Frontend_App SHALL navigate the user to the home screen
11. IF Google Sign In fails, THEN THE Frontend_App SHALL display an error message "Sign in with Google failed. Please try again"


### Requirement 5: SSO Account Linking

**User Story:** As an existing user, I want to link my Apple or Google account to my existing email-based account, so that I can sign in using multiple methods.

#### Acceptance Criteria

1. WHEN a user attempts SSO registration with an email that already exists in the Backend_API, THE Auth_System SHALL detect the existing account
2. WHEN an existing account is detected during SSO registration, THE Frontend_App SHALL display an account linking prompt "An account with this email already exists. Would you like to link your [Apple/Google] account?"
3. WHEN a user confirms account linking for a manual registration account, THE Frontend_App SHALL display a password verification field
4. WHEN a user enters the correct password for account linking, THE Auth_System SHALL add the SSO provider to the existing user account
5. WHEN a user enters an incorrect password for account linking, THE Frontend_App SHALL display an error message "Incorrect password. Please try again"
6. WHEN account linking succeeds, THE Auth_System SHALL generate a JWT token and refresh token
7. WHEN account linking succeeds, THE Frontend_App SHALL navigate the user to the home screen
8. WHEN account linking succeeds, THE Frontend_App SHALL display a success message "[Apple/Google] account linked successfully"
9. WHEN a user declines account linking, THE Frontend_App SHALL return to the registration screen
10. WHEN a user has linked multiple SSO providers, THE Auth_System SHALL allow authentication via any linked provider

### Requirement 6: User Login with Email or Username

**User Story:** As a registered user, I want to log in with my email or username and password, so that I can access my account.

#### Acceptance Criteria

1. THE Login_Form SHALL display fields for Email/Username and Password
2. WHEN a user enters an Email/Username field that is empty, THE Validator SHALL display an inline error message "Email or username is required"
3. WHEN a user enters a Password field that is empty, THE Validator SHALL display an inline error message "Password is required"
4. WHEN a user submits the Login_Form with valid credentials, THE Auth_System SHALL verify the credentials against the Backend_API
5. WHEN credentials are valid, THE Auth_System SHALL generate a JWT token and refresh token
6. WHEN credentials are valid, THE Auth_System SHALL store tokens in the Token_Store
7. WHEN login succeeds, THE Frontend_App SHALL navigate the user to the home screen
8. WHEN a user submits the Login_Form with invalid credentials, THE Auth_System SHALL return an error response with status code 401
9. WHEN invalid credentials are submitted, THE Login_Form SHALL display an error message "Invalid email or password"
10. WHEN invalid credentials are submitted, THE Login_Form SHALL clear the password field
11. THE Login_Form SHALL display a "Forgot Password?" link
12. THE Login_Form SHALL display a "Don't have an account? Sign Up" navigation link

### Requirement 7: SSO Login

**User Story:** As a registered user with an SSO account, I want to log in using Apple or Google Sign In, so that I can access my account without entering a password.

#### Acceptance Criteria

1. THE Login_Form SHALL display a "Sign in with Apple" button
2. THE Login_Form SHALL display a "Sign in with Google" button
3. WHEN a user taps the "Sign in with Apple" button, THE Frontend_App SHALL initiate the Apple Sign In OAuth flow
4. WHEN a user taps the "Sign in with Google" button, THE Frontend_App SHALL initiate the Google Sign In OAuth flow
5. WHEN SSO authentication succeeds and the email exists in the Backend_API, THE Auth_System SHALL verify the SSO provider is linked to the account
6. WHEN SSO authentication succeeds and the provider is linked, THE Auth_System SHALL generate a JWT token and refresh token
7. WHEN SSO login succeeds, THE Auth_System SHALL store tokens in the Token_Store
8. WHEN SSO login succeeds, THE Frontend_App SHALL navigate the user to the home screen
9. IF SSO authentication succeeds but the email does not exist in the Backend_API, THEN THE Frontend_App SHALL navigate to the registration flow
10. IF SSO authentication fails, THEN THE Frontend_App SHALL display an error message "Sign in failed. Please try again"


### Requirement 8: Session Management with JWT

**User Story:** As a logged-in user, I want my session to persist securely, so that I don't have to log in every time I open the app.

#### Acceptance Criteria

1. WHEN a user successfully authenticates, THE Auth_System SHALL generate a JWT access token with 15 minutes expiration
2. WHEN a user successfully authenticates, THE Auth_System SHALL generate a JWT refresh token with 7 days expiration
3. WHEN tokens are generated, THE Auth_System SHALL store the access token in the Token_Store
4. WHEN tokens are generated, THE Auth_System SHALL store the refresh token in the Token_Store
5. WHEN the Frontend_App makes an API request, THE Auth_System SHALL include the access token in the Authorization header
6. WHEN the access token expires, THE Auth_System SHALL automatically use the refresh token to obtain a new access token
7. WHEN token refresh succeeds, THE Auth_System SHALL store the new access token in the Token_Store
8. WHEN token refresh succeeds, THE Frontend_App SHALL retry the original API request with the new token
9. IF the refresh token is expired or invalid, THEN THE Auth_System SHALL clear all stored tokens
10. IF the refresh token is expired or invalid, THEN THE Frontend_App SHALL navigate the user to the login screen
11. WHEN the Frontend_App launches, THE Auth_System SHALL check for valid tokens in the Token_Store
12. WHEN valid tokens exist on app launch, THE Frontend_App SHALL navigate the user to the home screen
13. WHEN no valid tokens exist on app launch, THE Frontend_App SHALL navigate the user to the login screen

### Requirement 9: Remember Me Functionality

**User Story:** As a user, I want the option to stay logged in, so that I can access the app quickly without re-entering credentials.

#### Acceptance Criteria

1. THE Login_Form SHALL display a "Remember Me" checkbox
2. WHEN a user enables "Remember Me" and logs in successfully, THE Auth_System SHALL generate a refresh token with 30 days expiration
3. WHEN a user disables "Remember Me" and logs in successfully, THE Auth_System SHALL generate a refresh token with 7 days expiration
4. WHEN "Remember Me" is enabled, THE Token_Store SHALL persist tokens across app restarts
5. WHEN "Remember Me" is disabled, THE Token_Store SHALL clear tokens when the app is closed

### Requirement 10: User Logout

**User Story:** As a logged-in user, I want to log out of my account, so that I can secure my account when I'm done using the app.

#### Acceptance Criteria

1. WHEN a user initiates logout, THE Auth_System SHALL send a logout request to the Backend_API
2. WHEN logout is initiated, THE Auth_System SHALL clear the access token from the Token_Store
3. WHEN logout is initiated, THE Auth_System SHALL clear the refresh token from the Token_Store
4. WHEN logout is initiated, THE Auth_System SHALL clear user data from local storage
5. WHEN logout completes, THE Frontend_App SHALL navigate the user to the login screen
6. WHEN logout completes, THE Frontend_App SHALL clear all Redux state related to the authenticated user
7. IF the logout API request fails, THEN THE Auth_System SHALL still clear local tokens and user data

### Requirement 11: Password Reset Request

**User Story:** As a user who forgot my password, I want to request a password reset, so that I can regain access to my account.

#### Acceptance Criteria

1. WHEN a user taps "Forgot Password?" on the Login_Form, THE Frontend_App SHALL navigate to the password reset request screen
2. THE password reset request screen SHALL display an email input field
3. WHEN a user enters an email and submits the request, THE Auth_System SHALL send the request to the Backend_API
4. WHEN the email exists in the Backend_API, THE Email_Service SHALL send a password reset email with a unique token
5. WHEN the password reset email is sent, THE Frontend_App SHALL display a success message "Password reset email sent. Please check your inbox"
6. WHEN the email does not exist in the Backend_API, THE Frontend_App SHALL display the same success message to prevent email enumeration
7. THE password reset token SHALL expire after 1 hour
8. THE password reset email SHALL include a link to the password reset screen with the token as a parameter


### Requirement 12: Password Reset Completion

**User Story:** As a user who requested a password reset, I want to set a new password, so that I can access my account again.

#### Acceptance Criteria

1. WHEN a user opens the password reset link, THE Frontend_App SHALL navigate to the password reset screen with the token
2. THE password reset screen SHALL display fields for New Password and Confirm New Password
3. WHEN a user enters a New Password, THE Validator SHALL apply the same password validation rules as registration
4. WHEN a user enters a Confirm New Password that does not match the New Password, THE Validator SHALL display an inline error message "Passwords do not match"
5. WHEN a user submits valid passwords, THE Auth_System SHALL verify the reset token with the Backend_API
6. WHEN the reset token is valid, THE Auth_System SHALL hash the new password using bcrypt
7. WHEN the reset token is valid, THE Backend_API SHALL update the user's password
8. WHEN password reset succeeds, THE Frontend_App SHALL display a success message "Password reset successful. Please log in with your new password"
9. WHEN password reset succeeds, THE Frontend_App SHALL navigate the user to the login screen
10. IF the reset token is expired or invalid, THEN THE Frontend_App SHALL display an error message "Password reset link is invalid or expired. Please request a new one"
11. IF the reset token is expired or invalid, THEN THE Frontend_App SHALL provide a link to request a new password reset

### Requirement 13: Security - Password Hashing

**User Story:** As a system administrator, I want user passwords to be securely hashed, so that user accounts are protected even if the database is compromised.

#### Acceptance Criteria

1. WHEN a user registers with a password, THE Auth_System SHALL hash the password using bcrypt with a cost factor of 10
2. WHEN a user resets their password, THE Auth_System SHALL hash the new password using bcrypt with a cost factor of 10
3. THE Backend_API SHALL store only the hashed password in the database
4. WHEN a user logs in, THE Auth_System SHALL compare the provided password with the stored hash using bcrypt compare function
5. THE Auth_System SHALL never log or transmit passwords in plain text

### Requirement 14: Security - HTTPS and Token Storage

**User Story:** As a user, I want my authentication data to be transmitted and stored securely, so that my account cannot be compromised.

#### Acceptance Criteria

1. THE Backend_API SHALL require HTTPS for all authentication endpoints
2. WHEN running on iOS or Android, THE Token_Store SHALL use Expo SecureStore for token storage
3. WHEN running on web, THE Token_Store SHALL use secure HTTP-only cookies for token storage
4. THE Auth_System SHALL include the httpOnly flag on web cookies to prevent JavaScript access
5. THE Auth_System SHALL include the secure flag on web cookies to require HTTPS
6. THE Auth_System SHALL include the sameSite flag on web cookies to prevent CSRF attacks
7. THE JWT tokens SHALL be signed with a secret key stored in environment variables
8. THE Backend_API SHALL validate JWT signatures on every authenticated request

### Requirement 15: Security - Rate Limiting

**User Story:** As a system administrator, I want to prevent brute force attacks on authentication endpoints, so that user accounts remain secure.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL limit login attempts to 5 requests per IP address per 15 minutes
2. THE Rate_Limiter SHALL limit registration attempts to 3 requests per IP address per 15 minutes
3. THE Rate_Limiter SHALL limit password reset requests to 3 requests per IP address per 15 minutes
4. WHEN rate limit is exceeded for login, THE Backend_API SHALL return an error response with status code 429
5. WHEN rate limit is exceeded for login, THE Login_Form SHALL display an error message "Too many login attempts. Please try again in 15 minutes"
6. WHEN rate limit is exceeded for registration, THE Backend_API SHALL return an error response with status code 429
7. WHEN rate limit is exceeded for registration, THE Registration_Form SHALL display an error message "Too many registration attempts. Please try again in 15 minutes"
8. WHEN rate limit is exceeded for password reset, THE Backend_API SHALL return an error response with status code 429
9. WHEN rate limit is exceeded for password reset, THE Frontend_App SHALL display an error message "Too many password reset requests. Please try again in 15 minutes"


### Requirement 16: Error Handling - Network Errors

**User Story:** As a user, I want to be informed when network errors occur during authentication, so that I understand why my action failed.

#### Acceptance Criteria

1. WHEN a network request fails due to no internet connection, THE Frontend_App SHALL display an error message "No internet connection. Please check your network and try again"
2. WHEN a network request times out after 30 seconds, THE Frontend_App SHALL display an error message "Request timed out. Please try again"
3. WHEN the Backend_API is unavailable, THE Frontend_App SHALL display an error message "Service temporarily unavailable. Please try again later"
4. WHEN a network error occurs during login, THE Login_Form SHALL remain populated with the entered email/username
5. WHEN a network error occurs during registration, THE Registration_Form SHALL remain populated with all entered data
6. WHEN a network error occurs, THE Frontend_App SHALL provide a "Retry" button

### Requirement 17: Error Handling - Validation Errors

**User Story:** As a user, I want to see clear validation errors as I fill out forms, so that I can correct mistakes before submitting.

#### Acceptance Criteria

1. WHEN a user types in an input field and then leaves the field, THE Validator SHALL check the field value
2. WHEN a field fails validation on blur, THE Validator SHALL display an inline error message below the field
3. WHEN a user corrects an invalid field, THE Validator SHALL remove the error message immediately
4. WHEN a user submits a form with validation errors, THE Frontend_App SHALL focus on the first invalid field
5. WHEN validation errors exist, THE Frontend_App SHALL disable the submit button
6. THE Validator SHALL display error messages in Track red color (#D45B5D)
7. THE Validator SHALL display a red border around invalid input fields

### Requirement 18: User Experience - Loading States

**User Story:** As a user, I want to see loading indicators during authentication operations, so that I know the system is processing my request.

#### Acceptance Criteria

1. WHEN a user submits the Login_Form, THE Frontend_App SHALL display a loading spinner on the submit button
2. WHEN a user submits the Registration_Form, THE Frontend_App SHALL display a loading spinner on the submit button
3. WHEN SSO authentication is in progress, THE Frontend_App SHALL display a loading overlay with the message "Signing in..."
4. WHEN password reset is in progress, THE Frontend_App SHALL display a loading spinner on the submit button
5. WHILE authentication is in progress, THE Frontend_App SHALL disable all form inputs
6. WHILE authentication is in progress, THE Frontend_App SHALL disable the submit button
7. WHEN authentication completes, THE Frontend_App SHALL remove the loading indicator

### Requirement 19: User Experience - Navigation Between Login and Registration

**User Story:** As a user, I want to easily switch between login and registration screens, so that I can access the appropriate form.

#### Acceptance Criteria

1. THE Login_Form SHALL display a "Don't have an account? Sign Up" link at the bottom
2. WHEN a user taps "Don't have an account? Sign Up", THE Frontend_App SHALL navigate to the Registration_Form
3. THE Registration_Form SHALL display an "Already have an account? Log In" link at the bottom
4. WHEN a user taps "Already have an account? Log In", THE Frontend_App SHALL navigate to the Login_Form
5. WHEN navigating between forms, THE Frontend_App SHALL clear all form data
6. WHEN navigating between forms, THE Frontend_App SHALL clear all error messages

### Requirement 20: User Experience - Terms of Service and Privacy Policy

**User Story:** As a new user, I want to review the Terms of Service and Privacy Policy before registering, so that I understand what I'm agreeing to.

#### Acceptance Criteria

1. THE Registration_Form SHALL display a checkbox labeled "I agree to the Terms of Service and Privacy Policy"
2. THE Terms of Service text SHALL be a clickable link that opens the Terms of Service document
3. THE Privacy Policy text SHALL be a clickable link that opens the Privacy Policy document
4. WHEN a user attempts to submit the Registration_Form without checking the agreement checkbox, THE Validator SHALL display an error message "You must agree to the Terms of Service and Privacy Policy"
5. WHEN the agreement checkbox is not checked, THE Frontend_App SHALL disable the submit button


### Requirement 21: Database Schema - User Model Extensions

**User Story:** As a system administrator, I want the database to support multiple authentication methods, so that users can authenticate via email/password or SSO providers.

#### Acceptance Criteria

1. THE Backend_API SHALL add an ssoProviders field to the User model as a JSON array
2. THE Backend_API SHALL add an ssoProviderIds field to the User model as a JSON object mapping provider names to provider user IDs
3. THE Backend_API SHALL make the password field nullable in the User model to support SSO-only accounts
4. WHEN a user registers via SSO, THE Backend_API SHALL store the provider name in the ssoProviders array
5. WHEN a user registers via SSO, THE Backend_API SHALL store the provider user ID in the ssoProviderIds object
6. WHEN a user links an additional SSO provider, THE Backend_API SHALL append the provider to the ssoProviders array
7. WHEN a user links an additional SSO provider, THE Backend_API SHALL add the provider user ID to the ssoProviderIds object
8. THE Backend_API SHALL maintain the existing username field as unique and optional

### Requirement 22: API Endpoints - Registration

**User Story:** As a frontend developer, I want well-defined API endpoints for registration, so that I can implement the registration flow.

#### Acceptance Criteria

1. THE Backend_API SHALL provide a POST /api/auth/register endpoint for manual registration
2. THE /api/auth/register endpoint SHALL accept firstName, lastName, email, username, password, and agreedToTerms in the request body
3. WHEN registration succeeds, THE /api/auth/register endpoint SHALL return status code 201 with user data, access token, and refresh token
4. WHEN email already exists, THE /api/auth/register endpoint SHALL return status code 409 with error message "This email is already registered"
5. WHEN username already exists, THE /api/auth/register endpoint SHALL return status code 409 with error message "This username is taken"
6. WHEN validation fails, THE /api/auth/register endpoint SHALL return status code 400 with detailed validation errors
7. THE Backend_API SHALL provide a POST /api/auth/register/sso endpoint for SSO registration
8. THE /api/auth/register/sso endpoint SHALL accept provider, providerToken, providerUserId, email, firstName, lastName, and username in the request body
9. WHEN SSO registration succeeds, THE /api/auth/register/sso endpoint SHALL return status code 201 with user data, access token, and refresh token

### Requirement 23: API Endpoints - Login

**User Story:** As a frontend developer, I want well-defined API endpoints for login, so that I can implement the login flow.

#### Acceptance Criteria

1. THE Backend_API SHALL provide a POST /api/auth/login endpoint for manual login
2. THE /api/auth/login endpoint SHALL accept emailOrUsername and password in the request body
3. THE /api/auth/login endpoint SHALL check both email and username fields for a match
4. WHEN login succeeds, THE /api/auth/login endpoint SHALL return status code 200 with user data, access token, and refresh token
5. WHEN credentials are invalid, THE /api/auth/login endpoint SHALL return status code 401 with error message "Invalid email or password"
6. THE Backend_API SHALL provide a POST /api/auth/login/sso endpoint for SSO login
7. THE /api/auth/login/sso endpoint SHALL accept provider, providerToken, and providerUserId in the request body
8. WHEN SSO login succeeds, THE /api/auth/login/sso endpoint SHALL return status code 200 with user data, access token, and refresh token
9. WHEN SSO provider is not linked to any account, THE /api/auth/login/sso endpoint SHALL return status code 404 with error message "No account found with this provider"

### Requirement 24: API Endpoints - Account Linking

**User Story:** As a frontend developer, I want well-defined API endpoints for account linking, so that I can implement the account linking flow.

#### Acceptance Criteria

1. THE Backend_API SHALL provide a POST /api/auth/link-account endpoint for linking SSO providers
2. THE /api/auth/link-account endpoint SHALL accept email, password, provider, providerToken, and providerUserId in the request body
3. WHEN account linking succeeds, THE /api/auth/link-account endpoint SHALL return status code 200 with user data, access token, and refresh token
4. WHEN password is incorrect, THE /api/auth/link-account endpoint SHALL return status code 401 with error message "Incorrect password"
5. WHEN email does not exist, THE /api/auth/link-account endpoint SHALL return status code 404 with error message "No account found with this email"
6. WHEN provider is already linked to the account, THE /api/auth/link-account endpoint SHALL return status code 409 with error message "This provider is already linked to your account"


### Requirement 25: API Endpoints - Token Management

**User Story:** As a frontend developer, I want well-defined API endpoints for token management, so that I can implement session persistence.

#### Acceptance Criteria

1. THE Backend_API SHALL provide a POST /api/auth/refresh endpoint for refreshing access tokens
2. THE /api/auth/refresh endpoint SHALL accept refreshToken in the request body
3. WHEN refresh token is valid, THE /api/auth/refresh endpoint SHALL return status code 200 with a new access token and refresh token
4. WHEN refresh token is expired, THE /api/auth/refresh endpoint SHALL return status code 401 with error message "Refresh token expired"
5. WHEN refresh token is invalid, THE /api/auth/refresh endpoint SHALL return status code 401 with error message "Invalid refresh token"
6. THE Backend_API SHALL provide a POST /api/auth/logout endpoint for logging out
7. THE /api/auth/logout endpoint SHALL accept the access token in the Authorization header
8. WHEN logout succeeds, THE /api/auth/logout endpoint SHALL return status code 200
9. THE Backend_API SHALL invalidate the refresh token on logout

### Requirement 26: API Endpoints - Password Reset

**User Story:** As a frontend developer, I want well-defined API endpoints for password reset, so that I can implement the password reset flow.

#### Acceptance Criteria

1. THE Backend_API SHALL provide a POST /api/auth/forgot-password endpoint for requesting password resets
2. THE /api/auth/forgot-password endpoint SHALL accept email in the request body
3. WHEN password reset request succeeds, THE /api/auth/forgot-password endpoint SHALL return status code 200
4. THE /api/auth/forgot-password endpoint SHALL return status code 200 even when email does not exist to prevent email enumeration
5. THE Backend_API SHALL provide a POST /api/auth/reset-password endpoint for completing password resets
6. THE /api/auth/reset-password endpoint SHALL accept resetToken and newPassword in the request body
7. WHEN password reset succeeds, THE /api/auth/reset-password endpoint SHALL return status code 200
8. WHEN reset token is expired, THE /api/auth/reset-password endpoint SHALL return status code 401 with error message "Password reset link is invalid or expired"
9. WHEN reset token is invalid, THE /api/auth/reset-password endpoint SHALL return status code 401 with error message "Password reset link is invalid or expired"

### Requirement 27: Platform Support - iOS

**User Story:** As an iOS user, I want to use Apple Sign In to authenticate, so that I can quickly access the app with my Apple ID.

#### Acceptance Criteria

1. WHEN running on iOS, THE Frontend_App SHALL use expo-apple-authentication for Apple Sign In
2. WHEN running on iOS, THE Frontend_App SHALL request user's email, firstName, and lastName from Apple
3. WHEN running on iOS, THE Token_Store SHALL use Expo SecureStore for token storage
4. THE Frontend_App SHALL handle iOS-specific Apple Sign In errors gracefully
5. THE Frontend_App SHALL comply with Apple's Human Interface Guidelines for Sign in with Apple button placement and styling

### Requirement 28: Platform Support - Android

**User Story:** As an Android user, I want to use Google Sign In to authenticate, so that I can quickly access the app with my Google account.

#### Acceptance Criteria

1. WHEN running on Android, THE Frontend_App SHALL use expo-auth-session with Google OAuth for Google Sign In
2. WHEN running on Android, THE Frontend_App SHALL request user's email, firstName, and lastName from Google
3. WHEN running on Android, THE Token_Store SHALL use Expo SecureStore for token storage
4. THE Frontend_App SHALL handle Android-specific Google Sign In errors gracefully
5. THE Frontend_App SHALL comply with Google's Material Design guidelines for Sign in with Google button placement and styling

### Requirement 29: Platform Support - Web

**User Story:** As a web user, I want to authenticate using email/password or SSO, so that I can access the platform from my browser.

#### Acceptance Criteria

1. WHEN running on web, THE Frontend_App SHALL use expo-auth-session for both Apple and Google Sign In
2. WHEN running on web, THE Token_Store SHALL use secure HTTP-only cookies for token storage
3. WHEN running on web, THE Frontend_App SHALL handle browser-specific authentication flows
4. THE Frontend_App SHALL support keyboard navigation for all authentication forms on web
5. THE Frontend_App SHALL be responsive and work on desktop and mobile browsers


### Requirement 30: Accessibility - Screen Reader Support

**User Story:** As a visually impaired user, I want authentication forms to be accessible with screen readers, so that I can create an account and log in independently.

#### Acceptance Criteria

1. THE Registration_Form SHALL provide accessible labels for all input fields
2. THE Login_Form SHALL provide accessible labels for all input fields
3. WHEN validation errors occur, THE Frontend_App SHALL announce error messages to screen readers
4. THE Frontend_App SHALL provide accessible labels for all buttons including SSO buttons
5. THE Frontend_App SHALL maintain proper focus order through all authentication forms
6. THE Frontend_App SHALL announce loading states to screen readers
7. THE Frontend_App SHALL announce success messages to screen readers

### Requirement 31: Accessibility - Keyboard Navigation

**User Story:** As a user who relies on keyboard navigation, I want to navigate authentication forms using only my keyboard, so that I can complete authentication without a mouse.

#### Acceptance Criteria

1. WHEN running on web, THE Frontend_App SHALL support Tab key navigation through all form fields
2. WHEN running on web, THE Frontend_App SHALL support Enter key to submit forms
3. WHEN running on web, THE Frontend_App SHALL display visible focus indicators on all interactive elements
4. WHEN running on web, THE Frontend_App SHALL support Escape key to close modals and overlays
5. THE Frontend_App SHALL maintain logical tab order through all authentication forms

### Requirement 32: Accessibility - Color Contrast

**User Story:** As a user with visual impairments, I want authentication forms to have sufficient color contrast, so that I can read all text and see all interactive elements.

#### Acceptance Criteria

1. THE Frontend_App SHALL maintain a minimum contrast ratio of 4.5:1 for all text on authentication forms
2. THE Frontend_App SHALL maintain a minimum contrast ratio of 3:1 for all interactive elements
3. THE Frontend_App SHALL use Track red (#D45B5D) for error messages with sufficient contrast against the background
4. THE Frontend_App SHALL use Grass green (#3D8C5E) for primary buttons with sufficient contrast for button text
5. THE Frontend_App SHALL not rely solely on color to convey validation errors

### Requirement 33: Performance - Token Refresh Optimization

**User Story:** As a user, I want authentication to be fast and seamless, so that I can access the app without delays.

#### Acceptance Criteria

1. WHEN the access token is within 5 minutes of expiration, THE Auth_System SHALL proactively refresh the token
2. WHEN multiple API requests are pending during token refresh, THE Auth_System SHALL queue requests and retry them with the new token
3. THE Auth_System SHALL cache the current user data in Redux to avoid unnecessary API calls
4. WHEN the app launches with valid tokens, THE Frontend_App SHALL display the home screen within 2 seconds
5. THE Auth_System SHALL perform token validation asynchronously to avoid blocking the UI

### Requirement 34: Testing - Unit Test Coverage

**User Story:** As a developer, I want comprehensive unit tests for authentication logic, so that I can confidently make changes without breaking functionality.

#### Acceptance Criteria

1. THE Auth_System SHALL have unit tests for all validation functions with minimum 90% code coverage
2. THE Auth_System SHALL have unit tests for password hashing and comparison
3. THE Auth_System SHALL have unit tests for JWT token generation and validation
4. THE Auth_System SHALL have unit tests for token refresh logic
5. THE Auth_System SHALL have unit tests for all error handling scenarios
6. THE Backend_API SHALL have unit tests for all authentication endpoints
7. THE Backend_API SHALL have unit tests for rate limiting logic

### Requirement 35: Testing - Integration Test Coverage

**User Story:** As a developer, I want integration tests for authentication flows, so that I can verify end-to-end functionality.

#### Acceptance Criteria

1. THE Auth_System SHALL have integration tests for the complete manual registration flow
2. THE Auth_System SHALL have integration tests for the complete login flow
3. THE Auth_System SHALL have integration tests for the password reset flow
4. THE Auth_System SHALL have integration tests for token refresh flow
5. THE Auth_System SHALL have integration tests for account linking flow
6. THE Auth_System SHALL have integration tests for logout flow
7. THE integration tests SHALL use a test database separate from development and production

