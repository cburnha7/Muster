/**
 * Connect Express Onboarding — Business Logic
 *
 * Pure service functions for managing Stripe Connect onboarding.
 * Separated from the route layer for testability.
 */

import { PrismaClient } from '@prisma/client';
import {
  createConnectAccount,
  createConnectAccountLink,
  getConnectAccountStatus,
  ConnectAccountStatus,
} from './stripe-connect';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EntityType = 'roster' | 'facility' | 'league';

export interface EntityRecord {
  id: string;
  name: string;
  connectAccountId: string | null;
}

export interface ConnectAccountEntry {
  entityType: string;
  entityId: string;
  entityName: string;
  accountId: string | null;
  status: ConnectAccountStatus | null;
}

// ---------------------------------------------------------------------------
// Entity resolution & authorisation
// ---------------------------------------------------------------------------

/**
 * Verify the current user owns/manages the given entity and return its record.
 */
export async function resolveEntity(
  prisma: PrismaClient,
  entityType: EntityType,
  entityId: string,
  userId: string
): Promise<{ entity: EntityRecord | null; error: string | null }> {
  switch (entityType) {
    case 'roster': {
      const membership = await prisma.teamMember.findFirst({
        where: {
          teamId: entityId,
          userId,
          role: { in: ['manager', 'captain'] },
          status: 'active',
        },
      });
      if (!membership) {
        return {
          entity: null,
          error: 'You must be a manager or captain of this roster',
        };
      }
      const team = await prisma.team.findUnique({ where: { id: entityId } });
      if (!team) {
        return { entity: null, error: 'Roster not found' };
      }
      return {
        entity: {
          id: team.id,
          name: team.name,
          connectAccountId: team.stripeAccountId,
        },
        error: null,
      };
    }

    case 'facility': {
      const facility = await prisma.facility.findUnique({
        where: { id: entityId },
      });
      if (!facility) {
        return { entity: null, error: 'Facility not found' };
      }
      if (facility.ownerId !== userId) {
        return {
          entity: null,
          error: 'You must be the owner of this facility',
        };
      }
      return {
        entity: {
          id: facility.id,
          name: facility.name,
          connectAccountId: facility.stripeConnectAccountId,
        },
        error: null,
      };
    }

    case 'league': {
      const league = await prisma.league.findUnique({
        where: { id: entityId },
      });
      if (!league) {
        return { entity: null, error: 'League not found' };
      }
      if (league.organizerId !== userId) {
        return {
          entity: null,
          error: 'You must be the organiser of this league',
        };
      }
      return {
        entity: {
          id: league.id,
          name: league.name,
          connectAccountId: league.stripeConnectAccountId,
        },
        error: null,
      };
    }

    default:
      return {
        entity: null,
        error: 'Invalid entity type. Must be roster, facility, or league',
      };
  }
}

// ---------------------------------------------------------------------------
// Store Connect account ID
// ---------------------------------------------------------------------------

export async function storeConnectAccountId(
  prisma: PrismaClient,
  entityType: EntityType,
  entityId: string,
  accountId: string
): Promise<void> {
  switch (entityType) {
    case 'roster':
      await prisma.team.update({
        where: { id: entityId },
        data: { stripeAccountId: accountId },
      });
      break;
    case 'facility':
      await prisma.facility.update({
        where: { id: entityId },
        data: { stripeConnectAccountId: accountId },
      });
      break;
    case 'league':
      await prisma.league.update({
        where: { id: entityId },
        data: { stripeConnectAccountId: accountId },
      });
      break;
  }
}

// ---------------------------------------------------------------------------
// Start onboarding
// ---------------------------------------------------------------------------

export async function startOnboarding(
  prisma: PrismaClient,
  userId: string,
  entityType: EntityType,
  entityId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<{ url?: string; error?: string; status?: number }> {
  const { entity, error } = await resolveEntity(
    prisma,
    entityType,
    entityId,
    userId
  );
  if (error || !entity) {
    return { error: error!, status: 403 };
  }

  let connectAccountId = entity.connectAccountId;

  if (!connectAccountId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { error: 'User not found', status: 404 };
    }
    const account = await createConnectAccount(user.email ?? undefined);
    connectAccountId = account.id;
    await storeConnectAccountId(prisma, entityType, entityId, connectAccountId);
  }

  const accountLink = await createConnectAccountLink(
    connectAccountId,
    refreshUrl,
    returnUrl
  );
  return { url: accountLink.url };
}

// ---------------------------------------------------------------------------
// Check onboarding status
// ---------------------------------------------------------------------------

export async function checkOnboardingStatus(
  prisma: PrismaClient,
  userId: string,
  entityType: EntityType,
  entityId: string
): Promise<{ data?: any; error?: string; status?: number }> {
  const { entity, error } = await resolveEntity(
    prisma,
    entityType,
    entityId,
    userId
  );
  if (error || !entity) {
    return { error: error!, status: 403 };
  }

  if (!entity.connectAccountId) {
    return { data: { onboarded: false } };
  }

  const accountStatus = await getConnectAccountStatus(entity.connectAccountId);
  return { data: { onboarded: true, ...accountStatus } };
}

// ---------------------------------------------------------------------------
// List all Connect accounts for a user
// ---------------------------------------------------------------------------

export async function listConnectAccounts(
  prisma: PrismaClient,
  userId: string
): Promise<ConnectAccountEntry[]> {
  const rosterMemberships = await prisma.teamMember.findMany({
    where: { userId, role: { in: ['manager', 'captain'] }, status: 'active' },
    include: { team: true },
  });

  const facilities = await prisma.facility.findMany({
    where: { ownerId: userId },
  });

  const leagues = await prisma.league.findMany({
    where: { organizerId: userId },
  });

  const accounts: ConnectAccountEntry[] = [];

  for (const m of rosterMemberships) {
    const accountId = m.team.stripeAccountId;
    let status: ConnectAccountStatus | null = null;
    if (accountId) {
      try {
        status = await getConnectAccountStatus(accountId);
      } catch {
        /* noop */
      }
    }
    accounts.push({
      entityType: 'roster',
      entityId: m.team.id,
      entityName: m.team.name,
      accountId: accountId ?? null,
      status,
    });
  }

  for (const f of facilities) {
    const accountId = f.stripeConnectAccountId;
    let status: ConnectAccountStatus | null = null;
    if (accountId) {
      try {
        status = await getConnectAccountStatus(accountId);
      } catch {
        /* noop */
      }
    }
    accounts.push({
      entityType: 'facility',
      entityId: f.id,
      entityName: f.name,
      accountId: accountId ?? null,
      status,
    });
  }

  for (const l of leagues) {
    const accountId = l.stripeConnectAccountId;
    let status: ConnectAccountStatus | null = null;
    if (accountId) {
      try {
        status = await getConnectAccountStatus(accountId);
      } catch {
        /* noop */
      }
    }
    accounts.push({
      entityType: 'league',
      entityId: l.id,
      entityName: l.name,
      accountId: accountId ?? null,
      status,
    });
  }

  return accounts;
}
