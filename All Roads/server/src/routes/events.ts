import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all events
router.get('/', async (req, res) => {
  try {
    const { sportType, skillLevel, status, organizerId, page = '1', limit = '10' } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {
      // Only show upcoming events (not past events)
      startTime: { gte: new Date() },
    };
    if (sportType) where.sportType = sportType;
    if (skillLevel) where.skillLevel = skillLevel;
    if (status) where.status = status;
    if (organizerId) where.organizerId = organizerId;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take,
        include: {
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          facility: true,
          rental: {
            include: {
              timeSlot: {
                include: {
                  court: true,
                },
              },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.event.count({ where }),
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
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get event by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        facility: true,
        rental: {
          include: {
            timeSlot: {
              include: {
                court: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Get event participants
router.get('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;

    const bookings = await prisma.booking.findMany({
      where: {
        eventId: id,
        status: 'confirmed',
      },
      include: {
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

    const participants = bookings.map(booking => ({
      userId: booking.user.id,
      eventId: id,
      bookingId: booking.id,
      status: booking.status,
      joinedAt: booking.createdAt,
      user: booking.user,
    }));

    res.json(participants);
  } catch (error) {
    console.error('Get event participants error:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// Check if user has submitted salutes for an event
router.get('/:id/salutes/status', async (req, res) => {
  try {
    const { id } = req.params;

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
router.post('/', async (req, res) => {
  try {
    console.log('=== Create Event Request ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // TODO: Get organizer ID from auth token
    // For now, use the first user as default organizer
    const defaultOrganizer = await prisma.user.findFirst({
      select: { id: true },
    });

    if (!defaultOrganizer) {
      return res.status(400).json({ error: 'No users found in database' });
    }

    const eventData = {
      ...req.body,
      organizerId: req.body.organizerId || defaultOrganizer.id,
    };

    const organizerId = eventData.organizerId;
    console.log('Organizer ID:', organizerId);

    // Validate facility authorization
    const facility = await prisma.facility.findUnique({
      where: { id: eventData.facilityId },
      select: { id: true, ownerId: true },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const isOwner = facility.ownerId === organizerId;
    console.log('Is owner:', isOwner);
    console.log('Facility owner ID:', facility.ownerId);

    // If not owner, check if user has a rental at this facility
    if (!isOwner) {
      const hasRental = await prisma.facilityRental.findFirst({
        where: {
          userId: organizerId,
          status: 'confirmed',
          timeSlot: {
            court: {
              facilityId: eventData.facilityId,
            },
          },
        },
      });

      console.log('Has rental:', !!hasRental);
      
      if (!hasRental) {
        console.log('Authorization failed: No rental found');
        return res.status(403).json({ 
          error: 'Unauthorized: You must own this facility or have a rental to create events here' 
        });
      }
    }

    // Handle timeSlotId (direct slot selection for owners) - only if not using rental
    if (eventData.timeSlotId && !eventData.rentalId) {
      const timeSlot = await prisma.facilityTimeSlot.findUnique({
        where: { id: eventData.timeSlotId },
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

      // Verify slot belongs to the selected facility
      if (timeSlot.court.facilityId !== eventData.facilityId) {
        return res.status(400).json({ error: 'Time slot does not belong to selected facility' });
      }

      // Only owners can use timeSlotId directly
      if (!isOwner) {
        return res.status(403).json({ error: 'Only facility owners can directly select time slots' });
      }

      // Verify slot is available
      if (timeSlot.status !== 'available') {
        return res.status(400).json({ error: 'Time slot is not available' });
      }

      // Validate event time matches slot
      // NOTE: Slot times are stored as local times (e.g., "18:00" means 6 PM local)
      // The client sends event times as UTC ISO strings
      // We need to compare them properly accounting for timezone conversion
      
      const slotDate = new Date(timeSlot.date);
      const [startHours, startMinutes] = timeSlot.startTime.split(':').map(Number);
      const [endHours, endMinutes] = timeSlot.endTime.split(':').map(Number);
      
      // The client constructs local datetime then converts to UTC
      // So we need to do the same: create local datetime from slot date + time
      const slotStart = new Date(
        slotDate.getUTCFullYear(),
        slotDate.getUTCMonth(),
        slotDate.getUTCDate(),
        startHours,
        startMinutes,
        0,
        0
      );
      
      const slotEnd = new Date(
        slotDate.getUTCFullYear(),
        slotDate.getUTCMonth(),
        slotDate.getUTCDate(),
        endHours,
        endMinutes,
        0,
        0
      );

      const eventStart = new Date(eventData.startTime);
      const eventEnd = new Date(eventData.endTime);

      console.log('Time validation:');
      console.log('  Slot start (local):', slotStart.toString());
      console.log('  Slot start (UTC):', slotStart.toISOString());
      console.log('  Event start (UTC):', eventStart.toISOString());
      console.log('  Slot end (local):', slotEnd.toString());
      console.log('  Slot end (UTC):', slotEnd.toISOString());
      console.log('  Event end (UTC):', eventEnd.toISOString());
      console.log('  Match:', eventStart.getTime() === slotStart.getTime() && eventEnd.getTime() === slotEnd.getTime());

      // Compare the timestamps (both are now in the same reference frame)
      if (eventStart.getTime() !== slotStart.getTime() || eventEnd.getTime() !== slotEnd.getTime()) {
        return res.status(400).json({ 
          error: 'Event time must match time slot',
          expected: {
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          },
          received: {
            start: eventStart.toISOString(),
            end: eventEnd.toISOString(),
          }
        });
      }
    }

    // Handle rentalId (rental-based event creation)
    if (eventData.rentalId) {
      // If multiple slots selected, validate user has rentals for all of them
      const slotIds = eventData.timeSlotIds || [eventData.timeSlotId];
      
      // Get all rentals for these slots
      const rentals = await prisma.facilityRental.findMany({
        where: {
          userId: organizerId,
          status: 'confirmed',
          timeSlotId: { in: slotIds },
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

      console.log('Found rentals:', rentals.length, 'for', slotIds.length, 'slots');

      // Verify user has rentals for all selected slots
      if (rentals.length !== slotIds.length) {
        return res.status(403).json({ 
          error: `You must have confirmed rentals for all ${slotIds.length} selected time slots` 
        });
      }

      // Verify none of the rentals have been used
      const usedRental = rentals.find(r => r.usedForEventId);
      if (usedRental) {
        return res.status(400).json({ error: 'One or more rentals have already been used for an event' });
      }

      // Use the first rental for facility validation
      const firstRental = rentals[0];
      
      // Set facility and timeSlotId from rental
      eventData.facilityId = firstRental.timeSlot.court.facilityId;
      eventData.timeSlotId = firstRental.timeSlotId;
      
      // Store all rental IDs for later processing
      eventData.rentalIds = rentals.map(r => r.id);
    } else if (!isOwner) {
      // If not using a rental and not owner, reject
      return res.status(403).json({ 
        error: 'You must use a rental to create events at facilities you do not own' 
      });
    }

    // Create event and block slot in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Store rental/slot IDs for later, then remove from eventData
      const rentalIds = eventData.rentalIds;
      const timeSlotIds = eventData.timeSlotIds;
      
      // Clean eventData - remove fields that aren't in the Event model
      const { rentalIds: _, timeSlotIds: __, eligibility, ...cleanEventData } = eventData;
      
      // Transform eligibility object to flat fields if present
      if (eligibility) {
        cleanEventData.eligibilityIsInviteOnly = eligibility.isInviteOnly || false;
        cleanEventData.minimumPlayerCount = eligibility.minimumPlayerCount;
        cleanEventData.eligibilityRestrictedToTeams = eligibility.restrictedToTeams || [];
        cleanEventData.eligibilityRestrictedToLeagues = eligibility.restrictedToLeagues || [];
        cleanEventData.eligibilityMinAge = eligibility.minAge;
        cleanEventData.eligibilityMaxAge = eligibility.maxAge;
        cleanEventData.eligibilityRequiredSkillLevel = eligibility.requiredSkillLevel;
        cleanEventData.eligibilityMinSkillLevel = eligibility.minSkillLevel;
        cleanEventData.eligibilityMaxSkillLevel = eligibility.maxSkillLevel;
      }
      
      // Create the event
      const event = await tx.event.create({
        data: cleanEventData,
        include: {
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          facility: true,
          rental: {
            include: {
              timeSlot: {
                include: {
                  court: true,
                },
              },
            },
          },
          timeSlot: {
            include: {
              court: true,
            },
          },
        },
      });

      // If event was created from rental(s), mark them as used
      if (rentalIds && rentalIds.length > 0) {
        await tx.facilityRental.updateMany({
          where: { id: { in: rentalIds } },
          data: { usedForEventId: event.id },
        });
      } else if (cleanEventData.rentalId) {
        // Fallback for single rental (backward compatibility)
        await tx.facilityRental.update({
          where: { id: cleanEventData.rentalId },
          data: { usedForEventId: event.id },
        });
      }

      // If event is linked to timeSlot(s), block them
      const slotIdsToBlock = timeSlotIds || (cleanEventData.timeSlotId ? [cleanEventData.timeSlotId] : []);
      if (slotIdsToBlock.length > 0) {
        await tx.facilityTimeSlot.updateMany({
          where: { id: { in: slotIdsToBlock } },
          data: {
            status: 'blocked',
            blockReason: `Event: ${event.title} (ID: ${event.id})`,
          },
        });
      }

      return event;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.update({
      where: { id },
      data: req.body,
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        facility: true,
      },
    });

    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Cancel/Delete event
// If event has participants, mark as cancelled with reason
// If event has no participants, delete it entirely
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // Cancellation reason from request body

    console.log('🗑️ Cancel/Delete event request for ID:', id);
    console.log('📝 Cancellation reason:', reason);

    // Get event details and participant count
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        currentParticipants: true,
        timeSlotId: true,
        rentalId: true,
      },
    });

    if (!event) {
      console.log('❌ Event not found:', id);
      return res.status(404).json({ error: 'Event not found' });
    }

    console.log('📋 Event details:', event);

    // Find all rentals that were used for this event (handles multiple rentals)
    const linkedRentals = await prisma.facilityRental.findMany({
      where: { usedForEventId: id },
      select: { id: true },
    });

    console.log('🔗 Found linked rentals:', linkedRentals.length);

    // Check if event has participants
    const hasParticipants = event.currentParticipants > 0;
    console.log('👥 Has participants:', hasParticipants);

    if (hasParticipants) {
      // Event has participants - mark as CANCELLED with reason
      console.log('📌 Marking event as cancelled (has participants)');
      
      await prisma.$transaction(async (tx) => {
        // Update event status to cancelled with reason
        await tx.event.update({
          where: { id },
          data: {
            status: 'cancelled',
            cancellationReason: reason || 'Event cancelled by organizer',
          },
        });
        console.log('✅ Event marked as cancelled');

        // Unblock time slot if linked
        if (event.timeSlotId) {
          await tx.facilityTimeSlot.update({
            where: { id: event.timeSlotId },
            data: {
              status: 'available',
              blockReason: null,
            },
          });
          console.log('✅ Time slot unblocked:', event.timeSlotId);
        }

        // Clear usedForEventId for all linked rentals
        if (linkedRentals.length > 0) {
          const rentalIds = linkedRentals.map(r => r.id);
          await tx.facilityRental.updateMany({
            where: { id: { in: rentalIds } },
            data: { usedForEventId: null },
          });
          console.log('✅ Cleared usedForEventId for rentals:', rentalIds);
        } else if (event.rentalId) {
          await tx.facilityRental.update({
            where: { id: event.rentalId },
            data: { usedForEventId: null },
          });
          console.log('✅ Cleared usedForEventId for single rental:', event.rentalId);
        }

        // TODO: Send notifications to all participants about cancellation
      });

      console.log('✅ Event cancelled successfully (kept in system)');
      res.json({ 
        message: 'Event cancelled successfully',
        deleted: false,
        participantsNotified: event.currentParticipants,
      });
    } else {
      // Event has NO participants - delete it entirely
      console.log('🗑️ Deleting event (no participants)');
      
      await prisma.$transaction(async (tx) => {
        // Delete the event
        await tx.event.delete({ where: { id } });
        console.log('✅ Event deleted');

        // Unblock time slot if linked
        if (event.timeSlotId) {
          await tx.facilityTimeSlot.update({
            where: { id: event.timeSlotId },
            data: {
              status: 'available',
              blockReason: null,
            },
          });
          console.log('✅ Time slot unblocked:', event.timeSlotId);
        }

        // Clear usedForEventId for all linked rentals
        if (linkedRentals.length > 0) {
          const rentalIds = linkedRentals.map(r => r.id);
          await tx.facilityRental.updateMany({
            where: { id: { in: rentalIds } },
            data: { usedForEventId: null },
          });
          console.log('✅ Cleared usedForEventId for rentals:', rentalIds);
        } else if (event.rentalId) {
          await tx.facilityRental.update({
            where: { id: event.rentalId },
            data: { usedForEventId: null },
          });
          console.log('✅ Cleared usedForEventId for single rental:', event.rentalId);
        }
      });

      console.log('✅ Event deleted successfully (removed from system)');
      res.status(204).send();
    }
  } catch (error) {
    console.error('❌ Cancel/Delete event error:', error);
    res.status(500).json({ error: 'Failed to cancel/delete event' });
  }
});

// Book event
router.post('/:id/book', async (req, res) => {
  try {
    const { id } = req.params;
    let { userId } = req.body;

    console.log('📞 POST /events/:id/book called');
    console.log('📋 Event ID:', id);
    console.log('📋 Request body:', req.body);
    console.log('👤 User ID from body:', userId);

    // TEMPORARY: If userId is "1" (mock user), use first real user from database
    if (userId === '1') {
      console.log('⚠️ Mock user ID detected, finding first real user...');
      const firstUser = await prisma.user.findFirst();
      if (firstUser) {
        userId = firstUser.id;
        console.log('✅ Using first user:', firstUser.id, firstUser.email);
      } else {
        console.log('❌ No users found in database');
        return res.status(400).json({ error: 'No users found in database' });
      }
    }

    // Check if event exists and has space
    console.log('🔍 Checking if event exists...');
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      console.log('❌ Event not found');
      return res.status(404).json({ error: 'Event not found' });
    }
    console.log('✅ Event found:', event.title);
    console.log('📊 Current participants:', event.currentParticipants, '/', event.maxParticipants);

    if (event.currentParticipants >= event.maxParticipants) {
      console.log('❌ Event is full');
      return res.status(400).json({ error: 'Event is full' });
    }

    // Check if user already booked
    console.log('🔍 Checking for existing booking...');
    const existingBooking = await prisma.booking.findFirst({
      where: {
        userId,
        eventId: id,
        status: 'confirmed',
      },
    });

    if (existingBooking) {
      console.log('❌ User already booked this event');
      return res.status(400).json({ error: 'Already booked' });
    }
    console.log('✅ No existing booking found');

    // Create booking and update event
    console.log('💾 Creating booking and updating event...');
    const [booking] = await prisma.$transaction([
      prisma.booking.create({
        data: {
          userId,
          eventId: id,
          bookingType: 'event',
          totalPrice: event.price,
          status: 'confirmed',
          paymentStatus: event.price > 0 ? 'pending' : 'completed',
        },
        include: {
          event: {
            include: {
              facility: true,
              organizer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.event.update({
        where: { id },
        data: {
          currentParticipants: { increment: 1 },
        },
      }),
    ]);

    console.log('✅ Booking created successfully!');
    console.log('📦 Booking ID:', booking.id);
    console.log('📊 Updated participants:', event.currentParticipants + 1);

    res.status(201).json(booking);
  } catch (error) {
    console.error('❌ Book event error:', error);
    res.status(500).json({ error: 'Failed to book event' });
  }
});

// Cancel booking
router.delete('/:id/book/:bookingId', async (req, res) => {
  try {
    const { id, bookingId } = req.params;

    console.log('🚶 DELETE /events/:id/book/:bookingId');
    console.log('📋 Event ID:', id);
    console.log('📋 Booking ID:', bookingId);

    // Delete the booking and update event participant count
    await prisma.$transaction([
      prisma.booking.delete({
        where: { id: bookingId },
      }),
      prisma.event.update({
        where: { id },
        data: {
          currentParticipants: { decrement: 1 },
        },
      }),
    ]);

    console.log('✅ Booking cancelled successfully');
    res.status(204).send();
  } catch (error) {
    console.error('❌ Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Submit salutes for event participants
router.post('/:id/salutes', async (req, res) => {
  try {
    const { id } = req.params;
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
      return res.status(400).json({ error: 'Can only salute participants after event has ended' });
    }

    // Validate salutedUserIds
    if (!Array.isArray(salutedUserIds) || salutedUserIds.length === 0) {
      return res.status(400).json({ error: 'salutedUserIds must be a non-empty array' });
    }

    if (salutedUserIds.length > 3) {
      return res.status(400).json({ error: 'Can only salute up to 3 participants per event' });
    }

    // Check if user already submitted salutes for this event
    const existingSalutes = await prisma.salute.findMany({
      where: {
        eventId: id,
        fromUserId: fromUser.id,
      },
    });

    if (existingSalutes.length > 0) {
      return res.status(400).json({ error: 'Salutes already submitted for this event' });
    }

    // Create salutes
    const salutes = await prisma.$transaction(
      salutedUserIds.map((toUserId) =>
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
      salutedUserIds.map(async (userId) => {
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
    const { id } = req.params;

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
    const { id } = req.params;

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

export default router;
