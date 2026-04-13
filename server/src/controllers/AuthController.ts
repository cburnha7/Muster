import { Request, Response } from 'express';
import AuthService from '../services/AuthService';
import TokenService from '../services/TokenService';
import EmailService from '../services/EmailService';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import {
  RegisterRequest,
  SSORegisterRequest,
  LoginRequest,
  SSOLoginRequest,
  LinkAccountRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  toUserResponse,
  AuthResponse,
  TokenResponse,
  ErrorResponse,
} from '../types/auth';

/**
 * AuthController - Handles authentication HTTP requests
 *
 * Coordinates authentication flows by orchestrating AuthService, TokenService,
 * and EmailService. Handles request validation, error responses, and proper
 * HTTP status codes.
 *
 * Requirements: 22.1-22.9, 23.1-23.9, 24.1-24.9, 25.1-25.9, 26.1-26.9
 */
class AuthController {
  /**
   * Register a new user with email and password
   * POST /api/auth/register
   *
   * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as RegisterRequest;

      // Validate required fields
      if (
        !body.firstName ||
        !body.lastName ||
        !body.email ||
        !body.username ||
        !body.password
      ) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'All fields are required',
          statusCode: 400,
        } as ErrorResponse);
        return;
      }

      // Check if terms were agreed to
      if (!body.agreedToTerms) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'You must agree to the Terms of Service and Privacy Policy',
          statusCode: 400,
        } as ErrorResponse);
        return;
      }

      // Check if email already exists
      const existingEmail = await AuthService.findUserByEmail(body.email);
      if (existingEmail) {
        res.status(409).json({
          error: 'Conflict',
          message: 'This email is already registered',
          statusCode: 409,
        } as ErrorResponse);
        return;
      }

      // Check if username already exists
      const existingUsername = await AuthService.findUserByUsername(
        body.username
      );
      if (existingUsername) {
        res.status(409).json({
          error: 'Conflict',
          message: 'This username is taken',
          statusCode: 409,
        } as ErrorResponse);
        return;
      }

      // Create user with a default date of birth (can be updated later)
      const defaultDateOfBirth = new Date('2000-01-01');
      const user = await AuthService.createUser({
        email: body.email,
        username: body.username,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        dateOfBirth: defaultDateOfBirth,
      });

      // Generate tokens
      const accessToken = TokenService.generateAccessToken(user.id);
      const refreshToken = TokenService.generateRefreshToken(user.id, false);

      // Store refresh token
      const refreshTokenExpiration =
        TokenService.getExpirationDate(refreshToken);
      if (refreshTokenExpiration) {
        await TokenService.storeRefreshToken(
          user.id,
          refreshToken,
          refreshTokenExpiration
        );
      }

      // Send welcome email (optional, don't block on failure)
      EmailService.sendWelcomeEmail(user.email, user.firstName).catch(error => {
        console.error('Failed to send welcome email:', error);
      });

      // Return success response
      const response: AuthResponse = {
        user: toUserResponse(user),
        accessToken,
        refreshToken,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during registration',
        statusCode: 500,
      } as ErrorResponse);
    }
  }

  /**
   * Register a new user with SSO (Apple or Google)
   * POST /api/auth/register/sso
   *
   * Requirements: 22.7, 22.8, 22.9
   */
  async registerWithSSO(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as SSORegisterRequest;

      // Validate required fields
      if (
        !body.provider ||
        !body.providerUserId ||
        !body.email ||
        !body.username
      ) {
        res.status(400).json({
          error: 'Validation Error',
          message:
            'Provider, provider user ID, email, and username are required',
          statusCode: 400,
        } as ErrorResponse);
        return;
      }

      // Validate provider
      if (body.provider !== 'apple' && body.provider !== 'google') {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid SSO provider',
          statusCode: 400,
        } as ErrorResponse);
        return;
      }

      // Check if email already exists
      const existingEmail = await AuthService.findUserByEmail(body.email);
      if (existingEmail) {
        res.status(409).json({
          error: 'Conflict',
          message: 'This email is already registered',
          statusCode: 409,
        } as ErrorResponse);
        return;
      }

      // Check if username already exists
      const existingUsername = await AuthService.findUserByUsername(
        body.username
      );
      if (existingUsername) {
        res.status(409).json({
          error: 'Conflict',
          message: 'This username is taken',
          statusCode: 409,
        } as ErrorResponse);
        return;
      }

      // Create SSO user with a default date of birth
      const defaultDateOfBirth = new Date('2000-01-01');
      const user = await AuthService.createSSOUser({
        email: body.email,
        username: body.username,
        firstName: body.firstName || body.email.split('@')[0],
        lastName: body.lastName || '',
        dateOfBirth: defaultDateOfBirth,
        ssoProvider: body.provider,
        ssoProviderId: body.providerUserId,
      });

      // Generate tokens
      const accessToken = TokenService.generateAccessToken(user.id);
      const refreshToken = TokenService.generateRefreshToken(user.id, false);

      // Store refresh token
      const refreshTokenExpiration =
        TokenService.getExpirationDate(refreshToken);
      if (refreshTokenExpiration) {
        await TokenService.storeRefreshToken(
          user.id,
          refreshToken,
          refreshTokenExpiration
        );
      }

      // Send welcome email (optional)
      EmailService.sendWelcomeEmail(user.email, user.firstName).catch(error => {
        console.error('Failed to send welcome email:', error);
      });

      // Return success response
      const response: AuthResponse = {
        user: toUserResponse(user),
        accessToken,
        refreshToken,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('SSO registration error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during SSO registration',
        statusCode: 500,
      } as ErrorResponse);
    }
  }

  /**
   * Login with email/username and password
   * POST /api/auth/login
   *
   * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as LoginRequest;

      // Validate required fields
      if (!body.emailOrUsername || !body.password) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Email/username and password are required',
          statusCode: 400,
        } as ErrorResponse);
        return;
      }

      // Authenticate user
      const user = await AuthService.authenticateUser(
        body.emailOrUsername,
        body.password
      );

      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password',
          statusCode: 401,
        } as ErrorResponse);
        return;
      }

      // Generate tokens with rememberMe flag
      const rememberMe = body.rememberMe || false;
      const accessToken = TokenService.generateAccessToken(user.id);
      const refreshToken = TokenService.generateRefreshToken(
        user.id,
        rememberMe
      );

      // Store refresh token
      const refreshTokenExpiration =
        TokenService.getExpirationDate(refreshToken);
      if (refreshTokenExpiration) {
        await TokenService.storeRefreshToken(
          user.id,
          refreshToken,
          refreshTokenExpiration
        );
      }

      // Return success response
      const response: AuthResponse = {
        user: toUserResponse(user),
        accessToken,
        refreshToken,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during login',
        statusCode: 500,
      } as ErrorResponse);
    }
  }

  /**
   * Login with SSO (Apple or Google)
   * POST /api/auth/login/sso
   *
   * Requirements: 23.6, 23.7, 23.8, 23.9
   */
  async loginWithSSO(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as SSOLoginRequest;

      // Validate required fields
      if (!body.provider || !body.providerUserId) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Provider and provider user ID are required',
          statusCode: 400,
        } as ErrorResponse);
        return;
      }

      // Validate provider
      if (body.provider !== 'apple' && body.provider !== 'google') {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid SSO provider',
          statusCode: 400,
        } as ErrorResponse);
        return;
      }

      // Authenticate SSO user
      const user = await AuthService.authenticateSSOUser(
        body.provider,
        body.providerUserId
      );

      if (!user) {
        res.status(404).json({
          error: 'Not Found',
          message: 'No account found with this provider',
          statusCode: 404,
        } as ErrorResponse);
        return;
      }

      // Generate tokens
      const accessToken = TokenService.generateAccessToken(user.id);
      const refreshToken = TokenService.generateRefreshToken(user.id, false);

      // Store refresh token
      const refreshTokenExpiration =
        TokenService.getExpirationDate(refreshToken);
      if (refreshTokenExpiration) {
        await TokenService.storeRefreshToken(
          user.id,
          refreshToken,
          refreshTokenExpiration
        );
      }

      // Return success response
      const response: AuthResponse = {
        user: toUserResponse(user),
        accessToken,
        refreshToken,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('SSO login error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during SSO login',
        statusCode: 500,
      } as ErrorResponse);
    }
  }

  /**
   * Unified SSO — find existing account or create new one
   * POST /api/auth/sso
   */
  async ssoFindOrCreate(req: Request, res: Response): Promise<void> {
    try {
      const { provider, providerUserId, email, firstName, lastName } = req.body;

      if (!provider || !providerUserId) {
<<<<<<< HEAD
        res.status(400).json({
          error: 'Validation Error',
          message: 'provider and providerUserId are required',
        });
=======
        res
          .status(400)
          .json({
            error: 'Validation Error',
            message: 'provider and providerUserId are required',
          });
>>>>>>> charles-dev
        return;
      }
      if (provider !== 'apple' && provider !== 'google') {
        res
          .status(400)
          .json({ error: 'Validation Error', message: 'Invalid provider' });
        return;
      }

      // 1. Try to find by SSO provider ID
      let user = await AuthService.findUserBySSOProvider(
        provider,
        providerUserId
      );

<<<<<<< HEAD
      // 2. If not found and we have a valid email, try to find by email and link
      if (!user && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        const existingByEmail = await AuthService.findUserByEmail(
          email.trim().toLowerCase()
        );
=======
      // 2. If not found and we have an email, try to find by email and link
      if (!user && email) {
        const existingByEmail = await AuthService.findUserByEmail(email);
>>>>>>> charles-dev
        if (existingByEmail) {
          await AuthService.linkSSOProvider(
            existingByEmail.id,
            provider,
            providerUserId
          );
          user = await prisma.user.findUnique({
            where: { id: existingByEmail.id },
          });
        }
      }

      // 3. If still not found, create a new account
      if (!user) {
<<<<<<< HEAD
        // Sanitize provider data — discard garbled or obviously bad values
        const cleanName = (val: string | undefined): string => {
          if (!val) return '';
          const trimmed = val.trim();
          // Reject if it looks encoded, has special chars, or is too long
          if (trimmed.length > 100) return '';
          if (/[<>{}\\\/\x00-\x1f]/.test(trimmed)) return '';
          if (/^[=+\-@]/.test(trimmed)) return '';
          return trimmed;
        };
        const cleanEmail = (val: string | undefined): string => {
          if (!val) return '';
          const trimmed = val.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return '';
          if (trimmed.length > 254) return '';
          return trimmed;
        };

        const safeEmail = cleanEmail(email);
        const safeFirst = cleanName(firstName);
        const safeLast = cleanName(lastName);
        const regEmail = safeEmail || `${providerUserId}@${provider}.sso`;
        const username =
          (safeEmail ? safeEmail.split('@')[0] : providerUserId.slice(0, 10)) +
=======
        const regEmail = email || `${providerUserId}@${provider}.sso`;
        const username =
          (email ? email.split('@')[0] : providerUserId.slice(0, 10)) +
>>>>>>> charles-dev
          '_' +
          Date.now().toString(36);
        user = await AuthService.createSSOUser({
          email: regEmail,
          username,
<<<<<<< HEAD
          firstName: safeFirst || regEmail.split('@')[0],
          lastName: safeLast,
=======
          firstName: firstName || regEmail.split('@')[0],
          lastName: lastName || '',
>>>>>>> charles-dev
          dateOfBirth: new Date('2000-01-01'),
          ssoProvider: provider,
          ssoProviderId: providerUserId,
        });
      }

      const accessToken = TokenService.generateAccessToken(user!.id);
      const refreshToken = TokenService.generateRefreshToken(user!.id, false);
      const exp = TokenService.getExpirationDate(refreshToken);
      if (exp)
        await TokenService.storeRefreshToken(user!.id, refreshToken, exp);

<<<<<<< HEAD
      res.status(200).json({
        user: toUserResponse(user!),
        accessToken,
        refreshToken,
      } as AuthResponse);
    } catch (error: any) {
      console.error('SSO find-or-create error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'SSO authentication failed',
      });
=======
      res
        .status(200)
        .json({
          user: toUserResponse(user!),
          accessToken,
          refreshToken,
        } as AuthResponse);
    } catch (error: any) {
      console.error('SSO find-or-create error:', error);
      res
        .status(500)
        .json({
          error: 'Internal Server Error',
          message: error.message || 'SSO authentication failed',
        });
>>>>>>> charles-dev
    }
  }

  /**
   * Link an SSO account to an existing user account
   * POST /api/auth/link-account
   *
   * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6
   */
  async linkAccount(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as LinkAccountRequest;

      // Validate required fields
      if (
        !body.email ||
        !body.password ||
        !body.provider ||
        !body.providerUserId
      ) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'All fields are required',
          statusCode: 400,
        } as ErrorResponse);
        return;
      }

      // Validate provider
      if (body.provider !== 'apple' && body.provider !== 'google') {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid SSO provider',
          statusCode: 400,
        } as ErrorResponse);
        return;
      }

      // Find user by email
      const user = await AuthService.findUserByEmail(body.email);

      if (!user) {
        res.status(404).json({
          error: 'Not Found',
          message: 'No account found with this email',
          statusCode: 404,
        } as ErrorResponse);
        return;
      }

      // Verify password (only if user has a password - not SSO-only account)
      if (user.password) {
        const isValidPassword = await AuthService.comparePassword(
          body.password,
          user.password
        );
        if (!isValidPassword) {
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Incorrect password',
            statusCode: 401,
          } as ErrorResponse);
          return;
        }
      }

      // Check if provider is already linked
      if (user.ssoProviders.includes(body.provider)) {
        res.status(409).json({
          error: 'Conflict',
          message: 'This provider is already linked to your account',
          statusCode: 409,
        } as ErrorResponse);
        return;
      }

      // Link SSO provider
      const updatedUser = await AuthService.linkSSOProvider(
        user.id,
        body.provider,
        body.providerUserId
      );

      // Generate tokens
      const accessToken = TokenService.generateAccessToken(updatedUser.id);
      const refreshToken = TokenService.generateRefreshToken(
        updatedUser.id,
        false
      );

      // Store refresh token
      const refreshTokenExpiration =
        TokenService.getExpirationDate(refreshToken);
      if (refreshTokenExpiration) {
        await TokenService.storeRefreshToken(
          updatedUser.id,
          refreshToken,
          refreshTokenExpiration
        );
      }

      // Send account linked email (optional)
      const providerName =
        body.provider.charAt(0).toUpperCase() + body.provider.slice(1);
      EmailService.sendAccountLinkedEmail(
        updatedUser.email,
        providerName
      ).catch(error => {
        console.error('Failed to send account linked email:', error);
      });

      // Return success response
      const response: AuthResponse = {
        user: toUserResponse(updatedUser),
        accessToken,
        refreshToken,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Account linking error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during account linking',
        statusCode: 500,
      } as ErrorResponse);
    }
  }

  /**
   * Refresh access token using refresh token
   * POST /api/auth/refresh
   *
   * Requirements: 25.1, 25.2, 25.3, 25.4, 25.5
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as RefreshTokenRequest;

      // Validate required fields
      if (!body.refreshToken) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Refresh token is required',
          statusCode: 400,
        } as ErrorResponse);
        return;
      }

      // Verify refresh token
      const isValid = await TokenService.isRefreshTokenValid(body.refreshToken);

      if (!isValid) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired refresh token',
          statusCode: 401,
        } as ErrorResponse);
        return;
      }

      // Decode token to get user ID
      const payload = TokenService.verifyRefreshToken(body.refreshToken);
      if (!payload) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid refresh token',
          statusCode: 401,
        } as ErrorResponse);
        return;
      }

      // Generate new tokens
      const accessToken = TokenService.generateAccessToken(payload.userId);
      const newRefreshToken = TokenService.generateRefreshToken(
        payload.userId,
        false
      );

      // Invalidate old refresh token
      await TokenService.invalidateRefreshToken(body.refreshToken);

      // Store new refresh token
      const refreshTokenExpiration =
        TokenService.getExpirationDate(newRefreshToken);
      if (refreshTokenExpiration) {
        await TokenService.storeRefreshToken(
          payload.userId,
          newRefreshToken,
          refreshTokenExpiration
        );
      }

      // Return new tokens
      const response: TokenResponse = {
        accessToken,
        refreshToken: newRefreshToken,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during token refresh',
        statusCode: 500,
      } as ErrorResponse);
    }
  }

  /**
   * Logout user by invalidating refresh token
   * POST /api/auth/logout
   *
   * Requirements: 25.6, 25.7, 25.8, 25.9
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as RefreshTokenRequest;

      // Validate required fields
      if (!body.refreshToken) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Refresh token is required',
          statusCode: 400,
        } as ErrorResponse);
        return;
      }

      // Invalidate refresh token
      await TokenService.invalidateRefreshToken(body.refreshToken);

      res.status(200).json({
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during logout',
        statusCode: 500,
      } as ErrorResponse);
    }
  }

  /**
   * Request password reset email
   * POST /api/auth/forgot-password
   *
   * Requirements: 26.1, 26.2, 26.3, 26.4
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as ForgotPasswordRequest;

      // Validate required fields
      if (!body.email) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Email is required',
          statusCode: 400,
        } as ErrorResponse);
        return;
      }

      // Find user by email
      const user = await AuthService.findUserByEmail(body.email);

      // Always return success to prevent email enumeration
      // Only send email if user exists
      if (user) {
        // Generate reset token (32 bytes = 64 hex characters)
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Store reset token with 1 hour expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            token: resetToken,
            expiresAt,
            used: false,
          },
        });

        // Send password reset email
        await EmailService.sendPasswordResetEmail(user.email, resetToken);
      }

      // Return success response (same for existing and non-existing emails)
      res.status(200).json({
        message: 'Password reset email sent. Please check your inbox',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while processing your request',
        statusCode: 500,
      } as ErrorResponse);
    }
  }

  /**
   * Reset password using reset token
   * POST /api/auth/reset-password
   *
   * Requirements: 26.5, 26.6, 26.7, 26.8, 26.9
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as ResetPasswordRequest;

      // Validate required fields
      if (!body.token || !body.newPassword) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Token and new password are required',
          statusCode: 400,
        } as ErrorResponse);
        return;
      }

      // Find reset token
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: body.token },
      });

      if (!resetToken) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Password reset link is invalid or expired',
          statusCode: 401,
        } as ErrorResponse);
        return;
      }

      // Check if token is expired
      if (resetToken.expiresAt < new Date()) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Password reset link is invalid or expired',
          statusCode: 401,
        } as ErrorResponse);
        return;
      }

      // Check if token has already been used
      if (resetToken.used) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Password reset link has already been used',
          statusCode: 401,
        } as ErrorResponse);
        return;
      }

      // Hash new password
      const hashedPassword = await AuthService.hashPassword(body.newPassword);

      // Update user password
      await prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });

      // Mark token as used
      await prisma.passwordResetToken.update({
        where: { token: body.token },
        data: {
          used: true,
          usedAt: new Date(),
        },
      });

      // Invalidate all refresh tokens for security
      await TokenService.invalidateAllUserTokens(resetToken.userId);

      res.status(200).json({
        message:
          'Password reset successful. Please log in with your new password',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while resetting your password',
        statusCode: 500,
      } as ErrorResponse);
    }
  }
}

export default new AuthController();
