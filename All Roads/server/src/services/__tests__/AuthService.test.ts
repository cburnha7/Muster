import AuthService from '../AuthService';
import bcrypt from 'bcrypt';

/**
 * Unit tests for AuthService
 * 
 * Tests password hashing, comparison, and basic service methods
 * Requirements: 13.1, 13.2, 13.3, 13.4, 34.2, 34.5
 */

describe('AuthService', () => {
  describe('hashPassword', () => {
    it('should hash a password using bcrypt with cost factor 10', async () => {
      const password = 'TestPassword123!';
      const hash = await AuthService.hashPassword(password);

      // Verify hash format (bcrypt hashes start with $2b$10$ for cost factor 10)
      expect(hash).toMatch(/^\$2b\$10\$/);
      
      // Verify hash is not the same as plain text
      expect(hash).not.toBe(password);
      
      // Verify hash length (bcrypt hashes are 60 characters)
      expect(hash.length).toBe(60);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await AuthService.hashPassword(password);
      const hash2 = await AuthService.hashPassword(password);

      // Different salts should produce different hashes
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await AuthService.hashPassword(password);

      const isValid = await AuthService.comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await AuthService.hashPassword(password);

      const isValid = await AuthService.comparePassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const password = 'TestPassword123!';
      const hash = await AuthService.hashPassword(password);

      const isValid = await AuthService.comparePassword('', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Password hashing security', () => {
    it('should use bcrypt cost factor of 10', async () => {
      const password = 'TestPassword123!';
      const hash = await AuthService.hashPassword(password);

      // Extract cost factor from hash (format: $2b$10$...)
      const costFactor = hash.split('$')[2];
      expect(costFactor).toBe('10');
    });

    it('should never store passwords in plain text', async () => {
      const password = 'TestPassword123!';
      const hash = await AuthService.hashPassword(password);

      // Hash should not contain the original password
      expect(hash).not.toContain(password);
      expect(hash).not.toContain(password.toLowerCase());
      expect(hash).not.toContain(password.toUpperCase());
    });
  });
});
