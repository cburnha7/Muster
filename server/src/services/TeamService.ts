import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { ServiceError } from '../utils/ServiceError';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GetTeamsFilters {
  sportType?: string;
  page?: string;
  limit?: string;
}

export interface CreateTeamData {
  name: string;
  description?: string;
  sportType?: string;
  sportTypes?: string[];
  skillLevel?: string;
  maxMembers?: number;
  isPublic?: boolean;
  genderRestriction?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  initialMemberIds?: string[];
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  sportType?: string;
  sportTypes?: string[];
  skillLevel?: string;
  maxMembers?: number;
  isPublic?: boolean;
  coverImageUrl?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Map a raw team row to the frontend shape (isPrivate → isPublic, normalise sportTypes). */
function mapTeamToPublic(team: any) {
  const { isPrivate, ...rest } = team;
  return {
    ...rest,
    isPublic: !isPrivate,
    sportTypes:
      rest.sportTypes && rest.sportTypes.length > 0
        ? rest.sportTypes
        : rest.sportType
          ? [rest.sportType]
          : [],
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getTeams(filters: GetTeamsFilters) {
  const { sportType, page = '1', limit = '10' } = filters;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where: any = {};
  if (sportType) {
    where.OR = [{ sportType }, { sportTypes: { has: sportType } }];
  }

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where,
      skip,
      take,
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
    }),
    prisma.team.count({ where }),
  ]);

  return {
    data: teams.map(mapTeamToPublic),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / take),
    },
  };
}

export async function validateInviteCode(code: string) {
  if (!code || typeof code !== 'string') {
    throw new ServiceError('Invite code is required', 400);
  }

  const inviteLink = await prisma.inviteLink.findFirst({
    where: {
      token: code.toUpperCase(),
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    include: {
      team: {
        include: {
          members: {
            where: { status: 'active' },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!inviteLink) {
    return { valid: false as const };
  }

  // Check max uses
  if (
    inviteLink.maxUses !== null &&
    inviteLink.useCount >= inviteLink.maxUses
  ) {
    return { valid: false as const };
  }

  const { team } = inviteLink;
  return {
    valid: true as const,
    team: {
      id: team.id,
      name: team.name,
      sportType: team.sportType,
      skillLevel: team.skillLevel,
      memberCount: team.members.length,
      maxMembers: team.maxMembers,
      imageUrl: team.imageUrl,
    },
    expiresAt: inviteLink.expiresAt,
  };
}

export async function getTeamById(id: string) {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
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
      },
    },
  });

  if (!team) {
    throw new ServiceError('Team not found', 404);
  }

  return mapTeamToPublic(team);
}

export async function updateTeam(id: string, data: UpdateTeamData) {
  const {
    name,
    description,
    sportType,
    sportTypes,
    skillLevel,
    maxMembers,
    isPublic,
    coverImageUrl,
  } = data;

  const existing = await prisma.team.findUnique({ where: { id } });
  if (!existing) {
    throw new ServiceError('Team not found', 404);
  }

  const team = await prisma.team.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(sportType !== undefined && { sportType }),
      ...(sportTypes !== undefined && { sportTypes }),
      ...(skillLevel !== undefined && { skillLevel }),
      ...(maxMembers !== undefined && { maxMembers }),
      ...(isPublic !== undefined && { isPrivate: !isPublic }),
      ...(coverImageUrl !== undefined && { coverImageUrl }),
    },
    include: {
      members: {
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
      },
    },
  });

  return mapTeamToPublic(team);
}

export async function deleteTeam(id: string) {
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) {
    throw new ServiceError('Team not found', 404);
  }

  // Check for upcoming events where this roster is an active participant
  const now = new Date();
  const upcomingEvents = await prisma.event.findMany({
    where: {
      startTime: { gt: now },
      status: { not: 'cancelled' },
      eligibilityRestrictedToTeams: { has: id },
    },
    select: { id: true, title: true, startTime: true },
    orderBy: { startTime: 'asc' },
  });

  if (upcomingEvents.length > 0) {
    throw new ServiceError(
      'This roster is registered in upcoming events. Remove it from all upcoming events before deleting.',
      409,
      {
        error: 'UPCOMING_EVENTS_CONFLICT',
        events: upcomingEvents.map(e => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
        })),
      }
    );
  }

  await prisma.$transaction(async tx => {
    // Delete conversations linked to this roster
    const conversations = await tx.conversation.findMany({
      where: { entityId: id, type: 'TEAM_CHAT' },
      select: { id: true },
    });
    const convIds = conversations.map(c => c.id);
    if (convIds.length > 0) {
      await tx.messageReaction.deleteMany({
        where: { message: { conversationId: { in: convIds } } },
      });
      await tx.message.deleteMany({
        where: { conversationId: { in: convIds } },
      });
      await tx.conversationParticipant.deleteMany({
        where: { conversationId: { in: convIds } },
      });
      await tx.conversation.deleteMany({ where: { id: { in: convIds } } });
    }

    // Delete booking participants referencing this roster
    await tx.bookingParticipant.deleteMany({ where: { rosterId: id } });

    // Remove roster from eligibilityRestrictedToTeams arrays
    const eventsWithRestriction = await tx.event.findMany({
      where: { eligibilityRestrictedToTeams: { has: id } },
      select: { id: true, eligibilityRestrictedToTeams: true },
    });
    for (const evt of eventsWithRestriction) {
      await tx.event.update({
        where: { id: evt.id },
        data: {
          eligibilityRestrictedToTeams: evt.eligibilityRestrictedToTeams.filter(
            tid => tid !== id
          ),
        },
      });
    }

    // Delete matches referencing this team
    await tx.match.deleteMany({
      where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
    });

    // Delete league memberships
    await tx.leagueMembership.deleteMany({ where: { teamId: id } });

    // Delete team members
    await tx.teamMember.deleteMany({ where: { teamId: id } });

    // Delete the team
    await tx.team.delete({ where: { id } });
  });
}

export async function createTeam(data: CreateTeamData, creatorId: string) {
  const { initialMemberIds, isPublic, ...rest } = data;

  // Plan gate: 2nd+ roster requires 'roster' plan
  {
    const { userBypassesPlanGate } = require('../middleware/subscription');
    const bypassed = await userBypassesPlanGate(creatorId, 'roster');
    if (!bypassed) {
      const PLAN_HIERARCHY = [
        'free',
        'roster',
        'league',
        'facility_basic',
        'facility_pro',
      ];
      const existingRosterCount = await prisma.teamMember.count({
        where: { userId: creatorId, role: 'captain', status: 'active' },
      });
      if (existingRosterCount >= 1) {
        const sub = await prisma.subscription.findUnique({
          where: { userId: creatorId },
          select: { plan: true, status: true },
        });
        const userPlan = sub?.plan || 'free';
        const isActive =
          !sub || sub.status === 'active' || sub.status === 'trialing';
        if (
          !isActive ||
          PLAN_HIERARCHY.indexOf(userPlan) < PLAN_HIERARCHY.indexOf('roster')
        ) {
          throw new ServiceError('Plan upgrade required', 403, {
            requiredPlan: 'roster',
            currentPlan: userPlan,
          });
        }
      }
    }
  }

  // Map frontend fields to DB fields explicitly
  const teamData: any = {
    name: rest.name,
    description: rest.description || '',
    sportType: rest.sportType || rest.sportTypes?.[0] || '',
    sportTypes:
      rest.sportTypes && rest.sportTypes.length > 0
        ? rest.sportTypes
        : rest.sportType
          ? [rest.sportType]
          : [],
    skillLevel: rest.skillLevel || 'all_levels',
    maxMembers: rest.maxMembers || 10,
    isPrivate: isPublic === undefined ? false : !isPublic,
    ...(rest.genderRestriction
      ? { genderRestriction: rest.genderRestriction }
      : {}),
    ...(rest.imageUrl ? { imageUrl: rest.imageUrl } : {}),
    ...(rest.coverImageUrl ? { coverImageUrl: rest.coverImageUrl } : {}),
  };

  // Create the team
  const team = await prisma.team.create({
    data: teamData,
  });

  // Add the creator as captain
  if (creatorId) {
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: creatorId,
        role: 'captain',
        status: 'active',
        joinedAt: new Date(),
      },
    });
  }

  // Add initial members if provided
  if (
    initialMemberIds &&
    Array.isArray(initialMemberIds) &&
    initialMemberIds.length > 0
  ) {
    const memberIds = (
      creatorId
        ? initialMemberIds.filter((id: string) => id !== creatorId)
        : initialMemberIds
    ).filter((id: string) => !id.startsWith('pending-'));

    if (memberIds.length > 0) {
      await prisma.teamMember.createMany({
        data: memberIds.map((userId: string) => ({
          teamId: team.id,
          userId,
          role: 'member',
          status: 'pending',
          joinedAt: new Date(),
        })),
      });
    }
  }

  // Fetch the complete team with members
  const completeTeam = await prisma.team.findUnique({
    where: { id: team.id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  // Messaging hook: create team chat
  try {
    const { MessagingService } = await import('../services/MessagingService');
    if (creatorId) {
      await MessagingService.createTeamChat(team.id, creatorId, team.name);
    }
  } catch (msgErr) {
    console.error('Failed to create team chat:', msgErr);
  }

  if (completeTeam) {
    return mapTeamToPublic(completeTeam);
  }
  return completeTeam;
}

export async function joinTeam(
  teamId: string,
  userId: string,
  inviteCode?: string
) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: true },
  });

  if (!team) {
    throw new ServiceError('Roster not found', 404);
  }

  // Check if already a member
  const existingMember = team.members.find(m => m.userId === userId);
  if (existingMember && existingMember.status === 'active') {
    throw new ServiceError('You are already a member of this roster', 400);
  }

  // Validate invite code if provided
  let validInviteLink = false;
  if (inviteCode) {
    const link = await prisma.inviteLink.findFirst({
      where: {
        token: inviteCode.toUpperCase(),
        teamId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (link && (link.maxUses === null || link.useCount < link.maxUses)) {
      validInviteLink = true;
      // Increment use count
      await prisma.inviteLink.update({
        where: { id: link.id },
        data: { useCount: { increment: 1 } },
      });
    }
  }

  // Private roster: require existing membership record OR valid invite code
  if (team.isPrivate) {
    const wasInvited = team.members.some(m => m.userId === userId);

    if (!wasInvited && !validInviteLink) {
      throw new ServiceError(
        'This is a private roster. You need an invite to join.',
        403
      );
    }
  }

  // Check capacity
  const activeCount = team.members.filter(m => m.status === 'active').length;
  if (activeCount >= team.maxMembers) {
    throw new ServiceError('This roster is full', 400);
  }

  // Create or reactivate membership
  let member;
  if (existingMember) {
    member = await prisma.teamMember.update({
      where: { id: existingMember.id },
      data: { status: 'active', joinedAt: new Date() },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  } else {
    member = await prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role: 'member',
        status: 'active',
        joinedAt: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // Messaging hook: add to team chat
  try {
    const { MessagingService } = await import('../services/MessagingService');
    const conv = await MessagingService.getConversationForTeam(teamId);
    if (conv) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      await MessagingService.addParticipant(conv.id, userId, 'MEMBER');
      if (user)
        await MessagingService.postSystemMessage(
          conv.id,
          `${user.firstName} ${user.lastName} joined the team`
        );
    }
  } catch (msgErr) {
    console.error('Failed to update team chat on join:', msgErr);
  }

  return member;
}

export async function leaveTeam(teamId: string, userId: string) {
  const member = await prisma.teamMember.findFirst({
    where: { teamId, userId, status: 'active' },
  });

  if (!member) {
    throw new ServiceError('You are not a member of this roster', 404);
  }

  if (member.role === 'captain') {
    throw new ServiceError(
      'Captains cannot leave. Transfer captaincy first or delete the roster.',
      400
    );
  }

  await prisma.teamMember.delete({ where: { id: member.id } });

  // Messaging hook: remove from team chat
  try {
    const { MessagingService } = await import('../services/MessagingService');
    const conv = await MessagingService.getConversationForTeam(teamId);
    if (conv) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      await MessagingService.removeParticipant(conv.id, userId);
      if (user)
        await MessagingService.postSystemMessage(
          conv.id,
          `${user.firstName} ${user.lastName} left the team`
        );
    }
  } catch (msgErr) {
    console.error('Failed to update team chat on leave:', msgErr);
  }
}

export async function addMember(teamId: string, userId: string) {
  if (!userId) {
    throw new ServiceError('userId is required', 400);
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: true },
  });

  if (!team) {
    throw new ServiceError('Roster not found', 404);
  }

  // Check if already a member
  const existing = team.members.find(m => m.userId === userId);
  if (existing && existing.status === 'active') {
    throw new ServiceError('User is already a player in this roster', 400);
  }

  // Check capacity
  const activeCount = team.members.filter(m => m.status === 'active').length;
  if (activeCount >= team.maxMembers) {
    throw new ServiceError('This roster is full', 400);
  }

  let member;
  if (existing) {
    member = await prisma.teamMember.update({
      where: { id: existing.id },
      data: { status: 'pending', joinedAt: new Date() },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  } else {
    member = await prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role: 'member',
        status: 'pending',
        joinedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  return member;
}

export async function removeMember(teamId: string, userId: string) {
  const membership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });

  if (!membership) {
    throw new ServiceError('Player not found in this roster', 404);
  }

  await prisma.teamMember.delete({
    where: { id: membership.id },
  });

  // Messaging hook: remove from team chat
  try {
    const { MessagingService } = await import('../services/MessagingService');
    const conv = await MessagingService.getConversationForTeam(teamId);
    if (conv) {
      const removedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      await MessagingService.removeParticipant(conv.id, userId);
      if (removedUser)
        await MessagingService.postSystemMessage(
          conv.id,
          `${removedUser.firstName} ${removedUser.lastName} left the team`
        );
    }
  } catch (msgErr) {
    console.error('Failed to update team chat on leave:', msgErr);
  }
}

export async function getTeamEvents(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    throw new ServiceError('Team not found', 404);
  }

  const now = new Date();

  const events = await prisma.event.findMany({
    where: {
      startTime: { gte: now },
      status: 'active',
      OR: [
        { eligibilityRestrictedToTeams: { has: teamId } },
        { coveringTeamId: teamId },
      ],
    },
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
    orderBy: { startTime: 'asc' },
    take: 20,
  });

  return events;
}

export async function getTeamLeagues(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new ServiceError('Team not found', 404);
  }

  const memberships = await prisma.leagueMembership.findMany({
    where: {
      teamId,
      status: { in: ['active', 'pending'] },
    },
    include: {
      league: {
        include: {
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: {
      joinedAt: 'desc',
    },
  });

  const leagues = memberships.map(membership => ({
    ...membership.league,
    membership: {
      id: membership.id,
      status: membership.status,
      joinedAt: membership.joinedAt,
      matchesPlayed: membership.matchesPlayed,
      wins: membership.wins,
      losses: membership.losses,
      draws: membership.draws,
      points: membership.points,
      goalsFor: membership.goalsFor,
      goalsAgainst: membership.goalsAgainst,
      goalDifference: membership.goalDifference,
    },
  }));

  return leagues;
}

export async function generateInviteLink(
  teamId: string,
  userId: string,
  maxUses?: number | null
) {
  // Verify team exists and user is captain/co-captain
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        where: { userId, status: 'active' },
        select: { role: true },
      },
    },
  });

  if (!team) {
    throw new ServiceError('Roster not found', 404);
  }

  const member = team.members[0];
  if (!member || (member.role !== 'captain' && member.role !== 'co_captain')) {
    throw new ServiceError(
      'Only captains and co-captains can generate invite links',
      403
    );
  }

  // Check for existing active, non-expired link with >1 day remaining
  const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const existingLink = await prisma.inviteLink.findFirst({
    where: {
      teamId,
      isActive: true,
      expiresAt: { gt: oneDayFromNow },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingLink) {
    return {
      link: `https://muster.app/join/${existingLink.token}`,
      code: existingLink.token,
      expiresAt: existingLink.expiresAt,
    };
  }

  // Generate a new 8-char uppercase hex token
  const token = crypto.randomBytes(4).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const inviteLink = await prisma.inviteLink.create({
    data: {
      token,
      teamId,
      createdBy: userId,
      expiresAt,
      maxUses: maxUses ?? null,
    },
  });

  return {
    link: `https://muster.app/join/${inviteLink.token}`,
    code: inviteLink.token,
    expiresAt: inviteLink.expiresAt,
  };
}
