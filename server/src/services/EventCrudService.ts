import { prisma } from '../lib/prisma';
import { ServiceError } from '../utils/ServiceError';

// ─── Public API ─────────────────────────────────────────────────────────────

export interface GetEventsFilters {
  sportType?: string;
  sportTypes?: string;
  minPlayerRating?: string;
  status?: string;
  organizerId?: string;
  userId?: string;
  latitude?: string;
  longitude?: string;
  radiusMiles?: string;
  locationQuery?: string;
  page?: string;
  limit?: string;
}

export async function getEvents(filters: GetEventsFilters) {
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
  } = filters;

  const skip = (parseInt(page) - 1) * Math.min(parseInt(limit), 50);
  const take = Math.min(parseInt(limit), 50);

  const where: any = {
    // Only show upcoming events (not past events)
    startTime: { gte: new Date() },
  };

  // Multi-sport filter (comma-separated)
  if (sportTypesRaw) {
    const sportsList = sportTypesRaw
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
    where.minPlayerRating = { lte: parseInt(minPlayerRating) };
  if (status) where.status = status;
  if (organizerId) where.organizerId = organizerId;

  // Location-based filtering: restrict to facilities within radius
  const lat = latRaw ? parseFloat(latRaw) : null;
  const lng = lngRaw ? parseFloat(lngRaw) : null;
  const radiusMiles = radiusRaw ? parseFloat(radiusRaw) : null;

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
    const lngDeltaEvent = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180));

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
    const locStr = locationQuery.trim();
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
      { organizerId: userId },
      { invitedUserIds: { has: userId } },
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

  return {
    data: events,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / take),
    },
  };
}

export async function getEventById(id: string, requestingUserId?: string) {
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
    throw new ServiceError('Event not found', 404);
  }

  // Enforce private event visibility
  if (event.isPrivate && requestingUserId) {
    const isOrganizer = event.organizerId === requestingUserId;
    const isInvited = event.invitedUserIds?.includes(requestingUserId);
    if (!isOrganizer && !isInvited) {
      throw new ServiceError(
        'You do not have access to this private event',
        403
      );
    }
  } else if (event.isPrivate && !requestingUserId) {
    throw new ServiceError('You do not have access to this private event', 403);
  }

  return event;
}

export async function getEventParticipants(id: string) {
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

  return { participants, rosters };
}

export interface CreateEventData {
  [key: string]: any;
}

export async function createEvent(
  data: CreateEventData,
  authenticatedUserId: string | undefined
) {
  let resolvedOrganizerId: string;
  if (!authenticatedUserId) {
    // Fallback for development: use the first user as default organizer
    const defaultOrganizer = await prisma.user.findFirst({
      select: { id: true },
    });

    if (!defaultOrganizer) {
      throw new ServiceError('No users found in database', 400);
    }

    // Use default organizer only when no auth is available
    resolvedOrganizerId = defaultOrganizer.id;
  } else {
    resolvedOrganizerId = authenticatedUserId;
  }

  const eventData: any = {
    ...data,
    // Override organizerId with authenticated user — ignore any client-supplied value
    organizerId: resolvedOrganizerId,
  };

  // Validate game events have at most 2 rosters
  if (eventData.eventType === 'game') {
    const rosterIds = eventData.eligibility?.restrictedToTeams || [];
    if (rosterIds.length > 2) {
      throw new ServiceError(
        'Game events can have a maximum of two rosters.',
        400
      );
    }
  }

  const organizerId = eventData.organizerId;

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
      throw new ServiceError('Facility not found', 404);
    }

    isOwner = facility.ownerId === organizerId;

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

      if (!hasRental) {
        throw new ServiceError(
          'Unauthorized: You must own this facility or have a rental to create events here',
          403
        );
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
  } else {
    // ── No location (TBD): clear all location fields ──
    eventData.facilityId = null;
    eventData.rentalId = null;
    eventData.timeSlotId = null;
    eventData.timeSlotIds = null;
    eventData.rentalIds = null;
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
      throw new ServiceError('Time slot not found', 404);
    }

    if (timeSlots.length !== slotIds.length) {
      throw new ServiceError('Some time slots not found', 404);
    }

    const firstSlot = timeSlots[0];
    const lastSlot = timeSlots[timeSlots.length - 1];

    // Verify all slots belong to the selected facility
    const invalidSlot = timeSlots.find(
      slot => slot.court.facilityId !== eventData.facilityId
    );
    if (invalidSlot) {
      throw new ServiceError(
        'Time slot does not belong to selected facility',
        400
      );
    }

    // Only owners can use timeSlotId directly
    if (!isOwner) {
      throw new ServiceError(
        'Only facility owners can directly select time slots',
        403
      );
    }

    // Verify all slots are available
    const unavailableSlot = timeSlots.find(slot => slot.status !== 'available');
    if (unavailableSlot) {
      throw new ServiceError('One or more time slots are not available', 400);
    }

    // Set event start/end time from the selected time slots
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

    // Verify user has rentals for all selected slots
    if (rentals.length !== slotIds.length) {
      throw new ServiceError(
        `You must have confirmed rentals for all ${slotIds.length} selected time slots`,
        403
      );
    }

    // Verify none of the rentals have been used
    const usedRental = rentals.find(r => r.usedForEventId);
    if (usedRental) {
      throw new ServiceError(
        'One or more rentals have already been used for an event',
        400
      );
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
    throw new ServiceError(
      'You must use a rental to create events at facilities you do not own',
      403
    );
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
    const restrictedToTeams = (data.eligibility?.restrictedToTeams ||
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
    const { MessagingService } = await import('./MessagingService');
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

  return result;
}

export interface UpdateEventData {
  [key: string]: any;
}

export async function updateEvent(id: string, data: UpdateEventData) {
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
    throw new ServiceError('Event not found', 404);
  }

  // Only the organizer can edit the event
  const requestingUserId = data.organizerId;
  if (requestingUserId && existing.organizerId !== requestingUserId) {
    throw new ServiceError('Only the organizer can edit this event', 403);
  }

  // Don't allow overwriting organizerId
  const { organizerId, ...updateData } = data;

  // Validate game events have at most 2 rosters
  const effectiveEventType = data.eventType || existing.eventType;
  if (effectiveEventType === 'game') {
    const rosterIds = data.eligibility?.restrictedToTeams || [];
    if (rosterIds.length > 2) {
      throw new ServiceError(
        'Game events can have a maximum of two rosters.',
        400
      );
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
    const { ScheduleGeneratorService } =
      await import('./ScheduleGeneratorService');
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

  return event;
}

export async function deleteEvent(id: string, reason?: string) {
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
    throw new ServiceError('Event not found', 404);
  }

  // Find all rentals that were used for this event (handles multiple rentals)
  const linkedRentals = await prisma.facilityRental.findMany({
    where: { usedForEventId: id },
    select: { id: true },
  });

  // Check if event has participants
  const hasParticipants = event.currentParticipants > 0;

  if (hasParticipants) {
    // Event has participants - mark as CANCELLED with reason

    await prisma.$transaction(async tx => {
      // Update event status to cancelled with reason
      await tx.event.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancellationReason: reason || 'Event cancelled by organizer',
        },
      });

      // Cancel all bookings for this event
      await tx.booking.updateMany({
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

      // Unblock time slot if linked
      if (event.timeSlotId) {
        await tx.facilityTimeSlot.update({
          where: { id: event.timeSlotId },
          data: {
            status: 'available',
            blockReason: null,
          },
        });
      }

      // Clear usedForEventId for all linked rentals
      if (linkedRentals.length > 0) {
        const rentalIds = linkedRentals.map(r => r.id);
        await tx.facilityRental.updateMany({
          where: { id: { in: rentalIds } },
          data: { usedForEventId: null },
        });
      } else if (event.rentalId) {
        await tx.facilityRental.update({
          where: { id: event.rentalId },
          data: { usedForEventId: null },
        });
      }
    });

    return {
      message: 'Event cancelled successfully',
      deleted: false,
      participantsNotified: event.currentParticipants,
    };
  } else {
    // Event has NO participants - delete it entirely

    await prisma.$transaction(async tx => {
      // Delete the event
      await tx.event.delete({ where: { id } });

      // Unblock time slot if linked
      if (event.timeSlotId) {
        await tx.facilityTimeSlot.update({
          where: { id: event.timeSlotId },
          data: {
            status: 'available',
            blockReason: null,
          },
        });
      }

      // Clear usedForEventId for all linked rentals
      if (linkedRentals.length > 0) {
        const rentalIds = linkedRentals.map(r => r.id);
        await tx.facilityRental.updateMany({
          where: { id: { in: rentalIds } },
          data: { usedForEventId: null },
        });
      } else if (event.rentalId) {
        await tx.facilityRental.update({
          where: { id: event.rentalId },
          data: { usedForEventId: null },
        });
      }
    });

    return null; // Signals 204 No Content to the route handler
  }
}

export async function bookEvent(eventId: string, userId: string) {
  // TEMPORARY: If userId is "1" (mock user), use first real user from database
  if (userId === '1') {
    const firstUser = await prisma.user.findFirst();
    if (firstUser) {
      userId = firstUser.id;
    } else {
      throw new ServiceError('No users found in database', 400);
    }
  }

  // Check if event exists and has space
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new ServiceError('Event not found', 404);
  }

  if (event.currentParticipants >= event.maxParticipants) {
    throw new ServiceError('Event is full', 400);
  }

  // Enforce private event access
  if (event.isPrivate) {
    const isOrganizer = event.organizerId === userId;
    const isInvited = event.invitedUserIds?.includes(userId);
    if (!isOrganizer && !isInvited) {
      throw new ServiceError('You are not invited to this private event', 403);
    }
  }

  // Check if user already booked
  const existingBooking = await prisma.booking.findFirst({
    where: {
      userId,
      eventId,
      status: 'confirmed',
    },
  });

  if (existingBooking) {
    throw new ServiceError('Already booked', 400);
  }

  // Create booking and update event
  const [booking] = await prisma.$transaction([
    prisma.booking.create({
      data: {
        userId,
        eventId,
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
      where: { id: eventId },
      data: {
        currentParticipants: { increment: 1 },
      },
    }),
  ]);

  // Messaging hook: add to game thread
  try {
    const { MessagingService } = await import('./MessagingService');
    const conv = await MessagingService.getConversationForEvent(eventId);
    if (conv) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const totalParticipants = await prisma.booking.count({
        where: { eventId, status: 'confirmed' },
      });
      await MessagingService.addParticipant(conv.id, userId, 'MEMBER');
      if (user) {
        const eventRecord = await prisma.event.findUnique({
          where: { id: eventId },
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

  return booking;
}

export async function cancelBooking(eventId: string, bookingId: string) {
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
      where: { id: eventId },
      data: {
        currentParticipants: { decrement: 1 },
      },
    }),
  ]);

  // Messaging hook: remove from game thread
  if (bookingToCancel) {
    try {
      const { MessagingService } = await import('./MessagingService');
      const conv = await MessagingService.getConversationForEvent(eventId);
      if (conv) {
        const user = await prisma.user.findUnique({
          where: { id: bookingToCancel.userId },
          select: { firstName: true, lastName: true },
        });
        await MessagingService.removeParticipant(
          conv.id,
          bookingToCancel.userId
        );
        const remaining = await prisma.booking.count({
          where: { eventId, status: 'confirmed' },
        });
        if (user) {
          const eventRecord = await prisma.event.findUnique({
            where: { id: eventId },
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
}
