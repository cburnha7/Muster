import { Router } from 'express';
import { prisma } from '../index';
import { TimeSlotGeneratorService } from '../services/TimeSlotGeneratorService';

const router = Router();

// In-memory map to track failed generations
const failedGenerations = new Map<string, { courtId: string; failedAt: Date; error: string; retryCount: number }>();

/**
 * Track failed slot generation for retry by cron job
 */
async function trackFailedGeneration(courtId: string, error: Error): Promise<void> {
  const existing = failedGenerations.get(courtId);
  failedGenerations.set(courtId, {
    courtId,
    failedAt: new Date(),
    error: error.message,
    retryCount: (existing?.retryCount ?? 0) + 1,
  });
}

/**
 * Queue async slot generation (non-blocking)
 */
async function queueSlotGeneration(courtId: string): Promise<void> {
  // Add small delay to ensure transaction is committed
  await new Promise(resolve => setTimeout(resolve, 100));

  const generator = new TimeSlotGeneratorService();
  
  try {
    const result = await generator.generateRollingWindow(courtId);
    console.log('✅ Slot generation completed', {
      courtId,
      slotsGenerated: result.slotsGenerated,
      duration: result.duration,
    });
  } catch (error: any) {
    console.error('❌ Slot generation failed', {
      courtId,
      error: error.message,
    });
    
    // Track failure for retry by cron job
    await trackFailedGeneration(courtId, error);
  }
}

// Get all courts for a facility
router.get('/facilities/:facilityId/courts', async (req, res) => {
  try {
    const { facilityId } = req.params;

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
    const { facilityId, courtId } = req.params;

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
router.post('/facilities/:facilityId/courts', async (req, res) => {
  try {
    const { facilityId } = req.params;
    const {
      name,
      sportType,
      capacity,
      isIndoor,
      boundaryCoordinates,
      pricePerHour,
      displayOrder,
    } = req.body;

    // TODO: Add authorization check - only facility owner can create courts
    // For now, verify facility exists
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    // Validate required fields
    if (!name || !sportType) {
      return res.status(400).json({ error: 'Name and sport type are required' });
    }

    // Check for duplicate court name within facility
    const existingCourt = await prisma.facilityCourt.findFirst({
      where: {
        facilityId,
        name,
      },
    });

    if (existingCourt) {
      return res.status(400).json({ error: 'Court with this name already exists' });
    }

    const court = await prisma.facilityCourt.create({
      data: {
        facilityId,
        name,
        sportType,
        capacity: capacity || 1,
        isIndoor: isIndoor || false,
        boundaryCoordinates: boundaryCoordinates || null,
        pricePerHour: pricePerHour || null,
        displayOrder: displayOrder || 0,
      },
    });

    // Queue async slot generation (non-blocking)
    console.log(`🕐 Queueing slot generation for court: ${court.name}`);
    queueSlotGeneration(court.id).catch((error) => {
      console.error('Async slot generation queue error:', error);
    });

    // Return immediately with court data
    res.status(201).json(court);
  } catch (error) {
    console.error('Create court error:', error);
    res.status(500).json({ error: 'Failed to create court' });
  }
});

// Update court
router.put('/facilities/:facilityId/courts/:courtId', async (req, res) => {
  try {
    const { facilityId, courtId } = req.params;
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

    // TODO: Add authorization check - only facility owner can update courts

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
        return res.status(400).json({ error: 'Court with this name already exists' });
      }
    }

    const court = await prisma.facilityCourt.update({
      where: { id: courtId },
      data: {
        ...(name && { name }),
        ...(sportType && { sportType }),
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
});

// Delete court
router.delete('/facilities/:facilityId/courts/:courtId', async (req, res) => {
  try {
    const { facilityId, courtId } = req.params;

    // TODO: Add authorization check - only facility owner can delete courts

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
        error: 'Cannot delete court with future rentals. Cancel all rentals first.',
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
});

export default router;

// Get time slots for a court
router.get('/facilities/:facilityId/courts/:courtId/slots', async (req, res) => {
  try {
    const { facilityId, courtId } = req.params;
    const { startDate, endDate, status } = req.query;

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

    const where: any = { courtId };

    if (startDate) {
      where.date = { gte: new Date(startDate as string) };
    }
    if (endDate) {
      where.date = { ...where.date, lte: new Date(endDate as string) };
    }
    if (status) {
      where.status = status;
    }

    const timeSlots = await prisma.facilityTimeSlot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    res.json(timeSlots);
  } catch (error) {
    console.error('Get time slots error:', error);
    res.status(500).json({ error: 'Failed to fetch time slots' });
  }
});

// Block time slot(s)
router.post('/facilities/:facilityId/courts/:courtId/slots/block', async (req, res) => {
  try {
    const { facilityId, courtId } = req.params;
    const { date, startTime, endTime, blockReason } = req.body;

    // TODO: Add authorization check - only facility owner can block slots

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
      return res.status(400).json({ error: 'Date, start time, and end time are required' });
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
});

// Unblock time slot
router.delete('/facilities/:facilityId/courts/:courtId/slots/:slotId/unblock', async (req, res) => {
  try {
    const { facilityId, courtId, slotId } = req.params;

    // TODO: Add authorization check - only facility owner can unblock slots

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
      return res.status(400).json({ error: 'Cannot unblock a rented time slot' });
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
});

// Check availability for a court
router.get('/facilities/:facilityId/courts/:courtId/availability', async (req, res) => {
  try {
    const { facilityId, courtId } = req.params;
    const { date } = req.query;

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

    console.log(`[Availability] Court: ${courtId}, Date query: ${date}, Parsed: ${targetDate.toISOString()}`);

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

    // Filter to only show available slots
    const availableSlots = slotsWithRentalInfo.filter(slot => slot.status === 'available');

    res.json({
      date: targetDate,
      courtId,
      courtName: court.name,
      totalSlots: timeSlots.length,
      availableSlots: availableSlots.length,
      slots: slotsWithRentalInfo,
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// Get available slots for event creation with ownership context
router.get('/facilities/:facilityId/courts/:courtId/slots-for-event', async (req, res) => {
  try {
    const { facilityId, courtId } = req.params;
    const { userId, startDate, endDate } = req.query;

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
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    // Map slots with ownership context
    const slotsWithContext = timeSlots.map(slot => {
      const hasPendingCancellation = slot.rental && slot.rental.cancellationStatus === 'pending_cancellation';
      const isUserRental = slot.rental && slot.rental.userId === userId && !slot.rental.usedForEventId && !hasPendingCancellation;
      const isOtherUserRental = slot.rental && slot.rental.userId !== userId;
      const isAlreadyUsedForEvent = slot.rental && slot.rental.usedForEventId;

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
});
