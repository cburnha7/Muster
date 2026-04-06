import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ScheduleGeneratorService } from '../services/ScheduleGeneratorService';
import { requireNonDependent } from '../middleware/require-non-dependent';

const router = Router();

// Get all events
router.get('/', async (req, res) => {
  try {
    const {
      sportType,
      sportTypes: sportTypesRaw,
      minPlayerRating,
      status,
      organizerId,
      userId,
      latitude: latRaw,
      longitude: lngRaw,
      radiusMiles: radiusRaw,
      locationQuery,
      page = '1',
      limit = '10',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {
      // Only show upcoming events (not past events)
      startTime: { gte: new Date() },
    };

    // Multi-sport filter (comma-separated)
    if (sportTypesRaw) {
      const sportsList = (sportTypesRaw as string)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (sportsList.length === 1) {
        where.sportType = sportsList[0];
      } else if (sportsList.length > 1) {
        where.sportType = { in: sportsList };
      }
    } else if (sportType) {
      where.sportType = sportType;
    }

    if (minPlayerRating)
      where.minPlayerRating = { lte: parseInt(minPlayerRating as string) };
    if (status) where.status = status;
    if (organizerId) where.organizerId = organizerId;

    // Location-based filtering: restrict to facilities within radius
    const lat = latRaw ? parseFloat(latRaw as string) : null;
    const lng = lngRaw ? parseFloat(lngRaw as string) : null;
    const radiusMiles = radiusRaw ? parseFloat(radiusRaw as string) : null;

    let facilityIdsInRadius: string[] | null = null;
    if (lat != null && lng != null && radiusMiles != null) {
      // Haversine approximation: 1 degree latitude ≈ 69 miles
      const latDelta = radiusMiles / 69;
      const lngDelta = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180));

      const nearbyFacilities = await prisma.facility.findMany({
        where: {
          latitude: { gte: lat - latDelta, lte: lat + latDelta },
          longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
        },
        select: { id: true, latitude: true, longitude: true },
      });

      // Precise Haversine filter
      facilityIdsInRadius = nearbyFacilities
        .filter(f => {
          const dLat = ((f.latitude - lat) * Math.PI) / 180;
          const dLng = ((f.longitude - lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((f.latitude * Math.PI) / 180) *
              Math.sin(dLng / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distMiles = 3959 * c; // Earth radius in miles
          return distMiles <= radiusMiles;
        })
        .map(f => f.id);

      // Also find free-text events within radius using their own coordinates
      const latDeltaEvent = radiusMiles / 69;
      const lngDeltaEvent =
        radiusMiles / (69 * Math.cos((lat * Math.PI) / 180));

      where.OR = [
        // Events at facilities within radius
        { facilityId: { in: facilityIdsInRadius } },
        // Events with free-text coordinates within radius
        {
          facilityId: null,
          locationLat: {
            not: null,
            gte: lat - latDeltaEvent,
            lte: lat + latDeltaEvent,
          },
          locationLng: {
            not: null,
            gte: lng - lngDeltaEvent,
            lte: lng + lngDeltaEvent,
          },
        },
      ];
    }

    // Text-based location search (city/state match on facility OR free-text location)
    if (locationQuery && !facilityIdsInRadius) {
      const locStr = (locationQuery as string).trim();
      if (locStr) {
        const matchingFacilities = await prisma.facility.findMany({
          where: {
            OR: [
              { city: { contains: locStr, mode: 'insensitive' } },
              { state: { contains: locStr, mode: 'insensitive' } },
              { name: { contains: locStr, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });
        where.OR = [
          { facilityId: { in: matchingFacilities.map(f => f.id) } },
          { locationName: { contains: locStr, mode: 'insensitive' } },
          { locationAddress: { contains: locStr, mode: 'insensitive' } },
        ];
      }
    }

    // Filter out private events unless the requesting user is the organizer or invited
    if (userId) {
      where.OR = [
        { isPrivate: false },
        { organizerId: userId as string },
        { invitedUserIds: { has: userId as string } },
      ];
    } else {
      // No user context — only show public events
      where.isPrivate = false;
    }

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

    // Enforce private event visibility
    const requestingUserId =
      (req.query.userId as string | undefined) ||
      (req as any).effectiveUserId ||
      (req as any).user?.userId ||
      (req.headers['x-user-id'] as string | undefined);
    if (event.isPrivate && requestingUserId) {
      const isOrganizer = event.organizerId === requestingUserId;
      const isInvited = event.invitedUserIds?.includes(requestingUserId);
      if (!isOrganizer && !isInvited) {
        return res
          .status(403)
          .json({ error: 'You do not have access to this private event' });
      }
    } else if (event.isPrivate && !requestingUserId) {
      return res
        .status(403)
        .json({ error: 'You do not have access to this private event' });
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

    // Fetch the event to check type and team associations
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        eventType: true,
        eligibilityRestrictedToTeams: true,
        matches: {
          select: {
            homeTeamId: true,
            awayTeamId: true,
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
          },
          take: 1,
        },
      },
    });

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
            profileImage: true,
          },
        },
      },
    });

    // For game events, resolve each participant's roster via team membership
    let teamMembershipMap: Record<string, string> = {};
    const isGame = event?.eventType === 'game';
    const rosterIds = event?.eligibilityRestrictedToTeams ?? [];

    if (isGame && rosterIds.length > 0) {
      const userIds = bookings.map(b => b.user.id);
      const memberships = await prisma.teamMember.findMany({
        where: {
          teamId: { in: rosterIds },
          userId: { in: userIds },
          status: 'active',
        },
        select: { userId: true, teamId: true },
      });
      for (const m of memberships) {
        teamMembershipMap[m.userId] = m.teamId;
      }
    }

    // Build roster metadata for game events
    let rosters: { id: string; name: string; isHome: boolean }[] | undefined;
    if (isGame && rosterIds.length > 0) {
      const match = event?.matches?.[0];
      if (match) {
        rosters = [
          { id: match.homeTeam!.id, name: match.homeTeam!.name, isHome: true },
          { id: match.awayTeam!.id, name: match.awayTeam!.name, isHome: false },
        ];
      } else {
        // No match record — fetch roster names and order alphabetically
        const teams = await prisma.team.findMany({
          where: { id: { in: rosterIds } },
          select: { id: true, name: true },
        });
        rosters = teams
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(t => ({ id: t.id, name: t.name, isHome: false }));
      }
    }

    const participants = bookings.map(booking => ({
      userId: booking.user.id,
      eventId: id,
      bookingId: booking.id,
      status: booking.status,
      joinedAt: booking.createdAt,
      user: booking.user,
      ...(isGame && teamMembershipMap[booking.user.id]
        ? { teamId: teamMembershipMap[booking.user.id] }
        : {}),
    }));

    res.json({ participants, rosters });
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
router.post('/', requireNonDependent, async (req, res) => {
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

    // Validate game events have at most 2 rosters
    if (eventData.eventType === 'game') {
      const rosterIds = eventData.eligibility?.restrictedToTeams || [];
      if (rosterIds.length > 2) {
        return res.status(400).json({
          error: 'Game events can have a maximum of two rosters.',
        });
      }
    }

    const organizerId = eventData.organizerId;
    console.log('Organizer ID:', organizerId);

    // Determine location mode: facility-based OR free-text OR none
    const hasFacility = !!eventData.facilityId;
    const hasFreeTextLocation = !!eventData.locationName;
    let isOwner = false;

    if (hasFacility) {
      // ── Facility-based event: validate facility authorization ──
      const facility = await prisma.facility.findUnique({
        where: { id: eventData.facilityId },
        select: { id: true, ownerId: true },
      });

      if (!facility) {
        return res.status(404).json({ error: 'Facility not found' });
      }

      isOwner = facility.ownerId === organizerId;
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
            error:
              'Unauthorized: You must own this facility or have a rental to create events here',
          });
        }
      }

      // Clear free-text location fields when using a facility
      eventData.locationName = null;
      eventData.locationAddress = null;
      eventData.locationLat = null;
      eventData.locationLng = null;
    } else if (hasFreeTextLocation) {
      // ── Free-text location event: clear facility references ──
      eventData.facilityId = null;
      eventData.rentalId = null;
      eventData.timeSlotId = null;
      eventData.timeSlotIds = null;
      eventData.rentalIds = null;
      console.log('Free-text location event:', eventData.locationName);
    } else {
      // ── No location (TBD): clear all location fields ──
      eventData.facilityId = null;
      eventData.rentalId = null;
      eventData.timeSlotId = null;
      eventData.timeSlotIds = null;
      eventData.rentalIds = null;
      console.log('Event with no location (TBD)');
    }

    // Handle timeSlotId (direct slot selection for owners) - only if not using rental
    if (hasFacility && eventData.timeSlotId && !eventData.rentalId) {
      // Check if multiple slots are selected
      const slotIds = eventData.timeSlotIds || [eventData.timeSlotId];

      // Fetch all selected slots
      const timeSlots = await prisma.facilityTimeSlot.findMany({
        where: { id: { in: slotIds } },
        include: {
          court: {
            include: {
              facility: true,
            },
          },
        },
        orderBy: { startTime: 'asc' },
      });

      if (timeSlots.length === 0) {
        return res.status(404).json({ error: 'Time slot not found' });
      }

      if (timeSlots.length !== slotIds.length) {
        return res.status(404).json({ error: 'Some time slots not found' });
      }

      const firstSlot = timeSlots[0];
      const lastSlot = timeSlots[timeSlots.length - 1];

      // Verify all slots belong to the selected facility
      const invalidSlot = timeSlots.find(
        slot => slot.court.facilityId !== eventData.facilityId
      );
      if (invalidSlot) {
        return res
          .status(400)
          .json({ error: 'Time slot does not belong to selected facility' });
      }

      // Only owners can use timeSlotId directly
      if (!isOwner) {
        return res.status(403).json({
          error: 'Only facility owners can directly select time slots',
        });
      }

      // Verify all slots are available
      const unavailableSlot = timeSlots.find(
        slot => slot.status !== 'available'
      );
      if (unavailableSlot) {
        return res
          .status(400)
          .json({ error: 'One or more time slots are not available' });
      }

      // Set event start/end time from the selected time slots
      // The slot date is stored as UTC midnight; startTime/endTime are "HH:MM" local strings.
      // Build the event times from the slot date + slot time strings to avoid timezone mismatches.
      const slotDate = new Date(firstSlot.date);
      const [startHours = 0, startMinutes = 0] = firstSlot.startTime
        .split(':')
        .map(Number);
      const [endHours = 0, endMinutes = 0] = lastSlot.endTime
        .split(':')
        .map(Number);

      const slotStart = new Date(slotDate);
      slotStart.setUTCHours(startHours, startMinutes, 0, 0);
      const slotEnd = new Date(slotDate);
      slotEnd.setUTCHours(endHours, endMinutes, 0, 0);

      // Override event times with the authoritative slot times
      eventData.startTime = slotStart;
      eventData.endTime = slotEnd;

      console.log('Time slot override:');
      console.log(
        '  Slots:',
        timeSlots.length,
        '| First:',
        firstSlot.startTime,
        '| Last:',
        lastSlot.endTime
      );
      console.log(
        '  Event start:',
        slotStart.toISOString(),
        '| Event end:',
        slotEnd.toISOString()
      );
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

      console.log(
        'Found rentals:',
        rentals.length,
        'for',
        slotIds.length,
        'slots'
      );

      // Verify user has rentals for all selected slots
      if (rentals.length !== slotIds.length) {
        return res.status(403).json({
          error: `You must have confirmed rentals for all ${slotIds.length} selected time slots`,
        });
      }

      // Verify none of the rentals have been used
      const usedRental = rentals.find(r => r.usedForEventId);
      if (usedRental) {
        return res.status(400).json({
          error: 'One or more rentals have already been used for an event',
        });
      }

      // Use the first rental for facility validation
      const firstRental = rentals[0];

      // Set facility and timeSlotId from rental
      eventData.facilityId = firstRental.timeSlot.court.facilityId;
      eventData.timeSlotId = firstRental.timeSlotId;

      // Override event times from the rental's time slot to avoid timezone mismatches
      const rentalSlotDate = new Date(firstRental.timeSlot.date);
      const lastRental = rentals[rentals.length - 1];
      const [rStartH = 0, rStartM = 0] = firstRental.timeSlot.startTime
        .split(':')
        .map(Number);
      const [rEndH = 0, rEndM = 0] = lastRental.timeSlot.endTime
        .split(':')
        .map(Number);
      const rentalStart = new Date(rentalSlotDate);
      rentalStart.setUTCHours(rStartH, rStartM, 0, 0);
      const rentalEnd = new Date(rentalSlotDate);
      rentalEnd.setUTCHours(rEndH, rEndM, 0, 0);
      eventData.startTime = rentalStart;
      eventData.endTime = rentalEnd;

      // Store all rental IDs for later processing
      eventData.rentalIds = rentals.map(r => r.id);
    } else if (hasFacility && !isOwner) {
      // If using a facility but not using a rental and not owner, reject
      return res.status(403).json({
        error:
          'You must use a rental to create events at facilities you do not own',
      });
    }

    // Create event and block slot in a transaction
    const result = await prisma.$transaction(async tx => {
      // Store rental/slot IDs for later, then remove from eventData
      const rentalIds = eventData.rentalIds;
      const timeSlotIds = eventData.timeSlotIds;

      // Clean eventData - remove fields that aren't in the Event model
      const {
        rentalIds: _,
        timeSlotIds: __,
        eligibility,
        invitedUserIds,
        homeRosterId: _hr,
        awayRosterId: _ar,
        recurring: _recurring,
        recurringFrequency: _rf,
        recurringEndDate: _re,
        recurringDays: _rd,
        numberOfEvents: _ne,
        occurrenceLocations: _ol,
        ...cleanEventData
      } = eventData;

      // Transform eligibility object to flat fields if present
      if (eligibility) {
        cleanEventData.eligibilityIsInviteOnly =
          eligibility.isInviteOnly || false;
        cleanEventData.minimumPlayerCount = eligibility.minimumPlayerCount;
        cleanEventData.eligibilityRestrictedToTeams =
          eligibility.restrictedToTeams || [];
        cleanEventData.eligibilityRestrictedToLeagues =
          eligibility.restrictedToLeagues || [];
        cleanEventData.eligibilityMinAge = eligibility.minAge;
        cleanEventData.eligibilityMaxAge = eligibility.maxAge;
        // Legacy skill-level eligibility fields — no longer written
        // cleanEventData.eligibilityRequiredSkillLevel = eligibility.requiredSkillLevel;
        // cleanEventData.eligibilityMinSkillLevel = eligibility.minSkillLevel;
        // cleanEventData.eligibilityMaxSkillLevel = eligibility.maxSkillLevel;
      }

      // Set minPlayerRating from top-level field
      if (eventData.minPlayerRating != null) {
        cleanEventData.minPlayerRating = eventData.minPlayerRating;
      }

      // Store private event data
      if (eventData.isPrivate !== undefined) {
        cleanEventData.isPrivate = eventData.isPrivate;
      }
      if (invitedUserIds && invitedUserIds.length > 0) {
        cleanEventData.invitedUserIds = invitedUserIds;
      }

      // Create the event(s)
      // For recurring events, create one event per occurrence date
      const isRecurring =
        eventData.recurring &&
        eventData.occurrenceLocations &&
        eventData.occurrenceLocations.length > 0;
      const eventInclude = {
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
      };

      let event;
      const allCreatedEvents: any[] = [];

      if (isRecurring) {
        // Create one event per occurrence
        const baseStart = new Date(cleanEventData.startTime);
        const baseEnd = new Date(cleanEventData.endTime);
        const startHours = baseStart.getHours();
        const startMinutes = baseStart.getMinutes();
        const endHours = baseEnd.getHours();
        const endMinutes = baseEnd.getMinutes();

        for (const occ of eventData.occurrenceLocations) {
          const occDate = new Date(occ.date + 'T12:00:00');
          const occStart = new Date(
            occDate.getFullYear(),
            occDate.getMonth(),
            occDate.getDate(),
            startHours,
            startMinutes
          );
          const occEnd = new Date(
            occDate.getFullYear(),
            occDate.getMonth(),
            occDate.getDate(),
            endHours,
            endMinutes
          );

          const occEventData = {
            ...cleanEventData,
            startTime: occStart,
            endTime: occEnd,
            // Use occurrence-specific facility if booked, otherwise keep base
            ...(occ.facilityId ? { facilityId: occ.facilityId } : {}),
          };
          // Remove slot/rental refs for recurring — each occurrence is independent
          delete occEventData.timeSlotId;
          delete occEventData.rentalId;

          const created = await tx.event.create({
            data: occEventData,
            include: eventInclude,
          });
          allCreatedEvents.push(created);
        }
        // Return the first event as the primary result
        event = allCreatedEvents[0];
      } else {
        event = await tx.event.create({
          data: cleanEventData,
          include: eventInclude,
        });
        allCreatedEvents.push(event);
      }

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
      const slotIdsToBlock =
        timeSlotIds ||
        (cleanEventData.timeSlotId ? [cleanEventData.timeSlotId] : []);
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

    // ── Post-creation: populate invitedUserIds for inbox ──
    try {
      const eventType = result.eventType;
      const restrictedToTeams = (eventData.eligibility?.restrictedToTeams ||
        []) as string[];
      const existingInvited = (result.invitedUserIds || []) as string[];
      let newInvitedIds: string[] = [...existingInvited];

      if (eventType === 'game' && restrictedToTeams.length > 0) {
        // Game: invite the managers (captains/co-captains) of each roster
        const managers = await prisma.teamMember.findMany({
          where: {
            teamId: { in: restrictedToTeams },
            role: { in: ['captain', 'co_captain'] },
            status: 'active',
          },
          select: { userId: true },
        });
        managers.forEach(m => {
          if (
            !newInvitedIds.includes(m.userId) &&
            m.userId !== result.organizerId
          ) {
            newInvitedIds.push(m.userId);
          }
        });
      } else if (
        (eventType === 'pickup' || eventType === 'practice') &&
        restrictedToTeams.length > 0
      ) {
        // Pickup/Practice with roster invites: expand roster members into invitedUserIds
        const members = await prisma.teamMember.findMany({
          where: {
            teamId: { in: restrictedToTeams },
            status: 'active',
          },
          select: { userId: true },
        });
        members.forEach(m => {
          if (
            !newInvitedIds.includes(m.userId) &&
            m.userId !== result.organizerId
          ) {
            newInvitedIds.push(m.userId);
          }
        });
      }

      // Update invitedUserIds if we added anyone
      if (newInvitedIds.length > existingInvited.length) {
        await prisma.event.update({
          where: { id: result.id },
          data: { invitedUserIds: newInvitedIds },
        });
      }
    } catch (inviteErr) {
      console.error('Failed to populate invitedUserIds:', inviteErr);
      // Non-fatal — event was still created
    }

    // Messaging hook: create game thread
    try {
      const { MessagingService } = await import('../services/MessagingService');
      await MessagingService.createGameThread(
        result.id,
        result.organizerId,
        result.title
      );

      // If the event is linked to teams, auto-post in their team chats
      const linkedTeams = result.eligibilityRestrictedToTeams ?? [];
      if (linkedTeams.length > 0) {
        const organizer = await prisma.user.findUnique({
          where: { id: result.organizerId },
          select: { firstName: true, lastName: true },
        });
        const dateStr = new Date(result.startTime).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        const timeStr = new Date(result.startTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
        for (const tId of linkedTeams) {
          try {
            const teamConv = await MessagingService.getConversationForTeam(tId);
            if (teamConv && organizer) {
              await MessagingService.postSystemMessage(
                teamConv.id,
                `${organizer.firstName} ${organizer.lastName} created ${result.title} for ${dateStr} ${timeStr}`
              );
            }
          } catch {
            /* non-critical */
          }
        }
      }
    } catch (msgErr) {
      console.error('Failed to create game thread:', msgErr);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Create event error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create event';
    res.status(500).json({ error: 'Failed to create event', details: message });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify the event exists and check organizer
    const existing = await prisma.event.findUnique({
      where: { id },
      select: {
        organizerId: true,
        scheduledStatus: true,
        facilityId: true,
        eventType: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only the organizer can edit the event
    // The organizerId should be in the request body (sent by the client)
    const requestingUserId = req.body.organizerId;
    if (requestingUserId && existing.organizerId !== requestingUserId) {
      return res
        .status(403)
        .json({ error: 'Only the organizer can edit this event' });
    }

    // Don't allow overwriting organizerId
    const { organizerId, ...updateData } = req.body;

    // Validate game events have at most 2 rosters
    const effectiveEventType = req.body.eventType || existing.eventType;
    if (effectiveEventType === 'game') {
      const rosterIds = req.body.eligibility?.restrictedToTeams || [];
      if (rosterIds.length > 2) {
        return res.status(400).json({
          error: 'Game events can have a maximum of two rosters.',
        });
      }
    }

    // If facility is being assigned to an unscheduled shell event, mark it as scheduled
    const isAssigningFacility =
      updateData.facilityId &&
      !existing.facilityId &&
      existing.scheduledStatus === 'unscheduled';
    if (isAssigningFacility) {
      updateData.scheduledStatus = 'scheduled';
    }

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
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

    // Notify roster players when a shell event becomes scheduled
    if (isAssigningFacility) {
      ScheduleGeneratorService.markEventScheduled(id).catch(err => {
        console.error('Error sending schedule notifications:', err);
      });
    }

    // ── Post-update: refresh invitedUserIds for inbox ──
    try {
      const eventType = event.eventType;
      const restrictedToTeams = (event.eligibilityRestrictedToTeams ||
        []) as string[];
      const existingInvited = (event.invitedUserIds || []) as string[];
      let newInvitedIds: string[] = [...existingInvited];

      if (eventType === 'game' && restrictedToTeams.length > 0) {
        const managers = await prisma.teamMember.findMany({
          where: {
            teamId: { in: restrictedToTeams },
            role: { in: ['captain', 'co_captain'] },
            status: 'active',
          },
          select: { userId: true },
        });
        managers.forEach(m => {
          if (
            !newInvitedIds.includes(m.userId) &&
            m.userId !== event.organizerId
          ) {
            newInvitedIds.push(m.userId);
          }
        });
      } else if (
        (eventType === 'pickup' || eventType === 'practice') &&
        restrictedToTeams.length > 0
      ) {
        const members = await prisma.teamMember.findMany({
          where: {
            teamId: { in: restrictedToTeams },
            status: 'active',
          },
          select: { userId: true },
        });
        members.forEach(m => {
          if (
            !newInvitedIds.includes(m.userId) &&
            m.userId !== event.organizerId
          ) {
            newInvitedIds.push(m.userId);
          }
        });
      }

      if (newInvitedIds.length > existingInvited.length) {
        await prisma.event.update({
          where: { id },
          data: { invitedUserIds: newInvitedIds },
        });
      }
    } catch (inviteErr) {
      console.error('Failed to refresh invitedUserIds on edit:', inviteErr);
    }

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

      await prisma.$transaction(async tx => {
        // Update event status to cancelled with reason
        await tx.event.update({
          where: { id },
          data: {
            status: 'cancelled',
            cancellationReason: reason || 'Event cancelled by organizer',
          },
        });
        console.log('✅ Event marked as cancelled');

        // Cancel all bookings for this event
        const cancelledBookings = await tx.booking.updateMany({
          where: {
            eventId: id,
            status: { not: 'cancelled' },
          },
          data: {
            status: 'cancelled',
            cancellationReason: reason || 'Event cancelled by organizer',
            cancelledAt: new Date(),
          },
        });
        console.log(`✅ Cancelled ${cancelledBookings.count} booking(s)`);

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
          console.log(
            '✅ Cleared usedForEventId for single rental:',
            event.rentalId
          );
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

      await prisma.$transaction(async tx => {
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
          console.log(
            '✅ Cleared usedForEventId for single rental:',
            event.rentalId
          );
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
    console.log(
      '📊 Current participants:',
      event.currentParticipants,
      '/',
      event.maxParticipants
    );

    if (event.currentParticipants >= event.maxParticipants) {
      console.log('❌ Event is full');
      return res.status(400).json({ error: 'Event is full' });
    }

    // Enforce private event access
    if (event.isPrivate) {
      const isOrganizer = event.organizerId === userId;
      const isInvited = event.invitedUserIds?.includes(userId);
      if (!isOrganizer && !isInvited) {
        console.log('❌ User not invited to private event');
        return res
          .status(403)
          .json({ error: 'You are not invited to this private event' });
      }
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

    // Messaging hook: add to game thread
    try {
      const { MessagingService } = await import('../services/MessagingService');
      const conv = await MessagingService.getConversationForEvent(id);
      if (conv) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        });
        const totalParticipants = await prisma.gameParticipation.count({
          where: { eventId: id },
        });
        await MessagingService.addParticipant(conv.id, userId, 'MEMBER');
        if (user) {
          const eventRecord = await prisma.event.findUnique({
            where: { id },
            select: { maxParticipants: true },
          });
          await MessagingService.postSystemMessage(
            conv.id,
            `${user.firstName} ${user.lastName} is in! (${totalParticipants}/${eventRecord?.maxParticipants ?? '?'})`
          );
        }
      }
    } catch (msgErr) {
      console.error('Failed to update game thread on RSVP:', msgErr);
    }

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

    // Fetch the booking to get userId before cancelling
    const bookingToCancel = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true },
    });

    // Update the booking status to cancelled and update event participant count
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'cancelled',
        },
      }),
      prisma.event.update({
        where: { id },
        data: {
          currentParticipants: { decrement: 1 },
        },
      }),
    ]);

    console.log('✅ Booking cancelled successfully');

    // Messaging hook: remove from game thread
    if (bookingToCancel) {
      try {
        const { MessagingService } =
          await import('../services/MessagingService');
        const conv = await MessagingService.getConversationForEvent(id);
        if (conv) {
          const user = await prisma.user.findUnique({
            where: { id: bookingToCancel.userId },
            select: { firstName: true, lastName: true },
          });
          await MessagingService.removeParticipant(
            conv.id,
            bookingToCancel.userId
          );
          const remaining = await prisma.gameParticipation.count({
            where: { eventId: id },
          });
          if (user) {
            const eventRecord = await prisma.event.findUnique({
              where: { id },
              select: { maxParticipants: true },
            });
            await MessagingService.postSystemMessage(
              conv.id,
              `${user.firstName} ${user.lastName} stepped out (${remaining}/${eventRecord?.maxParticipants ?? '?'})`
            );
          }
        }
      } catch (msgErr) {
        console.error('Failed to update game thread on RSVP out:', msgErr);
      }
    }

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
        const venue = event.facility?.name ?? event.location ?? 'TBD';
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
      include: { facility: { select: { name: true } } },
    });

    for (const event of upcoming1h) {
      const conv = await MessagingService.getConversationForEvent(event.id);
      if (conv) {
        const venue = event.facility?.name ?? event.location ?? 'TBD';
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
