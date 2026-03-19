# Web Platform Testing Guide

## Overview

This guide provides comprehensive testing procedures for the authentication and registration system on Web platform. It covers manual registration, Apple Sign In, Google Sign In, login flows, password reset, token storage with HTTP-only cookies, keyboard navigation, responsive design, and accessibility testing.

## Prerequisites

- Modern web browsers (Chrome, Firefox, Safari)
- Test environment set up (see test-environment-setup.md)
- Backend server running with test configuration
- Screen readers installed (NVDA for Windows, JAWS, VoiceOver for macOS)

## Test Checklist

### 1. Manual Registration on Web Browsers

**Test Case 1.1: Successful Registration (Chrome)**

Steps:
1. Open Chrome browser
2. Navigate to http://localhost:8081
3. Navigate to Registration screen
4. Fill in all fields with valid data:
   - First Name: "Alex"
   - Last Name: "Johnson"
   - Email: "alex.johnson.web@test.com"
   - Username: "alexjohnson_web"
   - Password: "Test123!@#"
   - Confirm Password: "Test123!@#"
5. Check "I agree to Terms of Service and Privacy Policy"
6. Click "Register" button

Expected Results:
- [ ] Loading spinner appears on button
- [ ] Form inputs are disabled during submission
- [ ] Success message "Welcome to Muster" appears
- [ ] User is navigated to home screen
- [ ] Tokens are stored in HTTP-only cookies
- [ ] User data is cached in browser

**Test Case 1.2: Registration on Firefox**

Repeat Test Case 1.1 on Firefox browser with email "alex.firefox@test.com"

Expected Results:
- [ ] All functionality works identically to Chrome
- [ ] Cookies are set correctly
- [ ] No browser-specific issues

**Test Case 1.3: Registration on Safari**

Repeat Test Case 1.1 on Safari browser with email "alex.safari@test.com"

Expected Results:
- [ ] All functionality works identically to Chrome
- [ ] Cookies are set correctly
- [ ] No browser-specific issues

**Test Case 1.4: Validation Errors**

Steps:
1. Navigate to Registration screen
2. Test each validation rule (same as mobile platforms)

Expected Results:
- [ ] Error messages appear inline below fields
- [ ] Error messages are in Track red color (#D45B5D)
- [ ] Invalid fields have red border
- [ ] Submit button is disabled when errors exist
- [ ] Error messages disappear when field is corrected
- [ ] Focus moves to first invalid field on submit

### 2. Apple Sign In on Web

**Test Case 2.1: Successful Apple Sign In Registration**

Steps:
1. Navigate to Registration screen in browser
2. Click "Sign in with Apple" button
3. Authenticate with Apple ID in popup/redirect
4. Approve sharing email and name
5. Return to app
6. Enter username in pre-populated form
7. Click "Register" button

Expected Results:
- [ ] Apple Sign In popup/redirect opens
- [ ] First Name, Last Name, and Email are pre-populated
- [ ] Password fields are hidden
- [ ] Username field is shown and required
- [ ] Loading state appears during SSO flow
- [ ] Success message appears
- [ ] User is navigated to home screen
- [ ] User account is created with SSO provider "apple"
- [ ] Tokens are stored in HTTP-only cookies

**Test Case 2.2: Apple Sign In Popup Blocker**

Steps:
1. Enable popup blocker in browser
2. Click "Sign in with Apple" button

Expected Results:
- [ ] User is notified about popup blocker
- [ ] Alternative flow is provided (redirect instead of popup)
- [ ] SSO flow completes successfully


### 3. Google Sign In on Web

**Test Case 3.1: Successful Google Sign In Registration**

Steps:
1. Navigate to Registration screen in browser
2. Click "Sign in with Google" button
3. Select Google account in popup/redirect
4. Approve permissions
5. Return to app
6. Enter username in pre-populated form
7. Click "Register" button

Expected Results:
- [ ] Google Sign In popup/redirect opens
- [ ] First Name, Last Name, and Email are pre-populated
- [ ] Password fields are hidden
- [ ] Username field is shown and required
- [ ] Loading state appears during SSO flow
- [ ] Success message appears
- [ ] User is navigated to home screen
- [ ] User account is created with SSO provider "google"
- [ ] Tokens are stored in HTTP-only cookies

**Test Case 3.2: Google Sign In Cancellation**

Steps:
1. Click "Sign in with Google" button
2. Close popup or cancel in Google dialog

Expected Results:
- [ ] Error message "Sign in with Google failed. Please try again" appears
- [ ] User remains on registration screen
- [ ] Form is not submitted

### 4. Login Flows on Web

**Test Case 4.1: Login with Email and Password**

Steps:
1. Navigate to Login screen
2. Enter email: "alex.johnson.web@test.com"
3. Enter password: "Test123!@#"
4. Click "Log In" button

Expected Results:
- [ ] Loading spinner appears on button
- [ ] Form inputs are disabled during submission
- [ ] User is navigated to home screen
- [ ] Tokens are stored in HTTP-only cookies
- [ ] User data is cached in browser storage

**Test Case 4.2: Login with Username and Password**

Steps:
1. Navigate to Login screen
2. Enter username: "alexjohnson_web"
3. Enter password: "Test123!@#"
4. Click "Log In" button

Expected Results:
- [ ] Login succeeds with username
- [ ] Same behavior as email login

**Test Case 4.3: Invalid Credentials**

Steps:
1. Navigate to Login screen
2. Enter email: "alex.johnson.web@test.com"
3. Enter incorrect password: "WrongPassword123!"
4. Click "Log In" button

Expected Results:
- [ ] Error message "Invalid email or password" appears
- [ ] Password field is cleared
- [ ] Email/username field remains populated
- [ ] User can retry

**Test Case 4.4: Apple Sign In Login**

Steps:
1. Navigate to Login screen
2. Click "Sign in with Apple" button
3. Authenticate with Apple ID

Expected Results:
- [ ] Apple Sign In popup/redirect opens
- [ ] User is logged in successfully
- [ ] User is navigated to home screen
- [ ] Tokens are stored in HTTP-only cookies

**Test Case 4.5: Google Sign In Login**

Steps:
1. Navigate to Login screen
2. Click "Sign in with Google" button
3. Select Google account

Expected Results:
- [ ] Google Sign In popup/redirect opens
- [ ] User is logged in successfully
- [ ] User is navigated to home screen
- [ ] Tokens are stored in HTTP-only cookies

### 5. Password Reset on Web

**Test Case 5.1: Request Password Reset**

Steps:
1. Navigate to Login screen
2. Click "Forgot Password?" link
3. Enter email: "alex.johnson.web@test.com"
4. Click "Send Reset Link" button

Expected Results:
- [ ] Loading spinner appears
- [ ] Success message "Password reset email sent. Please check your inbox" appears
- [ ] Email is sent to configured SMTP service
- [ ] Same message appears for non-existent email (enumeration prevention)

**Test Case 5.2: Complete Password Reset**

Steps:
1. Open password reset email
2. Click reset link (opens in browser)
3. Enter new password: "NewTest123!@#"
4. Enter confirm password: "NewTest123!@#"
5. Click "Reset Password" button

Expected Results:
- [ ] Browser opens to Reset Password screen
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

### 6. Token Storage with HTTP-only Cookies on Web

**Test Case 6.1: Cookie Configuration**

Verify cookies are set correctly:
- [ ] Access token cookie has httpOnly flag
- [ ] Refresh token cookie has httpOnly flag
- [ ] Cookies have secure flag (HTTPS only)
- [ ] Cookies have sameSite flag (Strict or Lax)
- [ ] Cookies have appropriate expiration
- [ ] Cookies are not accessible via JavaScript (document.cookie)

**Test Case 6.2: Token Persistence**

Steps:
1. Log in successfully
2. Close browser tab
3. Open new tab and navigate to app

Expected Results:
- [ ] User remains logged in
- [ ] App navigates directly to home screen
- [ ] No login screen is shown
- [ ] Tokens are retrieved from cookies

**Test Case 6.3: Cross-Site Request Forgery (CSRF) Protection**

Verify:
- [ ] SameSite cookie attribute prevents CSRF attacks
- [ ] Cookies are not sent with cross-origin requests
- [ ] CSRF token is used for state-changing operations (if implemented)

### 7. Remember Me Functionality on Web

**Test Case 7.1: Remember Me Enabled**

Steps:
1. Navigate to Login screen
2. Check "Remember Me" checkbox
3. Log in successfully
4. Close browser completely
5. Wait 8 days
6. Reopen browser and navigate to app

Expected Results:
- [ ] User remains logged in after 8 days
- [ ] Refresh token cookie has 30-day expiration
- [ ] App navigates to home screen

**Test Case 7.2: Remember Me Disabled**

Steps:
1. Navigate to Login screen
2. Uncheck "Remember Me" checkbox
3. Log in successfully
4. Close browser completely
5. Wait 8 days
6. Reopen browser and navigate to app

Expected Results:
- [ ] User is logged out after 7 days
- [ ] Refresh token cookie has 7-day expiration
- [ ] App navigates to login screen

### 8. Logout on Web

**Test Case 8.1: Successful Logout**

Steps:
1. Log in successfully
2. Navigate to profile/settings
3. Click "Log Out" button
4. Confirm logout

Expected Results:
- [ ] Logout API request is sent
- [ ] Cookies are cleared
- [ ] User data is cleared from browser storage
- [ ] User is navigated to login screen
- [ ] Cannot navigate back to authenticated screens

**Test Case 8.2: Logout with API Failure**

Steps:
1. Log in successfully
2. Disconnect from network
3. Attempt to log out

Expected Results:
- [ ] Cookies are still cleared locally
- [ ] User data is still cleared
- [ ] User is navigated to login screen
- [ ] Logout completes even if API fails


### 9. Keyboard Navigation (Tab, Enter, Escape keys)

**Test Case 9.1: Tab Navigation**

Steps:
1. Navigate to Registration screen
2. Press Tab key repeatedly

Expected Results:
- [ ] Tab key moves focus to next interactive element
- [ ] Shift+Tab moves focus to previous element
- [ ] Tab order is logical (top to bottom, left to right)
- [ ] All interactive elements are reachable
- [ ] Focus indicator is clearly visible
- [ ] Focus skips non-interactive elements

**Test Case 9.2: Enter Key Behavior**

Steps:
1. Navigate to Registration screen
2. Fill in form fields
3. Press Enter key in different fields

Expected Results:
- [ ] Enter key in text field moves to next field
- [ ] Enter key in last field submits form
- [ ] Enter key on button activates button
- [ ] Enter key on checkbox toggles checkbox
- [ ] Enter key on link follows link

**Test Case 9.3: Escape Key Behavior**

Steps:
1. Open account linking modal
2. Press Escape key

Expected Results:
- [ ] Escape key closes modal
- [ ] Escape key dismisses error messages (if applicable)
- [ ] Escape key cancels current operation

**Test Case 9.4: Keyboard-Only Form Completion**

Steps:
1. Navigate to Registration screen using only keyboard
2. Complete entire form using only keyboard
3. Submit form using only keyboard

Expected Results:
- [ ] Can navigate to all fields
- [ ] Can enter text in all fields
- [ ] Can toggle checkbox
- [ ] Can activate SSO buttons
- [ ] Can submit form
- [ ] Can navigate to login screen
- [ ] No mouse required for any operation

### 10. Responsive Design Testing

**Test Case 10.1: Desktop (1920x1080)**

Steps:
1. Set browser window to 1920x1080
2. Navigate through all authentication screens

Expected Results:
- [ ] Layout is centered and readable
- [ ] Forms are appropriately sized
- [ ] Buttons are properly sized
- [ ] No horizontal scrolling
- [ ] Proper use of whitespace

**Test Case 10.2: Laptop (1366x768)**

Steps:
1. Set browser window to 1366x768
2. Navigate through all authentication screens

Expected Results:
- [ ] Layout adapts to smaller screen
- [ ] All content is visible
- [ ] No horizontal scrolling
- [ ] Forms remain usable

**Test Case 10.3: Tablet (768x1024)**

Steps:
1. Set browser window to 768x1024
2. Navigate through all authentication screens

Expected Results:
- [ ] Layout adapts to tablet size
- [ ] Touch targets are appropriately sized
- [ ] Forms are full-width or appropriately sized
- [ ] No horizontal scrolling

**Test Case 10.4: Mobile (375x667)**

Steps:
1. Set browser window to 375x667
2. Navigate through all authentication screens

Expected Results:
- [ ] Layout adapts to mobile size
- [ ] Forms are full-width
- [ ] Touch targets are large enough (48px minimum)
- [ ] No horizontal scrolling
- [ ] Vertical scrolling works smoothly

**Test Case 10.5: Browser Zoom**

Steps:
1. Set browser zoom to 200%
2. Navigate through all authentication screens

Expected Results:
- [ ] Layout remains usable at 200% zoom
- [ ] Text is readable
- [ ] No content is cut off
- [ ] Scrolling works correctly

### 11. Visible Focus Indicators

**Test Case 11.1: Focus Indicator Visibility**

Steps:
1. Navigate through form using Tab key
2. Observe focus indicators on each element

Expected Results:
- [ ] Focus indicator is clearly visible on all interactive elements
- [ ] Focus indicator has sufficient contrast (3:1 minimum)
- [ ] Focus indicator is not obscured by other elements
- [ ] Focus indicator style is consistent across elements
- [ ] Focus indicator is visible on buttons, inputs, links, checkboxes

**Test Case 11.2: Focus Indicator on SSO Buttons**

Steps:
1. Tab to SSO buttons
2. Observe focus indicators

Expected Results:
- [ ] Apple Sign In button has visible focus indicator
- [ ] Google Sign In button has visible focus indicator
- [ ] Focus indicators are clearly visible on branded buttons

### 12. Accessibility Testing with Screen Readers

**Test Case 12.1: NVDA (Windows)**

Steps:
1. Install NVDA screen reader
2. Enable NVDA
3. Navigate through Registration screen
4. Complete registration form

Expected Results:
- [ ] All form labels are read aloud
- [ ] Field types are announced (text field, password field, checkbox, button)
- [ ] Error messages are announced when they appear
- [ ] Loading states are announced
- [ ] Success messages are announced
- [ ] Can complete form using only NVDA
- [ ] Form submission works correctly

**Test Case 12.2: JAWS (Windows)**

Steps:
1. Install JAWS screen reader
2. Enable JAWS
3. Navigate through Login screen
4. Complete login form

Expected Results:
- [ ] All form labels are read aloud
- [ ] Field types are announced
- [ ] Error messages are announced
- [ ] Can complete form using only JAWS
- [ ] Form submission works correctly

**Test Case 12.3: VoiceOver (macOS)**

Steps:
1. Enable VoiceOver (Cmd+F5)
2. Navigate through Password Reset screens
3. Complete password reset flow

Expected Results:
- [ ] All form labels are read aloud
- [ ] Field types are announced
- [ ] Error messages are announced
- [ ] Can complete flow using only VoiceOver
- [ ] All operations work correctly

**Test Case 12.4: Screen Reader Announcements**

Verify screen reader announces:
- [ ] Form field labels
- [ ] Field types (text, email, password)
- [ ] Required fields
- [ ] Error messages
- [ ] Success messages
- [ ] Loading states ("Loading", "Submitting")
- [ ] Button states (enabled, disabled)
- [ ] Checkbox states (checked, unchecked)

### 13. Color Contrast and Visual Accessibility

**Test Case 13.1: Color Contrast Ratios**

Use browser DevTools or online tools to verify:
- [ ] Body text has 4.5:1 contrast ratio minimum
- [ ] Large text (18pt+) has 3:1 contrast ratio minimum
- [ ] Interactive elements have 3:1 contrast ratio minimum
- [ ] Error messages have sufficient contrast
- [ ] Focus indicators have 3:1 contrast ratio minimum

**Test Case 13.2: Color Blindness Simulation**

Use browser extensions to simulate color blindness:
- [ ] Protanopia (red-blind): Information is not conveyed by color alone
- [ ] Deuteranopia (green-blind): Information is not conveyed by color alone
- [ ] Tritanopia (blue-blind): Information is not conveyed by color alone
- [ ] Error states are distinguishable without color
- [ ] Success states are distinguishable without color

### 14. Browser-Specific Testing

**Test Case 14.1: Chrome DevTools**

Steps:
1. Open Chrome DevTools (F12)
2. Check Console for errors
3. Check Network tab for API calls
4. Check Application tab for cookies

Expected Results:
- [ ] No console errors
- [ ] API calls succeed
- [ ] Cookies are set correctly
- [ ] No security warnings

**Test Case 14.2: Firefox Developer Tools**

Steps:
1. Open Firefox Developer Tools (F12)
2. Check Console for errors
3. Check Network tab for API calls
4. Check Storage tab for cookies

Expected Results:
- [ ] No console errors
- [ ] API calls succeed
- [ ] Cookies are set correctly
- [ ] No security warnings

**Test Case 14.3: Safari Web Inspector**

Steps:
1. Open Safari Web Inspector (Cmd+Option+I)
2. Check Console for errors
3. Check Network tab for API calls
4. Check Storage tab for cookies

Expected Results:
- [ ] No console errors
- [ ] API calls succeed
- [ ] Cookies are set correctly
- [ ] No security warnings

### 15. Network Error Handling

**Test Case 15.1: No Internet Connection**

Steps:
1. Disconnect from network
2. Attempt to register/login

Expected Results:
- [ ] Error message "No internet connection. Please check your network and try again" appears
- [ ] Retry button is provided
- [ ] Form data is preserved

**Test Case 15.2: Request Timeout**

Steps:
1. Simulate slow network (Chrome DevTools > Network > Throttling)
2. Attempt to register/login

Expected Results:
- [ ] Request times out after 30 seconds
- [ ] Error message "Request timed out. Please try again" appears
- [ ] Retry button is provided

**Test Case 15.3: Server Unavailable**

Steps:
1. Stop backend server
2. Attempt to register/login

Expected Results:
- [ ] Error message "Service temporarily unavailable. Please try again later" appears
- [ ] Retry button is provided

### 16. Security Testing

**Test Case 16.1: HTTPS Enforcement**

Verify:
- [ ] All API requests use HTTPS
- [ ] Mixed content warnings are not present
- [ ] Cookies have secure flag
- [ ] No sensitive data in URL parameters

**Test Case 16.2: XSS Prevention**

Steps:
1. Attempt to inject script tags in form fields
2. Submit form

Expected Results:
- [ ] Script tags are sanitized
- [ ] No script execution occurs
- [ ] Input is safely rendered

**Test Case 16.3: CSRF Protection**

Verify:
- [ ] SameSite cookie attribute is set
- [ ] CSRF tokens are used (if implemented)
- [ ] Cross-origin requests are blocked

## Test Results Summary

### Passed Tests: _____ / _____

### Failed Tests:

| Test Case | Issue Description | Severity | Browser | Notes |
|-----------|------------------|----------|---------|-------|
|           |                  |          |         |       |

### Browser Compatibility:

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Registration | ☐ | ☐ | ☐ | ☐ |
| Login | ☐ | ☐ | ☐ | ☐ |
| SSO | ☐ | ☐ | ☐ | ☐ |
| Password Reset | ☐ | ☐ | ☐ | ☐ |
| Keyboard Nav | ☐ | ☐ | ☐ | ☐ |
| Screen Reader | ☐ | ☐ | ☐ | ☐ |

### Issues Found:

1. **Issue Title**
   - Description:
   - Steps to Reproduce:
   - Expected Behavior:
   - Actual Behavior:
   - Severity: Critical / High / Medium / Low
   - Platform: Web
   - Browser:
   - Browser Version:

## Notes

- Document any browser-specific behaviors
- Note any performance issues
- Record any unexpected behaviors
- Capture screenshots of issues
- Note browser versions tested
- Record screen reader versions tested

## Sign-off

- Tester Name: _______________
- Date: _______________
- Browsers Tested: _______________
- Screen Readers Tested: _______________
- Test Environment: _______________
