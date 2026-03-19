import TokenService from '../services/TokenService';
import dotenv from 'dotenv';

/**
 * Manual test script for TokenService
 * 
 * Tests token generation, validation, and expiration
 * Run with: npx tsx src/scripts/test-token-service.ts
 */

dotenv.config();

async function testTokenService() {
  console.log('🧪 Testing TokenService...\n');

  const testUserId = 'test-user-123';

  try {
    // Test 1: Generate access token
    console.log('Test 1: Generate access token');
    const accessToken = TokenService.generateAccessToken(testUserId);
    console.log('✅ Access token generated:', accessToken.substring(0, 50) + '...');

    // Test 2: Verify access token
    console.log('\nTest 2: Verify access token');
    const accessPayload = TokenService.verifyAccessToken(accessToken);
    if (accessPayload && accessPayload.userId === testUserId) {
      console.log('✅ Access token verified successfully');
      console.log('   User ID:', accessPayload.userId);
      console.log('   Issued at:', new Date(accessPayload.iat * 1000).toISOString());
      console.log('   Expires at:', new Date(accessPayload.exp * 1000).toISOString());
    } else {
      console.log('❌ Access token verification failed');
    }

    // Test 3: Generate refresh token (default 7 days)
    console.log('\nTest 3: Generate refresh token (default 7 days)');
    const refreshToken = TokenService.generateRefreshToken(testUserId, false);
    console.log('✅ Refresh token generated:', refreshToken.substring(0, 50) + '...');

    // Test 4: Verify refresh token
    console.log('\nTest 4: Verify refresh token');
    const refreshPayload = TokenService.verifyRefreshToken(refreshToken);
    if (refreshPayload && refreshPayload.userId === testUserId) {
      console.log('✅ Refresh token verified successfully');
      console.log('   User ID:', refreshPayload.userId);
      console.log('   Issued at:', new Date(refreshPayload.iat * 1000).toISOString());
      console.log('   Expires at:', new Date(refreshPayload.exp * 1000).toISOString());
      
      // Calculate days until expiration
      const now = Date.now();
      const expiresAt = refreshPayload.exp * 1000;
      const daysUntilExpiration = Math.round((expiresAt - now) / (1000 * 60 * 60 * 24));
      console.log('   Days until expiration:', daysUntilExpiration);
    } else {
      console.log('❌ Refresh token verification failed');
    }

    // Test 5: Generate refresh token with Remember Me (30 days)
    console.log('\nTest 5: Generate refresh token with Remember Me (30 days)');
    const rememberMeToken = TokenService.generateRefreshToken(testUserId, true);
    const rememberMePayload = TokenService.verifyRefreshToken(rememberMeToken);
    if (rememberMePayload) {
      const now = Date.now();
      const expiresAt = rememberMePayload.exp * 1000;
      const daysUntilExpiration = Math.round((expiresAt - now) / (1000 * 60 * 60 * 24));
      console.log('✅ Remember Me token generated and verified');
      console.log('   Days until expiration:', daysUntilExpiration);
    } else {
      console.log('❌ Remember Me token verification failed');
    }

    // Test 6: Verify invalid token
    console.log('\nTest 6: Verify invalid token');
    const invalidToken = 'invalid.token.here';
    const invalidPayload = TokenService.verifyAccessToken(invalidToken);
    if (invalidPayload === null) {
      console.log('✅ Invalid token correctly rejected');
    } else {
      console.log('❌ Invalid token was incorrectly accepted');
    }

    // Test 7: Get expiration date from token
    console.log('\nTest 7: Get expiration date from token');
    const expirationDate = TokenService.getExpirationDate(accessToken);
    if (expirationDate) {
      console.log('✅ Expiration date extracted:', expirationDate.toISOString());
    } else {
      console.log('❌ Failed to extract expiration date');
    }

    // Test 8: Verify token expiration times
    console.log('\nTest 8: Verify token expiration times');
    const accessExp = TokenService.verifyAccessToken(accessToken);
    const refreshExp = TokenService.verifyRefreshToken(refreshToken);
    const rememberExp = TokenService.verifyRefreshToken(rememberMeToken);

    if (accessExp && refreshExp && rememberExp) {
      const accessMinutes = Math.round((accessExp.exp - accessExp.iat) / 60);
      const refreshDays = Math.round((refreshExp.exp - refreshExp.iat) / (60 * 60 * 24));
      const rememberDays = Math.round((rememberExp.exp - rememberExp.iat) / (60 * 60 * 24));

      console.log('✅ Token expiration times:');
      console.log('   Access token:', accessMinutes, 'minutes (expected: 15)');
      console.log('   Refresh token:', refreshDays, 'days (expected: 7)');
      console.log('   Remember Me token:', rememberDays, 'days (expected: 30)');

      // Verify expectations
      if (accessMinutes === 15 && refreshDays === 7 && rememberDays === 30) {
        console.log('✅ All expiration times match requirements!');
      } else {
        console.log('⚠️  Some expiration times do not match requirements');
      }
    }

    console.log('\n✅ All TokenService tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run tests
testTokenService()
  .then(() => {
    console.log('\n🎉 TokenService is working correctly!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 TokenService test failed:', error);
    process.exit(1);
  });
