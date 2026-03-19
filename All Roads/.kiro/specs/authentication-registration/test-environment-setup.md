# Test Environment Setup Guide

## Overview

This guide provides instructions for setting up the test environment for the authentication and registration system. The test environment includes a separate test database, mock email service, and SSO test credentials.

## Prerequisites

- PostgreSQL installed and running
- Node.js and npm installed
- Expo CLI installed
- iOS Simulator (for iOS testing)
- Android Emulator (for Android testing)
- Modern web browser (Chrome, Firefox, Safari)

## 1. Test Database Setup

### Create Test Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create test database
CREATE DATABASE muster_test;

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE muster_test TO postgres;

# Exit psql
\q
```

### Configure Test Database

1. Copy the test environment file:
   ```bash
   cp server/.env.test server/.env.test.local
   ```

2. Update `server/.env.test.local` with your database credentials:
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/muster_test?schema=public"
   ```

### Run Database Migrations

```bash
cd server
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/muster_test?schema=public" npx prisma migrate dev
```


## 2. Email Service Setup

### Option 1: Ethereal Email (Recommended for Development)

Ethereal Email is a fake SMTP service for testing email functionality.

1. Visit https://ethereal.email/
2. Click "Create Ethereal Account"
3. Copy the SMTP credentials
4. Update `server/.env.test.local`:
   ```
   SMTP_HOST=smtp.ethereal.email
   SMTP_PORT=587
   SMTP_USER=your-ethereal-username@ethereal.email
   SMTP_PASSWORD=your-ethereal-password
   ```

5. View sent emails at: https://ethereal.email/messages

### Option 2: MailHog (Local SMTP Server)

MailHog is a local SMTP server for testing.

1. Install MailHog:
   ```bash
   # macOS
   brew install mailhog
   
   # Windows (using Chocolatey)
   choco install mailhog
   
   # Linux
   go get github.com/mailhog/MailHog
   ```

2. Start MailHog:
   ```bash
   mailhog
   ```

3. Update `server/.env.test.local`:
   ```
   SMTP_HOST=localhost
   SMTP_PORT=1025
   SMTP_USER=
   SMTP_PASSWORD=
   ```

4. View sent emails at: http://localhost:8025

### Option 3: Mock Email Service in Tests

For automated tests, mock the EmailService to avoid sending real emails.


## 3. SSO Test Credentials Setup

### Apple Sign In

**Requirements:**
- Apple Developer Account ($99/year)
- Physical iOS device (Apple Sign In doesn't work in simulator)
- Xcode installed

**Setup Steps:**

1. **Create App ID:**
   - Go to https://developer.apple.com/account/
   - Navigate to Certificates, Identifiers & Profiles
   - Create a new App ID with "Sign in with Apple" capability
   - Note your Team ID and Bundle ID

2. **Create Service ID:**
   - Create a new Services ID
   - Enable "Sign in with Apple"
   - Configure return URLs: `exp://localhost:8081`, `https://your-domain.com`

3. **Create Key:**
   - Create a new Key with "Sign in with Apple" enabled
   - Download the .p8 file
   - Note the Key ID

4. **Configure Expo:**
   Update `app.json`:
   ```json
   {
     "expo": {
       "ios": {
         "bundleIdentifier": "com.muster.test",
         "usesAppleSignIn": true
       }
     }
   }
   ```

5. **Update Environment Variables:**
   ```
   APPLE_CLIENT_ID=com.muster.test
   APPLE_TEAM_ID=YOUR_TEAM_ID
   APPLE_KEY_ID=YOUR_KEY_ID
   APPLE_PRIVATE_KEY_PATH=./config/AuthKey_TEST.p8
   ```

### Google Sign In

**Requirements:**
- Google Cloud Console account (free)

**Setup Steps:**

1. **Create Project:**
   - Go to https://console.cloud.google.com/
   - Create a new project or select existing

2. **Enable Google Sign-In API:**
   - Navigate to APIs & Services > Library
   - Search for "Google Sign-In API"
   - Click Enable

3. **Create OAuth 2.0 Credentials:**
   
   **For iOS:**
   - Go to APIs & Services > Credentials
   - Create OAuth client ID
   - Application type: iOS
   - Bundle ID: `com.muster.test`
   - Copy the Client ID

   **For Android:**
   - Create OAuth client ID
   - Application type: Android
   - Package name: `com.muster.test`
   - SHA-1 certificate fingerprint (get from Expo)
   - Copy the Client ID

   **For Web:**
   - Create OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:8081`, `https://your-domain.com`
   - Copy the Client ID

4. **Update Environment Variables:**
   ```
   GOOGLE_CLIENT_ID_IOS=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
   GOOGLE_CLIENT_ID_ANDROID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
   GOOGLE_CLIENT_ID_WEB=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
   ```

5. **Configure Expo:**
   Update `app.json`:
   ```json
   {
     "expo": {
       "android": {
         "package": "com.muster.test",
         "googleServicesFile": "./google-services.json"
       }
     }
   }
   ```


## 4. Frontend Test Configuration

### Create Test Environment File

Create `.env.test` in the project root:

```bash
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_ENVIRONMENT=test

# SSO Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

### Install Test Dependencies

```bash
# Install testing libraries (if not already installed)
npm install --save-dev @testing-library/react-native @testing-library/jest-native jest-expo
```

## 5. Running the Test Environment

### Start Backend Server

```bash
cd server
# Load test environment variables
export $(cat .env.test.local | xargs)
npm run dev
```

### Start Frontend Development Server

```bash
# In project root
npm start
```

### Run on Different Platforms

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

**Web:**
```bash
npm run web
```

## 6. Verification Checklist

- [ ] Test database created and migrations applied
- [ ] Backend server starts with test environment variables
- [ ] Email service configured (Ethereal/MailHog)
- [ ] Apple Sign In credentials configured (if testing iOS)
- [ ] Google Sign In credentials configured
- [ ] Frontend connects to test backend API
- [ ] Can register a test user manually
- [ ] Can receive password reset emails
- [ ] SSO buttons appear on registration/login screens

## 7. Troubleshooting

### Database Connection Issues

**Error:** "Connection refused"
- Ensure PostgreSQL is running: `pg_ctl status`
- Check DATABASE_URL in `.env.test.local`
- Verify database exists: `psql -U postgres -l`

### Email Service Issues

**Error:** "SMTP connection failed"
- Verify SMTP credentials in `.env.test.local`
- Check Ethereal/MailHog is running
- Test SMTP connection with a simple script

### SSO Issues

**Apple Sign In:**
- Requires physical iOS device (doesn't work in simulator)
- Verify App ID and Service ID are configured correctly
- Check Bundle ID matches in Xcode and Apple Developer Portal

**Google Sign In:**
- Verify OAuth client IDs are correct
- Check redirect URIs are configured
- Ensure Google Sign-In API is enabled in Cloud Console

### Frontend Connection Issues

**Error:** "Network request failed"
- Verify backend server is running on port 3001
- Check EXPO_PUBLIC_API_URL in `.env.test`
- Ensure CORS is configured correctly in backend

## 8. Test Data Management

### Seed Test Data

```bash
cd server
npm run prisma:seed
```

### Clear Test Data

```bash
cd server
npx prisma migrate reset --force
```

### Create Test Users

Use the registration API or create directly in database:

```sql
-- Example test user
INSERT INTO "User" (id, email, username, "firstName", "lastName", password, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'test@example.com',
  'testuser',
  'Test',
  'User',
  '$2b$10$hashedpassword',
  NOW(),
  NOW()
);
```

## 9. Security Notes

- **Never commit** `.env.test.local` or real credentials to version control
- Use separate test accounts for SSO providers
- Test database should be isolated from development/production
- Rotate test credentials regularly
- Use mock services for automated tests to avoid rate limits

## 10. Next Steps

After completing the test environment setup:

1. Proceed to Task 9.2: Test iOS platform
2. Proceed to Task 9.3: Test Android platform
3. Proceed to Task 9.4: Test Web platform
4. Run automated test suites
5. Document any issues found during testing
