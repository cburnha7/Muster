import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { User, Prisma } from '@prisma/client';

/**
 * AuthService - Core authentication business logic
 * 
 * Handles password hashing, user creation (manual and SSO), authentication,
 * and account linking for the Muster authentication system.
 * 
 * Requirements: 1.13, 1.14, 6.4, 13.1, 13.2, 13.3, 13.4
 */

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
}

export interface CreateSSOUserData {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  ssoProvider: string;
  ssoProviderId: string;
}

class AuthService {
  /**
   * Hash a password using bcrypt with cost factor 10
   * Requirements: 13.1, 13.2
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a plain text password with a bcrypt hash
   * Requirements: 13.4
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Create a new user with manual registration (email/password)
   * Requirements: 1.13, 1.14
   */
  async createUser(data: CreateUserData): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await this.hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        ssoProviders: [],
      },
    });

    return user;
  }

  /**
   * Create a new user with SSO registration (Apple/Google)
   * Requirements: 3.7, 4.7, 21.4, 21.5
   */
  async createSSOUser(data: CreateSSOUserData): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: null, // SSO users don't have passwords
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        ssoProviders: [data.ssoProvider],
        ssoProviderIds: {
          [data.ssoProvider]: data.ssoProviderId,
        } as Prisma.JsonObject,
      },
    });

    return user;
  }

  /**
   * Authenticate a user with email/username and password
   * Requirements: 6.4
   */
  async authenticateUser(emailOrUsername: string, password: string): Promise<User | null> {
    // Find user by email or username
    const user = await this.findUserByEmailOrUsername(emailOrUsername);

    if (!user) {
      return null;
    }

    // Check if user has a password (not SSO-only account)
    if (!user.password) {
      return null;
    }

    // Verify password
    const isValidPassword = await this.comparePassword(password, user.password);

    if (!isValidPassword) {
      return null;
    }

    return user;
  }

  /**
   * Authenticate a user with SSO provider
   * Requirements: 7.5
   */
  async authenticateSSOUser(provider: string, providerId: string): Promise<User | null> {
    return this.findUserBySSOProvider(provider, providerId);
  }

  /**
   * Link an SSO provider to an existing user account
   * Requirements: 5.4, 21.6, 21.7
   */
  async linkSSOProvider(userId: string, provider: string, providerId: string): Promise<User> {
    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if provider is already linked
    if (user.ssoProviders.includes(provider)) {
      throw new Error('Provider already linked to this account');
    }

    // Add provider to ssoProviders array and update ssoProviderIds
    const updatedSsoProviders = [...user.ssoProviders, provider];
    const currentProviderIds = (user.ssoProviderIds as Prisma.JsonObject) || {};
    const updatedProviderIds = {
      ...currentProviderIds,
      [provider]: providerId,
    };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ssoProviders: updatedSsoProviders,
        ssoProviderIds: updatedProviderIds as Prisma.JsonObject,
      },
    });

    return updatedUser;
  }

  /**
   * Find a user by email
   * Requirements: 2.1
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find a user by username
   * Requirements: 2.3
   */
  async findUserByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  /**
   * Find a user by email or username
   * Requirements: 6.4, 23.3
   */
  async findUserByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername },
        ],
      },
    });
  }

  /**
   * Find a user by SSO provider and provider user ID
   * Requirements: 7.5, 23.9
   */
  async findUserBySSOProvider(provider: string, providerId: string): Promise<User | null> {
    // Query users where ssoProviders array contains the provider
    const users = await prisma.user.findMany({
      where: {
        ssoProviders: {
          has: provider,
        },
      },
    });

    // Filter by provider ID in the ssoProviderIds JSON object
    const user = users.find((u) => {
      const providerIds = u.ssoProviderIds as Record<string, string> | null;
      return providerIds && providerIds[provider] === providerId;
    });

    return user || null;
  }
}

export default new AuthService();
