# iOS Platform Testing Guide

## Overview

This guide provides comprehensive testing procedures for the authentication and registration system on iOS platform. It covers manual registration, Apple Sign In, Google Sign In, login flows, password reset, token storage, and accessibility testing.

## Prerequisites

- iOS Simulator or physical iOS device
- Xcode installed (for physical device testing)
- Test environment set up (see test-environment-setup.md)
- Backend server running with test configuration

## Test Checklist

### 1. Manual Registration on iOS

**Test Case 1.1: Successful Registration**

Steps:
1. Launch app on iOS simulator/device
2. Navigate to Registration screen
3. Fill in all fields with valid data:
   - First Name: "John"
   - Last Name: "Doe"
   - Email: "john.doe.ios@test.com"
   - Username: "johndoe_ios"
   - Password: "Test123!@#"
   - Confirm Password: "Test123!@#"
4. Check "I agree to Terms of Service and Privacy Policy"
5. Tap "Register" button

Expected Results:
- [ ] Loading spinner appears on button
- [ ] Form inputs are disabled during submission
- [ ] Success message "Welcome to Muster" appears
- [ ] User is navigated to home screen
- [ ] User data is stored in SecureStore
- [ ] Tokens are stored securely

**Test Case 1.2: Validation Errors**

Steps:
1. Navigate to Registration screen
2. Test each validation rule:
   - Enter first name with 1 character → Error: "First name must be at least 2 characters"
   - Enter invalid email → Error: "Please enter a valid email address"
   - Enter username with 2 characters → Error: "Username must be at least 3 characters"
   - Enter username with special characters → Error: "Username can only contain letters, numbers, underscores, and dashes"
   - Enter password with 7 characters → Error: "Password must be at least 8 characters"
   - Enter password without uppercase → Error: "Password must contain at least one uppercase letter"
   - Enter password without lowercase → Error: "Password must contain at least one lowercase letter"
   - Enter password without number → Error: "Password must contain at least one number"
   - Enter password without special character → Error: "Password must contain at least one special character"
   - Enter mismatched passwords → Error: "Passwords do not match"

Expected Results:
- [ ] Error messages appear inline below fields
- [ ] Error messages are in Track red color (#D45B5D)
- [ ] Invalid fields have red border
- [ ] Submit button is disabled when errors exist
- [ ] Error messages disappear when field is corrected

**Test Case 1.3: Duplicate Email/Username**

Steps:
1. Register a user with email "duplicate@test.com" and username "duplicate_user"
2. Attempt to register another user with same email
3. Attempt to register another user with same username

Expected Results:
- [ ] Error message "This email is already registered" appears for duplicate email
- [ ] Error message "This username is taken" appears for duplicate username
- [ ] Other field values remain populated
- [ ] User can correct and resubmit


### 2. Apple Sign In on iOS

**IMPORTANT:** Apple Sign In requires a physical iOS device. It does not work in the iOS Simulator.

**Test Case 2.1: Successful Apple Sign In Registration**

Steps:
1. Launch app on physical iOS device
2. Navigate to Registration screen
3. Tap "Sign in with Apple" button
4. Authenticate with Apple ID in system dialog
5. Approve sharing email and name
6. Enter username in pre-populated form
7. Tap "Register" button

Expected Results:
- [ ] Apple Sign In system dialog appears
- [ ] First Name, Last Name, and Email are pre-populated
- [ ] Password fields are hidden
- [ ] Username field is shown and required
- [ ] Loading state appears during SSO flow
- [ ] Success message appears
- [ ] User is navigated to home screen
- [ ] User account is created with SSO provider "apple"
- [ ] Tokens are stored in SecureStore

**Test Case 2.2: Apple Sign In Button Design**

Verify Apple Sign In button follows iOS Human Interface Guidelines:
- [ ] Button uses Apple's standard "Sign in with Apple" design
- [ ] Button has Apple logo
- [ ] Button text is "Sign in with Apple"
- [ ] Button has appropriate height (44pt minimum)
- [ ] Button has rounded corners
- [ ] Button uses system font
- [ ] Button has proper contrast

**Test Case 2.3: Apple Sign In Cancellation**

Steps:
1. Tap "Sign in with Apple" button
2. Cancel in Apple Sign In dialog

Expected Results:
- [ ] Error message "Sign in with Apple failed. Please try again" appears
- [ ] User remains on registration screen
- [ ] Form is not submitted

**Test Case 2.4: Apple Sign In Account Linking**

Steps:
1. Register manually with email "apple.link@test.com"
2. Log out
3. Attempt to register with Apple Sign In using same email
4. Confirm account linking
5. Enter password for existing account

Expected Results:
- [ ] Account linking modal appears
- [ ] Modal shows "An account with this email already exists. Would you like to link your Apple account?"
- [ ] Password field is shown
- [ ] Correct password links accounts successfully
- [ ] Incorrect password shows error "Incorrect password. Please try again"
- [ ] After linking, user can log in with either method

### 3. Google Sign In on iOS

**Test Case 3.1: Successful Google Sign In Registration**

Steps:
1. Launch app on iOS simulator/device
2. Navigate to Registration screen
3. Tap "Sign in with Google" button
4. Select Google account in browser/dialog
5. Approve permissions
6. Enter username in pre-populated form
7. Tap "Register" button

Expected Results:
- [ ] Google Sign In flow opens (browser or in-app)
- [ ] First Name, Last Name, and Email are pre-populated
- [ ] Password fields are hidden
- [ ] Username field is shown and required
- [ ] Loading state appears during SSO flow
- [ ] Success message appears
- [ ] User is navigated to home screen
- [ ] User account is created with SSO provider "google"
- [ ] Tokens are stored in SecureStore

**Test Case 3.2: Google Sign In Cancellation**

Steps:
1. Tap "Sign in with Google" button
2. Cancel in Google Sign In dialog

Expected Results:
- [ ] Error message "Sign in with Google failed. Please try again" appears
- [ ] User remains on registration screen
- [ ] Form is not submitted


### 4. Login Flows on iOS

**Test Case 4.1: Login with Email and Password**

Steps:
1. Navigate to Login screen
2. Enter email: "john.doe.ios@test.com"
3. Enter password: "Test123!@#"
4. Tap "Log In" button

Expected Results:
- [ ] Loading spinner appears on button
- [ ] Form inputs are disabled during submission
- [ ] User is navigated to home screen
- [ ] Tokens are stored in SecureStore
- [ ] User data is cached in Redux

**Test Case 4.2: Login with Username and Password**

Steps:
1. Navigate to Login screen
2. Enter username: "johndoe_ios"
3. Enter password: "Test123!@#"
4. Tap "Log In" button

Expected Results:
- [ ] Login succeeds with username
- [ ] Same behavior as email login

**Test Case 4.3: Invalid Credentials**

Steps:
1. Navigate to Login screen
2. Enter email: "john.doe.ios@test.com"
3. Enter incorrect password: "WrongPassword123!"
4. Tap "Log In" button

Expected Results:
- [ ] Error message "Invalid email or password" appears
- [ ] Password field is cleared
- [ ] Email/username field remains populated
- [ ] User can retry

**Test Case 4.4: Apple Sign In Login**

Steps:
1. Navigate to Login screen (on physical device)
2. Tap "Sign in with Apple" button
3. Authenticate with Apple ID

Expected Results:
- [ ] Apple Sign In dialog appears
- [ ] User is logged in successfully
- [ ] User is navigated to home screen
- [ ] Tokens are stored in SecureStore

**Test Case 4.5: Google Sign In Login**

Steps:
1. Navigate to Login screen
2. Tap "Sign in with Google" button
3. Select Google account

Expected Results:
- [ ] Google Sign In flow opens
- [ ] User is logged in successfully
- [ ] User is navigated to home screen
- [ ] Tokens are stored in SecureStore

### 5. Password Reset on iOS

**Test Case 5.1: Request Password Reset**

Steps:
1. Navigate to Login screen
2. Tap "Forgot Password?" link
3. Enter email: "john.doe.ios@test.com"
4. Tap "Send Reset Link" button

Expected Results:
- [ ] Loading spinner appears
- [ ] Success message "Password reset email sent. Please check your inbox" appears
- [ ] Email is sent to configured SMTP service
- [ ] Same message appears for non-existent email (enumeration prevention)

**Test Case 5.2: Complete Password Reset**

Steps:
1. Open password reset email
2. Tap reset link (opens app via deep link)
3. Enter new password: "NewTest123!@#"
4. Enter confirm password: "NewTest123!@#"
5. Tap "Reset Password" button

Expected Results:
- [ ] App opens to Reset Password screen
- [ ] Reset token is extracted from URL
- [ ] Password validation works
- [ ] Success message "Password reset successful. Please log in with your new password" appears
- [ ] User is navigated to login screen
- [ ] User can log in with new password

**Test Case 5.3: Expired Reset Token**

Steps:
1. Use a reset link older than 1 hour
2. Attempt to reset password

Expected Results:
- [ ] Error message "Password reset link is invalid or expired. Please request a new one" appears
- [ ] Link to request new reset is provided

### 6. Token Storage with SecureStore on iOS

**Test Case 6.1: Token Persistence**

Steps:
1. Log in successfully
2. Close app completely (swipe up from app switcher)
3. Reopen app

Expected Results:
- [ ] User remains logged in
- [ ] App navigates directly to home screen
- [ ] No login screen is shown
- [ ] Tokens are retrieved from SecureStore

**Test Case 6.2: Token Security**

Verify:
- [ ] Tokens are stored in iOS Keychain via SecureStore
- [ ] Tokens are not accessible to other apps
- [ ] Tokens are encrypted at rest
- [ ] Tokens are cleared on logout

### 7. Remember Me Functionality on iOS

**Test Case 7.1: Remember Me Enabled**

Steps:
1. Navigate to Login screen
2. Check "Remember Me" checkbox
3. Log in successfully
4. Close app completely
5. Wait 8 days
6. Reopen app

Expected Results:
- [ ] User remains logged in after 8 days
- [ ] Refresh token has 30-day expiration
- [ ] App navigates to home screen

**Test Case 7.2: Remember Me Disabled**

Steps:
1. Navigate to Login screen
2. Uncheck "Remember Me" checkbox
3. Log in successfully
4. Close app completely
5. Wait 8 days
6. Reopen app

Expected Results:
- [ ] User is logged out after 7 days
- [ ] Refresh token has 7-day expiration
- [ ] App navigates to login screen


### 8. Logout on iOS

**Test Case 8.1: Successful Logout**

Steps:
1. Log in successfully
2. Navigate to profile/settings
3. Tap "Log Out" button
4. Confirm logout

Expected Results:
- [ ] Logout API request is sent
- [ ] Tokens are cleared from SecureStore
- [ ] User data is cleared from Redux
- [ ] User is navigated to login screen
- [ ] Cannot navigate back to authenticated screens

**Test Case 8.2: Logout with API Failure**

Steps:
1. Log in successfully
2. Disconnect from network
3. Attempt to log out

Expected Results:
- [ ] Tokens are still cleared locally
- [ ] User data is still cleared
- [ ] User is navigated to login screen
- [ ] Logout completes even if API fails

### 9. Accessibility Testing with VoiceOver

**Test Case 9.1: VoiceOver Navigation**

Steps:
1. Enable VoiceOver (Settings > Accessibility > VoiceOver)
2. Navigate through Registration screen
3. Navigate through Login screen

Expected Results:
- [ ] All form fields have descriptive labels
- [ ] Labels are read aloud by VoiceOver
- [ ] Field types are announced (text field, secure text field, button)
- [ ] Error messages are announced when they appear
- [ ] Loading states are announced
- [ ] Success messages are announced
- [ ] Navigation between fields works with swipe gestures

**Test Case 9.2: VoiceOver Form Completion**

Steps:
1. With VoiceOver enabled, complete registration form
2. Submit form

Expected Results:
- [ ] Can enter text in all fields using VoiceOver
- [ ] Can toggle checkbox with VoiceOver
- [ ] Can activate buttons with VoiceOver
- [ ] Form submission works correctly
- [ ] Success/error feedback is accessible

**Test Case 9.3: VoiceOver SSO Buttons**

Steps:
1. With VoiceOver enabled, navigate to SSO buttons
2. Activate Apple Sign In button
3. Activate Google Sign In button

Expected Results:
- [ ] SSO buttons have descriptive labels
- [ ] Button purpose is clear from label
- [ ] Buttons are activatable with VoiceOver
- [ ] Loading states are announced

### 10. Keyboard Navigation

**Test Case 10.1: Tab Order**

Steps:
1. Connect external keyboard to iOS device
2. Navigate through form using Tab key

Expected Results:
- [ ] Tab key moves focus to next field
- [ ] Shift+Tab moves focus to previous field
- [ ] Tab order is logical (top to bottom)
- [ ] All interactive elements are reachable
- [ ] Focus indicator is visible

**Test Case 10.2: Keyboard Shortcuts**

Steps:
1. Test keyboard shortcuts on forms

Expected Results:
- [ ] Return key submits form when on last field
- [ ] Return key moves to next field when not on last field
- [ ] Escape key dismisses keyboard
- [ ] Keyboard type is appropriate for field (email, default, etc.)

### 11. Touch Target Sizes

**Test Case 11.1: Minimum Touch Targets**

Verify all interactive elements meet iOS minimum touch target size (44x44pt):
- [ ] Text input fields
- [ ] Buttons (Register, Log In, SSO buttons)
- [ ] Checkboxes
- [ ] Links (Forgot Password, Sign Up, Terms of Service)
- [ ] Password visibility toggle

### 12. Visual Design Compliance

**Test Case 12.1: Brand Colors**

Verify correct use of Muster brand colors:
- [ ] Primary button uses Grass green (#3D8C5E)
- [ ] Error messages use Track red (#D45B5D)
- [ ] Error borders use Track red
- [ ] Links use Sky blue (#5B9FD4)
- [ ] Text uses Ink (#1C2320) or Soft (#6B7C76)

**Test Case 12.2: Typography**

Verify typography follows design system:
- [ ] Form labels use appropriate font size
- [ ] Input text is readable
- [ ] Error messages are legible
- [ ] Button text is clear

**Test Case 12.3: Spacing and Layout**

Verify consistent spacing:
- [ ] Fields have appropriate spacing (16px)
- [ ] Buttons have proper padding
- [ ] Screen margins are consistent
- [ ] Layout adapts to different iPhone sizes

### 13. Network Error Handling

**Test Case 13.1: No Internet Connection**

Steps:
1. Disable Wi-Fi and cellular data
2. Attempt to register/login

Expected Results:
- [ ] Error message "No internet connection. Please check your network and try again" appears
- [ ] Retry button is provided
- [ ] Form data is preserved

**Test Case 13.2: Request Timeout**

Steps:
1. Simulate slow network
2. Attempt to register/login

Expected Results:
- [ ] Request times out after 30 seconds
- [ ] Error message "Request timed out. Please try again" appears
- [ ] Retry button is provided

**Test Case 13.3: Server Unavailable**

Steps:
1. Stop backend server
2. Attempt to register/login

Expected Results:
- [ ] Error message "Service temporarily unavailable. Please try again later" appears
- [ ] Retry button is provided

## Test Results Summary

### Passed Tests: _____ / _____

### Failed Tests:

| Test Case | Issue Description | Severity | Notes |
|-----------|------------------|----------|-------|
|           |                  |          |       |

### Issues Found:

1. **Issue Title**
   - Description:
   - Steps to Reproduce:
   - Expected Behavior:
   - Actual Behavior:
   - Severity: Critical / High / Medium / Low
   - Platform: iOS
   - Device/Simulator:
   - iOS Version:

## Notes

- Document any platform-specific behaviors
- Note any performance issues
- Record any unexpected behaviors
- Capture screenshots of issues
- Note device/simulator used for testing
- Record iOS version tested

## Sign-off

- Tester Name: _______________
- Date: _______________
- iOS Version: _______________
- Device/Simulator: _______________
- Test Environment: _______________
