import jwt from 'jsonwebtoken';
import { prisma } from '../index';

/**
 * TokenService - JWT token generation, validation, and management
 * 
 * Handles access token and refresh token lifecycle including generation,
 * validation, storage, and invalidation for the Muster authentication system.
 * 
 * Requirements: 8.1, 8.2, 9.2, 9.3, 25.3
 */

export interface TokenPayload {
  userId: string;
  iat: number; // Issued at
  exp: number; // Expiration
}

class TokenService {
  private readonly JWT_SECRET: string;
  private readonly ACCESS_TOKEN_EXPIRATION = '15m'; // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRATION_DEFAULT = '7d'; // 7 days
  private readonly REFRESH_TOKEN_EXPIRATION_REMEMBER_ME = '30d'; // 30 days

  constructor() {
    // Get JWT secret from environment variables
    this.JWT_SECRET = process.env.JWT_SECRET || '';
    
    if (!this.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    if (this.JWT_SECRET.length < 32) {
      console.warn('WARNING: JWT_SECRET should be at least 32 characters for security');
    }
  }

  /**
   * Generate an access token with 15-minute expiration
   * Requirements: 8.1
   */
  generateAccessToken(userId: string): string {
    const payload = {
      userId,
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRATION,
      algorithm: 'HS256',
    });
  }

  /**
   * Generate a refresh token with 7-day or 30-day expiration
   * Requirements: 8.2, 9.2, 9.3
   */
  generateRefreshToken(userId: string, rememberMe: boolean = false): string {
    const payload = {
      userId,
    };

    const expiresIn = rememberMe
      ? this.REFRESH_TOKEN_EXPIRATION_REMEMBER_ME
      : this.REFRESH_TOKEN_EXPIRATION_DEFAULT;

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn,
      algorithm: 'HS256',
    });
  }

  /**
   * Verify and decode an access token
   * Returns TokenPayload if valid, null if invalid or expired
   * Requirements: 8.5
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      // Token is invalid or expired
      return null;
    }
  }

  /**
   * Verify and decode a refresh token
   * Returns TokenPayload if valid, null if invalid or expired
   * Requirements: 8.6
   */
  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      // Token is invalid or expired
      return null;
    }
  }

  /**
   * Store a refresh token in the database
   * Requirements: 8.2, 25.3
   */
  async storeRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    // Delete any existing token with the same value (shouldn't happen, but handle it)
    await prisma.refreshToken.deleteMany({
      where: { token },
    });
    
    // Create the new token
    await prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  /**
   * Invalidate a specific refresh token
   * Requirements: 10.1, 25.8
   */
  async invalidateRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  /**
   * Invalidate all refresh tokens for a user
   * Requirements: 10.1
   */
  async invalidateAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Check if a refresh token is valid (exists in database and not expired)
   * Requirements: 8.6, 25.3
   */
  async isRefreshTokenValid(token: string): Promise<boolean> {
    // First verify the JWT signature and expiration
    const payload = this.verifyRefreshToken(token);
    if (!payload) {
      return false;
    }

    // Then check if token exists in database and is not expired
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken) {
      return false;
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await this.invalidateRefreshToken(token);
      return false;
    }

    return true;
  }

  /**
   * Calculate expiration date from JWT token
   * Helper method to extract expiration date for database storage
   */
  getExpirationDate(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as TokenPayload;
      if (!decoded || !decoded.exp) {
        return null;
      }
      // Convert Unix timestamp (seconds) to Date
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }
}

export default new TokenService();
