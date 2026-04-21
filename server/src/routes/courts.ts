import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import {
  getAvailableSlots,
  getAvailableSlotsForRange,
} from '../services/AvailabilityCalculator';
import {
  validate,
  CreateCourtSchema,
  UpdateCourtSchema,
  BlockSlotSchema,
} from '../validation/schemas';

const router = Router();

/**
 * Check whether a time slot's start time is in the past.
 * `date` is stored as UTC midnight; `startTime` is "HH:MM" in facility-local time.
 * `tzOffset` is the client's timezone offset in minutes from JS getTimezoneOffset()
 * (positive = behind UTC, e.g. 240 for US Eastern).
 * When no offset is provided, falls back to UTC comparison.
 */
function isSlotInPast(
  slotDate: Date,
  startTime: string,
  tzOffset?: number
): boolean {
  const now = new Date();
  const [h, m] = startTime.split(':').map(Number);

  // Build "now" in the same frame as stored local times (which are stored as UTC)
  let effectiveNow: Date;
  if (tzOffset !== undefined) {
    // JS getTimezoneOffset() is positive for behind-UTC zones (e.g. 240 for ET = UTC-4).
    // Stored times are local times written as UTC hours, so we need "now" in local time
    // expressed as UTC: subtract the offset from UTC to get local time.
    effectiveNow = new Date(now.getTime() - tzOffset * 60 * 1000);
  } else {
    effectiveNow = now;
  }

  // Quick check: if the slot date is strictly after today, it's not in the past
  const slotDateMidnight = new Date(slotDate);
  slotDateMidnight.setUTCHours(0, 0, 0, 0);
  const todayMidnight = new Date(effectiveNow);
  todayMidnight.setUTCHours(0, 0, 0, 0);

  if (slotDateMidnight.getTime() > todayMidnight.getTime()) {
    return false;
  }

  // Same day — compare the time
  const d = new Date(slotDate);
  d.setUTCHours(h, m, 0, 0);
  return d.getTime() <= effectiveNow.getTime();
}

/**
 * Slot generation removed — availability is now calculated on-the-fly
 * from FacilityCourtAvailability rules via AvailabilityCalculator.
 */

// Get all courts for a facility
router.get('/facilities/:facilityId/courts', async (req, res) => {
  try {
    const { facilityId } = req.params as { facilityId: string };

    const courts = await prisma.facilityCourt.findMany({
      where: { facilityId },
      orderBy: { displayOrder: 'asc' },
    });

    res.json(courts);
  } catch (error) {
    console.error('Get courts error:', error);
    res.status(500).json({ error: 'Failed to fetch courts' });
  }
});

// Get single court by ID
router.get('/facilities/:facilityId/courts/:courtId', async (req, res) => {
  try {
    const { facilityId, courtId } = req.params as {
      facilityId: string;
      courtId: string;
    };

    const court = await prisma.facilityCourt.findFirst({
      where: {
        id: courtId,
        facilityId,
      },
    });

    if (!court) {
      return res.status(404).json({ error: 'Court not found' });
    }

    res.json(court);
  } catch (error) {
    console.error('Get court error:', error);
    res.status(500).json({ error: 'Failed to fetch court' });
  }
});

// Create new court
router.post(
  '/facilities/:facilityId/courts',
  authMiddleware,
  async (req, res) => {
    try {
      const { facilityId } = req.params as { facilityId: string };
      const {
        name,
        sportType,
        capacity,
        isIndoor,
        boundaryCoordinates,
        pricePerHour,
        displayOrder,
      } = req.body;

      // Authorization: only facility owner can create courts
      const facility = await prisma.facility.findUnique({
        where: { id: facilityId },
        select: { id: true, ownerId: true },
      });

      if (!facility) {
        return res.status(404).json({ error: 'Facility not found' });
      }

      if (facility.ownerId !== req.user!.userId) {
        return res
          .status(403)
          .json({ error: 'Only the facility owner can manage courts' });
      }

      // Validate required fields
      if (!name || !sportType) {
        return res
          .status(400)
          .json({ error: 'Name and sport type are required' });
      }

      // Check for duplicate court name within facility
      const existingCourt = await prisma.facilityCourt.findFirst({
        where: {
          facilityId,
          name,
        },
      });

      if (existingCourt) {
        return res
          .status(400)
          .json({ error: 'Court with this name already exists' });
      }

      const court = await prisma.facilityCourt.create({
        data: {
          facilityId,
          name,
          sportType: sportType || (req.body.sportTypes?.[0] ?? ''),
          sportTypes: req.body.sportTypes || (sportType ? [sportType] : []),
          capacity: capacity || 1,
          isIndoor: isIndoor || false,
          boundaryCoordinates: boundaryCoordinates || null,
          pricePerHour: pricePerHour || null,
          displayOrder: displayOrder || 0,
        },
      });

      // Availability is calculated on-the-fly — no slot generation needed

      // Return immediately with court data
      res.status(201).json(court);
    } catch (error) {
      console.error('Create court error:', error);
      res.status(500).json({ error: 'Failed to create court' });
    }
  }
);

// Update court
router.put(
  '/facilities/:facilityId/courts/:courtId',
  authMiddleware,
  async (req, res) => {
    try {
      const { facilityId, courtId } = req.params as {
        facilityId: string;
        courtId: string;
      };
      const {
        name,
        sportType,
        capacity,
        isIndoor,
        isActive,
        boundaryCoordinates,
        pricePerHour,
        displayOrder,
      } = req.body;

      // Authorization: only facility owner can update courts
      const ownerCheck = await prisma.facility.findUnique({
        where: { id: facilityId },
        select: { ownerId: true },
      });
      if (!ownerCheck || ownerCheck.ownerId !== req.user!.userId) {
        return res
          .status(403)
          .json({ error: 'Only the facility owner can manage courts' });
      }

      // Verify court exists and belongs to facility
      const existingCourt = await prisma.facilityCourt.findFirst({
        where: {
          id: courtId,
          facilityId,
        },
      });

      if (!existingCourt) {
        return res.status(404).json({ error: 'Court not found' });
      }

      // If name is being changed, check for duplicates
      if (name && name !== existingCourt.name) {
        const duplicateCourt = await prisma.facilityCourt.findFirst({
          where: {
            facilityId,
            name,
            id: { not: courtId },
          },
        });

        if (duplicateCourt) {
          return res
            .status(400)
            .json({ error: 'Court with this name already exists' });
        }
      }

      const court = await prisma.facilityCourt.update({
        where: { id: courtId },
        data: {
          ...(name && { name }),
          ...(sportType && { sportType }),
          ...(req.body.sportTypes && { sportTypes: req.body.sportTypes }),
          ...(capacity !== undefined && { capacity }),
          ...(isIndoor !== undefined && { isIndoor }),
          ...(isActive !== undefined && { isActive }),
          ...(boundaryCoordinates !== undefined && { boundaryCoordinates }),
          ...(pricePerHour !== undefined && { pricePerHour }),
          ...(displayOrder !== undefined && { displayOrder }),
        },
      });

      res.json(court);
    } catch (error) {
      console.error('Update court error:', error);
      res.status(500).json({ error: 'Failed to update court' });
    }
  }
);

// Delete court
router.delete(
  '/facilities/:facilityId/courts/:courtId',
  authMiddleware,
  async (req, res) => {
    try {
      const { facilityId, courtId } = req.params as {
        facilityId: string;
        courtId: string;
      };

      // Authorization: only facility owner can delete courts
      const ownerCheck2 = await prisma.facility.findUnique({
        where: { id: facilityId },
        select: { ownerId: true },
      });
      if (!ownerCheck2 || ownerCheck2.ownerId !== req.user!.userId) {
        return res
          .status(403)
          .json({ error: 'Only the facility owner can manage courts' });
      }

      // Verify court exists and belongs to facility
      const court = await prisma.facilityCourt.findFirst({
        where: {
          id: courtId,
          facilityId,
        },
      });

      if (!court) {
        return res.status(404).json({ error: 'Court not found' });
      }

      // Check if court has any future rentals
      const futureRentals = await prisma.facilityRental.count({
        where: {
          timeSlot: {
            courtId,
            date: { gte: new Date() },
          },
          status: 'confirmed',
        },
      });

      if (futureRentals > 0) {
        return res.status(400).json({
          error:
            'Cannot delete court with future rentals. Cancel all rentals first.',
        });
      }

      await prisma.facilityCourt.delete({
        where: { id: courtId },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Delete court error:', error);
      res.status(500).json({ error: 'Failed to delete court' });
    }
  }
);

// ── On-demand schedule: compute availability from operating hours + rentals ──
router.get(
  '/facilities/:facilityId/courts/:courtId/schedule',
  async (req, res) => {
    try {
      const { facilityId, courtId } = req.params as {
        facilityId: string;
        courtId: string;
      };
      const { date, userId } = req.query;

      if (!date)
        return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

      const court = await prisma.facilityCourt.findFirst({
        where: { id: courtId, facilityId, isActive: true },
        include: {
          facility: {
            select: {
              id: true,
              ownerId: true,
              pricePerHour: true,
              slotIncrementMinutes: true,
            },
          },
        },
      });
      if (!court)
        return res.status(404).json({ error: 'Court not found or inactive' });

      const isOwner = userId
        ? court.facility.ownerId === (userId as string)
        : false;
      const slotIncrement = court.facility.slotIncrementMinutes || 60;
      const pricePerHour =
        court.pricePerHour ?? court.facility.pricePerHour ?? 0;
      const pricePerSlot = (pricePerHour / 60) * slotIncrement;

      // Parse date and get day of week
      const targetDate = new Date((date as string) + 'T00:00:00Z');
      const dayOfWeek = targetDate.getUTCDay(); // 0=Sun

      // Get operating hours for this day
      const opHours = await prisma.facilityCourtAvailability.findMany({
        where: {
          courtId,
          OR: [
            { isRecurring: true, dayOfWeek },
            { isRecurring: false, specificDate: targetDate },
          ],
        },
      });

      // If no operating hours defined, use default 8am-10pm
      const windows =
        opHours.length > 0
          ? opHours
              .filter(h => !h.isBlocked)
              .map(h => ({ start: h.startTime, end: h.endTime }))
          : [{ start: '08:00', end: '22:00' }];

      // Get all confirmed rentals for this court on this date
      // Rentals reference FacilityTimeSlot which has the date/time
      const rentals = await prisma.facilityRental.findMany({
        where: {
          status: { in: ['confirmed', 'pending_approval'] },
          timeSlot: {
            courtId,
            date: targetDate,
          },
        },
        include: {
          timeSlot: { select: { startTime: true, endTime: true } },
        },
      });

      // Also get owner-blocked slots
      const blockedSlots = await prisma.facilityTimeSlot.findMany({
        where: {
          courtId,
          date: targetDate,
          status: 'blocked',
        },
        select: { startTime: true, endTime: true },
      });

      // Build a set of booked time ranges (in minutes from midnight)
      const bookedRanges: { start: number; end: number; userId?: string }[] =
        [];
      for (const r of rentals) {
        const [sh, sm] = r.timeSlot.startTime.split(':').map(Number);
        const [eh, em] = r.timeSlot.endTime.split(':').map(Number);
        bookedRanges.push({
          start: (sh || 0) * 60 + (sm || 0),
          end: (eh || 0) * 60 + (em || 0),
          userId: r.userId,
        });
      }
      for (const b of blockedSlots) {
        const [sh, sm] = b.startTime.split(':').map(Number);
        const [eh, em] = b.endTime.split(':').map(Number);
        bookedRanges.push({
          start: (sh || 0) * 60 + (sm || 0),
          end: (eh || 0) * 60 + (em || 0),
        });
      }

      // Generate schedule slots from operating hours
      const schedule: Array<{
        startTime: string;
        endTime: string;
        status: 'available' | 'booked' | 'own_reservation';
        price: number;
      }> = [];

      for (const window of windows) {
        const [wsh, wsm] = window.start.split(':').map(Number);
        const [weh, wem] = window.end.split(':').map(Number);
        const windowStart = (wsh || 0) * 60 + (wsm || 0);
        const windowEnd = (weh || 0) * 60 + (wem || 0);

        for (let t = windowStart; t < windowEnd; t += slotIncrement) {
          const slotEnd = t + slotIncrement;
          const startStr = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
          const endStr = `${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}`;

          // Check if this slot overlaps any booked range
          const overlap = bookedRanges.find(
            br => t < br.end && slotEnd > br.start
          );

          let status: 'available' | 'booked' | 'own_reservation' = 'available';
          if (overlap) {
            status =
              userId && overlap.userId === userId
                ? 'own_reservation'
                : 'booked';
          }

          schedule.push({
            startTime: startStr,
            endTime: endStr,
            status,
            price: Math.round(pricePerSlot * 100) / 100,
          });
        }
      }

      res.json({
        courtId,
        courtName: court.name,
        date: date as string,
        isOwner,
        slotIncrementMinutes: slotIncrement,
        minimumBookingMinutes: court.minimumBookingMinutes || 60,
        schedule,
      });
    } catch (error) {
      console.error('Get court schedule error:', error);
      res.status(500).json({ error: 'Failed to compute court schedule' });
    }
  }
);

export default router;

// Get time slots for a court — calculated on-the-fly from operating hours
router.get(
  '/facilities/:facilityId/courts/:courtId/slots',
  async (req, res) => {
    try {
      const { facilityId, courtId } = req.params as {
        facilityId: string;
        courtId: string;
      };
      const { startDate, endDate, status: statusFilter } = req.query;

      // Verify court exists and belongs to facility
      const court = await prisma.facilityCourt.findFirst({
        where: { id: courtId, facilityId },
      });

      if (!court) {
        return res.status(404).json({ error: 'Court not found' });
      }

      const today = new Date();
      const start = startDate
        ? (startDate as string)
        : today.toISOString().split('T')[0]!;
      const end = endDate
        ? (endDate as string)
        : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]!;

      const slots = await getAvailableSlotsForRange(courtId, start, end);

      // Apply status filter if provided
      const filtered = statusFilter
        ? slots.filter(s => s.status === statusFilter)
        : slots;

      res.json(filtered);
    } catch (error) {
      console.error('Get time slots error:', error);
      res.status(500).json({ error: 'Failed to fetch time slots' });
    }
  }
);

// Block time slot(s)
router.post(
  '/facilities/:facilityId/courts/:courtId/slots/block',
  authMiddleware,
  async (req, res) => {
    try {
      const { facilityId, courtId } = req.params as {
        facilityId: string;
        courtId: string;
      };
      const { date, startTime, endTime, blockReason } = req.body;

      // Authorization: only facility owner can block slots
      const blockOwnerCheck = await prisma.facility.findUnique({
        where: { id: facilityId },
        select: { ownerId: true },
      });
      if (!blockOwnerCheck || blockOwnerCheck.ownerId !== req.user!.userId) {
        return res
          .status(403)
          .json({ error: 'Only the facility owner can block time slots' });
      }

      // Verify court exists and belongs to facility
      const court = await prisma.facilityCourt.findFirst({
        where: {
          id: courtId,
          facilityId,
        },
      });

      if (!court) {
        return res.status(404).json({ error: 'Court not found' });
      }

      // Validate required fields
      if (!date || !startTime || !endTime) {
        return res
          .status(400)
          .json({ error: 'Date, start time, and end time are required' });
      }

      // Check if slot already exists
      const existingSlot = await prisma.facilityTimeSlot.findUnique({
        where: {
          courtId_date_startTime: {
            courtId,
            date: new Date(date),
            startTime,
          },
        },
      });

      if (existingSlot) {
        // Update existing slot to blocked
        const updatedSlot = await prisma.facilityTimeSlot.update({
          where: { id: existingSlot.id },
          data: {
            status: 'blocked',
            blockReason: blockReason || 'Blocked by operator',
          },
        });
        return res.json(updatedSlot);
      }

      // Create new blocked slot
      const price = court.pricePerHour || 0;
      const timeSlot = await prisma.facilityTimeSlot.create({
        data: {
          courtId,
          date: new Date(date),
          startTime,
          endTime,
          status: 'blocked',
          blockReason: blockReason || 'Blocked by operator',
          price,
        },
      });

      res.status(201).json(timeSlot);
    } catch (error) {
      console.error('Block time slot error:', error);
      res.status(500).json({ error: 'Failed to block time slot' });
    }
  }
);

// Unblock time slot
router.delete(
  '/facilities/:facilityId/courts/:courtId/slots/:slotId/unblock',
  authMiddleware,
  async (req, res) => {
    try {
      const { facilityId, courtId, slotId } = req.params as {
        facilityId: string;
        courtId: string;
        slotId: string;
      };

      // Authorization: only facility owner can unblock slots
      const unblockOwnerCheck = await prisma.facility.findUnique({
        where: { id: facilityId },
        select: { ownerId: true },
      });
      if (
        !unblockOwnerCheck ||
        unblockOwnerCheck.ownerId !== req.user!.userId
      ) {
        return res
          .status(403)
          .json({ error: 'Only the facility owner can unblock time slots' });
      }

      // Verify slot exists and belongs to court
      const timeSlot = await prisma.facilityTimeSlot.findFirst({
        where: {
          id: slotId,
          courtId,
        },
        include: {
          court: true,
        },
      });

      if (!timeSlot) {
        return res.status(404).json({ error: 'Time slot not found' });
      }

      if (timeSlot.court.facilityId !== facilityId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      if (timeSlot.status === 'rented') {
        return res
          .status(400)
          .json({ error: 'Cannot unblock a rented time slot' });
      }

      // Update slot to available
      const updatedSlot = await prisma.facilityTimeSlot.update({
        where: { id: slotId },
        data: {
          status: 'available',
          blockReason: null,
        },
      });

      res.json(updatedSlot);
    } catch (error) {
      console.error('Unblock time slot error:', error);
      res.status(500).json({ error: 'Failed to unblock time slot' });
    }
  }
);

// Check availability for a court
router.get(
  '/facilities/:facilityId/courts/:courtId/availability',
  async (req, res) => {
    try {
      const { facilityId, courtId } = req.params as {
        facilityId: string;
        courtId: string;
      };
      const { date, tzOffset: tzOffsetParam } = req.query;
      const clientTzOffset = tzOffsetParam
        ? parseInt(tzOffsetParam as string, 10)
        : undefined;

      // Verify court exists and belongs to facility
      const court = await prisma.facilityCourt.findFirst({
        where: {
          id: courtId,
          facilityId,
          isActive: true,
        },
      });

      if (!court) {
        return res.status(404).json({ error: 'Court not found or inactive' });
      }

      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }

      // Parse date string and normalize to midnight UTC
      const targetDate = new Date(date as string);
      targetDate.setUTCHours(0, 0, 0, 0);

      console.log(
        `[Availability] Court: ${courtId}, Date query: ${date}, Parsed: ${targetDate.toISOString()}`
      );

      // Get all time slots for this date with rental information
      const timeSlots = await prisma.facilityTimeSlot.findMany({
        where: {
          courtId,
          date: targetDate,
        },
        include: {
          rental: {
            select: {
              userId: true,
            },
          },
        },
        orderBy: { startTime: 'asc' },
      });

      console.log(`[Availability] Found ${timeSlots.length} slots`);

      // Map slots to include rental user ID
      const slotsWithRentalInfo = timeSlots.map(slot => ({
        ...slot,
        rentalUserId: slot.rental?.userId || null,
      }));

      // Filter out slots whose start time is in the past
      const futureSlots = slotsWithRentalInfo.filter(
        slot => !isSlotInPast(slot.date, slot.startTime, clientTzOffset)
      );

      // Filter to only show available slots
      const availableSlots = futureSlots.filter(
        slot => slot.status === 'available'
      );

      res.json({
        date: targetDate,
        courtId,
        courtName: court.name,
        minimumBookingMinutes: court.minimumBookingMinutes || 60,
        totalSlots: futureSlots.length,
        availableSlots: availableSlots.length,
        slots: futureSlots,
      });
    } catch (error) {
      console.error('Check availability error:', error);
      res.status(500).json({ error: 'Failed to check availability' });
    }
  }
);

// Get available slots for event creation with ownership context
router.get(
  '/facilities/:facilityId/courts/:courtId/slots-for-event',
  async (req, res) => {
    try {
      const { facilityId, courtId } = req.params as {
        facilityId: string;
        courtId: string;
      };
      const {
        userId,
        startDate,
        endDate,
        tzOffset: tzOffsetParam2,
      } = req.query;
      const clientTzOffset = tzOffsetParam2
        ? parseInt(tzOffsetParam2 as string, 10)
        : undefined;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      // Verify court exists and belongs to facility
      const court = await prisma.facilityCourt.findFirst({
        where: {
          id: courtId,
          facilityId,
          isActive: true,
        },
        include: {
          facility: {
            select: {
              ownerId: true,
            },
          },
        },
      });

      if (!court) {
        return res.status(404).json({ error: 'Court not found or inactive' });
      }

      const isOwner = court.facility.ownerId === userId;

      // Normalize dates
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const start = startDate ? new Date(startDate as string) : today;
      start.setUTCHours(0, 0, 0, 0);

      const end = endDate ? new Date(endDate as string) : new Date(start);
      if (!endDate) {
        end.setDate(end.getDate() + 30); // Default to 30 days only if no endDate provided
      }
      end.setUTCHours(0, 0, 0, 0);

      // Get all time slots in date range
      const timeSlots = await prisma.facilityTimeSlot.findMany({
        where: {
          courtId,
          date: {
            gte: start,
            lte: end,
          },
        },
        include: {
          rental: {
            select: {
              id: true,
              userId: true,
              status: true,
              usedForEventId: true,
              cancellationStatus: true,
            },
          },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });

      // Map slots with ownership context
      const slotsWithContext = timeSlots
        .filter(
          slot => !isSlotInPast(slot.date, slot.startTime, clientTzOffset)
        )
        .map(slot => {
          const hasPendingCancellation =
            slot.rental &&
            slot.rental.cancellationStatus === 'pending_cancellation';
          const isUserRental =
            slot.rental &&
            slot.rental.userId === userId &&
            !slot.rental.usedForEventId &&
            !hasPendingCancellation;
          const isOtherUserRental =
            slot.rental && slot.rental.userId !== userId;
          const isAlreadyUsedForEvent =
            slot.rental && slot.rental.usedForEventId;

          let isSelectable = false;
          let selectabilityReason = '';

          if (isOwner) {
            // Owner can select available slots
            if (slot.status === 'available') {
              isSelectable = true;
            } else if (slot.status === 'blocked') {
              selectabilityReason = 'Blocked by operator';
            } else if (slot.status === 'rented') {
              if (hasPendingCancellation) {
                selectabilityReason = 'Pending cancellation';
              } else {
                selectabilityReason = 'Rented by another user';
              }
            }
          } else {
            // Non-owner can only select their own unused rentals (not pending cancellation)
            if (isUserRental) {
              isSelectable = true;
            } else if (hasPendingCancellation) {
              selectabilityReason = 'Cancellation pending approval';
            } else if (isAlreadyUsedForEvent) {
              selectabilityReason = 'Already used for an event';
            } else if (isOtherUserRental) {
              selectabilityReason = 'Rented by another user';
            } else if (slot.status === 'blocked') {
              selectabilityReason = 'Not available';
            } else {
              selectabilityReason = 'You have not reserved this slot';
            }
          }

          return {
            id: slot.id,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            price: slot.price,
            status: slot.status,
            isSelectable,
            selectabilityReason,
            isUserRental: !!isUserRental,
            rentalId: isUserRental ? slot.rental!.id : null,
          };
        });

      res.json({
        courtId,
        courtName: court.name,
        sportType: court.sportType,
        isOwner,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        slots: slotsWithContext,
        totalSlots: slotsWithContext.length,
        selectableSlots: slotsWithContext.filter(s => s.isSelectable).length,
      });
    } catch (error) {
      console.error('Get slots for event error:', error);
      res.status(500).json({ error: 'Failed to fetch slots for event' });
    }
  }
);
