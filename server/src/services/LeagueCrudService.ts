import { prisma } from '../lib/prisma';
import { LeagueDeletionService } from './LeagueDeletionService';
import { ServiceError } from '../utils/ServiceError';

const leagueDeletionService = new LeagueDeletionService();

// ─── Helpers ────────────────────────────────────────────────────────────────

const hhmmRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateTimeWindows(
  preferredTimeWindowStart?: string,
  preferredTimeWindowEnd?: string
) {
  if (preferredTimeWindowStart && !hhmmRegex.test(preferredTimeWindowStart)) {
    throw new ServiceError(
      'preferredTimeWindowStart must be in HH:MM 24-hour format',
      400
    );
  }
  if (preferredTimeWindowEnd && !hhmmRegex.test(preferredTimeWindowEnd)) {
    throw new ServiceError(
      'preferredTimeWindowEnd must be in HH:MM 24-hour format',
      400
    );
  }
  if (
    preferredTimeWindowStart &&
    preferredTimeWindowEnd &&
    preferredTimeWindowStart >= preferredTimeWindowEnd
  ) {
    throw new ServiceError(
      'preferredTimeWindowStart must be before preferredTimeWindowEnd',
      400
    );
  }
}

function validateCommonFields(body: Record<string, any>) {
  const { suggestedRosterSize, preferredGameDays, registrationCloseDate } =
    body;

  validateTimeWindows(
    body.preferredTimeWindowStart,
    body.preferredTimeWindowEnd
  );

  if (
    suggestedRosterSize !== undefined &&
    suggestedRosterSize !== null &&
    (typeof suggestedRosterSize !== 'number' || suggestedRosterSize < 1)
  ) {
    throw new ServiceError(
      'suggestedRosterSize must be a positive integer',
      400
    );
  }

  if (registrationCloseDate) {
    const closeDate = new Date(registrationCloseDate);
    if (closeDate <= new Date()) {
      throw new ServiceError(
        'registrationCloseDate must be in the future',
        400
      );
    }
  }

  if (preferredGameDays && Array.isArray(preferredGameDays)) {
    if (preferredGameDays.some((d: number) => d < 0 || d > 6)) {
      throw new ServiceError(
        'preferredGameDays values must be between 0 (Sunday) and 6 (Saturday)',
        400
      );
    }
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface GetLeaguesFilters {
  sportType?: string;
  isCertified?: string;
  isActive?: string;
  search?: string;
  page?: string;
  limit?: string;
}

export async function getLeagues(filters: GetLeaguesFilters) {
  const {
    sportType,
    isCertified,
    isActive,
    search,
    page = '1',
    limit = '20',
  } = filters;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (sportType) {
    where.sportType = sportType;
  }
  if (isCertified !== undefined) {
    where.isCertified = isCertified === 'true';
  }
  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const total = await prisma.league.count({ where });

  const leagues = await prisma.league.findMany({
    where,
    skip,
    take: limitNum,
    include: {
      organizer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profileImage: true,
        },
      },
      memberships: {
        where: { status: 'active', memberType: 'roster' },
        select: { id: true },
      },
      matches: {
        select: { id: true },
      },
    },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  });

  const leaguesWithCounts = leagues.map(league => ({
    ...league,
    memberCount: league.memberships.length,
    matchCount: league.matches.length,
    memberships: undefined,
    matches: undefined,
  }));

  return {
    data: leaguesWithCounts,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

export async function getLeagueById(id: string) {
  const league = await prisma.league.findUnique({
    where: { id },
    include: {
      organizer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profileImage: true,
        },
      },
      memberships: {
        where: { status: { in: ['active', 'pending'] } },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              sportType: true,
              isPrivate: true,
              _count: { select: { members: true } },
            },
          },
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
      },
      matches: {
        take: 10,
        orderBy: { scheduledAt: 'desc' },
        include: {
          homeTeam: { select: { id: true, name: true, imageUrl: true } },
          awayTeam: { select: { id: true, name: true, imageUrl: true } },
        },
      },
      seasons: { orderBy: { startDate: 'desc' } },
    },
  });

  if (!league) {
    throw new ServiceError('League not found', 404);
  }

  // Cleanup stale/duplicate memberships
  let cleanedMemberships = [...league.memberships];

  const activeMemberIds = cleanedMemberships
    .filter(m => m.status === 'active' && m.memberType === 'roster')
    .map(m => m.memberId);

  if (activeMemberIds.length > 0) {
    const stalePending = cleanedMemberships.filter(
      m =>
        m.status === 'pending' &&
        m.memberType === 'roster' &&
        activeMemberIds.includes(m.memberId)
    );
    if (stalePending.length > 0) {
      await prisma.leagueMembership.deleteMany({
        where: { id: { in: stalePending.map(m => m.id) } },
      });
      cleanedMemberships = cleanedMemberships.filter(
        m => !stalePending.some(s => s.id === m.id)
      );
    }
  }

  // Cleanup duplicate pending memberships for the same roster
  const pendingRosterMemberships = cleanedMemberships.filter(
    m => m.status === 'pending' && m.memberType === 'roster'
  );
  const seenPendingRosterIds = new Set<string>();
  const duplicatePendingIds: string[] = [];
  for (const m of pendingRosterMemberships) {
    if (seenPendingRosterIds.has(m.memberId)) {
      duplicatePendingIds.push(m.id);
    } else {
      seenPendingRosterIds.add(m.memberId);
    }
  }
  if (duplicatePendingIds.length > 0) {
    await prisma.leagueMembership.deleteMany({
      where: { id: { in: duplicatePendingIds } },
    });
    cleanedMemberships = cleanedMemberships.filter(
      m => !duplicatePendingIds.includes(m.id)
    );
  }

  return { ...league, memberships: cleanedMemberships };
}

export interface CreateLeagueData {
  name: string;
  description?: string;
  sportType: string;
  skillLevel: string;
  minPlayerRating?: number | null;
  seasonName?: string;
  startDate?: string;
  endDate?: string;
  pointsConfig?: any;
  imageUrl?: string;
  organizerId?: string;
  leagueType?: string;
  visibility?: string;
  membershipFee?: number;
  suggestedRosterSize?: number;
  registrationCloseDate?: string;
  preferredGameDays?: number[];
  preferredTimeWindowStart?: string;
  preferredTimeWindowEnd?: string;
  seasonGameCount?: number;
  rosterIds?: string[];
  trackStandings?: boolean;
  leagueFormat?: string;
  playoffTeamCount?: number;
  eliminationFormat?: string;
  gameFrequency?: string;
  scheduleFrequency?: string;
  seasonLength?: number;
  genderRestriction?: string;
  invitedRosterIds?: string[];
}

export async function createLeague(
  data: CreateLeagueData,
  authenticatedUserId: string
) {
  const {
    name,
    description,
    sportType,
    skillLevel,
    minPlayerRating,
    seasonName,
    startDate,
    endDate,
    pointsConfig,
    imageUrl,
    organizerId: _clientOrganizerId,
    visibility,
    membershipFee,
    suggestedRosterSize,
    registrationCloseDate,
    preferredGameDays,
    preferredTimeWindowStart,
    preferredTimeWindowEnd,
    seasonGameCount,
    rosterIds,
    trackStandings,
    leagueFormat,
    playoffTeamCount,
    eliminationFormat,
    gameFrequency,
    scheduleFrequency,
    seasonLength,
    genderRestriction,
    invitedRosterIds,
  } = data;

  const organizerId = authenticatedUserId || _clientOrganizerId;

  if (!name || !sportType || !skillLevel || !organizerId) {
    throw new ServiceError(
      'Missing required fields: name, sportType, skillLevel, organizerId',
      400,
      {
        received: {
          name: !!name,
          sportType: !!sportType,
          skillLevel: !!skillLevel,
          organizerId: !!organizerId,
        },
      }
    );
  }

  validateCommonFields(data);

  const finalLeagueType = 'team';
  const finalVisibility =
    visibility === 'public' || visibility === 'private' ? visibility : 'public';

  // Validate name uniqueness within sport and season
  if (startDate && endDate) {
    const existingLeague = await prisma.league.findFirst({
      where: {
        name,
        sportType,
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(endDate) } },
              { endDate: { gte: new Date(startDate) } },
            ],
          },
        ],
      },
    });

    if (existingLeague) {
      throw new ServiceError(
        'A league with this name already exists for this sport and season timeframe',
        409
      );
    }
  }

  const league = await prisma.league.create({
    data: {
      name,
      description,
      sportType,
      skillLevel,
      ...(minPlayerRating != null && { minPlayerRating }),
      seasonName,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      pointsConfig: pointsConfig || { win: 3, draw: 1, loss: 0 },
      imageUrl,
      organizerId,
      leagueType: finalLeagueType,
      visibility: finalVisibility,
      ...(membershipFee !== undefined && { membershipFee }),
      ...(suggestedRosterSize !== undefined && { suggestedRosterSize }),
      ...(registrationCloseDate && {
        registrationCloseDate: new Date(registrationCloseDate),
      }),
      ...(preferredGameDays && { preferredGameDays }),
      ...(preferredTimeWindowStart && { preferredTimeWindowStart }),
      ...(preferredTimeWindowEnd && { preferredTimeWindowEnd }),
      ...(seasonGameCount !== undefined &&
        seasonGameCount !== null && { seasonGameCount }),
      ...(trackStandings !== undefined && { trackStandings }),
      ...(leagueFormat && { leagueFormat }),
      ...(playoffTeamCount !== undefined &&
        playoffTeamCount !== null && { playoffTeamCount }),
      ...(eliminationFormat && { eliminationFormat }),
      ...(gameFrequency && { gameFrequency }),
      ...(scheduleFrequency && { scheduleFrequency }),
      ...(seasonLength !== undefined &&
        seasonLength !== null && { seasonLength }),
      ...(genderRestriction && { genderRestriction }),
      autoGenerateMatchups: false,
    },
    include: {
      organizer: {
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

  // Create roster memberships if rosterIds provided
  if (Array.isArray(rosterIds) && rosterIds.length > 0) {
    await prisma.leagueMembership.createMany({
      data: rosterIds.map((rid: string) => ({
        leagueId: league.id,
        memberId: rid,
        teamId: rid,
        memberType: 'roster',
        status: 'active',
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
      })),
      skipDuplicates: true,
    });
  }

  // Create pending memberships for invited rosters
  if (Array.isArray(invitedRosterIds) && invitedRosterIds.length > 0) {
    const activeIds = new Set(Array.isArray(rosterIds) ? rosterIds : []);
    const toInvite = invitedRosterIds.filter(
      (rid: string) => !activeIds.has(rid)
    );
    if (toInvite.length > 0) {
      await prisma.leagueMembership.createMany({
        data: toInvite.map((rid: string) => ({
          leagueId: league.id,
          memberId: rid,
          teamId: rid,
          memberType: 'roster',
          status: 'pending',
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
        })),
        skipDuplicates: true,
      });
    }
  }

  // Messaging hook: create league channels
  try {
    const { MessagingService } = await import('./MessagingService');
    await MessagingService.createLeagueChannels(
      league.id,
      organizerId,
      league.name || 'League'
    );
  } catch (msgErr) {
    console.error('Failed to create league channels:', msgErr);
  }

  return league;
}

export interface UpdateLeagueData {
  name?: string;
  description?: string;
  skillLevel?: string;
  minPlayerRating?: number;
  seasonName?: string;
  startDate?: string;
  endDate?: string;
  pointsConfig?: any;
  imageUrl?: string;
  isActive?: boolean;
  leagueType?: string;
  visibility?: string;
  userId: string;
  suggestedRosterSize?: number;
  registrationCloseDate?: string | null;
  preferredGameDays?: number[];
  preferredTimeWindowStart?: string;
  preferredTimeWindowEnd?: string;
  seasonGameCount?: number;
  rosterIds?: string[];
  invitedRosterIds?: string[];
  trackStandings?: boolean;
  seasonLength?: number;
  scheduleFrequency?: string;
  leagueFormat?: string;
  playoffTeamCount?: number;
  eliminationFormat?: string;
  gameFrequency?: string;
}

export async function updateLeague(id: string, data: UpdateLeagueData) {
  const {
    name,
    description,
    skillLevel,
    minPlayerRating,
    seasonName,
    startDate,
    endDate,
    pointsConfig,
    imageUrl,
    isActive,
    visibility,
    userId,
    suggestedRosterSize,
    registrationCloseDate,
    preferredGameDays,
    preferredTimeWindowStart,
    preferredTimeWindowEnd,
    seasonGameCount,
    rosterIds,
    invitedRosterIds,
    trackStandings,
    seasonLength,
    scheduleFrequency,
    leagueFormat,
    playoffTeamCount,
    eliminationFormat,
    gameFrequency,
  } = data;

  const existingLeague = await prisma.league.findUnique({ where: { id } });

  if (!existingLeague) {
    throw new ServiceError('League not found', 404);
  }

  if (existingLeague.organizerId !== userId) {
    throw new ServiceError(
      'Only the league operator can update this league',
      403
    );
  }

  validateCommonFields(data);

  const league = await prisma.league.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(skillLevel && { skillLevel }),
      ...(minPlayerRating !== undefined && { minPlayerRating }),
      ...(seasonName !== undefined && { seasonName }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(pointsConfig && { pointsConfig }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(isActive !== undefined && { isActive }),
      ...(visibility !== undefined && { visibility }),
      ...(suggestedRosterSize !== undefined && { suggestedRosterSize }),
      ...(registrationCloseDate !== undefined && {
        registrationCloseDate: registrationCloseDate
          ? new Date(registrationCloseDate)
          : null,
      }),
      ...(preferredGameDays !== undefined && { preferredGameDays }),
      ...(preferredTimeWindowStart !== undefined && {
        preferredTimeWindowStart,
      }),
      ...(preferredTimeWindowEnd !== undefined && { preferredTimeWindowEnd }),
      ...(seasonGameCount !== undefined && { seasonGameCount }),
      ...(trackStandings !== undefined && { trackStandings }),
      ...(seasonLength !== undefined && { seasonLength }),
      ...(scheduleFrequency !== undefined && { scheduleFrequency }),
      ...(leagueFormat !== undefined && { leagueFormat }),
      ...(playoffTeamCount !== undefined && { playoffTeamCount }),
      ...(eliminationFormat !== undefined && { eliminationFormat }),
      ...(gameFrequency !== undefined && { gameFrequency }),
    },
    include: {
      organizer: {
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

  // Sync roster memberships if rosterIds provided
  if (Array.isArray(rosterIds)) {
    const currentActiveMemberships = await prisma.leagueMembership.findMany({
      where: { leagueId: id, memberType: 'roster', status: 'active' },
      select: { id: true, memberId: true },
    });
    const currentActiveRosterIds = currentActiveMemberships.map(
      (m: any) => m.memberId
    );

    const toAddActive = rosterIds.filter(
      (rid: string) => !currentActiveRosterIds.includes(rid)
    );
    const toRemoveActive = currentActiveMemberships.filter(
      (m: any) => !rosterIds.includes(m.memberId)
    );

    if (toAddActive.length > 0) {
      const existingPending = await prisma.leagueMembership.findMany({
        where: {
          leagueId: id,
          memberType: 'roster',
          memberId: { in: toAddActive },
          status: 'pending',
        },
        select: { id: true, memberId: true },
      });
      const pendingRosterIds = new Set(
        existingPending.map((m: any) => m.memberId)
      );

      if (existingPending.length > 0) {
        await prisma.leagueMembership.updateMany({
          where: { id: { in: existingPending.map((m: any) => m.id) } },
          data: { status: 'active' },
        });
      }

      const trulyNew = toAddActive.filter(
        (rid: string) => !pendingRosterIds.has(rid)
      );
      if (trulyNew.length > 0) {
        await prisma.leagueMembership.createMany({
          data: trulyNew.map((rid: string) => ({
            leagueId: id,
            memberId: rid,
            teamId: rid,
            memberType: 'roster',
            status: 'active',
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            points: 0,
          })),
          skipDuplicates: true,
        });
      }
    }

    if (toRemoveActive.length > 0) {
      await prisma.leagueMembership.deleteMany({
        where: { id: { in: toRemoveActive.map((m: any) => m.id) } },
      });
    }
  }

  // Sync invited (pending) roster memberships if invitedRosterIds provided
  if (Array.isArray(invitedRosterIds)) {
    const currentPendingMemberships = await prisma.leagueMembership.findMany({
      where: { leagueId: id, memberType: 'roster', status: 'pending' },
      select: { id: true, memberId: true },
    });
    const currentPendingRosterIds = currentPendingMemberships.map(
      (m: any) => m.memberId
    );

    const toInvite = invitedRosterIds.filter(
      (rid: string) => !currentPendingRosterIds.includes(rid)
    );
    const toRemovePending = currentPendingMemberships.filter(
      (m: any) => !invitedRosterIds.includes(m.memberId)
    );

    if (toInvite.length > 0) {
      await prisma.leagueMembership.createMany({
        data: toInvite.map((rid: string) => ({
          leagueId: id,
          memberId: rid,
          teamId: rid,
          memberType: 'roster',
          status: 'pending',
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
        })),
        skipDuplicates: true,
      });
    }

    if (toRemovePending.length > 0) {
      await prisma.leagueMembership.deleteMany({
        where: { id: { in: toRemovePending.map((m: any) => m.id) } },
      });
    }
  }

  return league;
}

export async function deleteLeague(id: string, userId: string) {
  const existingLeague = await prisma.league.findUnique({ where: { id } });

  if (!existingLeague) {
    throw new ServiceError('League not found', 404);
  }

  if (existingLeague.organizerId !== userId) {
    throw new ServiceError(
      'Only the league operator can delete this league',
      403
    );
  }

  if (existingLeague.lockedFromDeletion) {
    throw new ServiceError(
      'This league cannot be deleted because matches have been played',
      403
    );
  }

  return leagueDeletionService.executeLeagueDeletion(id);
}

export async function getDeletionPreview(id: string, userId: string) {
  const league = await prisma.league.findUnique({ where: { id } });

  if (!league) {
    throw new ServiceError('League not found', 404);
  }

  if (league.organizerId !== userId) {
    throw new ServiceError('Only the league commissioner can access this', 403);
  }

  if (league.lockedFromDeletion) {
    throw new ServiceError(
      'This league cannot be deleted because matches have been played',
      403
    );
  }

  return leagueDeletionService.getDeletionPreview(id);
}
