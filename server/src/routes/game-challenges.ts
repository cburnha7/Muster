/**
 * Game Challenge Routes
 *
 * Handles the pickup game challenge flow where one roster manager
 * challenges another to a game at a specific facility, court, and time slot.
 *
 * Flow: Challenger selects opponent roster, facility, court, time slot →
 *       Creates booking with status 'pending_away_confirm' →
 *       Two BookingParticipant records (home + away) with 50% escrow each →
 *       48h confirmation deadline set for opponent
 */

import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { checkBalance } from '../services/balance';
import {
  createEscrowIntent,
  captureEscrow,
  releaseEscrow,
} from '../services/escrow';

const router = express.Router();

/**
 * POST /api/game-challenges
 *
 * Create a new game challenge. The challenging roster manager is the booking
 * host (home). The opponent roster manager is the away participant.
 *
 * Body:
 *   - userId: string           — ID of the challenging user
 *   - challengerRosterId: string — Challenger's roster ID (home)
 *   - opponentRosterId: string  — Opponent's roster ID (away)
 *   - facilityId: string        — Facility ID
 *   - courtId: string           — Court ID within the facility
 *   - timeSlotId: string        — Time slot ID for the booking
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      challengerRosterId,
      opponentRosterId,
      facilityId,
      courtId,
      timeSlotId,
    } = req.body;

    // --- Validate required fields ---
    if (
      !userId ||
      !challengerRosterId ||
      !opponentRosterId ||
      !facilityId ||
      !courtId ||
      !timeSlotId
    ) {
      return res.status(400).json({
        error:
          'Missing required fields: userId, challengerRosterId, opponentRosterId, facilityId, courtId, timeSlotId',
      });
    }

    // Rosters must be different
    if (challengerRosterId === opponentRosterId) {
      return res
        .status(400)
        .json({ error: 'Cannot challenge your own roster' });
    }

    // --- Verify the user is a captain/manager of the challenger roster ---
    const challengerMembership = await prisma.teamMember.findFirst({
      where: {
        userId,
        teamId: challengerRosterId,
        role: 'captain',
        status: 'active',
      },
    });

    if (!challengerMembership) {
      return res
        .status(403)
        .json({ error: 'Only the roster manager can issue a game challenge' });
    }

    // --- Verify both rosters exist and have Stripe Connect accounts ---
    const [challengerRoster, opponentRoster] = await Promise.all([
      prisma.team.findUnique({
        where: { id: challengerRosterId },
        select: { id: true, name: true, stripeAccountId: true },
      }),
      prisma.team.findUnique({
        where: { id: opponentRosterId },
        select: { id: true, name: true, stripeAccountId: true },
      }),
    ]);

    if (!challengerRoster) {
      return res.status(404).json({ error: 'Challenger roster not found' });
    }
    if (!opponentRoster) {
      return res.status(404).json({ error: 'Opponent roster not found' });
    }

    if (!challengerRoster.stripeAccountId) {
      return res
        .status(400)
        .json({
          error:
            'Challenger roster has not completed Stripe Connect onboarding',
        });
    }
    if (!opponentRoster.stripeAccountId) {
      return res
        .status(400)
        .json({
          error: 'Opponent roster has not completed Stripe Connect onboarding',
        });
    }

    // --- Verify facility exists and is onboarded ---
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: { id: true, name: true, stripeConnectAccountId: true },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    if (!facility.stripeConnectAccountId) {
      return res
        .status(400)
        .json({
          error: 'Facility has not completed Stripe Connect onboarding',
        });
    }

    // --- Verify court belongs to the facility ---
    const court = await prisma.facilityCourt.findUnique({
      where: { id: courtId },
      select: { id: true, name: true, facilityId: true, isActive: true },
    });

    if (!court || court.facilityId !== facilityId) {
      return res
        .status(404)
        .json({ error: 'Court not found at this facility' });
    }
    if (!court.isActive) {
      return res.status(400).json({ error: 'Court is not currently active' });
    }

    // --- Verify time slot exists, belongs to the court, and is available ---
    const timeSlot = await prisma.facilityTimeSlot.findUnique({
      where: { id: timeSlotId },
      select: {
        id: true,
        courtId: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
        price: true,
      },
    });

    if (!timeSlot || timeSlot.courtId !== courtId) {
      return res
        .status(404)
        .json({ error: 'Time slot not found for this court' });
    }
    if (timeSlot.status !== 'available') {
      return res.status(400).json({ error: 'Time slot is not available' });
    }

    // --- Calculate escrow amounts (50/50 split) ---
    const courtCost = Math.round(timeSlot.price * 100); // Convert to cents
    const halfCost = Math.floor(courtCost / 2);
    const halfCostOther = courtCost - halfCost; // Handle odd cent rounding

    // --- 48h confirmation deadline ---
    const confirmationDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // --- Create booking + participants atomically ---
    const result = await prisma.$transaction(async tx => {
      // Create the booking
      const booking = await tx.booking.create({
        data: {
          userId,
          facilityId,
          courtId,
          status: 'pending_away_confirm',
          bookingType: 'game_challenge',
          totalPrice: timeSlot.price,
          paymentStatus: 'pending',
          bookingHostType: 'roster_manager',
          bookingHostId: challengerRosterId,
          stripeTransferGroup: '', // Will be set to booking ID after creation
        },
      });

      // Set stripeTransferGroup to the booking ID
      await tx.booking.update({
        where: { id: booking.id },
        data: { stripeTransferGroup: booking.id },
      });

      // Create challenger (home) participant
      const homeParticipant = await tx.bookingParticipant.create({
        data: {
          bookingId: booking.id,
          rosterId: challengerRosterId,
          role: 'home',
          escrowAmount: halfCost,
          paymentStatus: 'pending',
          confirmationDeadline,
        },
      });

      // Create opponent (away) participant
      const awayParticipant = await tx.bookingParticipant.create({
        data: {
          bookingId: booking.id,
          rosterId: opponentRosterId,
          role: 'away',
          escrowAmount: halfCostOther,
          paymentStatus: 'pending',
          confirmationDeadline,
        },
      });

      return { booking, homeParticipant, awayParticipant };
    });

    // --- Fetch the full booking with relations for the response ---
    const fullBooking = await prisma.booking.findUnique({
      where: { id: result.booking.id },
      include: {
        facility: {
          select: { id: true, name: true, street: true, city: true },
        },
        court: {
          select: { id: true, name: true, sportType: true },
        },
        participants: {
          select: {
            id: true,
            rosterId: true,
            role: true,
            escrowAmount: true,
            paymentStatus: true,
            confirmationDeadline: true,
          },
        },
      },
    });

    res.status(201).json({
      ...fullBooking,
      timeSlot: {
        id: timeSlot.id,
        date: timeSlot.date,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        price: timeSlot.price,
      },
      challengerRoster: {
        id: challengerRoster.id,
        name: challengerRoster.name,
      },
      opponentRoster: { id: opponentRoster.id, name: opponentRoster.name },
    });
  } catch (error) {
    console.error('Error creating game challenge:', error);
    res.status(500).json({ error: 'Failed to create game challenge' });
  }
});

/**
 * GET /api/game-challenges/:bookingId
 *
 * Get a game challenge by booking ID with full details.
 */
router.get('/:bookingId', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params as { bookingId: string };

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            state: true,
          },
        },
        court: {
          select: { id: true, name: true, sportType: true },
        },
        participants: {
          select: {
            id: true,
            rosterId: true,
            role: true,
            escrowAmount: true,
            paymentStatus: true,
            confirmedAt: true,
            confirmationDeadline: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Game challenge not found' });
    }

    if (booking.bookingType !== 'game_challenge') {
      return res.status(400).json({ error: 'Booking is not a game challenge' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching game challenge:', error);
    res.status(500).json({ error: 'Failed to fetch game challenge' });
  }
});

/**
 * POST /api/game-challenges/:bookingId/accept
 *
 * Accept a game challenge. The opponent roster manager accepts the challenge,
 * triggering balance checks against both roster managers' Stripe Connect accounts.
 *
 * Body:
 *   - userId: string — ID of the accepting user (must be opponent roster manager)
 */
router.post('/:bookingId/accept', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params as { bookingId: string };
    const { userId } = req.body;

    if (!userId || !bookingId) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: userId, bookingId' });
    }

    // --- Fetch booking with participants ---
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        participants: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Game challenge not found' });
    }

    if (booking.bookingType !== 'game_challenge') {
      return res.status(400).json({ error: 'Booking is not a game challenge' });
    }

    if (booking.status !== 'pending_away_confirm') {
      return res
        .status(400)
        .json({ error: 'Game challenge is not pending acceptance' });
    }

    // --- Identify home and away participants ---
    const homeParticipant = booking.participants.find(p => p.role === 'home');
    const awayParticipant = booking.participants.find(p => p.role === 'away');

    if (!homeParticipant || !awayParticipant) {
      return res
        .status(500)
        .json({ error: 'Booking participants are incomplete' });
    }

    // --- Verify the accepting user is the opponent (away) roster manager ---
    const awayMembership = await prisma.teamMember.findFirst({
      where: {
        userId,
        teamId: awayParticipant.rosterId,
        role: 'captain',
        status: 'active',
      },
    });

    if (!awayMembership) {
      return res
        .status(403)
        .json({
          error: 'Only the opponent roster manager can accept a game challenge',
        });
    }

    // --- Check confirmation deadline ---
    if (
      awayParticipant.confirmationDeadline &&
      new Date() > awayParticipant.confirmationDeadline
    ) {
      return res
        .status(400)
        .json({ error: 'Confirmation deadline has passed' });
    }

    // --- Fetch both rosters for display names ---
    const [homeRoster, awayRoster] = await Promise.all([
      prisma.team.findUnique({
        where: { id: homeParticipant.rosterId },
        select: { id: true, name: true, stripeAccountId: true },
      }),
      prisma.team.findUnique({
        where: { id: awayParticipant.rosterId },
        select: { id: true, name: true, stripeAccountId: true },
      }),
    ]);

    if (!homeRoster?.stripeAccountId || !awayRoster?.stripeAccountId) {
      return res
        .status(400)
        .json({
          error: 'Both rosters must have completed Stripe Connect onboarding',
        });
    }

    // --- Run checkBalance against both roster managers ---
    const [homeBalance, awayBalance] = await Promise.all([
      checkBalance(homeParticipant.rosterId, homeParticipant.escrowAmount),
      checkBalance(awayParticipant.rosterId, awayParticipant.escrowAmount),
    ]);

    // --- If either is insufficient, return 402 with per-roster shortfall ---
    if (!homeBalance.sufficient || !awayBalance.sufficient) {
      const shortfalls: Array<{
        rosterId: string;
        rosterName: string;
        role: string;
        required: number;
        shortfall: number;
      }> = [];

      if (!homeBalance.sufficient) {
        shortfalls.push({
          rosterId: homeRoster.id,
          rosterName: homeRoster.name,
          role: 'home',
          required: homeParticipant.escrowAmount,
          shortfall: homeBalance.shortfall,
        });
      }

      if (!awayBalance.sufficient) {
        shortfalls.push({
          rosterId: awayRoster.id,
          rosterName: awayRoster.name,
          role: 'away',
          required: awayParticipant.escrowAmount,
          shortfall: awayBalance.shortfall,
        });
      }

      return res.status(402).json({
        error: 'Insufficient balance',
        message:
          'One or more rosters have insufficient funds to cover their share of the court cost',
        shortfalls,
      });
    }

    // --- Both sufficient — update booking status atomically ---
    const result = await prisma.$transaction(async tx => {
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'escrow_collecting' },
      });

      await tx.bookingParticipant.update({
        where: { id: awayParticipant.id },
        data: { confirmedAt: new Date() },
      });

      return updatedBooking;
    });

    // --- Return success with booking details ---
    const fullBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        facility: {
          select: { id: true, name: true, street: true, city: true },
        },
        court: {
          select: { id: true, name: true, sportType: true },
        },
        participants: {
          select: {
            id: true,
            rosterId: true,
            role: true,
            escrowAmount: true,
            paymentStatus: true,
            confirmedAt: true,
            confirmationDeadline: true,
          },
        },
      },
    });

    res.json({
      ...fullBooking,
      homeRoster: { id: homeRoster.id, name: homeRoster.name },
      awayRoster: { id: awayRoster.id, name: awayRoster.name },
      balanceCheck: {
        home: { sufficient: true, shortfall: 0 },
        away: { sufficient: true, shortfall: 0 },
      },
    });
  } catch (error) {
    console.error('Error accepting game challenge:', error);
    res.status(500).json({ error: 'Failed to accept game challenge' });
  }
});

/**
 * POST /api/game-challenges/:bookingId/capture
 *
 * Capture escrow for a game challenge. After the accept endpoint transitions
 * the booking to `escrow_collecting`, this endpoint:
 *   1. Creates two PaymentIntents (manual capture) — one per roster manager
 *   2. Attempts simultaneous capture via captureEscrow
 *   3. On success → booking transitions to `confirmed`
 *   4. On failure → releases successful intents, blocks booking
 *
 * Body:
 *   - userId: string — ID of the user triggering capture (must be home or away roster manager)
 */
router.post('/:bookingId/capture', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params as { bookingId: string };
    const { userId } = req.body;

    if (!userId || !bookingId) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: userId, bookingId' });
    }

    // --- Fetch booking with participants ---
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        participants: true,
        facility: {
          select: { id: true, stripeConnectAccountId: true },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Game challenge not found' });
    }

    if (booking.bookingType !== 'game_challenge') {
      return res.status(400).json({ error: 'Booking is not a game challenge' });
    }

    if (booking.status !== 'escrow_collecting') {
      return res
        .status(400)
        .json({ error: 'Booking is not in escrow_collecting status' });
    }

    // --- Verify facility has a Connect account ---
    if (!booking.facility?.stripeConnectAccountId) {
      return res
        .status(400)
        .json({
          error: 'Facility has not completed Stripe Connect onboarding',
        });
    }

    // --- Identify home and away participants ---
    const homeParticipant = booking.participants.find(p => p.role === 'home');
    const awayParticipant = booking.participants.find(p => p.role === 'away');

    if (!homeParticipant || !awayParticipant) {
      return res
        .status(500)
        .json({ error: 'Booking participants are incomplete' });
    }

    // --- Verify the user is a manager of either roster ---
    const membership = await prisma.teamMember.findFirst({
      where: {
        userId,
        teamId: { in: [homeParticipant.rosterId, awayParticipant.rosterId] },
        role: 'captain',
        status: 'active',
      },
    });

    if (!membership) {
      return res
        .status(403)
        .json({
          error:
            'Only a roster manager involved in this challenge can trigger capture',
        });
    }

    const facilityConnectId = booking.facility.stripeConnectAccountId;

    // --- Create escrow intents for both participants ---
    try {
      await createEscrowIntent(
        homeParticipant.id,
        homeParticipant.escrowAmount,
        facilityConnectId,
        bookingId,
        homeParticipant.role
      );

      await createEscrowIntent(
        awayParticipant.id,
        awayParticipant.escrowAmount,
        facilityConnectId,
        bookingId,
        awayParticipant.role
      );
    } catch (intentError) {
      // If creating intents fails, release any that were created
      if (homeParticipant.stripePaymentIntentId) {
        await releaseEscrow(homeParticipant.stripePaymentIntentId).catch(
          () => {}
        );
      }
      if (awayParticipant.stripePaymentIntentId) {
        await releaseEscrow(awayParticipant.stripePaymentIntentId).catch(
          () => {}
        );
      }

      // Re-fetch participants to release any newly created intents
      const updatedParticipants = await prisma.bookingParticipant.findMany({
        where: { bookingId: bookingId },
      });
      for (const p of updatedParticipants) {
        if (p.stripePaymentIntentId && p.paymentStatus === 'authorized') {
          await releaseEscrow(p.stripePaymentIntentId).catch(() => {});
        }
      }

      return res.status(502).json({
        error: 'Failed to create escrow intents',
        message: (intentError as Error).message,
      });
    }

    // --- Attempt simultaneous capture ---
    try {
      await captureEscrow(bookingId);
    } catch (captureError) {
      // captureEscrow already handles releasing successful intents on failure
      return res.status(502).json({
        error: 'Escrow capture failed',
        message: (captureError as Error).message,
      });
    }

    // --- Return confirmed booking ---
    const confirmedBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        facility: {
          select: { id: true, name: true, street: true, city: true },
        },
        court: {
          select: { id: true, name: true, sportType: true },
        },
        participants: {
          select: {
            id: true,
            rosterId: true,
            role: true,
            escrowAmount: true,
            paymentStatus: true,
            confirmedAt: true,
          },
        },
      },
    });

    res.json({
      ...confirmedBooking,
      message: 'Escrow captured successfully — booking confirmed',
    });
  } catch (error) {
    console.error('Error capturing escrow for game challenge:', error);
    res.status(500).json({ error: 'Failed to capture escrow' });
  }
});

export default router;
