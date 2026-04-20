import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { rateCalculator } from '../services/RateCalculator';
import { availabilityService } from '../services/AvailabilityService';
import { verificationService } from '../services/VerificationService';
import { TimeSlotGeneratorService } from '../services/TimeSlotGeneratorService';
import {
  uploadMap,
  uploadPhoto,
  uploadCover,
  validateImageFile,
  validatePhotoFile,
  generateImageUrl,
  processMapImage,
  deleteImageFiles,
} from '../services/ImageUploadService';
import fs from 'fs';
import path from 'path';
import { isValidPolicyHours } from '../services/cancellation-window';
import { requireNonDependent } from '../middleware/require-non-dependent';
import { sendError, ErrorCode, asyncHandler } from '../utils/errors';

// ─── Service imports ────────────────────────────────────────────────────────
import * as FacilityCrudService from '../services/FacilityCrudService';

const router = Router();
const timeSlotGenerator = new TimeSlotGeneratorService();

// ─── Error helper ───────────────────────────────────────────────────────────
function sendServiceError(res: Response, error: any) {
  const status = error.statusCode || 500;
  const body: any = { error: error.message || 'Internal error' };
  if (error.extra) Object.assign(body, error.extra);
  res.status(status).json(body);
}

// Get all facilities
router.get('/', async (req, res) => {
  try {
    const result = await FacilityCrudService.getFacilities(
      req.query as FacilityCrudService.GetFacilitiesFilters
    );
    res.json(result);
  } catch (error: any) {
    console.error('Get facilities error:', error);
    sendServiceError(res, error);
  }
});

// Get facility by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const facility = await FacilityCrudService.getFacilityById(id);
    res.json(facility);
  } catch (error: any) {
    console.error('Get facility error:', error);
    sendServiceError(res, error);
  }
});

// Get events at a facility
router.get('/:id/events', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const result = await FacilityCrudService.getFacilityEvents(
      id,
      req.query as FacilityCrudService.GetFacilityEventsParams
    );
    res.json(result);
  } catch (error: any) {
    console.error('Get facility events error:', error);
    sendServiceError(res, error);
  }
});

// ---------------------------------------------------------------------------
// GET /facilities/for-event — All facilities matching a sport type, with user context
// ---------------------------------------------------------------------------
router.get('/for-event', async (req, res) => {
  try {
    const result = await FacilityCrudService.getFacilitiesForEvent(
      req.query.sportType as string | undefined,
      req.query.userId as string | undefined
    );
    res.json(result);
  } catch (error: any) {
    console.error('Facilities for-event error:', error);
    sendServiceError(res, error);
  }
});

// Get authorized facilities for event creation
router.get('/authorized/for-events', async (req, res) => {
  try {
    const result = await FacilityCrudService.getAuthorizedFacilities(
      req.query.userId as string | undefined
    );
    res.json(result);
  } catch (error: any) {
    console.error('Get authorized facilities error:', error?.message || error);
    sendServiceError(res, error);
  }
});

// Get available time slots for event creation at a facility
// Returns slots based on ownership (all available) or rentals (only user's rentals)
router.get('/:id/available-slots', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Check if facility exists
    const facility = await prisma.facility.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const isOwner = facility.ownerId === userId;

    // Normalize today's date to midnight UTC for comparison
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (isOwner) {
      // User owns the facility - show all available slots
      const availableSlots = await prisma.facilityTimeSlot.findMany({
        where: {
          court: {
            facilityId: id,
            isActive: true,
          },
          status: 'available',
          date: { gte: today }, // Only future slots
        },
        include: {
          court: {
            select: {
              id: true,
              name: true,
              sportType: true,
              capacity: true,
            },
          },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });

      res.json({
        data: availableSlots.map(slot => ({
          ...slot,
          isFromRental: false,
          rentalId: null,
        })),
        isOwner: true,
        total: availableSlots.length,
      });
    } else {
      // User doesn't own - show only their rental slots
      const userRentals = await prisma.facilityRental.findMany({
        where: {
          userId: userId as string,
          status: 'confirmed',
          usedForEventId: null, // Only unused rentals
          timeSlot: {
            court: {
              facilityId: id,
            },
            date: { gte: today }, // Only future rentals
          },
        },
        include: {
          timeSlot: {
            include: {
              court: {
                select: {
                  id: true,
                  name: true,
                  sportType: true,
                  capacity: true,
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

      res.json({
        data: userRentals.map(rental => ({
          ...rental.timeSlot,
          isFromRental: true,
          rentalId: rental.id,
        })),
        isOwner: false,
        total: userRentals.length,
      });
    }
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

// ============================================================================
// EVENT CREATION FILTERING ENDPOINTS
// ============================================================================

// Get courts available for event creation at a facility
// Returns all active courts filtered by sport type only — availability is checked on-demand
router.get('/:facilityId/courts-for-event', async (req, res) => {
  try {
    const { facilityId } = req.params as { facilityId: string };
    const { userId, sportType } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: { id: true, ownerId: true },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const isOwner = facility.ownerId === (userId as string);

    const courtWhere: any = { facilityId, isActive: true };
    if (sportType) {
      courtWhere.sportType = sportType as string;
    }

    const courts = await prisma.facilityCourt.findMany({
      where: courtWhere,
      select: { id: true, name: true, sportType: true, capacity: true },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      data: courts.map(c => ({ ...c, availableSlotCount: 0 })),
      isOwner,
    });
  } catch (error) {
    console.error('Get courts for event error:', error);
    res.status(500).json({ error: 'Failed to fetch courts for event' });
  }
});

// Get available dates for a court for event creation
// Returns dates filtered by ownership (all future dates with available slots) or rentals (only user's rental dates)
router.get('/:facilityId/courts/:courtId/dates', async (req, res) => {
  try {
    const { facilityId, courtId } = req.params as {
      facilityId: string;
      courtId: string;
    };
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Check if facility exists and determine ownership
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: { id: true, ownerId: true },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const isOwner = facility.ownerId === (userId as string);

    // Normalize today's date to midnight UTC for comparison
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (isOwner) {
      // Owner: return all future dates with available slots on this court
      const slots = await prisma.facilityTimeSlot.findMany({
        where: {
          courtId,
          status: 'available',
          date: { gte: today },
          court: { facilityId },
        },
        select: { date: true },
      });

      // Group by date and count
      const dateMap = new Map<string, number>();
      for (const slot of slots) {
        const dateStr = slot.date.toISOString().split('T')[0];
        dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
      }

      const dates = Array.from(dateMap.entries())
        .map(([date, slotCount]) => ({ date, slotCount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json({ data: dates, isOwner: true });
    } else {
      // Non-owner: return only dates where user has a confirmed rental on this court
      const rentals = await prisma.facilityRental.findMany({
        where: {
          userId: userId as string,
          status: 'confirmed',
          usedForEventId: null,
          timeSlot: {
            courtId,
            date: { gte: today },
            court: { facilityId },
          },
        },
        include: {
          timeSlot: {
            select: { date: true },
          },
        },
      });

      // Group by date and count
      const dateMap = new Map<string, number>();
      for (const rental of rentals) {
        const dateStr = rental.timeSlot.date.toISOString().split('T')[0];
        dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
      }

      const dates = Array.from(dateMap.entries())
        .map(([date, slotCount]) => ({ date, slotCount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json({ data: dates, isOwner: false });
    }
  } catch (error) {
    console.error('Get dates for court error:', error);
    res.status(500).json({ error: 'Failed to fetch dates for court' });
  }
});

// Get available time slots for a court on a specific date for event creation
// Returns slots filtered by ownership (all available slots) or rentals (only user's rental slots)
router.get('/:facilityId/courts/:courtId/slots', async (req, res) => {
  try {
    const { facilityId, courtId } = req.params as {
      facilityId: string;
      courtId: string;
    };
    const { userId, date } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    if (!date) {
      return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
    }

    // Check if facility exists and determine ownership
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: { id: true, ownerId: true },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const isOwner = facility.ownerId === (userId as string);

    // Parse the date string to a Date object (midnight UTC)
    const slotDate = new Date(date as string);
    slotDate.setUTCHours(0, 0, 0, 0);

    // End of day for range query
    const slotDateEnd = new Date(slotDate);
    slotDateEnd.setUTCHours(23, 59, 59, 999);

    if (isOwner) {
      // Owner: return all available time slots on this court for this date
      const slots = await prisma.facilityTimeSlot.findMany({
        where: {
          courtId,
          status: 'available',
          date: { gte: slotDate, lte: slotDateEnd },
          court: { facilityId },
        },
        orderBy: { startTime: 'asc' },
      });

      res.json({
        data: slots.map(slot => ({
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          price: slot.price,
          isFromRental: false,
          rentalId: null,
        })),
        isOwner: true,
      });
    } else {
      // Non-owner: return only time slots where user has a confirmed rental
      const rentals = await prisma.facilityRental.findMany({
        where: {
          userId: userId as string,
          status: 'confirmed',
          usedForEventId: null,
          timeSlot: {
            courtId,
            date: { gte: slotDate, lte: slotDateEnd },
            court: { facilityId },
          },
        },
        include: {
          timeSlot: true,
        },
        orderBy: {
          timeSlot: { startTime: 'asc' },
        },
      });

      res.json({
        data: rentals.map(rental => ({
          id: rental.timeSlot.id,
          startTime: rental.timeSlot.startTime,
          endTime: rental.timeSlot.endTime,
          price: rental.timeSlot.price,
          isFromRental: true,
          rentalId: rental.id,
        })),
        isOwner: false,
      });
    }
  } catch (error) {
    console.error('Get slots for court error:', error);
    res.status(500).json({ error: 'Failed to fetch slots for court' });
  }
});

// Check for duplicate facilities at address
router.post('/check-duplicates', async (req, res) => {
  try {
    const result = await FacilityCrudService.checkDuplicates(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Check duplicates error:', error);
    sendServiceError(res, error);
  }
});

// Create facility
router.post('/', requireNonDependent, async (req, res) => {
  try {
    const authenticatedUserId =
      (req as any).user?.userId ||
      (req.headers['x-user-id'] as string | undefined);
    const facility = await FacilityCrudService.createFacility(
      req.body,
      authenticatedUserId
    );
    res.status(201).json(facility);
  } catch (error: any) {
    console.error('Create facility error:', error);
    sendServiceError(res, error);
  }
});

// Update facility
router.put('/:id', requireNonDependent, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const userId =
      (req as any).user?.userId || (req.headers['x-user-id'] as string);
    const result = await FacilityCrudService.updateFacility(
      id,
      req.body,
      userId
    );
    res.json(result);
  } catch (error: any) {
    console.error('Update facility error:', error);
    sendServiceError(res, error);
  }
});

// Delete facility
router.delete('/:id', requireNonDependent, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const userId =
      (req as any).user?.userId || (req.headers['x-user-id'] as string);
    await FacilityCrudService.deleteFacility(id, userId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Delete facility error:', error?.message || error);
    sendServiceError(res, error);
  }
});

export default router;

// ============================================================================
// VERIFICATION ROUTES
// ============================================================================

// Submit verification request
router.post('/:id/verification', requireNonDependent, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { documents } = req.body;

    if (!documents || documents.length === 0) {
      return res
        .status(400)
        .json({ error: 'At least one document is required' });
    }

    if (documents.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 documents allowed' });
    }

    const verification = await verificationService.submitVerification(
      id,
      documents
    );
    res.status(201).json(verification);
  } catch (error: any) {
    console.error('Submit verification error:', error);
    res
      .status(500)
      .json({ error: error.message || 'Failed to submit verification' });
  }
});

// Get verification status
router.get('/:id/verification', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const verification = await verificationService.getVerification(id);

    if (!verification) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    res.json(verification);
  } catch (error) {
    console.error('Get verification error:', error);
    res.status(500).json({ error: 'Failed to fetch verification' });
  }
});

// ============================================================================
// RATE SCHEDULE ROUTES
// ============================================================================

// Create rate schedule
router.post('/:id/rates', requireNonDependent, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const rateData = req.body;

    // Validate rate
    if (rateData.hourlyRate < 1 || rateData.hourlyRate > 500) {
      return res
        .status(400)
        .json({ error: 'Hourly rate must be between $1 and $500' });
    }

    const rate = await prisma.facilityRateSchedule.create({
      data: {
        facilityId: id,
        ...rateData,
      },
    });

    res.status(201).json(rate);
  } catch (error) {
    console.error('Create rate error:', error);
    res.status(500).json({ error: 'Failed to create rate schedule' });
  }
});

// List rate schedules
router.get('/:id/rates', async (req, res) => {
  try {
    const { id } = req.params as { id: string };

    const rates = await prisma.facilityRateSchedule.findMany({
      where: { facilityId: id },
      orderBy: { priority: 'desc' },
    });

    res.json(rates);
  } catch (error) {
    console.error('Get rates error:', error);
    res.status(500).json({ error: 'Failed to fetch rate schedules' });
  }
});

// Update rate schedule
router.put('/:id/rates/:rateId', async (req, res) => {
  try {
    const { rateId } = req.params as { rateId: string };
    const rateData = req.body;

    const rate = await prisma.facilityRateSchedule.update({
      where: { id: rateId },
      data: rateData,
    });

    res.json(rate);
  } catch (error) {
    console.error('Update rate error:', error);
    res.status(500).json({ error: 'Failed to update rate schedule' });
  }
});

// Delete rate schedule
router.delete('/:id/rates/:rateId', async (req, res) => {
  try {
    const { rateId } = req.params as { rateId: string };

    await prisma.facilityRateSchedule.delete({
      where: { id: rateId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete rate error:', error);
    res.status(500).json({ error: 'Failed to delete rate schedule' });
  }
});

// Calculate price for booking
router.post('/:id/calculate-price', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return res
        .status(400)
        .json({ error: 'startTime and endTime are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ error: 'endTime must be after startTime' });
    }

    const breakdown = await rateCalculator.calculatePrice(id, start, end);
    res.json(breakdown);
  } catch (error: any) {
    console.error('Calculate price error:', error);
    res
      .status(500)
      .json({ error: error.message || 'Failed to calculate price' });
  }
});

// ============================================================================
// AVAILABILITY ROUTES
// ============================================================================

// Create availability slot
router.post('/:id/availability', requireNonDependent, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const availabilityData = req.body;

    const slot = await prisma.facilityAvailability.create({
      data: {
        facilityId: id,
        ...availabilityData,
      },
    });

    res.status(201).json(slot);
  } catch (error) {
    console.error('Create availability error:', error);
    res.status(500).json({ error: 'Failed to create availability slot' });
  }
});

// List availability slots
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { startDate, endDate } = req.query;

    const where: any = { facilityId: id };

    if (startDate && endDate) {
      where.OR = [
        { isRecurring: true },
        {
          isRecurring: false,
          specificDate: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
        },
      ];
    }

    const slots = await prisma.facilityAvailability.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.json(slots);
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Update availability slot
router.put('/:id/availability/:slotId', async (req, res) => {
  try {
    const { slotId } = req.params as { slotId: string };
    const availabilityData = req.body;

    const slot = await prisma.facilityAvailability.update({
      where: { id: slotId },
      data: availabilityData,
    });

    res.json(slot);
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Failed to update availability slot' });
  }
});

// Delete availability slot
router.delete('/:id/availability/:slotId', async (req, res) => {
  try {
    const { slotId } = req.params as { slotId: string };

    await prisma.facilityAvailability.delete({
      where: { id: slotId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete availability error:', error);
    res.status(500).json({ error: 'Failed to delete availability slot' });
  }
});

// Check if time slot is available
router.get('/:id/availability/check', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      return res
        .status(400)
        .json({ error: 'startTime and endTime are required' });
    }

    const start = new Date(startTime as string);
    const end = new Date(endTime as string);

    const available = await availabilityService.isAvailable(id, start, end);

    if (!available) {
      const conflicts = await availabilityService.getConflicts(id, start, end);
      return res.json({ available: false, conflicts });
    }

    res.json({ available: true });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// ============================================================================
// FACILITY PHOTO ROUTES
// ============================================================================

// Upload facility photos
router.post(
  '/:id/photos',
  uploadPhoto.array('photos', 20),
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const facility = await prisma.facility.findUnique({
        where: { id },
        select: { id: true, ownerId: true },
      });

      if (!facility) {
        return res.status(404).json({ error: 'Facility not found' });
      }

      if (facility.ownerId !== userId) {
        return res
          .status(403)
          .json({ error: 'Only the facility owner can upload photos' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No photo files provided' });
      }

      // Validate each file before creating DB records
      for (const file of files) {
        const error = validatePhotoFile(file);
        if (error) {
          // Clean up all uploaded files on validation failure
          for (const f of files) {
            try {
              if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            } catch {}
          }
          return res.status(400).json({ error });
        }
      }

      // Get current max displayOrder for this facility
      const lastPhoto = await prisma.facilityPhoto.findFirst({
        where: { facilityId: id },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      const baseOrder = (lastPhoto?.displayOrder ?? -1) + 1;

      // Create DB records
      const createdPhotos = await Promise.all(
        files.map((file, index) => {
          const imageUrl = generateImageUrl(file.path);
          return prisma.facilityPhoto.create({
            data: {
              facilityId: id,
              imageUrl,
              displayOrder: baseOrder + index,
            },
            select: { id: true, imageUrl: true },
          });
        })
      );

      res.status(201).json(createdPhotos);
    } catch (error: any) {
      console.error('Upload facility photos error:', error);
      // Clean up any uploaded files on error
      const files = req.files as Express.Multer.File[] | undefined;
      if (files) {
        for (const f of files) {
          try {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
          } catch {}
        }
      }
      res
        .status(500)
        .json({ error: error.message || 'Failed to upload photos' });
    }
  }
);

// Delete a facility photo
router.delete('/:id/photos/:photoId', async (req, res) => {
  try {
    const { id, photoId } = req.params as { id: string; photoId: string };
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const facility = await prisma.facility.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    if (facility.ownerId !== userId) {
      return res
        .status(403)
        .json({ error: 'Only the facility owner can delete photos' });
    }

    const photo = await prisma.facilityPhoto.findFirst({
      where: { id: photoId, facilityId: id },
    });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete file from disk
    try {
      const photoPath = path.join(
        __dirname,
        '../../uploads',
        photo.imageUrl.replace('/uploads/', '')
      );
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    } catch (err) {
      console.error('Error deleting photo file:', err);
    }

    // Delete DB record
    await prisma.facilityPhoto.delete({ where: { id: photoId } });

    res.status(200).json({ message: 'Photo deleted successfully' });
  } catch (error: any) {
    console.error('Delete facility photo error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete photo' });
  }
});

// ============================================================================
// FACILITY MAP ROUTES
// ============================================================================

// Upload facility map image
router.post(
  '/:id/map',
  uploadMap.single('image'),
  requireNonDependent,
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const file = req.file;

      // Validate file
      const validation = validateImageFile(file as Express.Multer.File);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      if (!file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Check if facility exists
      const facility = await prisma.facility.findUnique({
        where: { id },
        select: {
          id: true,
          facilityMapUrl: true,
          facilityMapThumbnailUrl: true,
        },
      });

      if (!facility) {
        // Clean up uploaded file
        if (file.path) {
          const fs = require('fs');
          fs.unlinkSync(file.path);
        }
        return res.status(404).json({ error: 'Facility not found' });
      }

      // Process and optimize image
      const { optimizedPath, thumbnailPath } = await processMapImage(
        file.path,
        {
          maxWidth: 4000,
          maxHeight: 4000,
          quality: 85,
        }
      );

      // Generate URLs
      const facilityMapUrl = generateImageUrl(optimizedPath);
      const facilityMapThumbnailUrl = generateImageUrl(thumbnailPath);

      // Delete old images if they exist
      if (facility.facilityMapUrl) {
        try {
          await deleteImageFiles(
            facility.facilityMapUrl,
            facility.facilityMapThumbnailUrl || undefined
          );
        } catch (error) {
          console.error('Error deleting old map images:', error);
          // Continue even if deletion fails
        }
      }

      // Update facility with new map URLs
      const updatedFacility = await prisma.facility.update({
        where: { id },
        data: {
          facilityMapUrl,
          facilityMapThumbnailUrl,
        },
        select: {
          id: true,
          facilityMapUrl: true,
          facilityMapThumbnailUrl: true,
        },
      });

      res.status(200).json({
        facilityMapUrl: updatedFacility.facilityMapUrl,
        facilityMapThumbnailUrl: updatedFacility.facilityMapThumbnailUrl,
        message: 'Facility map uploaded successfully',
      });
    } catch (error: any) {
      console.error('Upload facility map error:', error);

      // Clean up uploaded file on error
      if (req.file?.path) {
        try {
          const fs = require('fs');
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }

      res.status(500).json({
        error: error.message || 'Failed to upload facility map',
      });
    }
  }
);

// Delete facility map image
router.delete('/:id/map', async (req, res) => {
  try {
    const { id } = req.params as { id: string };

    // Check if facility exists
    const facility = await prisma.facility.findUnique({
      where: { id },
      select: {
        id: true,
        facilityMapUrl: true,
        facilityMapThumbnailUrl: true,
      },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    if (!facility.facilityMapUrl) {
      return res.status(404).json({ error: 'No facility map to delete' });
    }

    // Delete image files
    await deleteImageFiles(
      facility.facilityMapUrl,
      facility.facilityMapThumbnailUrl || undefined
    );

    // Update facility to remove map URLs
    await prisma.facility.update({
      where: { id },
      data: {
        facilityMapUrl: null,
        facilityMapThumbnailUrl: null,
      },
    });

    res.status(200).json({ message: 'Facility map deleted successfully' });
  } catch (error: any) {
    console.error('Delete facility map error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete facility map',
    });
  }
});

// ============================================================================
// COVER IMAGE ROUTES
// ============================================================================

// Upload facility cover image
router.post(
  '/:id/cover',
  uploadCover.single('image'),
  requireNonDependent,
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const file = req.file;
      const userId =
        (req as any).user?.userId || (req.headers['x-user-id'] as string);

      // Validate file
      const validation = validateImageFile(file as Express.Multer.File);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      if (!file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Check if facility exists
      const facility = await prisma.facility.findUnique({
        where: { id },
        select: {
          id: true,
          ownerId: true,
          coverImageUrl: true,
          coverImageThumbnailUrl: true,
        },
      });

      if (!facility) {
        // Clean up uploaded file
        if (file.path) {
          const fs = require('fs');
          fs.unlinkSync(file.path);
        }
        return res.status(404).json({ error: 'Facility not found' });
      }

      // Authorization: only the facility owner
      if (facility.ownerId !== userId) {
        if (file.path) {
          const fs = require('fs');
          fs.unlinkSync(file.path);
        }
        return res
          .status(403)
          .json({ error: 'Only the facility owner can upload a cover image' });
      }

      // Process and optimize image
      const { optimizedPath, thumbnailPath } = await processMapImage(
        file.path,
        {
          maxWidth: 1600,
          maxHeight: 600,
          quality: 85,
        }
      );

      // Generate URLs
      const coverImageUrl = generateImageUrl(optimizedPath);
      const coverImageThumbnailUrl = generateImageUrl(thumbnailPath);

      // Delete old images if they exist
      if (facility.coverImageUrl) {
        try {
          await deleteImageFiles(
            facility.coverImageUrl,
            facility.coverImageThumbnailUrl || undefined
          );
        } catch (error) {
          console.error('Error deleting old cover images:', error);
          // Continue even if deletion fails
        }
      }

      // Update facility with new cover URLs
      const updatedFacility = await prisma.facility.update({
        where: { id },
        data: {
          coverImageUrl,
          coverImageThumbnailUrl,
        },
        select: {
          id: true,
          coverImageUrl: true,
          coverImageThumbnailUrl: true,
        },
      });

      res.status(200).json({
        coverImageUrl: updatedFacility.coverImageUrl,
        coverImageThumbnailUrl: updatedFacility.coverImageThumbnailUrl,
      });
    } catch (error: any) {
      console.error('Upload facility cover image error:', error);

      // Clean up uploaded file on error
      if (req.file?.path) {
        try {
          const fs = require('fs');
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }

      res.status(500).json({
        error: error.message || 'Failed to upload cover image',
      });
    }
  }
);

// Delete facility cover image
router.delete('/:id/cover', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const userId =
      (req as any).user?.userId || (req.headers['x-user-id'] as string);

    // Check if facility exists
    const facility = await prisma.facility.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        coverImageUrl: true,
        coverImageThumbnailUrl: true,
      },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    // Authorization: only the facility owner
    if (facility.ownerId !== userId) {
      return res
        .status(403)
        .json({ error: 'Only the facility owner can delete the cover image' });
    }

    if (!facility.coverImageUrl) {
      return res.status(404).json({ error: 'No cover image to delete' });
    }

    // Delete image files
    await deleteImageFiles(
      facility.coverImageUrl,
      facility.coverImageThumbnailUrl || undefined
    );

    // Update facility to remove cover URLs
    await prisma.facility.update({
      where: { id },
      data: {
        coverImageUrl: null,
        coverImageThumbnailUrl: null,
      },
    });

    res.status(200).json({ message: 'Cover image deleted' });
  } catch (error: any) {
    console.error('Delete facility cover image error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete cover image',
    });
  }
});

// ============================================================================
// CANCELLATION POLICY ROUTES
// ============================================================================

const VALID_PENALTY_DESTINATIONS = ['facility', 'opposing_team', 'split'];

// Get cancellation policy for a facility
router.get('/:id/cancellation-policy', async (req, res) => {
  try {
    const { id } = req.params as { id: string };

    const facility = await prisma.facility.findUnique({
      where: { id },
      select: {
        id: true,
        noticeWindowHours: true,
        teamPenaltyPct: true,
        penaltyDestination: true,
        policyVersion: true,
      },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const hasPolicy =
      facility.noticeWindowHours !== null &&
      facility.teamPenaltyPct !== null &&
      facility.penaltyDestination !== null;

    res.json({
      hasPolicy,
      noticeWindowHours: facility.noticeWindowHours,
      teamPenaltyPct: facility.teamPenaltyPct,
      penaltyDestination: facility.penaltyDestination,
      policyVersion: facility.policyVersion,
    });
  } catch (error) {
    console.error('Get cancellation policy error:', error);
    res.status(500).json({ error: 'Failed to fetch cancellation policy' });
  }
});

// Update cancellation policy for a facility
router.put(
  '/:id/cancellation-policy',
  requireNonDependent,
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const { noticeWindowHours, teamPenaltyPct, penaltyDestination } =
        req.body;

      // Validate all fields present
      if (noticeWindowHours === undefined || noticeWindowHours === null) {
        return res.status(400).json({ error: 'noticeWindowHours is required' });
      }
      if (teamPenaltyPct === undefined || teamPenaltyPct === null) {
        return res.status(400).json({ error: 'teamPenaltyPct is required' });
      }
      if (!penaltyDestination) {
        return res
          .status(400)
          .json({ error: 'penaltyDestination is required' });
      }

      // Validate types and ranges
      if (!Number.isInteger(noticeWindowHours) || noticeWindowHours < 0) {
        return res
          .status(400)
          .json({ error: 'noticeWindowHours must be a non-negative integer' });
      }
      if (
        !Number.isInteger(teamPenaltyPct) ||
        teamPenaltyPct < 0 ||
        teamPenaltyPct > 100
      ) {
        return res.status(400).json({
          error: 'teamPenaltyPct must be an integer between 0 and 100',
        });
      }
      if (!VALID_PENALTY_DESTINATIONS.includes(penaltyDestination)) {
        return res.status(400).json({
          error: `penaltyDestination must be one of: ${VALID_PENALTY_DESTINATIONS.join(', ')}`,
        });
      }

      // Check facility exists
      const facility = await prisma.facility.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!facility) {
        return res.status(404).json({ error: 'Facility not found' });
      }

      const policyVersion = new Date().toISOString();

      const updated = await prisma.facility.update({
        where: { id },
        data: {
          noticeWindowHours,
          teamPenaltyPct,
          penaltyDestination,
          policyVersion,
        },
        select: {
          id: true,
          noticeWindowHours: true,
          teamPenaltyPct: true,
          penaltyDestination: true,
          policyVersion: true,
        },
      });

      res.json({
        ...updated,
        hasPolicy: true,
      });
    } catch (error) {
      console.error('Update cancellation policy error:', error);
      res.status(500).json({ error: 'Failed to update cancellation policy' });
    }
  }
);
