/**
 * Public Event Routes
 *
 * Handles the public event flow where a roster manager creates a public event
 * at a facility, sets a per-person price and minimum attendee count.
 * Attendees can then register and pay to join.
 *
 * Flow: Roster manager selects facility, court, time slot →
 *       Sets per-person price and minimum attendee count →
 *       Creates booking with bookingType 'public_event', status 'pending' →
 *       Attendees browse and register (handled by task 7.2+)
 */

import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { stripe, calculatePlatformFee } from '../services/stripe-connect';
import { generateIdempotencyKey, IdempotencyAction } from '../utils/idempotency';
import { capturePublicEventEscrow, facilityCancelPublicEvent } from '../services/public-event-escrow';

const router = express.Router();

/**
 * POST /api/public-events
 *
 * Create a new public event. The roster manager is the booking host.
 *
 * Body:
 *   - userId: string           — ID of the roster manager
 *   - rosterId: string         — Roster ID
 *   - facilityId: string       — Facility ID
 *   - courtId: string          — Court ID within the facility
 *   - timeSlotId: string       — Time slot ID for the booking
 *   - perPersonPrice: number   — Price per attendee (in dollars)
 *   - minAttendeeCount: number — Minimum attendees required
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      rosterId,
      facilityId,
      courtId,
      timeSlotId,
      perPersonPrice,
      minAttendeeCount,
    } = req.body;

    // --- Validate required fields ---
    if (!userId || !rosterId || !facilityId || !courtId || !timeSlotId || perPersonPrice == null || minAttendeeCount == null) {
      return res.status(400).json({
        error: 'Missing required fields: userId, rosterId, facilityId, courtId, timeSlotId, perPersonPrice, minAttendeeCount',
      });
    }

    // --- Validate numeric fields ---
    if (typeof perPersonPrice !== 'number' || perPersonPrice <= 0) {
      return res.status(400).json({ error: 'perPersonPrice must be a positive number' });
    }

    if (typeof minAttendeeCount !== 'number' || !Number.isInteger(minAttendeeCount) || minAttendeeCount < 1) {
      return res.status(400).json({ error: 'minAttendeeCount must be a positive integer' });
    }

    // --- Verify the user is a captain/manager of the roster ---
    const membership = await prisma.teamMember.findFirst({
      where: {
        userId,
        teamId: rosterId,
        role: 'captain',
        status: 'active',
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only the roster manager can create a public event' });
    }

    // --- Verify roster exists and has Stripe Connect account ---
    const roster = await prisma.team.findUnique({
      where: { id: rosterId },
      select: { id: true, name: true, stripeAccountId: true },
    });

    if (!roster) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    if (!roster.stripeAccountId) {
      return res.status(400).json({ error: 'Roster has not completed Stripe Connect onboarding' });
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
      return res.status(400).json({ error: 'Facility has not completed Stripe Connect onboarding' });
    }

    // --- Verify court belongs to the facility ---
    const court = await prisma.facilityCourt.findUnique({
      where: { id: courtId },
      select: { id: true, name: true, facilityId: true, isActive: true },
    });

    if (!court || court.facilityId !== facilityId) {
      return res.status(404).json({ error: 'Court not found at this facility' });
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
      return res.status(404).json({ error: 'Time slot not found for this court' });
    }

    if (timeSlot.status !== 'available') {
      return res.status(400).json({ error: 'Time slot is not available' });
    }

    // --- Create booking atomically ---
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          userId,
          facilityId,
          courtId,
          status: 'pending',
          bookingType: 'public_event',
          totalPrice: timeSlot.price,
          paymentStatus: 'pending',
          bookingHostType: 'roster_manager',
          bookingHostId: rosterId,
          stripeTransferGroup: '',
          perPersonPrice,
          minAttendeeCount,
        },
      });

      // Set stripeTransferGroup to the booking ID
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: { stripeTransferGroup: booking.id },
      });

      // Create the host participant record
      await tx.bookingParticipant.create({
        data: {
          bookingId: booking.id,
          rosterId,
          role: 'host',
          escrowAmount: 0,
          paymentStatus: 'pending',
        },
      });

      return updatedBooking;
    });

    // --- Fetch the full booking with relations for the response ---
    const fullBooking = await prisma.booking.findUnique({
      where: { id: result.id },
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
      roster: { id: roster.id, name: roster.name },
    });
  } catch (error) {
    console.error('Error creating public event:', error);
    res.status(500).json({ error: 'Failed to create public event' });
  }
});

/**
 * GET /api/public-events/:bookingId
 *
 * Get a public event by booking ID with full details.
 */
router.get('/:bookingId', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        facility: {
          select: { id: true, name: true, street: true, city: true, state: true },
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

    if (!booking) {
      return res.status(404).json({ error: 'Public event not found' });
    }

    if (booking.bookingType !== 'public_event') {
      return res.status(400).json({ error: 'Booking is not a public event' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching public event:', error);
    res.status(500).json({ error: 'Failed to fetch public event' });
  }
});

/**
 * GET /api/public-events
 *
 * List public events for attendees to browse.
 * Returns only pending or confirmed public events.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, limit = '20', offset = '0' } = req.query;

    const where: any = {
      bookingType: 'public_event',
    };

    if (status && typeof status === 'string') {
      where.status = status;
    } else {
      where.status = { in: ['pending', 'confirmed'] };
    }

    const [events, total] = await Promise.all([
      prisma.booking.findMany({
        where,
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
              paymentStatus: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      data: events,
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('Error listing public events:', error);
    res.status(500).json({ error: 'Failed to list public events' });
  }
});

/**
 * POST /api/public-events/:bookingId/register
 *
 * Register an attendee for a public event. Creates a BookingParticipant
 * and a Stripe PaymentIntent held in escrow (manual capture) until the
 * event is confirmed to proceed.
 *
 * Body:
 *   - userId: string — ID of the attendee
 *
 * Returns the PaymentIntent client_secret for the frontend to confirm payment.
 */
router.post('/:bookingId/register', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body;

    // --- Validate required fields ---
    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    // --- Fetch the booking ---
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        participants: {
          select: { id: true, rosterId: true, role: true, paymentStatus: true },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Public event not found' });
    }

    if (booking.bookingType !== 'public_event') {
      return res.status(400).json({ error: 'Booking is not a public event' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Event is not accepting registrations' });
    }

    // --- Check for duplicate registration ---
    const alreadyRegistered = booking.participants.some(
      (p) => p.rosterId === userId && p.role === 'participant',
    );

    if (alreadyRegistered) {
      return res.status(409).json({ error: 'User is already registered for this event' });
    }

    // --- Fetch the roster manager's Connect account (booking host) ---
    const hostRoster = await prisma.team.findUnique({
      where: { id: booking.bookingHostId! },
      select: { stripeAccountId: true },
    });

    if (!hostRoster?.stripeAccountId) {
      return res.status(400).json({ error: 'Event host has not completed Stripe Connect onboarding' });
    }

    // --- Calculate escrow amount in cents ---
    const escrowAmountCents = Math.round((booking.perPersonPrice ?? 0) * 100);

    if (escrowAmountCents <= 0) {
      return res.status(400).json({ error: 'Invalid per-person price for this event' });
    }

    const platformFee = calculatePlatformFee(escrowAmountCents);
    const idempotencyKey = generateIdempotencyKey(bookingId, `${userId}:register`, IdempotencyAction.CREATE);

    // --- Create participant and PaymentIntent atomically ---
    const participant = await prisma.$transaction(async (tx) => {
      const bp = await tx.bookingParticipant.create({
        data: {
          bookingId,
          rosterId: userId,
          role: 'participant',
          escrowAmount: escrowAmountCents,
          paymentStatus: 'pending',
        },
      });

      return bp;
    });

    // --- Create Stripe PaymentIntent with manual capture ---
    const intent = await stripe.paymentIntents.create(
      {
        amount: escrowAmountCents,
        currency: 'usd',
        capture_method: 'manual',
        application_fee_amount: platformFee,
        transfer_data: {
          destination: hostRoster.stripeAccountId,
        },
        transfer_group: bookingId,
        metadata: {
          booking_id: bookingId,
          participant_role: 'participant',
          participant_id: participant.id,
          user_id: userId,
        },
      },
      {
        idempotencyKey,
      },
    );

    // --- Update participant with PaymentIntent ID ---
    await prisma.bookingParticipant.update({
      where: { id: participant.id },
      data: {
        stripePaymentIntentId: intent.id,
        paymentStatus: 'authorized',
      },
    });

    // --- Check if minimum attendee count is now reached and auto-trigger capture ---
    let escrowCaptured = false;
    const minAttendees = booking.minAttendeeCount ?? 0;

    if (minAttendees > 0) {
      const authorizedCount = await prisma.bookingParticipant.count({
        where: {
          bookingId,
          role: 'participant',
          paymentStatus: 'authorized',
        },
      });

      if (authorizedCount >= minAttendees && booking.status === 'pending') {
        try {
          await capturePublicEventEscrow(bookingId as string);
          escrowCaptured = true;
        } catch (captureError) {
          // Log but don't fail the registration — the attendee is registered,
          // capture can be retried later (e.g. by the cutoff job or manually)
          console.error('Auto-capture failed after registration:', captureError);
        }
      }
    }

    res.status(201).json({
      participantId: participant.id,
      clientSecret: intent.client_secret,
      escrowAmount: escrowAmountCents,
      currency: 'usd',
      escrowCaptured,
    });
  } catch (error) {
    console.error('Error registering for public event:', error);
    res.status(500).json({ error: 'Failed to register for public event' });
  }
});

/**
 * POST /api/public-events/:bookingId/facility-cancel
 *
 * Facility operator cancels a public event. Refunds all attendees in full
 * including platform fees. Uses reverse_transfer to claw back the facility
 * payout automatically.
 *
 * Body:
 *   - facilityId: string — ID of the facility (used to verify the caller is the facility operator)
 */
router.post('/:bookingId/facility-cancel', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { facilityId } = req.body;

    if (!facilityId) {
      return res.status(400).json({ error: 'Missing required field: facilityId' });
    }

    // Verify the booking exists and belongs to this facility
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingType: true,
        status: true,
        facilityId: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Public event not found' });
    }

    if (booking.bookingType !== 'public_event') {
      return res.status(400).json({ error: 'Booking is not a public event' });
    }

    if (booking.facilityId !== facilityId) {
      return res.status(403).json({ error: 'Facility does not own this event' });
    }

    await facilityCancelPublicEvent(bookingId);

    res.json({ message: 'Public event cancelled. All attendees have been refunded.' });
  } catch (error: any) {
    if (error.message?.includes('already cancelled')) {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error cancelling public event:', error);
    res.status(500).json({ error: 'Failed to cancel public event' });
  }
});

export default router;
