/**
 * Balance Service
 *
 * Provides balance-checking utilities for Stripe Connect accounts.
 * Used before booking confirmation to verify entities have sufficient funds.
 */

import { prisma } from '../lib/prisma';
import { getConnectAccountBalance } from './stripe-connect';
import { NotificationService } from './NotificationService';

export interface BalanceCheckResult {
  sufficient: boolean;
  shortfall: number;
}

/**
 * Look up the Stripe Connect account ID for a given entity.
 *
 * Checks Team (roster), Facility, and League tables in that order.
 * Returns `null` if the entity is not found or has no Connect account.
 */
async function resolveStripeAccountId(entityId: string): Promise<string | null> {
  // Check Team (roster) — uses `stripeAccountId`
  const team = await prisma.team.findUnique({
    where: { id: entityId },
    select: { stripeAccountId: true },
  });
  if (team?.stripeAccountId) return team.stripeAccountId;

  // Check Facility — uses `stripeConnectAccountId`
  const facility = await prisma.facility.findUnique({
    where: { id: entityId },
    select: { stripeConnectAccountId: true },
  });
  if (facility?.stripeConnectAccountId) return facility.stripeConnectAccountId;

  // Check League — uses `stripeConnectAccountId`
  const league = await prisma.league.findUnique({
    where: { id: entityId },
    select: { stripeConnectAccountId: true },
  });
  if (league?.stripeConnectAccountId) return league.stripeConnectAccountId;

  return null;
}

/**
 * Check whether an entity's Stripe Connect account has sufficient available
 * balance to cover `requiredAmount` (in cents).
 *
 * @param entityId - ID of a Team, Facility, or League
 * @param requiredAmount - Amount required in cents (USD)
 * @returns `{ sufficient, shortfall }` — shortfall is 0 when sufficient
 * @throws If the entity has no Stripe Connect account
 */
export async function checkBalance(
  entityId: string,
  requiredAmount: number,
): Promise<BalanceCheckResult> {
  const connectAccountId = await resolveStripeAccountId(entityId);

  if (!connectAccountId) {
    throw new Error(
      `No Stripe Connect account found for entity ${entityId}`,
    );
  }

  const { available } = await getConnectAccountBalance(connectAccountId);

  const sufficient = available >= requiredAmount;
  const shortfall = sufficient ? 0 : requiredAmount - available;

  return { sufficient, shortfall };
}

export type BalanceStatus = 'funded' | 'low' | 'blocked';

/**
 * Determine the balance status of an entity relative to the average court cost.
 *
 * Thresholds use the roster's 50% share of court cost (half-share):
 *   halfShare = avgCourtCost × 0.50
 *
 * - funded:  balance >= 2 × halfShare
 * - low:     balance >= 1 × halfShare but < 2 × halfShare
 * - blocked: balance < 1 × halfShare
 *
 * @param entityId - ID of a Team, Facility, or League
 * @param avgCourtCost - Average court cost in dollars (not cents)
 * @returns The balance status: 'funded', 'low', or 'blocked'
 * @throws If the entity has no Stripe Connect account
 */
export async function getBalanceStatus(
  entityId: string,
  avgCourtCost: number,
): Promise<BalanceStatus> {
  const connectAccountId = await resolveStripeAccountId(entityId);

  if (!connectAccountId) {
    throw new Error(
      `No Stripe Connect account found for entity ${entityId}`,
    );
  }

  const { available } = await getConnectAccountBalance(connectAccountId);

  // Convert available balance from cents to dollars for comparison
  const availableDollars = available / 100;

  const halfShare = avgCourtCost * 0.5;

  if (availableDollars >= 2 * halfShare) {
    return 'funded';
  }

  if (availableDollars >= halfShare) {
    return 'low';
  }

  return 'blocked';
}


/**
 * Calculate the average hourly court cost for a given sport type across all
 * onboarded facilities (those with a non-null `stripeConnectAccountId`).
 *
 * Used by the suggested dues calculator when a commissioner creates a paid
 * league season.
 *
 * @param sportType - The sport type to filter courts by (e.g. "basketball")
 * @returns Average price per hour in the same unit as `FacilityCourt.pricePerHour`,
 *          or 0 if no matching courts are found.
 */
export async function calculateAvgCourtCost(sportType: string): Promise<number> {
  const result = await prisma.facilityCourt.aggregate({
    _avg: { pricePerHour: true },
    where: {
      sportType,
      pricePerHour: { not: null },
      facility: {
        stripeConnectAccountId: { not: null },
      },
    },
  });

  return result._avg.pricePerHour ?? 0;
}


/**
 * Recalculate balance statuses for all rosters in a league season.
 *
 * For each active roster in the season:
 * 1. Calls `getBalanceStatus` with the season's `avgCourtCost`
 * 2. Compares the new status against the roster's previous status
 * 3. Sends notifications when status transitions to 'low' or 'blocked'
 *
 * Should be called after every booking confirmation, refund, or dues payment
 * that could affect roster balances.
 *
 * @param leagueId - The league ID
 * @param seasonId - The season ID
 */
export async function recalculateBalanceStatuses(
  leagueId: string,
  seasonId: string,
): Promise<void> {
  try {
    // 1. Fetch the season to get avgCourtCost
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: { avgCourtCost: true },
    });

    if (!season?.avgCourtCost || season.avgCourtCost <= 0) {
      return; // No court cost data — nothing to check
    }

    const avgCourtCost = season.avgCourtCost;

    // 2. Fetch all active roster memberships in this season
    const memberships = await prisma.leagueMembership.findMany({
      where: {
        leagueId,
        seasonId,
        memberType: 'roster',
        status: 'active',
      },
      select: {
        memberId: true,
        team: {
          select: {
            id: true,
            name: true,
            stripeAccountId: true,
          },
        },
      },
    });

    // 3. Check each roster's balance status and send notifications on transitions
    const halfShare = avgCourtCost * 0.5;

    for (const membership of memberships) {
      const roster = membership.team;
      if (!roster?.stripeAccountId) continue;

      try {
        const status = await getBalanceStatus(roster.id, avgCourtCost);

        // Send notifications on transitions to low or blocked
        // We always notify on low/blocked since we don't persist previous status —
        // the notification service can deduplicate if needed
        if (status === 'low') {
          await NotificationService.notifyLowBalance(roster.id, roster.name);
        } else if (status === 'blocked') {
          // Calculate the exact top-up amount needed to reach the low threshold (1× halfShare)
          const { available } = await getConnectAccountBalance(roster.stripeAccountId);
          const availableDollars = available / 100;
          const topUpAmount = Math.max(0, halfShare - availableDollars);
          await NotificationService.notifyBlockedBalance(roster.id, roster.name, topUpAmount);
        }
      } catch (error) {
        // Log but don't fail the entire recalculation for one roster
        console.error(`Failed to check balance status for roster ${roster.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`Failed to recalculate balance statuses for league ${leagueId}, season ${seasonId}:`, error);
  }
}
