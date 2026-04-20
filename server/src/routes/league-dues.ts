/**
 * League Dues Routes
 *
 * Handles roster-to-league season dues payments. Roster managers pay the
 * league commissioner's Stripe Connect account directly, with the platform
 * fee deducted at charge time. On success the roster is marked as an active
 * member of the league season.
 */

import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  createLeagueDuesPayment,
  confirmLeagueDuesPayment,
  getLeagueDuesStatus,
} from '../services/dues';
import { requireNonDependent } from '../middleware/require-non-dependent';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/league-dues
 *
 * Initiate a roster-to-league dues payment. Creates a Stripe PaymentIntent
 * and returns the client secret for the frontend to complete payment.
 *
 * Body:
 *   - rosterId:  string — Roster (Team) ID paying dues
 *   - leagueId:  string — League ID
 *   - seasonId:  string — Season ID
 *   - managerId: string — User ID of the roster manager
 */
router.post(
  '/',
  authMiddleware,
  requireNonDependent,
  async (req: Request, res: Response) => {
    try {
      const { rosterId, leagueId, seasonId, managerId } = req.body;

      if (!rosterId || !leagueId || !seasonId || !managerId) {
        return res.status(400).json({
          error:
            'Missing required fields: rosterId, leagueId, seasonId, managerId',
        });
      }

      const result = await createLeagueDuesPayment(
        rosterId,
        leagueId,
        seasonId,
        managerId
      );

      res.status(201).json({
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        amount: result.amount,
        platformFee: result.platformFee,
      });
    } catch (error: any) {
      console.error('Error creating league dues payment:', error);

      if (
        error.message === 'Season not found' ||
        error.message === 'Roster not found'
      ) {
        return res.status(404).json({ error: error.message });
      }
      if (
        error.message === 'Season does not belong to this league' ||
        error.message === 'This league does not require dues' ||
        error.message === 'No dues amount set for this season' ||
        error.message ===
          'League commissioner has not completed Stripe Connect onboarding' ||
        error.message === 'User is not the manager of this roster' ||
        error.message === 'Roster is already an active member of this season'
      ) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to create league dues payment' });
    }
  }
);

/**
 * POST /api/league-dues/confirm
 *
 * Confirm a league dues payment after the client completes Stripe payment.
 * Marks the roster as an active member of the league season and records
 * the transaction in the league ledger.
 *
 * Body:
 *   - paymentIntentId: string — The Stripe PaymentIntent ID
 *   - rosterId:        string — Roster ID
 *   - leagueId:        string — League ID
 *   - seasonId:        string — Season ID
 */
router.post(
  '/confirm',
  authMiddleware,
  requireNonDependent,
  async (req: Request, res: Response) => {
    try {
      const { paymentIntentId, rosterId, leagueId, seasonId } = req.body;

      if (!paymentIntentId || !rosterId || !leagueId || !seasonId) {
        return res.status(400).json({
          error:
            'Missing required fields: paymentIntentId, rosterId, leagueId, seasonId',
        });
      }

      await confirmLeagueDuesPayment(
        paymentIntentId,
        rosterId,
        leagueId,
        seasonId
      );

      res.json({ status: 'succeeded' });
    } catch (error: any) {
      console.error('Error confirming league dues payment:', error);
      res.status(500).json({ error: 'Failed to confirm league dues payment' });
    }
  }
);

/**
 * GET /api/league-dues/status
 *
 * Get the dues payment status for a roster in a specific league and season.
 *
 * Query:
 *   - rosterId:  string
 *   - leagueId:  string
 *   - seasonId:  string
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { rosterId, leagueId, seasonId } = req.query;

    if (!rosterId || !leagueId || !seasonId) {
      return res.status(400).json({
        error:
          'Missing required query parameters: rosterId, leagueId, seasonId',
      });
    }

    const status = await getLeagueDuesStatus(
      rosterId as string,
      leagueId as string,
      seasonId as string
    );

    res.json(status);
  } catch (error: any) {
    console.error('Error fetching league dues status:', error);

    if (error.message === 'Season not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to fetch league dues status' });
  }
});

/**
 * GET /api/league-dues/league-roster-status
 *
 * Get the dues payment status for ALL rosters in a league for a given season.
 * Used by commissioners to see which rosters have/haven't paid league dues.
 *
 * Query:
 *   - leagueId: string
 *   - seasonId: string
 */
router.get('/league-roster-status', async (req: Request, res: Response) => {
  try {
    const { leagueId, seasonId } = req.query;

    if (!leagueId || !seasonId) {
      return res.status(400).json({
        error: 'Missing required query parameters: leagueId, seasonId',
      });
    }

    // Get the season to check pricing type and dues amount
    const season = await prisma.season.findUnique({
      where: { id: seasonId as string },
      include: {
        league: { select: { id: true, pricingType: true } },
      },
    });

    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    // Get all roster memberships for this league + season
    const memberships = await prisma.leagueMembership.findMany({
      where: {
        leagueId: leagueId as string,
        seasonId: seasonId as string,
        memberType: 'roster',
      },
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
    });

    const rosterStatuses = memberships.map((m: any) => ({
      rosterId: m.team?.id ?? m.memberId,
      rosterName: m.team?.name ?? 'Unknown',
      sportType: m.team?.sportType ?? null,
      imageUrl: m.team?.imageUrl ?? null,
      membershipStatus: m.status,
      // In a paid league, active status means dues were paid
      paid: m.status === 'active',
    }));

    res.json({
      pricingType:
        (season as any).pricingType ?? season.league.pricingType ?? 'free',
      duesAmount: (season as any).duesAmount ?? null,
      rosters: rosterStatuses,
    });
  } catch (error) {
    console.error('Error fetching league roster dues status:', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch league roster dues status' });
  }
});

export default router;
