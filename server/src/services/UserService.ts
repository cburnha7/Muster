import { prisma } from '../lib/prisma';
import { ServiceError } from '../utils/ServiceError';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GetBookingsFilters {
  page?: string;
  limit?: string;
  status?: string;
  includeFamily?: string;
}

export interface GetEventsFilters {
  page?: string;
  limit?: string;
  status?: string;
}

export interface GetTeamsFilters {
  // Currently no filters, but kept for future extensibility
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  profileImage?: string;
  preferredSports?: string[];
  sportPreferences?: string[];
  locationCity?: string;
  locationState?: string;
  locationLat?: number;
  locationLng?: number;
  onboardingComplete?: boolean;
  intents?: string[];
}

export interface OnboardingData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  email?: string;
  profileImage?: string;
  intents?: string[];
  sportPreferences?: string[];
  locationCity?: string;
  locationState?: string;
  locationLat?: number;
  locationLng?: number;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getDashboard(userId: string, activeUserId: string) {
  const now = new Date();

  const [
    upcomingBookings,
    upcomingEvents,
    teamCount,
    leagueCount,
    invitationCount,
  ] = await Promise.all([
    // Next 5 upcoming bookings
    prisma.booking.findMany({
      where: {
        userId: activeUserId,
        status: { not: 'cancelled' },
        event: { startTime: { gte: now }, status: { not: 'cancelled' } },
      },
      take: 5,
      orderBy: { event: { startTime: 'asc' } },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            sportType: true,
            startTime: true,
            endTime: true,
            currentParticipants: true,
            maxParticipants: true,
            price: true,
            facility: {
              select: { id: true, name: true, city: true, state: true },
            },
          },
        },
      },
    }),
    // Next 3 events user organized
    prisma.event.findMany({
      where: {
        organizerId: activeUserId,
        startTime: { gte: now },
        status: 'active',
      },
      take: 3,
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        title: true,
        sportType: true,
        startTime: true,
        endTime: true,
        currentParticipants: true,
        maxParticipants: true,
        facility: { select: { id: true, name: true } },
      },
    }),
    // Team count
    prisma.teamMember.count({
      where: { userId: activeUserId, status: 'active' },
    }),
    // League count (via team memberships)
    prisma.leagueMembership.count({
      where: {
        OR: [
          { userId: activeUserId, status: 'active' },
          {
            team: {
              members: { some: { userId: activeUserId, status: 'active' } },
            },
            status: 'active',
          },
        ],
      },
    }),
    // Pending invitation count
    prisma.teamMember.count({
      where: { userId: activeUserId, status: 'pending' },
    }),
  ]);

  return {
    upcomingBookings,
    upcomingEvents,
    teamCount,
    leagueCount,
    invitationCount,
  };
}

export async function searchUsers(query: string, limit?: number) {
  if (!query || typeof query !== 'string') {
    throw new ServiceError('Search query is required', 400);
  }

  if (query.length < 2) {
    throw new ServiceError('Search query must be at least 2 characters', 400);
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      profileImage: true,
    },
    take: limit ?? 20,
  });

  return users;
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      dateOfBirth: true,
      gender: true,
      profileImage: true,
      sportPreferences: true,
      locationCity: true,
      locationState: true,
      membershipTier: true,
      onboardingComplete: true,
      intents: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ServiceError('User not found', 404);
  }

  return user;
}

export async function uploadProfileImage(
  userId: string,
  imageData: string | null,
  imageUrl: string | null
) {
  let finalUrl = imageUrl;

  // If base64 data is provided, store it (in production this would go to S3/CloudStorage)
  if (imageData && !imageUrl) {
    // Store as a data URI for now — in production, upload to cloud storage
    finalUrl = imageData;
  }

  if (!finalUrl) {
    throw new ServiceError('Image URL or data is required', 400);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { profileImage: finalUrl },
    select: { id: true, profileImage: true },
  });

  return { imageUrl: user.profileImage };
}

export async function deleteProfileImage(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { profileImage: null },
  });

  return { success: true };
}

export async function getProfileStats(userId: string) {
  const eventsOrganized = await prisma.event.count({
    where: { organizerId: userId },
  });

  const eventsAttended = await prisma.booking.count({
    where: {
      userId,
      status: 'confirmed',
    },
  });

  const totalBookings = await prisma.booking.count({
    where: { userId },
  });

  const upcomingBookings = await prisma.booking.count({
    where: {
      userId,
      status: 'confirmed',
      event: {
        startTime: { gte: new Date() },
      },
    },
  });

  const teamsJoined = await prisma.teamMember.count({
    where: { userId },
  });

  return {
    eventsOrganized,
    eventsAttended,
    totalBookings,
    upcomingBookings,
    teamsJoined,
    memberSince: new Date(),
  };
}

export async function getUserBookings(
  userId: string,
  filters: GetBookingsFilters
) {
  const { page = '1', limit = '20', status, includeFamily } = filters;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // When includeFamily=true, fetch bookings for this user AND all their dependents
  let userIds: string[] = [userId];
  if (includeFamily === 'true') {
    const dependents = await prisma.user.findMany({
      where: { guardianId: userId, isDependent: true },
      select: { id: true },
    });
    userIds = [userId, ...dependents.map(d => d.id)];
  }

  // Build where clause
  const where: any =
    userIds.length > 1 ? { userId: { in: userIds } } : { userId };

  if (status === 'upcoming') {
    where.status = { not: 'cancelled' };
    where.event = {
      startTime: { gte: new Date() },
      status: { not: 'cancelled' },
    };
  } else if (status === 'past') {
    where.status = { not: 'cancelled' };
    where.OR = [
      { event: { endTime: { lt: new Date() } } },
      { event: { status: 'cancelled' } },
    ];
  } else if (status === 'cancelled') {
    where.status = 'cancelled';
  } else if (status && status !== 'all') {
    where.status = status;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        event: {
          startTime: 'asc',
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            sportType: true,
            status: true,
            startTime: true,
            endTime: true,
            imageUrl: true,
            price: true,
            currentParticipants: true,
            maxParticipants: true,
            facility: {
              select: {
                id: true,
                name: true,
                street: true,
                city: true,
                state: true,
              },
            },
          },
        },
        facility: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            state: true,
            imageUrl: true,
          },
        },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    data: bookings,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

export async function getUserInvitations(userId: string) {
  // 1. Pending roster invitations — user was added to a team with status 'pending'
  const pendingRosterMemberships = await prisma.teamMember.findMany({
    where: { userId, status: 'pending' },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          sportType: true,
          imageUrl: true,
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const rosterInvitations = pendingRosterMemberships.map(m => ({
    id: m.id,
    type: 'roster' as const,
    rosterId: m.teamId,
    rosterName: m.team.name,
    sportType: m.team.sportType,
    imageUrl: m.team.imageUrl,
    playerCount: m.team._count.members,
    invitedAt: m.joinedAt,
  }));

  // 2. Pending league invitations for rosters the user owns (captain only)
  const captainedTeamIds = await prisma.teamMember.findMany({
    where: { userId, status: 'active', role: 'captain' },
    select: { teamId: true },
  });
  const teamIds = captainedTeamIds.map(t => t.teamId);

  let leagueInvitations: any[] = [];
  if (teamIds.length > 0) {
    const pendingLeagueMemberships = await prisma.leagueMembership.findMany({
      where: {
        memberType: 'roster',
        memberId: { in: teamIds },
        status: 'pending',
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true,
            imageUrl: true,
            leagueType: true,
          },
        },
        team: {
          select: { id: true, name: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    // Exclude pending invitations where the roster already has an active membership
    // in the same league (handles duplicate membership data)
    const activeLeagueMemberships = await prisma.leagueMembership.findMany({
      where: {
        memberType: 'roster',
        memberId: { in: teamIds },
        status: 'active',
      },
      select: { leagueId: true, memberId: true },
    });
    const activeKeys = new Set(
      activeLeagueMemberships.map(m => `${m.leagueId}:${m.memberId}`)
    );

    const filteredPending = pendingLeagueMemberships.filter(
      m => !activeKeys.has(`${m.leagueId}:${m.memberId}`)
    );

    leagueInvitations = filteredPending.map(m => ({
      id: m.id,
      type: 'league' as const,
      leagueId: m.league.id,
      leagueName: m.league.name,
      sportType: m.league.sportType,
      imageUrl: m.league.imageUrl,
      leagueType: m.league.leagueType,
      rosterId: m.team?.id,
      rosterName: m.team?.name,
      invitedAt: m.joinedAt,
    }));
  }

  // 3. Event invitations — league events where the user is in invitedUserIds
  const eventInvitations = await prisma.event.findMany({
    where: {
      invitedUserIds: { has: userId },
      status: 'active',
      startTime: { gte: new Date() },
      bookings: {
        none: { userId, status: { in: ['confirmed', 'pending'] } },
      },
    },
    select: {
      id: true,
      title: true,
      sportType: true,
      startTime: true,
      imageUrl: true,
      eligibilityRestrictedToLeagues: true,
      facility: {
        select: { id: true, name: true, city: true, state: true },
      },
    },
    orderBy: { startTime: 'asc' },
    take: 50,
  });

  const mappedEventInvitations = eventInvitations.map(e => ({
    id: e.id,
    type: 'event' as const,
    eventId: e.id,
    eventTitle: e.title,
    sportType: e.sportType,
    imageUrl: e.imageUrl,
    startTime: e.startTime,
    facilityName: e.facility?.name || null,
    leagueId: e.eligibilityRestrictedToLeagues?.[0] || null,
  }));

  return {
    rosterInvitations,
    leagueInvitations,
    eventInvitations: mappedEventInvitations,
    total:
      rosterInvitations.length +
      leagueInvitations.length +
      mappedEventInvitations.length,
  };
}

export async function getUserEvents(userId: string, filters: GetEventsFilters) {
  const { page = '1', limit = '50', status } = filters;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  // 1. Events user organized
  const organizedWhere: any = { organizerId: userId };
  if (status && status !== 'all') {
    organizedWhere.status = status;
  }

  // 2. Events user is a confirmed participant in (has a confirmed booking)
  const participantBookings = await prisma.booking.findMany({
    where: {
      userId,
      status: 'confirmed',
    },
    select: { eventId: true },
  });
  const participantEventIds = participantBookings
    .map(b => b.eventId)
    .filter((id): id is string => id !== null);

  // Build combined query: organized OR confirmed participant
  const combinedWhere: any = {
    OR: [
      organizedWhere,
      ...(participantEventIds.length > 0
        ? [
            {
              id: { in: participantEventIds },
              ...(status && status !== 'all' ? { status } : {}),
            },
          ]
        : []),
    ],
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: combinedWhere,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { startTime: 'desc' },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            street: true,
            city: true,
            state: true,
          },
        },
      },
    }),
    prisma.event.count({ where: combinedWhere }),
  ]);

  return {
    data: events,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

export async function getUserTeams(
  userId: string,
  _filters: GetTeamsFilters = {}
) {
  const memberships = await prisma.teamMember.findMany({
    where: { userId, status: 'active' },
    include: {
      team: {
        include: {
          members: {
            include: {
              user: {
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
    orderBy: { joinedAt: 'desc' },
  });

  const teams = memberships.map(m => {
    const { isPrivate, ...rest } = m.team;
    return { ...rest, isPublic: !isPrivate, currentUserRole: m.role };
  });

  return {
    data: teams,
    pagination: {
      page: 1,
      limit: teams.length,
      total: teams.length,
      totalPages: 1,
    },
  };
}

export async function updateUserProfile(
  userId: string,
  data: UpdateProfileData
) {
  // Whitelist allowed fields to prevent Prisma errors on unknown columns
  const allowed = [
    'firstName',
    'lastName',
    'email',
    'phoneNumber',
    'dateOfBirth',
    'gender',
    'profileImage',
    'preferredSports',
    'sportPreferences',
    'locationCity',
    'locationState',
    'locationLat',
    'locationLng',
    'onboardingComplete',
    'intents',
  ];
  const updateData: Record<string, any> = {};
  for (const key of allowed) {
    if ((data as any)[key] !== undefined) {
      updateData[key] = (data as any)[key];
    }
  }

  // Convert dateOfBirth string to Date if needed
  if (updateData.dateOfBirth && typeof updateData.dateOfBirth === 'string') {
    updateData.dateOfBirth = new Date(updateData.dateOfBirth);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      dateOfBirth: true,
      gender: true,
      profileImage: true,
      sportPreferences: true,
      locationCity: true,
      locationState: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

export async function completeOnboarding(userId: string, data: OnboardingData) {
  const {
    firstName,
    lastName,
    dateOfBirth,
    phoneNumber,
    email,
    profileImage,
    intents,
    sportPreferences,
    locationCity,
    locationState,
    locationLat,
    locationLng,
  } = data;

  // Build update payload — only include fields that were provided
  const updateData: Record<string, unknown> = {
    onboardingComplete: true,
  };

  // Name fields
  if (firstName && typeof firstName === 'string' && firstName.trim()) {
    updateData.firstName = firstName.trim();
  }
  if (lastName && typeof lastName === 'string' && lastName.trim()) {
    updateData.lastName = lastName.trim();
  }

  // Date of birth
  if (dateOfBirth) {
    updateData.dateOfBirth = new Date(dateOfBirth);
  }

  // Phone number (optional)
  if (phoneNumber && typeof phoneNumber === 'string') {
    updateData.phoneNumber = phoneNumber.trim();
  }

  // Email — only update if provided AND not an Apple relay address
  if (
    email &&
    typeof email === 'string' &&
    !email.includes('privaterelay.appleid.com')
  ) {
    updateData.email = email.trim().toLowerCase();
  }

  // Profile image (optional)
  if (profileImage && typeof profileImage === 'string') {
    updateData.profileImage = profileImage;
  }

  // Intents and sport preferences — default to empty arrays if not provided
  // (SSO onboarding doesn't collect these; they're handled post-onboarding)
  if (intents && Array.isArray(intents) && intents.length > 0) {
    updateData.intents = intents;
  } else if (!intents) {
    updateData.intents = [];
  }

  if (
    sportPreferences &&
    Array.isArray(sportPreferences) &&
    sportPreferences.length > 0
  ) {
    updateData.sportPreferences = sportPreferences;
  } else if (!sportPreferences) {
    updateData.sportPreferences = [];
  }

  // Location fields
  if (locationCity) updateData.locationCity = locationCity;
  if (locationState) updateData.locationState = locationState;
  if (locationLat != null) updateData.locationLat = locationLat;
  if (locationLng != null) updateData.locationLng = locationLng;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData as any,
  });

  return { success: true, user };
}

export async function getSportRatings(userId: string) {
  const ratings = await prisma.playerSportRating.findMany({
    where: {
      userId,
      OR: [
        { overallEventCount: { gt: 0 } },
        { bracketEventCount: { gt: 0 } },
        { gamesPlayed: { gt: 0 } },
      ],
    },
    select: {
      sportType: true,
      ageBracket: true,
      bracketRating: true,
      overallRating: true,
      bracketPercentile: true,
      overallPercentile: true,
      bracketEventCount: true,
      overallEventCount: true,
      rating: true,
      percentile: true,
      gamesPlayed: true,
      lastUpdated: true,
    },
    orderBy: { overallRating: 'desc' },
  });

  // Safely read new columns that may not exist yet in production
  const sportRatings = ratings.map((r: any) => ({
    sportType: r.sportType,
    ageBracket: r.ageBracket ?? null,
    openRating: r.openRating ?? r.overallRating ?? r.rating ?? 50,
    openPercentile:
      r.openPercentile ?? r.overallPercentile ?? r.percentile ?? null,
    openGamesPlayed:
      r.openGamesPlayed ?? r.overallEventCount ?? r.gamesPlayed ?? 0,
    ageGroupRating: r.ageGroupRating ?? r.bracketRating ?? r.rating ?? 50,
    ageGroupPercentile: r.ageGroupPercentile ?? r.bracketPercentile ?? null,
    ageGroupGamesPlayed:
      r.ageGroupGamesPlayed ?? r.bracketEventCount ?? r.gamesPlayed ?? 0,
    overallRating: r.overallRating ?? r.rating ?? 50,
    overallPercentile: r.overallPercentile ?? r.percentile ?? null,
    overallEventCount: r.overallEventCount ?? r.gamesPlayed ?? 0,
    bracketRating: r.bracketRating ?? r.rating ?? 50,
    bracketPercentile: r.bracketPercentile ?? null,
    bracketEventCount: r.bracketEventCount ?? 0,
    rating: r.rating ?? 50,
    percentile: r.percentile ?? null,
    gamesPlayed: r.gamesPlayed ?? 0,
    lastUpdated: r.lastUpdated,
  }));

  // Safely parse league history — only if the column exists
  const leagueHistory: any[] = [];
  for (const r of ratings as any[]) {
    if (!r.leagueRatingHistory) continue;
    try {
      const history = JSON.parse(r.leagueRatingHistory as string);
      for (const record of history) {
        if (record.archivedAt) leagueHistory.push(record);
      }
    } catch {
      // malformed JSON — skip
    }
  }

  return { sportRatings, leagueHistory };
}

export async function getLeaguesReadyToSchedule(userId: string) {
  const readyLeagues = await prisma.league.findMany({
    where: {
      organizerId: userId,
      readyNotificationSent: true,
      scheduleGenerated: false,
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    select: {
      id: true,
      name: true,
      sportType: true,
      endDate: true,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return readyLeagues;
}

export async function getUserLeagues(userId: string) {
  // Find teams the user is an active member of
  const userTeamIds = (
    await prisma.teamMember.findMany({
      where: { userId, status: 'active' },
      select: { teamId: true },
    })
  ).map(t => t.teamId);

  // Find leagues where user is organizer, direct member, or roster member
  const [organizedLeagues, directMemberships, rosterMemberships] =
    await Promise.all([
      prisma.league.findMany({
        where: { organizerId: userId },
        select: {
          id: true,
          name: true,
          sportType: true,
          leagueType: true,
          isActive: true,
          imageUrl: true,
          isCertified: true,
          organizerId: true,
          memberships: { where: { status: 'active' }, select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.leagueMembership.findMany({
        where: { memberId: userId, status: 'active' },
        include: {
          league: {
            select: {
              id: true,
              name: true,
              sportType: true,
              leagueType: true,
              isActive: true,
              imageUrl: true,
              isCertified: true,
              organizerId: true,
              memberships: {
                where: { status: 'active' },
                select: { id: true },
              },
            },
          },
        },
        take: 50,
      }),
      userTeamIds.length > 0
        ? prisma.leagueMembership.findMany({
            where: {
              memberId: { in: userTeamIds },
              memberType: 'roster',
              status: 'active',
            },
            include: {
              league: {
                select: {
                  id: true,
                  name: true,
                  sportType: true,
                  leagueType: true,
                  isActive: true,
                  imageUrl: true,
                  isCertified: true,
                  organizerId: true,
                  memberships: {
                    where: { status: 'active' },
                    select: { id: true },
                  },
                },
              },
            },
            take: 50,
          })
        : Promise.resolve([]),
    ]);

  // Merge and deduplicate
  const leagueMap = new Map<string, any>();
  organizedLeagues.forEach(l => {
    leagueMap.set(l.id, {
      ...l,
      memberCount: l.memberships.length,
      role: 'commissioner',
    });
  });
  directMemberships.forEach(m => {
    if (m.league && !leagueMap.has(m.league.id)) {
      leagueMap.set(m.league.id, {
        ...m.league,
        memberCount: m.league.memberships.length,
        role: 'player',
      });
    }
  });
  rosterMemberships.forEach(m => {
    if (m.league && !leagueMap.has(m.league.id)) {
      leagueMap.set(m.league.id, {
        ...m.league,
        memberCount: m.league.memberships.length,
        role: 'player',
      });
    }
  });

  const leagues = Array.from(leagueMap.values()).map(
    ({ memberships, ...rest }) => rest
  );
  return leagues;
}

export async function updateIntents(userId: string, intents: string[]) {
  if (!intents || !Array.isArray(intents) || intents.length === 0) {
    throw new ServiceError('At least one intent is required', 400);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { intents },
  });

  return { success: true, user };
}

export async function getOnboardingStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new ServiceError('User not found', 404);
  }

  return { completed: true, userId: user.id };
}

export async function getOpenGroundLocations(userId: string) {
  const locations = await prisma.savedOpenGroundLocation.findMany({
    where: { userId },
    orderBy: { lastUsedAt: 'desc' },
    select: { id: true, name: true, address: true, lastUsedAt: true },
    take: 10,
  });

  return locations;
}

export async function saveOpenGroundLocation(
  userId: string,
  name: string,
  address?: string
) {
  if (!name?.trim()) {
    throw new ServiceError('name is required', 400);
  }

  const location = await prisma.savedOpenGroundLocation.upsert({
    where: {
      userId_name_address: {
        userId,
        name: name.trim(),
        address: address?.trim() ?? '',
      },
    },
    create: { userId, name: name.trim(), address: address?.trim() ?? null },
    update: { lastUsedAt: new Date() },
    select: { id: true, name: true, address: true, lastUsedAt: true },
  });

  return location;
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      dateOfBirth: true,
      profileImage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ServiceError('User not found', 404);
  }

  return user;
}

export async function updateUserById(id: string, data: Record<string, any>) {
  const { password, ...updateData } = data;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      dateOfBirth: true,
      profileImage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}
