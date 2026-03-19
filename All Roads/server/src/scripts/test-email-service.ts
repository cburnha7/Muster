/**
 * Test script for EmailService
 * 
 * This script tests the EmailService functionality without actually sending emails
 * (unless SMTP is configured in .env)
 * 
 * Usage: tsx src/scripts/test-email-service.ts
 */

import EmailService from '../services/EmailService';

async function testEmailService() {
  console.log('=== Testing EmailService ===\n');

  try {
    // Test 1: Password Reset Email
    console.log('Test 1: Sending password reset email...');
    const testEmail = 'test@example.com';
    const testToken = 'test-reset-token-123456';
    
    await EmailService.sendPasswordResetEmail(testEmail, testToken);
    console.log('✓ Password reset email test completed\n');

    // Test 2: Welcome Email
    console.log('Test 2: Sending welcome email...');
    const testFirstName = 'John';
    
    await EmailService.sendWelcomeEmail(testEmail, testFirstName);
    console.log('✓ Welcome email test completed\n');

    // Test 3: Account Linked Email
    console.log('Test 3: Sending account linked email...');
    const testProvider = 'Google';
    
    await EmailService.sendAccountLinkedEmail(testEmail, testProvider);
    console.log('✓ Account linked email test completed\n');

    console.log('=== All EmailService tests completed successfully ===');
    console.log('\nNote: If SMTP is not configured, emails were not actually sent.');
    console.log('Check the console output for email content and reset tokens.');
    
  } catch (error) {
    console.error('❌ EmailService test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEmailService();
