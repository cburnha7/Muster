#!/usr/bin/env tsx
/**
 * Authentication System Smoke Test
 * 
 * This script performs basic smoke tests on the authentication system
 * to verify core functionality works correctly.
 */

import { PrismaClient } from '@prisma/client';
import authService from '../services/AuthService';
import tokenService from '../services/TokenService';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  try {
    await testFn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({ 
      name, 
      passed: false, 
      error: error instanceof Error ? error.message : String(error)
    });
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log('\n🧪 Authentication System Smoke Tests\n');
  console.log('=' .repeat(60));
  
  // Test 1: Database Connection
  await runTest('Database connection', async () => {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    console.log(`   Found ${userCount} users in database`);
  });

  // Test 2: Password Hashing
  await runTest('Password hashing', async () => {
    const password = 'TestPassword123!';
    const hash = await authService.hashPassword(password);
    
    if (!hash.startsWith('$2b$10$')) {
      throw new Error('Hash does not have correct bcrypt format');
    }
    
    if (hash === password) {
      throw new Error('Password was not hashed');
    }
    
    console.log(`   Hash format: ${hash.substring(0, 20)}...`);
  });

  // Test 3: Password Comparison
  await runTest('Password comparison', async () => {
    const password = 'TestPassword123!';
    const hash = await authService.hashPassword(password);
    
    const isValid = await authService.comparePassword(password, hash);
    if (!isValid) {
      throw new Error('Valid password comparison failed');
    }
    
    const isInvalid = await authService.comparePassword('WrongPassword', hash);
    if (isInvalid) {
      throw new Error('Invalid password comparison should have failed');
    }
    
    console.log('   Password comparison working correctly');
  });

  // Test 4: JWT Token Generation
  await runTest('JWT token generation', async () => {
    const userId = 'test-user-123';
    const accessToken = tokenService.generateAccessToken(userId);
    const refreshToken = tokenService.generateRefreshToken(userId, false);
    
    if (!accessToken || !refreshToken) {
      throw new Error('Tokens were not generated');
    }
    
    console.log(`   Access token: ${accessToken.substring(0, 30)}...`);
    console.log(`   Refresh token: ${refreshToken.substring(0, 30)}...`);
  });

  // Test 5: JWT Token Verification
  await runTest('JWT token verification', async () => {
    const userId = 'test-user-456';
    const accessToken = tokenService.generateAccessToken(userId);
    
    const payload = tokenService.verifyAccessToken(accessToken);
    if (!payload) {
      throw new Error('Token verification failed');
    }
    
    if (payload.userId !== userId) {
      throw new Error(`User ID mismatch: expected ${userId}, got ${payload.userId}`);
    }
    
    console.log(`   Token verified for user: ${payload.userId}`);
  });

  // Test 6: Token Expiration
  await runTest('Token expiration times', async () => {
    const userId = 'test-user-789';
    const accessToken = tokenService.generateAccessToken(userId);
    const refreshToken7Days = tokenService.generateRefreshToken(userId, false);
    const refreshToken30Days = tokenService.generateRefreshToken(userId, true);
    
    const accessPayload = tokenService.verifyAccessToken(accessToken);
    const refresh7Payload = tokenService.verifyRefreshToken(refreshToken7Days);
    const refresh30Payload = tokenService.verifyRefreshToken(refreshToken30Days);
    
    if (!accessPayload || !refresh7Payload || !refresh30Payload) {
      throw new Error('Token verification failed');
    }
    
    const accessExpiry = accessPayload.exp - accessPayload.iat;
    const refresh7Expiry = refresh7Payload.exp - refresh7Payload.iat;
    const refresh30Expiry = refresh30Payload.exp - refresh30Payload.iat;
    
    // Access token should be 15 minutes (900 seconds)
    if (Math.abs(accessExpiry - 900) > 5) {
      throw new Error(`Access token expiry incorrect: ${accessExpiry}s (expected 900s)`);
    }
    
    // Refresh token (no remember me) should be 7 days (604800 seconds)
    if (Math.abs(refresh7Expiry - 604800) > 5) {
      throw new Error(`Refresh token (7 days) expiry incorrect: ${refresh7Expiry}s (expected 604800s)`);
    }
    
    // Refresh token (remember me) should be 30 days (2592000 seconds)
    if (Math.abs(refresh30Expiry - 2592000) > 5) {
      throw new Error(`Refresh token (30 days) expiry incorrect: ${refresh30Expiry}s (expected 2592000s)`);
    }
    
    console.log(`   Access token: ${accessExpiry}s (15 minutes)`);
    console.log(`   Refresh token (no remember): ${refresh7Expiry}s (7 days)`);
    console.log(`   Refresh token (remember me): ${refresh30Expiry}s (30 days)`);
  });

  // Test 7: User Creation (Manual Registration)
  await runTest('User creation (manual registration)', async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testUsername = `testuser${Date.now()}`;
    
    const user = await authService.createUser({
      email: testEmail,
      username: testUsername,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: new Date('1990-01-01'),
    });
    
    if (!user.id) {
      throw new Error('User was not created');
    }
    
    if (user.email !== testEmail) {
      throw new Error('Email mismatch');
    }
    
    // Note: Prisma returns the password field, but it should be hashed
    if (user.password && !user.password.startsWith('$2b$10$')) {
      throw new Error('Password is not properly hashed');
    }
    
    console.log(`   Created user: ${user.email} (ID: ${user.id})`);
    
    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });

  // Test 8: User Lookup
  await runTest('User lookup by email', async () => {
    const testEmail = `lookup-${Date.now()}@example.com`;
    
    // Create test user
    const createdUser = await authService.createUser({
      email: testEmail,
      username: `lookup${Date.now()}`,
      password: 'TestPassword123!',
      firstName: 'Lookup',
      lastName: 'Test',
      dateOfBirth: new Date('1990-01-01'),
    });
    
    // Find by email
    const foundUser = await authService.findUserByEmail(testEmail);
    
    if (!foundUser) {
      throw new Error('User not found by email');
    }
    
    if (foundUser.id !== createdUser.id) {
      throw new Error('Found wrong user');
    }
    
    console.log(`   Found user: ${foundUser.email}`);
    
    // Cleanup
    await prisma.user.delete({ where: { id: createdUser.id } });
  });

  // Test 9: Authentication
  await runTest('User authentication', async () => {
    const testEmail = `auth-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    // Create test user
    const createdUser = await authService.createUser({
      email: testEmail,
      username: `auth${Date.now()}`,
      password: testPassword,
      firstName: 'Auth',
      lastName: 'Test',
      dateOfBirth: new Date('1990-01-01'),
    });
    
    // Authenticate with correct password
    const authenticatedUser = await authService.authenticateUser(testEmail, testPassword);
    
    if (!authenticatedUser) {
      throw new Error('Authentication failed with correct password');
    }
    
    if (authenticatedUser.id !== createdUser.id) {
      throw new Error('Authenticated wrong user');
    }
    
    // Try with wrong password
    let authFailed = false;
    try {
      await authService.authenticateUser(testEmail, 'WrongPassword');
    } catch (error) {
      authFailed = true;
    }
    
    // authenticateUser returns null for invalid credentials, doesn't throw
    const invalidAuth = await authService.authenticateUser(testEmail, 'WrongPassword');
    if (invalidAuth !== null) {
      throw new Error('Authentication should have failed with wrong password');
    }
    
    console.log('   Correctly rejected invalid password');
    console.log(`   Authenticated user: ${authenticatedUser.email}`);
    
    // Cleanup
    await prisma.user.delete({ where: { id: createdUser.id } });
  });

  // Test 10: Email Uniqueness
  await runTest('Email uniqueness constraint', async () => {
    const testEmail = `unique-${Date.now()}@example.com`;
    
    // Create first user
    const user1 = await authService.createUser({
      email: testEmail,
      username: `unique1${Date.now()}`,
      password: 'TestPassword123!',
      firstName: 'Unique',
      lastName: 'Test1',
      dateOfBirth: new Date('1990-01-01'),
    });
    
    // Try to create second user with same email
    let duplicateError = false;
    try {
      await authService.createUser({
        email: testEmail,
        username: `unique2${Date.now()}`,
        password: 'TestPassword123!',
        firstName: 'Unique',
        lastName: 'Test2',
        dateOfBirth: new Date('1990-01-01'),
      });
    } catch (error) {
      duplicateError = true;
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        console.log('   Correctly rejected duplicate email');
      } else {
        throw error;
      }
    }
    
    if (!duplicateError) {
      throw new Error('Should have thrown error for duplicate email');
    }
    
    // Cleanup
    await prisma.user.delete({ where: { id: user1.id } });
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('\n✅ All smoke tests passed! Authentication system is working correctly.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('\n❌ Fatal error running smoke tests:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
