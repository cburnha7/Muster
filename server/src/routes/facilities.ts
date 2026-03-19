import { Router } from 'express';
import { prisma } from '../index';
import { rateCalculator } from '../services/RateCalculator';
import { availabilityService } from '../services/AvailabilityService';
import { verificationService } from '../services/VerificationService';
import { TimeSlotGeneratorService } from '../services/TimeSlotGeneratorService';
import { 
  uploadMap, 
  validateImageFile, 
  generateImageUrl, 
  processMapImage,
  deleteImageFiles 
} from '../services/ImageUploadService';
import { isValidPolicyHours } from '../services/cancellation-window';

const router = Router();
const timeSlotGenerator = new TimeSlotGeneratorService();

// Get all facilities
router.get('/', async (req, res) => {
  try {
    const { sportType, ownerId, page = '1', limit = '10' } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { isActive: true };
    if (sportType) {
      where.sportTypes = { has: sportType };
    }
    if (ownerId) {
      where.ownerId = ownerId as string;
    }

    const [facilities, total] = await Promise.all([
      prisma.facility.findMany({
        where,
        skip,
        take,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          courts: {
            orderBy: {
              displayOrder: 'asc',
            },
          },
        },
      }),
      prisma.facility.count({ where }),
    ]);

    res.json({
      data: facilities,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get facilities error:', error);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
});

// Get facility by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const facility = await prisma.facility.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        verification: {
          include: {
            documents: true,
          },
        },
        rateSchedules: {
          where: { isActive: true },
          orderBy: { priority: 'desc' },
        },
        availabilitySlots: true,
        accessImages: {
          orderBy: { displayOrder: 'asc' },
        },
        courts: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            availability: {
              orderBy: [
                { dayOfWeek: 'asc' },
                { startTime: 'asc' },
              ],
            },
          },
        },
      },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    res.json(facility);
  } catch (error) {
    console.error('Get facility error:', error);
    res.status(500).json({ error: 'Failed to fetch facility' });
  }
});

// Get events at a facility
router.get('/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Check if facility exists
    const facility = await prisma.facility.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: { facilityId: id },
        skip,
        take,
        include: {
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          facility: {
            select: {
              id: true,
              name: true,
              street: true,
              city: true,
              state: true,
            },
          },
          rental: {
            include: {
              timeSlot: {
                include: {
                  court: {
                    select: {
                      id: true,
                      name: true,
                      sportType: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.event.count({ where: { facilityId: id } }),
    ]);

    res.json({
      data: events,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get facility events error:', error);
    res.status(500).json({ error: 'Failed to fetch facility events' });
  }
});

// Get authorized facilities for event creation
// Returns facilities where user is owner OR has confirmed rentals
router.get('/authorized/for-events', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get facilities owned by user
    const ownedFacilities = await prisma.facility.findMany({
      where: {
        ownerId: userId as string,
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      // Cancellation policy fields (noticeWindowHours, teamPenaltyPct, penaltyDestination)
      // are included by default since we use include (not select)
    });

    // Normalize today's date to midnight UTC for comparison
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get facilities where user has confirmed rentals
    const rentalsWithFacilities = await prisma.facilityRental.findMany({
      where: {
        userId: userId as string,
        status: 'confirmed',
        usedForEventId: null, // Only unused rentals
        timeSlot: {
          date: { gte: today }, // Only future rentals
        },
      },
      include: {
        timeSlot: {
          include: {
            court: {
              include: {
                facility: {
                  include: {
                    owner: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Extract unique facilities from rentals
    const rentalFacilityIds = new Set<string>();
    const rentalFacilitiesMap = new Map();
    
    rentalsWithFacilities.forEach(rental => {
      const facility = rental.timeSlot.court.facility;
      if (!rentalFacilityIds.has(facility.id)) {
        rentalFacilityIds.add(facility.id);
        rentalFacilitiesMap.set(facility.id, facility);
      }
    });

    // Combine owned and rental facilities (avoid duplicates)
    const ownedFacilityIds = new Set(ownedFacilities.map(f => f.id));
    const allFacilities = [
      ...ownedFacilities.map(f => ({ ...f, isOwned: true, hasRentals: false })),
      ...Array.from(rentalFacilitiesMap.values())
        .filter(f => !ownedFacilityIds.has(f.id))
        .map(f => ({ ...f, isOwned: false, hasRentals: true })),
    ];

    // Mark facilities that are both owned and have rentals,
    // and flag whether they have a cancellation policy set (required for booking flows)
    const facilitiesWithBoth = allFacilities.map(f => {
      const hasCancellationPolicy =
        f.noticeWindowHours !== null &&
        f.teamPenaltyPct !== null &&
        f.penaltyDestination !== null;

      const base = { ...f, hasCancellationPolicy };

      if (f.isOwned && rentalFacilityIds.has(f.id)) {
        return { ...base, hasRentals: true };
      }
      return base;
    });

    res.json({
      data: facilitiesWithBoth,
      total: facilitiesWithBoth.length,
    });
  } catch (error) {
    console.error('Get authorized facilities error:', error);
    res.status(500).json({ error: 'Failed to fetch authorized facilities' });
  }
});

// Get available time slots for event creation at a facility
// Returns slots based on ownership (all available) or rentals (only user's rentals)
router.get('/:id/available-slots', async (req, res) => {
  try {
    const { id } = req.params;
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
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' },
        ],
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

// Check for duplicate facilities at address
router.post('/check-duplicates', async (req, res) => {
  try {
    const { street, city, state, zipCode } = req.body;

    if (!street || !city || !state || !zipCode) {
      return res.status(400).json({ error: 'Address fields required' });
    }

    const existingFacilities = await prisma.facility.findMany({
      where: {
        street: { equals: street, mode: 'insensitive' },
        city: { equals: city, mode: 'insensitive' },
        state: { equals: state, mode: 'insensitive' },
        zipCode,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        sportTypes: true,
        street: true,
        city: true,
        state: true,
        zipCode: true,
        imageUrl: true,
      },
    });

    res.json({ duplicates: existingFacilities });
  } catch (error) {
    console.error('Check duplicates error:', error);
    res.status(500).json({ error: 'Failed to check for duplicates' });
  }
});

// Create facility
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      sportTypes,
      amenities = [],
      imageUrl,
      rating = 0,
      pricePerHour = 0,
      isVerified = false,
      verificationStatus = 'pending',
      accessInstructions,
      parkingInfo,
      minimumBookingHours = 1,
      bufferTimeMins = 0,
      contactName,
      contactPhone,
      contactEmail,
      contactWebsite,
      street,
      city,
      state,
      zipCode,
      latitude = 0,
      longitude = 0,
      ownerId,
      hoursOfOperation = [],
      cancellationPolicyHours,
      requiresInsurance = false,
    } = req.body;

    // Validate required fields
    if (!name || !sportTypes || !street || !city || !state || !zipCode) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, sportTypes, street, city, state, zipCode' 
      });
    }

    // Validate cancellation policy hours if provided
    if (cancellationPolicyHours !== undefined && !isValidPolicyHours(cancellationPolicyHours)) {
      return res.status(400).json({
        error: 'Invalid cancellation policy value. Allowed values: none, 0, 12, 24, 48, or 72 hours.',
      });
    }

    // Get ownerId from request or use first user as default (for testing)
    let facilityOwnerId = ownerId;
    if (!facilityOwnerId) {
      // For testing: use the first user in the database
      const firstUser = await prisma.user.findFirst();
      if (!firstUser) {
        return res.status(400).json({ error: 'No users found. Please create a user first.' });
      }
      facilityOwnerId = firstUser.id;
    }

    // Plan gate: facility creation requires facility_basic; 4th+ requires facility_pro
    const { userBypassesPlanGate } = require('../middleware/subscription');
    const bypassed = await userBypassesPlanGate(facilityOwnerId, 'facility_basic');
    if (!bypassed) {
      const PLAN_HIERARCHY = ['free', 'roster', 'league', 'facility_basic', 'facility_pro'];
      const existingFacilityCount = await prisma.facility.count({ where: { ownerId: facilityOwnerId } });
      const sub = await prisma.subscription.findUnique({ where: { userId: facilityOwnerId }, select: { plan: true, status: true } });
      const userPlan = sub?.plan || 'free';
      const isActive = !sub || sub.status === 'active' || sub.status === 'trialing';
      const userPlanIndex = PLAN_HIERARCHY.indexOf(userPlan);

      if (existingFacilityCount >= 3 && (!isActive || userPlanIndex < PLAN_HIERARCHY.indexOf('facility_pro'))) {
        return res.status(403).json({ error: 'Plan upgrade required', requiredPlan: 'facility_pro', currentPlan: userPlan });
      } else if (!isActive || userPlanIndex < PLAN_HIERARCHY.indexOf('facility_basic')) {
        return res.status(403).json({ error: 'Plan upgrade required', requiredPlan: 'facility_basic', currentPlan: userPlan });
      }
    }

    const facility = await prisma.facility.create({
      data: {
        name,
        description,
        sportTypes,
        amenities,
        imageUrl,
        rating,
        pricePerHour,
        isVerified,
        verificationStatus,
        accessInstructions,
        parkingInfo,
        minimumBookingHours,
        bufferTimeMins,
        contactName,
        contactPhone,
        contactEmail,
        contactWebsite,
        street,
        city,
        state,
        zipCode,
        latitude,
        longitude,
        ownerId: facilityOwnerId,
        requiresInsurance: requiresInsurance === true,
        ...(cancellationPolicyHours !== undefined && { cancellationPolicyHours }),
      },
    });

    // Create hours of operation if provided
    if (hoursOfOperation && hoursOfOperation.length > 0) {
      const availabilityData = hoursOfOperation.map((hours: any) => ({
        facilityId: facility.id,
        dayOfWeek: hours.dayOfWeek,
        startTime: hours.startTime,
        endTime: hours.endTime,
        isRecurring: true,
        isBlocked: hours.isClosed || false,
        blockReason: hours.isClosed ? 'Closed' : null,
      }));

      await prisma.facilityAvailability.createMany({
        data: availabilityData,
      });
    }

    console.log(`Created facility ${facility.id} with ${hoursOfOperation.length} hours of operation`);

    res.status(201).json(facility);
  } catch (error) {
    console.error('Create facility error:', error);
    res.status(500).json({ error: 'Failed to create facility' });
  }
});

// Update facility
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hoursOfOperation, slotIncrementMinutes, requiresInsurance, ...updateData } = req.body;

    // TODO: Add authorization check - only owner can update

    // Coerce requiresInsurance to boolean if provided
    if (requiresInsurance !== undefined) {
      updateData.requiresInsurance = requiresInsurance === true;
    }

    // Validate cancellation policy hours if provided
    if (updateData.cancellationPolicyHours !== undefined && !isValidPolicyHours(updateData.cancellationPolicyHours)) {
      return res.status(400).json({
        error: 'Invalid cancellation policy value. Allowed values: none, 0, 12, 24, 48, or 72 hours.',
      });
    }

    // Check if slot increment is changing
    let incrementChanged = false;
    let oldIncrement: number | undefined;
    
    if (slotIncrementMinutes !== undefined) {
      // Validate slot increment (must be 30 or 60)
      if (slotIncrementMinutes !== 30 && slotIncrementMinutes !== 60) {
        return res.status(400).json({ 
          error: 'Invalid slot increment. Must be 30 or 60 minutes.' 
        });
      }
      
      // Get current increment value
      const currentFacility = await prisma.facility.findUnique({
        where: { id },
        select: { slotIncrementMinutes: true },
      });
      
      if (currentFacility && currentFacility.slotIncrementMinutes !== slotIncrementMinutes) {
        incrementChanged = true;
        oldIncrement = currentFacility.slotIncrementMinutes;
      }
    }

    // Update facility
    const facility = await prisma.facility.update({
      where: { id },
      data: {
        ...updateData,
        ...(slotIncrementMinutes !== undefined && { slotIncrementMinutes }),
      },
    });

    // Update hours of operation if provided
    if (hoursOfOperation && hoursOfOperation.length > 0) {
      // Delete existing hours
      await prisma.facilityAvailability.deleteMany({
        where: { 
          facilityId: id,
          isRecurring: true,
          specificDate: null,
        },
      });

      // Create new hours
      const availabilityData = hoursOfOperation.map((hours: any) => ({
        facilityId: id,
        dayOfWeek: hours.dayOfWeek,
        startTime: hours.startTime,
        endTime: hours.endTime,
        isRecurring: true,
        isBlocked: hours.isClosed || false,
        blockReason: hours.isClosed ? 'Closed' : null,
      }));

      await prisma.facilityAvailability.createMany({
        data: availabilityData,
      });
    }

    // Regenerate time slots if increment changed
    if (incrementChanged) {
      console.log(`🔄 Slot increment changed from ${oldIncrement} to ${slotIncrementMinutes} minutes for facility ${id}`);
      
      try {
        const regenerateResult = await timeSlotGenerator.regenerateSlotsAfterIncrementChange(
          id,
          slotIncrementMinutes
        );
        
        console.log('✅ Slot regeneration complete:', regenerateResult);
        
        res.json({
          ...facility,
          slotRegenerationResult: {
            success: true,
            ...regenerateResult,
          },
        });
      } catch (regenerateError: any) {
        console.error('❌ Slot regeneration failed:', regenerateError);
        
        // Return facility update success but note regeneration failure
        res.json({
          ...facility,
          slotRegenerationResult: {
            success: false,
            error: regenerateError.message,
            message: 'Facility updated but slot regeneration failed. Please regenerate slots manually.',
          },
        });
      }
    } else {
      res.json(facility);
    }
  } catch (error) {
    console.error('Update facility error:', error);
    res.status(500).json({ error: 'Failed to update facility' });
  }
});

// Delete facility
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Add authorization check - only owner can delete

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

    // Check for future rentals
    const futureRentalsList = await prisma.facilityRental.findMany({
      where: {
        timeSlot: {
          court: {
            facilityId: id,
          },
          date: { gte: new Date() },
        },
        status: 'confirmed',
      },
      select: {
        id: true,
        timeSlot: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
            court: { select: { name: true } },
          },
        },
        user: { select: { username: true } },
      },
      orderBy: { timeSlot: { date: 'asc' } },
      take: 20,
    });

    if (futureRentalsList.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete ground with future rentals. Cancel all rentals first.',
        rentals: futureRentalsList.map((r: any) => ({
          id: r.id,
          court: r.timeSlot?.court?.name || 'Unknown court',
          date: r.timeSlot?.date,
          startTime: r.timeSlot?.startTime,
          endTime: r.timeSlot?.endTime,
          user: r.user?.username || 'Unknown',
        })),
      });
    }

    // Check for future events
    const futureEventsList = await prisma.event.findMany({
      where: {
        facilityId: id,
        startTime: { gte: new Date() },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: 'asc' },
      take: 20,
    });

    if (futureEventsList.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete ground with future events. Cancel all events first.',
        events: futureEventsList.map((e: any) => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
        })),
      });
    }

    // Delete facility map images if they exist
    if (facility.facilityMapUrl) {
      try {
        await deleteImageFiles(
          facility.facilityMapUrl,
          facility.facilityMapThumbnailUrl || undefined
        );
      } catch (error) {
        console.error('Error deleting map images:', error);
        // Continue with deletion even if image cleanup fails
      }
    }

    // Clean up references that don't cascade before deleting
    await prisma.$transaction(async (tx) => {
      // Nullify facility references on events
      await tx.event.updateMany({
        where: { facilityId: id },
        data: { facilityId: null },
      });

      // Nullify facility references on bookings
      await tx.booking.updateMany({
        where: { facilityId: id },
        data: { facilityId: null },
      });

      // Delete reviews for this facility
      await tx.review.deleteMany({
        where: { facilityId: id },
      });

      // Delete facility ratings
      await tx.facilityRating.deleteMany({
        where: { facilityId: id },
      });

      // Delete facility (cascade handles courts, time slots, rentals, etc.)
      await tx.facility.delete({
        where: { id },
      });
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete facility error:', error?.message || error);
    console.error('Delete facility error code:', error?.code);
    res.status(500).json({ error: 'Failed to delete facility' });
  }
});

export default router;

// ============================================================================
// VERIFICATION ROUTES
// ============================================================================

// Submit verification request
router.post('/:id/verification', async (req, res) => {
  try {
    const { id } = req.params;
    const { documents } = req.body;

    if (!documents || documents.length === 0) {
      return res.status(400).json({ error: 'At least one document is required' });
    }

    if (documents.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 documents allowed' });
    }

    const verification = await verificationService.submitVerification(id, documents);
    res.status(201).json(verification);
  } catch (error: any) {
    console.error('Submit verification error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit verification' });
  }
});

// Get verification status
router.get('/:id/verification', async (req, res) => {
  try {
    const { id } = req.params;
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
router.post('/:id/rates', async (req, res) => {
  try {
    const { id } = req.params;
    const rateData = req.body;

    // Validate rate
    if (rateData.hourlyRate < 1 || rateData.hourlyRate > 500) {
      return res.status(400).json({ error: 'Hourly rate must be between $1 and $500' });
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
    const { id } = req.params;

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
    const { rateId } = req.params;
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
    const { rateId } = req.params;

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
    const { id } = req.params;
    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime are required' });
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
    res.status(500).json({ error: error.message || 'Failed to calculate price' });
  }
});

// ============================================================================
// AVAILABILITY ROUTES
// ============================================================================

// Create availability slot
router.post('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
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
    const { id } = req.params;
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
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
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
    const { slotId } = req.params;
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
    const { slotId } = req.params;

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
    const { id } = req.params;
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime are required' });
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
// FACILITY MAP ROUTES
// ============================================================================

// Upload facility map image
router.post('/:id/map', uploadMap.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
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
        facilityMapThumbnailUrl: true 
      }
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
    const { optimizedPath, thumbnailPath } = await processMapImage(file.path, {
      maxWidth: 4000,
      maxHeight: 4000,
      quality: 85
    });

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
        facilityMapThumbnailUrl
      },
      select: {
        id: true,
        facilityMapUrl: true,
        facilityMapThumbnailUrl: true
      }
    });

    res.status(200).json({
      facilityMapUrl: updatedFacility.facilityMapUrl,
      facilityMapThumbnailUrl: updatedFacility.facilityMapThumbnailUrl,
      message: 'Facility map uploaded successfully'
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
      error: error.message || 'Failed to upload facility map' 
    });
  }
});

// Delete facility map image
router.delete('/:id/map', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if facility exists
    const facility = await prisma.facility.findUnique({
      where: { id },
      select: { 
        id: true, 
        facilityMapUrl: true, 
        facilityMapThumbnailUrl: true 
      }
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
        facilityMapThumbnailUrl: null
      }
    });

    res.status(200).json({ message: 'Facility map deleted successfully' });
  } catch (error: any) {
    console.error('Delete facility map error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to delete facility map' 
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
    const { id } = req.params;

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
router.put('/:id/cancellation-policy', async (req, res) => {
  try {
    const { id } = req.params;
    const { noticeWindowHours, teamPenaltyPct, penaltyDestination } = req.body;

    // Validate all fields present
    if (noticeWindowHours === undefined || noticeWindowHours === null) {
      return res.status(400).json({ error: 'noticeWindowHours is required' });
    }
    if (teamPenaltyPct === undefined || teamPenaltyPct === null) {
      return res.status(400).json({ error: 'teamPenaltyPct is required' });
    }
    if (!penaltyDestination) {
      return res.status(400).json({ error: 'penaltyDestination is required' });
    }

    // Validate types and ranges
    if (!Number.isInteger(noticeWindowHours) || noticeWindowHours < 0) {
      return res.status(400).json({ error: 'noticeWindowHours must be a non-negative integer' });
    }
    if (!Number.isInteger(teamPenaltyPct) || teamPenaltyPct < 0 || teamPenaltyPct > 100) {
      return res.status(400).json({ error: 'teamPenaltyPct must be an integer between 0 and 100' });
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
});
