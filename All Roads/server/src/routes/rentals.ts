import { Router } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../index';

const router = Router();

// Rent a time slot
router.post('/facilities/:facilityId/courts/:courtId/slots/:slotId/rent', async (req, res) => {
  try {
    const { facilityId, courtId, slotId } = req.params;
    const { userId } = req.body;

    // TODO: Get userId from auth token instead of request body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify time slot exists and is available
    const timeSlot = await prisma.facilityTimeSlot.findFirst({
      where: {
        id: slotId,
        courtId,
      },
      include: {
        court: {
          include: {
            facility: true,
          },
        },
      },
    });

    if (!timeSlot) {
      return res.status(404).json({ error: 'Time slot not found' });
    }

    if (timeSlot.court.facilityId !== facilityId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (timeSlot.status !== 'available') {
      return res.status(400).json({ error: 'Time slot is not available' });
    }

    // Check if slot is in the past
    // Note: Date is stored at midnight UTC, time is in local facility time
    // We'll be lenient and only reject if the date itself is in the past
    const slotDate = new Date(timeSlot.date);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    console.log(`[Rent Slot] Slot date: ${slotDate.toISOString()}, Today: ${today.toISOString()}`);

    if (slotDate < today) {
      return res.status(400).json({ error: 'Cannot rent past time slots' });
    }

    // Create rental and update slot status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update time slot status
      await tx.facilityTimeSlot.update({
        where: { id: slotId },
        data: { status: 'rented' },
      });

      // Create rental record
      const rental = await tx.facilityRental.create({
        data: {
          userId,
          timeSlotId: slotId,
          totalPrice: timeSlot.price,
          status: 'confirmed',
          paymentStatus: timeSlot.price > 0 ? 'pending' : 'paid',
        },
        include: {
          timeSlot: {
            include: {
              court: {
                include: {
                  facility: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return rental;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Rent time slot error:', error);
    res.status(500).json({ error: 'Failed to rent time slot' });
  }
});

// Cancel rental
router.delete('/rentals/:rentalId', async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { userId, cancellationReason } = req.body;

    // TODO: Get userId from auth token

    // Verify rental exists
    const rental = await prisma.facilityRental.findUnique({
      where: { id: rentalId },
      include: {
        timeSlot: true,
      },
    });

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Verify user owns this rental or is facility owner
    if (rental.userId !== userId) {
      // TODO: Also check if user is facility owner
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (rental.status === 'cancelled') {
      return res.status(400).json({ error: 'Rental already cancelled' });
    }

    // Check if rental is less than 2 hours away
    const slotDateTime = new Date(rental.timeSlot.date);
    const [hours, minutes] = rental.timeSlot.startTime.split(':').map(Number);
    slotDateTime.setHours(hours, minutes, 0, 0);

    const hoursUntilRental = (slotDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);

    if (hoursUntilRental < 2) {
      return res.status(400).json({
        error: 'Cannot cancel rental less than 2 hours before start time',
      });
    }

    // Cancel rental and return slot to available in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update rental status
      const updatedRental = await tx.facilityRental.update({
        where: { id: rentalId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: cancellationReason || 'Cancelled by user',
          refundAmount: rental.paymentStatus === 'paid' ? rental.totalPrice : 0,
        },
      });

      // Return time slot to available
      await tx.facilityTimeSlot.update({
        where: { id: rental.timeSlotId },
        data: { status: 'available' },
      });

      return updatedRental;
    });

    res.json(result);
  } catch (error) {
    console.error('Cancel rental error:', error);
    res.status(500).json({ error: 'Failed to cancel rental' });
  }
});

// Request rental cancellation (user requests, owner approves)
router.post('/rentals/:rentalId/request-cancellation', async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { userId, cancellationReason } = req.body;

    // TODO: Get userId from auth token

    if (!cancellationReason || cancellationReason.trim().length < 10) {
      return res.status(400).json({ error: 'Cancellation reason is required (minimum 10 characters)' });
    }

    // Verify rental exists
    const rental = await prisma.facilityRental.findUnique({
      where: { id: rentalId },
      include: {
        timeSlot: {
          include: {
            court: {
              include: {
                facility: true,
              },
            },
          },
        },
      },
    });

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Verify user owns this rental
    if (rental.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (rental.status === 'cancelled') {
      return res.status(400).json({ error: 'Rental already cancelled' });
    }

    if (rental.cancellationStatus === 'pending_cancellation') {
      return res.status(400).json({ error: 'Cancellation request already pending' });
    }

    // Check if rental has been used for an event
    if (rental.usedForEventId) {
      return res.status(400).json({ error: 'Cannot cancel rental that has been used for an event' });
    }

    // Update rental with cancellation request
    const updatedRental = await prisma.facilityRental.update({
      where: { id: rentalId },
      data: {
        cancellationStatus: 'pending_cancellation',
        cancellationReason: cancellationReason.trim(),
      },
      include: {
        timeSlot: {
          include: {
            court: {
              include: {
                facility: true,
              },
            },
          },
        },
      },
    });

    // TODO: Send notification to facility owner about cancellation request

    res.json({
      success: true,
      message: 'Cancellation request submitted. Awaiting facility owner approval.',
      rental: updatedRental,
    });
  } catch (error) {
    console.error('Request rental cancellation error:', error);
    res.status(500).json({ error: 'Failed to request cancellation' });
  }
});

// Bulk rent multiple time slots in a single transaction
router.post('/rentals/bulk', async (req, res) => {
  try {
    const { userId, slots } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: 'At least one slot is required' });
    }

    const slotIds = slots.map((s: any) => s.slotId);

    // Fetch all referenced time slots
    const timeSlots = await prisma.facilityTimeSlot.findMany({
      where: { id: { in: slotIds } },
      include: {
        court: {
          include: { facility: true },
        },
      },
    });

    // Build a lookup for validation
    const slotMap = new Map(timeSlots.map((ts) => [ts.id, ts]));
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const conflicts: any[] = [];
    const validSlots: any[] = [];

    for (const reqSlot of slots) {
      const ts = slotMap.get(reqSlot.slotId);

      if (!ts) {
        conflicts.push({
          slotId: reqSlot.slotId,
          courtId: reqSlot.courtId,
          courtName: 'Unknown',
          date: null,
          startTime: null,
          endTime: null,
          reason: 'not_found',
        });
        continue;
      }

      // Validate court/facility ownership
      if (ts.courtId !== reqSlot.courtId || ts.court.facilityId !== reqSlot.facilityId) {
        conflicts.push({
          slotId: ts.id,
          courtId: ts.courtId,
          courtName: ts.court.name,
          date: ts.date,
          startTime: ts.startTime,
          endTime: ts.endTime,
          reason: 'invalid_reference',
        });
        continue;
      }

      // Check past date
      const slotDate = new Date(ts.date);
      if (slotDate < today) {
        conflicts.push({
          slotId: ts.id,
          courtId: ts.courtId,
          courtName: ts.court.name,
          date: ts.date,
          startTime: ts.startTime,
          endTime: ts.endTime,
          reason: 'past_date',
        });
        continue;
      }

      // Check availability
      if (ts.status !== 'available') {
        conflicts.push({
          slotId: ts.id,
          courtId: ts.courtId,
          courtName: ts.court.name,
          date: ts.date,
          startTime: ts.startTime,
          endTime: ts.endTime,
          reason: ts.status,
        });
        continue;
      }

      validSlots.push({ reqSlot, timeSlot: ts });
    }

    // If any conflicts, return 409 without creating anything
    if (conflicts.length > 0) {
      return res.status(409).json({
        conflicts,
        availableSlots: validSlots.map((v) => ({
          slotId: v.timeSlot.id,
          courtId: v.reqSlot.courtId,
          facilityId: v.reqSlot.facilityId,
        })),
      });
    }

    // All slots valid — create rentals in a transaction
    const bookingSessionId = randomUUID();

    const result = await prisma.$transaction(async (tx) => {
      const rentals = [];

      for (const { timeSlot: ts } of validSlots) {
        // Update slot status
        await tx.facilityTimeSlot.update({
          where: { id: ts.id },
          data: { status: 'rented' },
        });

        // Create rental
        const rental = await tx.facilityRental.create({
          data: {
            userId,
            timeSlotId: ts.id,
            totalPrice: ts.price,
            status: 'confirmed',
            paymentStatus: ts.price > 0 ? 'pending' : 'paid',
            bookingSessionId,
          },
          include: {
            timeSlot: {
              include: {
                court: {
                  include: { facility: true },
                },
              },
            },
          },
        });

        rentals.push(rental);
      }

      return rentals;
    });

    const totalPrice = result.reduce((sum, r) => sum + r.totalPrice, 0);

    res.status(201).json({
      bookingSessionId,
      rentals: result,
      totalPrice,
      slotCount: result.length,
    });
  } catch (error) {
    console.error('Bulk rent error:', error);
    res.status(500).json({ error: 'Failed to process bulk booking' });
  }
});

// Get user's rentals (MUST be before /:rentalId to avoid route conflict)
router.get('/rentals/my-rentals', async (req, res) => {
  try {
    const { userId, status, upcoming } = req.query;

    // TODO: Get userId from auth token

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const where: any = { userId: userId as string };

    if (status) {
      where.status = status;
    }

    if (upcoming === 'true') {
      // Normalize to start of day for date comparison
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      where.timeSlot = {
        date: { gte: today },
      };
    }

    const rentals = await prisma.facilityRental.findMany({
      where,
      include: {
        timeSlot: {
          include: {
            court: {
              include: {
                facility: true,
              },
            },
          },
        },
      },
      orderBy: {
        timeSlot: {
          date: 'asc',
        },
      },
    });

    res.json(rentals);
  } catch (error) {
    console.error('Get user rentals error:', error);
    res.status(500).json({ error: 'Failed to fetch rentals' });
  }
});

// Get single rental by ID
router.get('/rentals/:rentalId', async (req, res) => {
  try {
    const { rentalId } = req.params;

    const rental = await prisma.facilityRental.findUnique({
      where: { id: rentalId },
      include: {
        timeSlot: {
          include: {
            court: {
              include: {
                facility: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // TODO: Add authorization check - only rental owner or facility owner can view

    res.json(rental);
  } catch (error) {
    console.error('Get rental error:', error);
    res.status(500).json({ error: 'Failed to fetch rental' });
  }
});

// Get all rentals for a facility (operator view)
router.get('/facilities/:facilityId/rentals', async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { status, startDate, endDate } = req.query;

    // TODO: Add authorization check - only facility owner can view

    const where: any = {
      timeSlot: {
        court: {
          facilityId,
        },
      },
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.timeSlot = {
        ...where.timeSlot,
        date: {},
      };
      if (startDate) {
        where.timeSlot.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.timeSlot.date.lte = new Date(endDate as string);
      }
    }

    const rentals = await prisma.facilityRental.findMany({
      where,
      include: {
        timeSlot: {
          include: {
            court: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        timeSlot: {
          date: 'asc',
        },
      },
    });

    res.json(rentals);
  } catch (error) {
    console.error('Get facility rentals error:', error);
    res.status(500).json({ error: 'Failed to fetch rentals' });
  }
});

export default router;
