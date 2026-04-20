import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { processCompletedGame } from '../services/PlayerRatingService';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// Get debrief-eligible events for current user
// Events that ended within last 24 hours where user hasn't submitted debrief
router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        userId,
        status: 'confirmed',
        debriefSubmitted: false,
        event: {
          endTime: {
            gte: twentyFourHoursAgo,
            lt: now,
          },
          status: { not: 'cancelled' },
          eventType: { in: ['game', 'pickup'] },
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            sportType: true,
            startTime: true,
            endTime: true,
            facilityId: true,
            facility: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { event: { endTime: 'desc' } },
    });

    res.json({ data: bookings });
  } catch (error) {
    console.error('Get debrief events error:', error);
    res.status(500).json({ error: 'Failed to fetch debrief events' });
  }
});

// Get debrief details for a specific event (participants list)
router.get('/:eventId', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        sportType: true,
        startTime: true,
        endTime: true,
        facilityId: true,
        facility: { select: { id: true, name: true, rating: true } },
        bookings: {
          where: { status: 'confirmed' },
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get existing salutes from this user for this event
    const existingSalutes = await prisma.salute.findMany({
      where: { eventId, fromUserId: userId },
      select: { toUserId: true },
    });

    const salutedUserIds = existingSalutes.map(s => s.toUserId);

    // Filter out current user from participants
    const participants = event.bookings
      .filter(b => b.userId !== userId)
      .map(b => ({
        ...b.user,
        saluted: salutedUserIds.includes(b.userId),
      }));

    // Get user's facility rating for this event (if any)
    let userFacilityRating: number | null = null;
    if (event.facilityId) {
      const existingRating = await prisma.facilityRating.findUnique({
        where: {
          userId_facilityId_eventId: {
            userId,
            facilityId: event.facilityId,
            eventId,
          },
        },
        select: { rating: true },
      });
      userFacilityRating = existingRating?.rating ?? null;
    }

    // Check if user already submitted debrief
    const userBooking = await prisma.booking.findFirst({
      where: { userId, eventId, status: 'confirmed' },
      select: { debriefSubmitted: true },
    });

    res.json({
      event: {
        id: event.id,
        title: event.title,
        sportType: event.sportType,
        startTime: event.startTime,
        endTime: event.endTime,
        facilityId: event.facilityId,
        facility: event.facility,
      },
      participants,
      salutedUserIds,
      facilityRating: userFacilityRating,
      debriefSubmitted: userBooking?.debriefSubmitted ?? false,
    });
  } catch (error) {
    console.error('Get debrief details error:', error);
    res.status(500).json({ error: 'Failed to fetch debrief details' });
  }
});

// Submit debrief (salutes + optional facility rating)
router.post('/:eventId/submit', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const { eventId } = req.params;
    const { salutedUserIds, facilityRating } = req.body;

    // Validate event exists and ended within 24 hours
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        endTime: true,
        eventType: true,
        facilityId: true,
        bookings: {
          where: { status: 'confirmed' },
          select: { userId: true },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.eventType === 'practice') {
      return res
        .status(400)
        .json({ error: 'Debriefs are not available for practice events' });
    }

    const now = new Date();
    const hoursSinceEnd =
      (now.getTime() - new Date(event.endTime).getTime()) / (1000 * 60 * 60);
    if (hoursSinceEnd > 24 || new Date(event.endTime) > now) {
      return res
        .status(400)
        .json({ error: 'Debrief window has closed or event has not ended' });
    }

    // Validate user was a participant
    const booking = await prisma.booking.findFirst({
      where: { userId, eventId, status: 'confirmed' },
    });
    if (!booking) {
      return res
        .status(403)
        .json({ error: 'You were not a participant in this event' });
    }
    if (booking.debriefSubmitted) {
      return res.status(400).json({ error: 'Debrief already submitted' });
    }

    // Count other participants
    const otherParticipants = event.bookings.filter(b => b.userId !== userId);
    const minSalutes = Math.min(3, otherParticipants.length);

    if (!Array.isArray(salutedUserIds) || salutedUserIds.length < minSalutes) {
      return res.status(400).json({
        error: `Must salute at least ${minSalutes} participant(s)`,
      });
    }

    // Validate facility rating if provided
    if (facilityRating !== undefined && facilityRating !== null) {
      if (!event.facilityId) {
        return res.status(400).json({ error: 'Event has no facility to rate' });
      }
      if (
        facilityRating < 1 ||
        facilityRating > 5 ||
        !Number.isInteger(facilityRating)
      ) {
        return res
          .status(400)
          .json({ error: 'Rating must be an integer between 1 and 5' });
      }
    }

    // Execute all writes in a transaction
    await prisma.$transaction(async tx => {
      // Create salutes (skip duplicates)
      for (const toUserId of salutedUserIds) {
        await tx.salute.upsert({
          where: {
            eventId_fromUserId_toUserId: {
              eventId,
              fromUserId: userId,
              toUserId,
            },
          },
          create: { eventId, fromUserId: userId, toUserId },
          update: {},
        });
      }

      // Save facility rating if provided
      if (facilityRating && event.facilityId) {
        await tx.facilityRating.upsert({
          where: {
            userId_facilityId_eventId: {
              userId,
              facilityId: event.facilityId,
              eventId,
            },
          },
          create: {
            userId,
            facilityId: event.facilityId,
            eventId,
            rating: facilityRating,
          },
          update: { rating: facilityRating },
        });

        // Recalculate facility average rating
        const avgResult = await tx.facilityRating.aggregate({
          where: { facilityId: event.facilityId },
          _avg: { rating: true },
        });
        if (avgResult._avg.rating !== null) {
          await tx.facility.update({
            where: { id: event.facilityId },
            data: { rating: Math.round(avgResult._avg.rating * 10) / 10 },
          });
        }
      }

      // Mark booking as debriefed
      await tx.booking.update({
        where: { id: booking.id },
        data: { debriefSubmitted: true },
      });
    });

    // Recalculate ratings using the new algorithm
    // Check if all participants have submitted debriefs; if so, process immediately.
    // Otherwise, the game will be processed when the 24h window closes.
    const allBookings = await prisma.booking.findMany({
      where: { eventId, status: 'confirmed' },
      select: { debriefSubmitted: true },
    });
    const allSubmitted = allBookings.every(b => b.debriefSubmitted);
    if (allSubmitted) {
      // Fire-and-forget — don't block the response
      processCompletedGame(eventId).catch(err =>
        console.error('Rating calculation error:', err)
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Submit debrief error:', error);
    res.status(500).json({ error: 'Failed to submit debrief' });
  }
});

export default router;
