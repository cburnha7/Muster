/**
 * Transfer Service
 *
 * Converts a dependent account into an independent user account when the
 * dependent turns 18. The transfer is an in-place mutation on the existing
 * User record — all FK references (bookings, events, Salutes, Rosters,
 * Leagues, ratings) are preserved automatically.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { validateDependentAge } from '../utils/age-validation';
import type { TransferCredentials } from '../types/dependent';

const SALT_ROUNDS = 10;

/**
 * Transfer a dependent account to an independent account.
 *
 * Validates:
 * - The dependent exists and is owned by the guardian
 * - The dependent is 18 or older
 * - The provided email is not already in use
 *
 * On success, sets `isDependent = false`, clears `guardianId`, and stores
 * the hashed password and email. All existing relations remain untouched.
 *
 * @param guardianId - The guardian's user ID (for ownership verification)
 * @param dependentId - The dependent's user ID
 * @param credentials - Email and password for the new independent account
 * @returns The updated User record
 * @throws {Error} If validation fails
 */
export async function transferAccount(
  guardianId: string,
  dependentId: string,
  credentials: TransferCredentials,
) {
  // Fetch the dependent and verify ownership
  const dependent = await prisma.user.findUnique({
    where: { id: dependentId },
    select: {
      id: true,
      isDependent: true,
      guardianId: true,
      dateOfBirth: true,
    },
  });

  if (!dependent) {
    throw new Error('Dependent not found');
  }

  if (!dependent.isDependent || dependent.guardianId !== guardianId) {
    throw new Error('Not authorized');
  }

  // Validate dependent is 18 or older
  validateDependentAge(dependent.dateOfBirth, 'transfer');

  // Validate email uniqueness
  const existingUser = await prisma.user.findFirst({
    where: { email: credentials.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error('Email address is already in use');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(credentials.password, SALT_ROUNDS);

  // Perform the in-place mutation — all FK references are preserved
  const updated = await prisma.user.update({
    where: { id: dependentId },
    data: {
      isDependent: false,
      guardianId: null,
      email: credentials.email,
      password: hashedPassword,
    },
  });

  return updated;
}
