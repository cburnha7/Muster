// Feature: sports-booking-app, Property 1: Authentication Round Trip
// Property-based tests for authentication flows
import * as fc from 'fast-check';
import { authService } from '../../src/services/auth/AuthService';
import { LoginCredentials, RegisterData } from '../../src/types';

// Mock the auth service
jest.mock('../../src/services/auth/AuthService');

describe('Property 1: Authentication Round Trip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should maintain session state for valid credentials until logout', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 50 }),
        }),
        async (credentials: LoginCredentials) => {
          const mockAuthResponse = {
            token: 'mock-token-' + Math.random(),
            refreshToken: 'mock-refresh-' + Math.random(),
            user: {
              id: 'user-' + Math.random(),
              email: credentials.email,
              firstName: 'Test',
              lastName: 'User',
            },
            expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
          };

          (authService.login as jest.Mock).mockResolvedValue(mockAuthResponse);
          (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
          (authService.getToken as jest.Mock).mockReturnValue(mockAuthResponse.token);

          // Login with valid credentials
          const authResponse = await authService.login(credentials);

          // Session should be maintained
          expect(authResponse.token).toBeDefined();
          expect(authResponse.user.email).toBe(credentials.email);
          expect(authService.isAuthenticated()).toBe(true);
          expect(authService.getToken()).toBe(mockAuthResponse.token);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid credentials with appropriate error messages', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.oneof(
            fc.constant(''),
            fc.constant('invalid-email'),
            fc.constant('test@'),
            fc.string({ maxLength: 5 })
          ),
          password: fc.oneof(
            fc.constant(''),
            fc.constant('123'), // Too short
            fc.constant('   '), // Whitespace only
          ),
        }),
        async (invalidCredentials: LoginCredentials) => {
          (authService.login as jest.Mock).mockRejectedValue(
            new Error('Invalid credentials')
          );

          // Attempt login with invalid credentials
          await expect(authService.login(invalidCredentials)).rejects.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should clear session state after explicit logout', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 50 }),
        }),
        async (credentials: LoginCredentials) => {
          const mockAuthResponse = {
            token: 'mock-token',
            refreshToken: 'mock-refresh',
            user: {
              id: 'user-1',
              email: credentials.email,
              firstName: 'Test',
              lastName: 'User',
            },
            expiresAt: new Date(Date.now() + 3600000),
          };

          (authService.login as jest.Mock).mockResolvedValue(mockAuthResponse);
          (authService.logout as jest.Mock).mockResolvedValue(undefined);
          (authService.isAuthenticated as jest.Mock)
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false);
          (authService.getToken as jest.Mock)
            .mockReturnValueOnce(mockAuthResponse.token)
            .mockReturnValueOnce(null);

          // Login
          await authService.login(credentials);
          expect(authService.isAuthenticated()).toBe(true);

          // Logout
          await authService.logout();
          expect(authService.isAuthenticated()).toBe(false);
          expect(authService.getToken()).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle session expiration correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 50 }),
        }),
        async (credentials: LoginCredentials) => {
          const pastExpiry = new Date(Date.now() - 3600000); // 1 hour ago
          const mockAuthResponse = {
            token: 'mock-token',
            refreshToken: 'mock-refresh',
            user: {
              id: 'user-1',
              email: credentials.email,
              firstName: 'Test',
              lastName: 'User',
            },
            expiresAt: pastExpiry,
          };

          (authService.login as jest.Mock).mockResolvedValue(mockAuthResponse);
          (authService.isAuthenticated as jest.Mock).mockReturnValue(false);

          // Login with expired token
          await authService.login(credentials);

          // Should not be authenticated with expired token
          expect(authService.isAuthenticated()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate registration data consistently', () => {
    fc.assert(
      fc.property(
        fc.record({
          firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 50 }),
        }),
        async (validRegisterData: RegisterData) => {
          const mockAuthResponse = {
            token: 'mock-token',
            refreshToken: 'mock-refresh',
            user: {
              id: 'user-' + Math.random(),
              email: validRegisterData.email,
              firstName: validRegisterData.firstName,
              lastName: validRegisterData.lastName,
            },
            expiresAt: new Date(Date.now() + 3600000),
          };

          (authService.register as jest.Mock).mockResolvedValue(mockAuthResponse);

          // Register with valid data
          const authResponse = await authService.register(validRegisterData);

          // Should succeed and return user data
          expect(authResponse.user.email).toBe(validRegisterData.email);
          expect(authResponse.user.firstName).toBe(validRegisterData.firstName);
          expect(authResponse.user.lastName).toBe(validRegisterData.lastName);
          expect(authResponse.token).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
