/**
 * Player Dues Routes
 *
 * Handles player season dues payments. Players pay their roster manager's
 * Stripe Connect account directly, with the platform fee deducted at charge time.
 */

import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  createPlayerDuesPayment,
  confirmPlayerDuesPayment,
} from '../services/dues';
import { requireNonDependent } from '../middleware/require-non-dependent';

const router = express.Router();

/**
 * POST /api/player-dues
 *
 * Initiate a player dues payment. Creates a Stripe PaymentIntent and returns
 * the client secret for the frontend to complete payment.
 *
 * Body:
 *   - playerId: string  — User ID of the player paying dues
 *   - rosterId: string  — Roster ID the player belongs to
 *   - seasonId: string  — Season ID the dues are for
 */
router.post('/', requireNonDependent, async (req: Request, res: Response) => {
  try {
    const { playerId, rosterId, seasonId } = req.body;

    if (!playerId || !rosterId || !seasonId) {
      return res.status(400).json({
        error: 'Missing required fields: playerId, rosterId, seasonId',
      });
    }

    const result = await createPlayerDuesPayment(playerId, rosterId, seasonId);

    res.status(201).json({
      paymentId: result.payment.id,
      clientSecret: result.clientSecret,
      amount: result.payment.amount,
      platformFee: result.payment.platformFee,
    });
  } catch (error: any) {
    console.error('Error creating player dues payment:', error);

    if (error.message === 'Season not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Roster not found') {
      return res.status(404).json({ error: error.message });
    }
    if (
      error.message === 'No dues amount set for this season' ||
      error.message === 'Roster manager has not completed Stripe Connect onboarding' ||
      error.message === 'Player is not an active member of this roster' ||
      error.message === 'Dues already paid for this season'
    ) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to create dues payment' });
  }
});

/**
 * POST /api/player-dues/:paymentId/confirm
 *
 * Confirm a player dues payment after the client completes Stripe payment.
 *
 * Body:
 *   - paymentIntentId: string — The Stripe PaymentIntent ID
 */
router.post('/:paymentId/confirm', requireNonDependent, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Missing required field: paymentIntentId' });
    }

    // Verify the payment record exists and matches
    const payment = await prisma.playerDuesPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Dues payment not found' });
    }

    if (payment.stripePaymentIntentId !== paymentIntentId) {
      return res.status(400).json({ error: 'PaymentIntent ID does not match' });
    }

    await confirmPlayerDuesPayment(paymentIntentId);

    res.json({ status: 'succeeded' });
  } catch (error: any) {
    console.error('Error confirming player dues payment:', error);
    res.status(500).json({ error: 'Failed to confirm dues payment' });
  }
});

/**
 * GET /api/player-dues/status
 *
 * Get the dues payment status for a player in a specific roster and season.
 *
 * Query:
 *   - playerId: string
 *   - rosterId: string
 *   - seasonId: string
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { playerId, rosterId, seasonId } = req.query;

    if (!playerId || !rosterId || !seasonId) {
      return res.status(400).json({
        error: 'Missing required query parameters: playerId, rosterId, seasonId',
      });
    }

    const payment = await prisma.playerDuesPayment.findUnique({
      where: {
        playerId_rosterId_seasonId: {
          playerId: playerId as string,
          rosterId: rosterId as string,
          seasonId: seasonId as string,
        },
      },
    });

    const season = await prisma.season.findUnique({
      where: { id: seasonId as string },
      select: { duesAmount: true },
    });

    res.json({
      paid: payment?.paymentStatus === 'succeeded',
      paymentStatus: payment?.paymentStatus ?? null,
      duesAmount: season?.duesAmount ?? null,
      paymentId: payment?.id ?? null,
    });
  } catch (error) {
    console.error('Error fetching dues status:', error);
    res.status(500).json({ error: 'Failed to fetch dues status' });
  }
});

/**
 * GET /api/player-dues/roster-status
 *
 * Get the dues payment status for ALL players in a roster for a given season.
 * Used by roster managers to see which players have/haven't paid.
 *
 * Query:
 *   - rosterId: string
 *   - seasonId: string
 */
router.get('/roster-status', async (req: Request, res: Response) => {
  try {
    const { rosterId, seasonId } = req.query;

    if (!rosterId || !seasonId) {
      return res.status(400).json({
        error: 'Missing required query parameters: rosterId, seasonId',
      });
    }

    // Get all active members of the roster
    const members = await prisma.teamMember.findMany({
      where: {
        teamId: rosterId as string,
        status: 'active',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    // Get all dues payments for this roster + season
    const payments = await prisma.playerDuesPayment.findMany({
      where: {
        rosterId: rosterId as string,
        seasonId: seasonId as string,
      },
    });

    // Get the season dues amount
    const season = await prisma.season.findUnique({
      where: { id: seasonId as string },
      select: { duesAmount: true },
    });

    // Build a map of playerId -> payment status
    const paymentMap = new Map(
      payments.map((p: any) => [p.playerId, p.paymentStatus]),
    );

    const playerStatuses = members.map((m: any) => ({
      playerId: m.userId,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      profileImage: m.user.profileImage,
      role: m.role,
      paid: paymentMap.get(m.userId) === 'succeeded',
      paymentStatus: paymentMap.get(m.userId) ?? null,
    }));

    res.json({
      duesAmount: season?.duesAmount ?? null,
      players: playerStatuses,
    });
  } catch (error) {
    console.error('Error fetching roster dues status:', error);
    res.status(500).json({ error: 'Failed to fetch roster dues status' });
  }
});

export default router;
