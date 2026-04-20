import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const requestingUserId =
      (req.query.userId as string | undefined) ||
      (req as any).effectiveUserId ||
      (req as any).user?.userId ||
      (req.headers['x-user-id'] as string | undefined);
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
router.get('/:id/salutes/status', async (req, res) => {
  try {
    const { id } = req.params as { id: string };

    // TODO: Get user ID from auth token
    // For now, use the first user
    const fromUser = await prisma.user.findFirst({
      select: { id: true },
    });

    if (!fromUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has submitted salutes for this event
    const existingSalutes = await prisma.salute.findMany({
      where: {
        eventId: id,
        fromUserId: fromUser.id,
      },
    });

    res.json({
      hasSubmitted: existingSalutes.length > 0,
      saluteCount: existingSalutes.length,
    });
  } catch (error) {
    console.error('Check salute status error:', error);
    res.status(500).json({ error: 'Failed to check salute status' });
  }
});

// Create event
router.post('/', requireNonDependent, async (req, res) => {
  try {
    const authenticatedUserId =
      (req as any).user?.userId ||
      (req.headers['x-user-id'] as string | undefined);
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
router.put('/:id', async (req, res) => {
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
// If event has participants, mark as cancelled with reason
// If event has no participants, delete it entirely
router.delete('/:id', async (req, res) => {
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
    console.error('❌ Cancel/Delete event error:', error);
    sendServiceError(res, error);
  }
});

// Book event
router.post('/:id/book', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { userId } = req.body;
    const booking = await EventCrudService.bookEvent(id, userId);
    res.status(201).json(booking);
  } catch (error: any) {
    console.error('❌ Book event error:', error);
    sendServiceError(res, error);
  }
});

// Cancel booking
router.delete('/:id/book/:bookingId', async (req, res) => {
  try {
    const { id, bookingId } = req.params;
    await EventCrudService.cancelBooking(id, bookingId);
    res.status(204).send();
  } catch (error: any) {
    console.error('❌ Cancel booking error:', error);
    sendServiceError(res, error);
  }
});

// Submit salutes for event participants
router.post('/:id/salutes', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { salutedUserIds } = req.body;

    // TODO: Get user ID from auth token
    // For now, use the first user
    const fromUser = await prisma.user.findFirst({
      select: { id: true },
    });

    if (!fromUser) {
      return res.status(404).json({ error: 'User not found' });
    }

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

    // Check if user already submitted salutes for this event
    const existingSalutes = await prisma.salute.findMany({
      where: {
        eventId: id,
        fromUserId: fromUser.id,
      },
    });

    if (existingSalutes.length > 0) {
      return res
        .status(400)
        .json({ error: 'Salutes already submitted for this event' });
    }

    // Create salutes
    const salutes = await prisma.$transaction(
      salutedUserIds.map(toUserId =>
        prisma.salute.create({
          data: {
            eventId: id,
            fromUserId: fromUser.id,
            toUserId,
          },
        })
      )
    );

    // Recalculate ratings for saluted users
    const ratingsUpdated = await Promise.all(
      salutedUserIds.map(async userId => {
        // Get total salutes received
        const totalSalutes = await prisma.salute.count({
          where: { toUserId: userId },
        });

        // Get total games played
        const totalGames = await prisma.booking.count({
          where: {
            userId,
            status: 'confirmed',
            event: {
              endTime: { lt: new Date() },
            },
          },
        });

        // Calculate new rating (simple formula: base 1.0 + salutes/games ratio)
        // This gives a boost based on salute frequency
        const saluteRatio = totalGames > 0 ? totalSalutes / totalGames : 0;
        const newRating = Math.min(5.0, 1.0 + saluteRatio * 2); // Cap at 5.0

        // Update user rating
        await prisma.user.update({
          where: { id: userId },
          data: {
            currentRating: newRating,
            pickupRating: newRating, // For now, use same rating for pickup
            ratingLastUpdated: new Date(),
          },
        });

        return userId;
      })
    );

    res.json({
      success: true,
      salutesRecorded: salutes.length,
      ratingsUpdated: ratingsUpdated.length,
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
router.get('/:id/salutes/me', async (req, res) => {
  try {
    const { id } = req.params as { id: string };

    // TODO: Get user ID from auth token
    // For now, use the first user
    const user = await prisma.user.findFirst({
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const salutes = await prisma.salute.findMany({
      where: {
        eventId: id,
        fromUserId: user.id,
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/events/send-reminders — cron job: send 24h and 1h game reminders
// Called periodically (every 15 min) to post system messages in game threads
// ─────────────────────────────────────────────────────────────────────────────
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

// ── Availability check for invitees ──
// POST /events/check-availability
// Body: { userIds: string[], rosterIds: string[], dates: { date: string, startTime: string, endTime: string }[] }
// Returns: { [inviteeId]: boolean[] } — one boolean per date, true = available
router.post('/check-availability', async (req, res) => {
  try {
    const { userIds = [], rosterIds = [], dates = [] } = req.body;
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.json({});
    }

    // Expand roster IDs to their member user IDs
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

    // Collect all unique user IDs to check
    const allUserIds = new Set<string>(userIds);
    for (const memberIds of Object.values(rosterMembers)) {
      for (const uid of memberIds) allUserIds.add(uid);
    }

    // For each date window, find users who have a confirmed booking/participation
    const result: Record<string, boolean[]> = {};

    // Initialize result arrays
    for (const uid of userIds) result[uid] = [];
    for (const rid of rosterIds) result[rid] = [];

    for (let i = 0; i < dates.length; i++) {
      const { date, startTime, endTime } = dates[i];
      const dayStart = new Date(`${date}T${startTime}:00`);
      const dayEnd = new Date(`${date}T${endTime}:00`);

      // Find events that overlap this time window for any of our users
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

      // Collect busy user IDs for this date
      const busyUsers = new Set<string>();
      for (const evt of conflicting) {
        if (allUserIds.has(evt.organizerId)) busyUsers.add(evt.organizerId);
        for (const b of evt.bookings) busyUsers.add(b.userId);
        for (const gp of evt.gameParticipations) busyUsers.add(gp.userId);
      }

      // Player availability
      for (const uid of userIds) {
        result[uid]!.push(!busyUsers.has(uid));
      }

      // Roster availability (worst-case: if ANY member is busy, mark unavailable)
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
