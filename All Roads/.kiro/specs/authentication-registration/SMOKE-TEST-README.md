# Authentication System Smoke Tests

## Quick Start

Run the smoke tests to verify core authentication functionality:

```bash
npx tsx server/src/scripts/smoke-test-auth.ts
```

## What Gets Tested

The smoke test suite verifies 10 critical authentication functions:

1. **Database Connection** - Verifies PostgreSQL connectivity
2. **Password Hashing** - Tests bcrypt hashing (cost factor 10)
3. **Password Comparison** - Validates password verification
4. **JWT Token Generation** - Tests access and refresh token creation
5. **JWT Token Verification** - Validates token parsing and signature
6. **Token Expiration Times** - Confirms 15min/7day/30day expiration
7. **User Creation** - Tests manual registration flow
8. **User Lookup** - Verifies database queries
9. **User Authentication** - Tests login with credentials
10. **Email Uniqueness** - Validates database constraints

## Expected Output

```
🧪 Authentication System Smoke Tests
============================================================
✅ Database connection
✅ Password hashing
✅ Password comparison
✅ JWT token generation
✅ JWT token verification
✅ Token expiration times
✅ User creation (manual registration)
✅ User lookup by email
✅ User authentication
✅ Email uniqueness constraint
============================================================
📊 Test Summary
Total Tests: 10
✅ Passed: 10
❌ Failed: 0
============================================================
✅ All smoke tests passed! Authentication system is working correctly.
```

## Prerequisites

1. **Database Running**: PostgreSQL must be running on localhost:5432
2. **Environment Variables**: `server/.env` must be configured
3. **Dependencies Installed**: Run `npm install` in server directory

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Start PostgreSQL service

### JWT_SECRET Not Found
```
Error: JWT_SECRET is not defined
```
**Solution:** Check `server/.env` file has `JWT_SECRET` configured

### Prisma Client Error
```
Error: Prisma Client is not generated
```
**Solution:** Run `npx prisma generate` in server directory

## Test Data Cleanup

The smoke tests automatically clean up test data after each test. Test users are created with timestamps in their email addresses (e.g., `test-1773348043960@example.com`) and are deleted after verification.

## Running Individual Tests

The smoke test script runs all tests sequentially. To test specific functionality, you can modify the script or use the backend services directly:

```typescript
import authService from './server/src/services/AuthService';
import tokenService from './server/src/services/TokenService';

// Test password hashing
const hash = await authService.hashPassword('TestPassword123!');
console.log('Hash:', hash);

// Test token generation
const token = tokenService.generateAccessToken('user-123');
console.log('Token:', token);
```

## Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Authentication Smoke Tests
  run: npx tsx server/src/scripts/smoke-test-auth.ts
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    JWT_SECRET: ${{ secrets.TEST_JWT_SECRET }}
```

## Next Steps

After smoke tests pass:
1. ✅ Core functionality is verified
2. ✅ Ready for Phase 6 (Polish and Documentation)
3. Consider running comprehensive platform tests before production
4. Review optional property-based tests for additional coverage

## Related Documentation

- **Test Environment Setup**: `test-environment-setup.md`
- **iOS Platform Testing**: `ios-platform-testing.md`
- **Android Platform Testing**: `android-platform-testing.md`
- **Web Platform Testing**: `web-platform-testing.md`
- **Test Execution Checklist**: `test-execution-checklist.md`
- **Checkpoint 10 Summary**: `CHECKPOINT-10-SUMMARY.md`
