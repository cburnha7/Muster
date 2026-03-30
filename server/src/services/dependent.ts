/**
 * Dependent Service
 *
 * Handles CRUD operations for guardian-managed dependent accounts.
 * Dependents are full User records with `isDependent = true`, no login
 * credentials, and a `guardianId` linking them to their guardian.
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3
 */

import { prisma } from '../index';
import { validateDependentAge } from '../utils/age-validation';
import type {
  CreateDependentInput,
  UpdateDependentInput,
  DependentSummary,
  DependentProfile,
} from '../types/dependent';

/**
 * Create a new dependent User record linked to the guardian.
 *
 * Validates that the dependent is under 18, then creates a User with
 * `isDependent = true`, the guardian's ID, and null email/password.
 *
 * @param guardianId - The guardian's user ID
 * @param data - Dependent creation input (name, DOB, sport preferences)
 * @returns The created User record
 * @throws {Error} If the dependent is 18 or older
 */
export async function createDependent(
  guardianId: string,
  data: CreateDependentInput,
) {
  const dateOfBirth = new Date(data.dateOfBirth);

  // Validate age < 18
  validateDependentAge(dateOfBirth, 'create-edit');

  const dependent = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth,
      profileImage: data.profileImage ?? null,
      sportPreferences: data.sportPreferences ?? [],
      ...(data.gender ? { gender: data.gender } : {}),
      isDependent: true,
      guardianId,
      email: null,
      password: null,
    },
  });

  return dependent;
}

/**
 * List all dependents for a guardian.
 *
 * Returns summary records (id, name, profile image, DOB) for all User
 * records where `guardianId` matches and `isDependent` is true.
 *
 * @param guardianId - The guardian's user ID
 * @returns Array of dependent summaries
 */
export async function listDependents(
  guardianId: string,
): Promise<DependentSummary[]> {
  const dependents = await prisma.user.findMany({
    where: {
      guardianId,
      isDependent: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profileImage: true,
      dateOfBirth: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return dependents.map((d) => ({
    id: d.id,
    firstName: d.firstName,
    lastName: d.lastName,
    profileImage: d.profileImage,
    dateOfBirth: d.dateOfBirth.toISOString(),
  }));
}

/**
 * Get a dependent's full profile including stats, ratings, and history.
 *
 * All returned data is scoped to the dependent's User record — no records
 * belonging to the guardian or other dependents are included.
 *
 * @param guardianId - The guardian's user ID (for ownership verification)
 * @param dependentId - The dependent's user ID
 * @returns Full dependent profile
 * @throws {Error} If the dependent is not found or not owned by the guardian
 */
export async function getDependentProfile(
  guardianId: string,
  dependentId: string,
): Promise<DependentProfile> {
  const dependent = await prisma.user.findUnique({
    where: { id: dependentId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profileImage: true,
      dateOfBirth: true,
      isDependent: true,
      guardianId: true,
    },
  });

  if (!dependent) {
    throw new Error('Dependent not found');
  }

  if (!dependent.isDependent || dependent.guardianId !== guardianId) {
    throw new Error('Not authorized');
  }

  // Fetch all profile data scoped to the dependent's user ID
  const [sportRatings, eventHistory, salutesCount, rosterMemberships, leagueMemberships] =
    await Promise.all([
      // Sport ratings (PlayerSportRating)
      prisma.playerSportRating.findMany({
        where: { userId: dependentId },
      }),
      // Event history via bookings
      prisma.booking.findMany({
        where: { userId: dependentId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              sportType: true,
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Salutes received (count)
      prisma.salute.count({
        where: { toUserId: dependentId },
      }),
      // Roster memberships (teamMemberships with team relation)
      prisma.teamMember.findMany({
        where: { userId: dependentId, status: 'active' },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              sportType: true,
              imageUrl: true,
            },
          },
        },
      }),
      // League memberships (with league relation)
      prisma.leagueMembership.findMany({
        where: {
          userId: dependentId,
          memberType: 'user',
          status: 'active',
        },
        include: {
          league: {
            select: {
              id: true,
              name: true,
              sportType: true,
            },
          },
        },
      }),
    ]);

  // Derive sport preferences from sport ratings
  const sportPreferences = sportRatings.map((r) => r.sportType);

  return {
    id: dependent.id,
    firstName: dependent.firstName,
    lastName: dependent.lastName,
    profileImage: dependent.profileImage,
    dateOfBirth: dependent.dateOfBirth.toISOString(),
    sportPreferences,
    sportRatings,
    eventHistory,
    salutesReceived: salutesCount,
    rosterMemberships,
    leagueMemberships,
  };
}

/**
 * Update a dependent's profile fields.
 *
 * Validates that the guardian owns the dependent, and if the DOB is being
 * changed, validates that the new DOB still yields age < 18.
 *
 * @param guardianId - The guardian's user ID (for ownership verification)
 * @param dependentId - The dependent's user ID
 * @param data - Fields to update
 * @returns The updated User record
 * @throws {Error} If the dependent is not found, not owned by the guardian, or DOB yields age >= 18
 */
export async function updateDependent(
  guardianId: string,
  dependentId: string,
  data: UpdateDependentInput,
) {
  // Verify ownership
  const dependent = await prisma.user.findUnique({
    where: { id: dependentId },
    select: {
      id: true,
      isDependent: true,
      guardianId: true,
    },
  });

  if (!dependent) {
    throw new Error('Dependent not found');
  }

  if (!dependent.isDependent || dependent.guardianId !== guardianId) {
    throw new Error('Not authorized');
  }

  // Validate age < 18 if DOB is being changed
  if (data.dateOfBirth) {
    validateDependentAge(new Date(data.dateOfBirth), 'create-edit');
  }

  // Build update payload — only include provided fields
  const updateData: Record<string, any> = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(data.dateOfBirth);
  if (data.profileImage !== undefined) updateData.profileImage = data.profileImage;
  if (data.sportPreferences !== undefined) updateData.sportPreferences = data.sportPreferences;
  if (data.gender !== undefined) updateData.gender = data.gender;

  const updated = await prisma.user.update({
    where: { id: dependentId },
    data: updateData,
  });

  return updated;
}
