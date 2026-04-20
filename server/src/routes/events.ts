import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { requireNonDependent } from '../middleware/require-non-dependent';

// ─── Service imports ────────────────────────────────────────────────────────
import * as EventCrudService from '../services/EventCrudService';

const router = Router();

// ─── Error helper ───────────────────────────────────────────────────────────
function sendServiceError(res: Response, error: any) {
  const status = error.statusCode || 500;
  const body: any = { error: error.message || 'Internal error' };
  if (error.extra) Object.assign(body, error.extra);
  res.status(status).json(body);
}

// Get all events
router.get('/', async (req, res) => {
  try {
    const result = await EventCrudService.getEvents(
      req.query as EventCrudService.GetEventsFilters
    );
    res.json(result);
  } catch (error: any) {
    console.error('Get events error:', error);
    sendServiceError(res, error);
  }
});

// Get event by ID
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const requestingUserId = req.user?.userId;
    const event = await EventCrudService.getEventById(id, requestingUserId);
    res.json(event);
  } catch (error: any) {
    console.error('Get event error:', error);
    sendServiceError(res, error);
  }
});

// Get event participants
router.get('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const result = await EventCrudService.getEventParticipants(id);
    res.json(result);
  } catch (error: any) {
    console.error('Get event participants error:', error);
    sendServiceError(res, error);
  }
});

// Check if user has submitted salutes for an event
router.get('/:id/salutes/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;

    const saluteCount = await prisma.salute.count({
      where: {
        eventId: id,
        fromUserId: userId,
      },
    });

    res.json({
      hasSubmitted: saluteCount > 0,
      saluteCount,
    });
  } catch (error) {
    console.error('Check salute status error:', error);
    res.status(500).json({ error: 'Failed to check salute status' });
  }
});

// Create event
router.post('/', authMiddleware, requireNonDependent, async (req, res) => {
  try {
    const authenticatedUserId = req.user!.userId;
    const result = await EventCrudService.createEvent(
      req.body,
      authenticatedUserId
    );
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Create event error:', error);
    sendServiceError(res, error);
  }
});

// Update event
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const event = await EventCrudService.updateEvent(id, req.body);
    res.json(event);
  } catch (error: any) {
    console.error('Update event error:', error);
    sendServiceError(res, error);
  }
});

// Cancel/Delete event
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { reason } = req.body;
    const result = await EventCrudService.deleteEvent(id, reason);
    if (result) {
      res.json(result);
    } else {
      res.status(204).send();
    }
  } catch (error: any) {
    console.error('Cancel/Delete event error:', error);
    sendServiceError(res, error);
  }
});

// Book event
router.post('/:id/book', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;
    const booking = await EventCrudService.bookEvent(id, userId);
    res.status(201).json(booking);
  } catch (error: any) {
    console.error('Book event error:', error);
    sendServiceError(res, error);
  }
});

// Cancel booking
router.delete('/:id/book/:bookingId', authMiddleware, async (req, res) => {
  try {
    const { id, bookingId } = req.params as { id: string; bookingId: string };
    await EventCrudService.cancelBooking(id, bookingId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Cancel booking error:', error);
    sendServiceError(res, error);
  }
});

// Submit salutes for event participants
router.post('/:id/salutes', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const fromUserId = req.user!.userId;
    const { salutedUserIds } = req.body;

    // Validate event exists and is in the past
    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, endTime: true },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (new Date(event.endTime) > new Date()) {
      return res
        .status(400)
        .json({ error: 'Can only salute participants after event has ended' });
    }

    // Validate salutedUserIds
    if (!Array.isArray(salutedUserIds) || salutedUserIds.length === 0) {
      return res
        .status(400)
        .json({ error: 'salutedUserIds must be a non-empty array' });
    }

    if (salutedUserIds.length > 3) {
      return res
        .status(400)
        .json({ error: 'Can only salute up to 3 participants per event' });
    }

    // Cannot salute yourself
    if (salutedUserIds.includes(fromUserId)) {
      return res.status(400).json({ error: "You can't salute yourself" });
    }

    // Check if user already submitted salutes for this event
    const existingCount = await prisma.salute.count({
      where: {
        eventId: id,
        fromUserId,
      },
    });

    if (existingCount > 0) {
      return res
        .status(400)
        .json({ error: 'Salutes already submitted for this event' });
    }

    // Create salutes in a transaction
    const salutes = await prisma.$transaction(
      salutedUserIds.map((toUserId: string) =>
        prisma.salute.create({
          data: {
            eventId: id,
            fromUserId,
            toUserId,
          },
        })
      )
    );

    // Batch recalculate ratings — get all counts in two queries instead of N+1
    const [saluteCounts, gameCounts] = await Promise.all([
      prisma.salute.groupBy({
        by: ['toUserId'],
        where: { toUserId: { in: salutedUserIds } },
        _count: true,
      }),
      prisma.booking.groupBy({
        by: ['userId'],
        where: {
          userId: { in: salutedUserIds },
          status: 'confirmed',
          event: { endTime: { lt: new Date() } },
        },
        _count: true,
      }),
    ]);

    const saluteMap = new Map(saluteCounts.map(s => [s.toUserId, s._count]));
    const gameMap = new Map(gameCounts.map(g => [g.userId, g._count]));

    // Update all ratings in a single transaction
    await prisma.$transaction(
      salutedUserIds.map((userId: string) => {
        const totalSalutes = saluteMap.get(userId) || 0;
        const totalGames = gameMap.get(userId) || 0;
        const saluteRatio = totalGames > 0 ? totalSalutes / totalGames : 0;
        const newRating = Math.min(5.0, 1.0 + saluteRatio * 2);

        return prisma.user.update({
          where: { id: userId },
          data: {
            currentRating: newRating,
            pickupRating: newRating,
            ratingLastUpdated: new Date(),
          },
        });
      })
    );

    res.json({
      success: true,
      salutesRecorded: salutes.length,
      ratingsUpdated: salutedUserIds.length,
    });
  } catch (error) {
    console.error('Submit salutes error:', error);
    res.status(500).json({ error: 'Failed to submit salutes' });
  }
});

// Get salutes for an event
router.get('/:id/salutes', async (req, res) => {
  try {
    const { id } = req.params as { id: string };

    const salutes = await prisma.salute.findMany({
      where: { eventId: id },
      select: {
        fromUserId: true,
        toUserId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(salutes);
  } catch (error) {
    console.error('Get salutes error:', error);
    res.status(500).json({ error: 'Failed to get salutes' });
  }
});

// Get current user's salutes for an event
router.get('/:id/salutes/me', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;

    const salutes = await prisma.salute.findMany({
      where: {
        eventId: id,
        fromUserId: userId,
      },
      select: {
        toUserId: true,
      },
    });

    res.json(salutes);
  } catch (error) {
    console.error('Get user salutes error:', error);
    res.status(500).json({ error: 'Failed to get user salutes' });
  }
});

// POST /api/events/send-reminders — cron job endpoint
router.post('/send-reminders', async (req, res) => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);

    const { MessagingService } = await import('../services/MessagingService');

    // 24-hour reminders
    const upcoming24h = await prisma.event.findMany({
      where: {
        startTime: { gte: now, lte: in24h },
        status: 'UPCOMING',
        reminderSent24h: { not: true },
      },
      include: {
        facility: { select: { name: true } },
        _count: { select: { gameParticipations: true } },
      },
    });

    for (const event of upcoming24h) {
      const conv = await MessagingService.getConversationForEvent(event.id);
      if (conv) {
        const dateStr = new Date(event.startTime).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
        const timeStr = new Date(event.startTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
        const venue = event.facility?.name ?? event.locationName ?? 'TBD';
        const count = event._count.gameParticipations;
        const max = event.maxParticipants ?? '?';
        await MessagingService.postSystemMessage(
          conv.id,
          `GAME DAY TOMORROW\n${event.title}\n${dateStr} ${timeStr}\n${venue}\n${count}/${max} players confirmed`,
          'URGENT'
        );
      }
      await prisma.event.update({
        where: { id: event.id },
        data: { reminderSent24h: true },
      });
    }

    // 1-hour reminders
    const upcoming1h = await prisma.event.findMany({
      where: {
        startTime: { gte: now, lte: in1h },
        status: 'UPCOMING',
        reminderSent1h: { not: true },
      },
      include: {
        facility: { select: { name: true } },
        _count: { select: { gameParticipations: true } },
      },
    });

    for (const event of upcoming1h) {
      const conv = await MessagingService.getConversationForEvent(event.id);
      if (conv) {
        const venue = event.facility?.name ?? event.locationName ?? 'TBD';
        await MessagingService.postSystemMessage(
          conv.id,
          `Game starts in 1 hour at ${venue}. See you there!`,
          'URGENT'
        );
      }
      await prisma.event.update({
        where: { id: event.id },
        data: { reminderSent1h: true },
      });
    }

    // Post-game messages for completed events
    const completed = await prisma.event.findMany({
      where: {
        status: 'COMPLETED',
        postGameMessageSent: { not: true },
      },
      include: {
        facility: { select: { name: true } },
        _count: { select: { gameParticipations: true } },
      },
    });

    for (const event of completed) {
      const conv = await MessagingService.getConversationForEvent(event.id);
      if (conv) {
        await MessagingService.postSystemMessage(
          conv.id,
          'Good game! How did everyone play?'
        );
      }
      await prisma.event.update({
        where: { id: event.id },
        data: { postGameMessageSent: true },
      });
    }

    res.json({
      reminders24h: upcoming24h.length,
      reminders1h: upcoming1h.length,
      postGame: completed.length,
    });
  } catch (error) {
    console.error('Send reminders error:', error);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

// POST /events/check-availability
router.post('/check-availability', authMiddleware, async (req, res) => {
  try {
    const { userIds = [], rosterIds = [], dates = [] } = req.body;
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.json({});
    }

    const rosterMembers: Record<string, string[]> = {};
    if (rosterIds.length > 0) {
      const members = await prisma.teamMember.findMany({
        where: { teamId: { in: rosterIds }, status: { not: 'removed' } },
        select: { teamId: true, userId: true },
      });
      for (const m of members) {
        if (!rosterMembers[m.teamId]) rosterMembers[m.teamId] = [];
        rosterMembers[m.teamId]!.push(m.userId);
      }
    }

    const allUserIds = new Set<string>(userIds);
    for (const memberIds of Object.values(rosterMembers)) {
      for (const uid of memberIds) allUserIds.add(uid);
    }

    const result: Record<string, boolean[]> = {};
    for (const uid of userIds) result[uid] = [];
    for (const rid of rosterIds) result[rid] = [];

    for (let i = 0; i < dates.length; i++) {
      const { date, startTime, endTime } = dates[i];
      const dayStart = new Date(`${date}T${startTime}:00`);
      const dayEnd = new Date(`${date}T${endTime}:00`);

      const conflicting = await prisma.event.findMany({
        where: {
          status: { in: ['active', 'confirmed'] },
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
          OR: [
            {
              bookings: {
                some: { userId: { in: [...allUserIds] }, status: 'confirmed' },
              },
            },
            {
              gameParticipations: { some: { userId: { in: [...allUserIds] } } },
            },
            { organizerId: { in: [...allUserIds] } },
          ],
        },
        select: {
          bookings: {
            where: { status: 'confirmed', userId: { in: [...allUserIds] } },
            select: { userId: true },
          },
          gameParticipations: {
            where: { userId: { in: [...allUserIds] } },
            select: { userId: true },
          },
          organizerId: true,
        },
      });

      const busyUsers = new Set<string>();
      for (const evt of conflicting) {
        if (allUserIds.has(evt.organizerId)) busyUsers.add(evt.organizerId);
        for (const b of evt.bookings) busyUsers.add(b.userId);
        for (const gp of evt.gameParticipations) busyUsers.add(gp.userId);
      }

      for (const uid of userIds) {
        result[uid]!.push(!busyUsers.has(uid));
      }

      for (const rid of rosterIds) {
        const members = rosterMembers[rid] || [];
        const available =
          members.length === 0 || members.every(uid => !busyUsers.has(uid));
        result[rid]!.push(available);
      }
    }

    res.json(result);
  } catch (error: any) {
    console.error('Availability check error:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

export default router;
