import { prisma } from '../lib/prisma';
import { NotificationService } from './NotificationService';
import { checkLeagueReady } from '../jobs/league-ready-check';

/** Service error with HTTP status code */
class ServiceError extends Error {
  statusCode: number;
  extra?: Record<string, any>;
  constructor(
    message: string,
    statusCode: number,
    extra?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.extra = extra;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function addTeamToLeagueChannel(leagueId: string, teamId: string) {
  try {
    const { MessagingService } = await import('./MessagingService');
    const convs = await MessagingService.getConversationsForLeague(leagueId);
    const general = convs.find((c: any) => c.name?.includes('General'));
    if (general) {
      const members = await prisma.teamMember.findMany({
        where: { teamId, status: 'active' },
        select: { userId: true },
      });
      for (const member of members) {
        await MessagingService.addParticipant(
          general.id,
          member.userId,
          'MEMBER'
        );
      }
    }
  } catch (msgErr) {
    console.error('Failed to add team to league channel:', msgErr);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function joinLeague(leagueId: string, rosterId: string) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });

  if (!league) {
    throw new ServiceError('League not found', 404);
  }

  if (
    league.registrationCloseDate &&
    new Date() > new Date(league.registrationCloseDate)
  ) {
    throw new ServiceError('Registration has closed for this league', 400);
  }

  if (!rosterId) {
    throw new ServiceError('Missing required field: rosterId', 400);
  }

  const existingMembership = await prisma.leagueMembership.findFirst({
    where: {
      leagueId,
      memberType: 'roster',
      memberId: rosterId,
      status: { in: ['active', 'pending'] },
    },
  });

  if (existingMembership) {
    throw new ServiceError('Roster is already a member of this league', 409);
  }

  const membership = await prisma.leagueMembership.create({
    data: {
      leagueId,
      teamId: rosterId,
      memberType: 'roster',
      memberId: rosterId,
      status: 'pending',
    },
    include: {
      team: {
        select: { id: true, name: true, imageUrl: true, sportType: true },
      },
      league: {
        select: { id: true, name: true, sportType: true },
      },
    },
  });

  NotificationService.notifyJoinRequest(leagueId, rosterId);

  return membership;
}

export async function getJoinRequests(leagueId: string, userId: string) {
  if (!userId) {
    throw new ServiceError('Missing required query parameter: userId', 400);
  }

  const league = await prisma.league.findUnique({ where: { id: leagueId } });

  if (!league) {
    throw new ServiceError('League not found', 404);
  }

  if (league.organizerId !== userId) {
    throw new ServiceError(
      'Only the league owner or admins can perform this action',
      403
    );
  }

  return prisma.leagueMembership.findMany({
    where: {
      leagueId,
      status: 'pending',
      memberType: 'roster',
    },
    include: {
      team: {
        select: { id: true, name: true, imageUrl: true, sportType: true },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });
}

export async function processJoinRequest(
  leagueId: string,
  requestId: string,
  action: string,
  userId: string
) {
  if (!userId) {
    throw new ServiceError('Missing required field: userId', 400);
  }

  if (!action || (action !== 'approve' && action !== 'decline')) {
    throw new ServiceError("action must be 'approve' or 'decline'", 400);
  }

  const league = await prisma.league.findUnique({ where: { id: leagueId } });

  if (!league) {
    throw new ServiceError('League not found', 404);
  }

  if (league.organizerId !== userId) {
    throw new ServiceError(
      'Only the league owner or admins can perform this action',
      403
    );
  }

  const membership = await prisma.leagueMembership.findFirst({
    where: {
      id: requestId,
      leagueId,
      status: 'pending',
      memberType: 'roster',
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          sportType: true,
          balance: true,
        },
      },
    },
  });

  if (!membership) {
    throw new ServiceError('Join request not found', 404);
  }

  if (action === 'approve') {
    // Check membership fee
    if (league.membershipFee != null && league.membershipFee > 0) {
      const rosterBalance = membership.team?.balance ?? 0;

      if (rosterBalance < league.membershipFee) {
        throw new ServiceError('Insufficient roster balance', 400, {
          required: league.membershipFee,
          available: rosterBalance,
        });
      }

      const result = await prisma.$transaction(async tx => {
        await tx.team.update({
          where: { id: membership.team!.id },
          data: { balance: { decrement: league.membershipFee! } },
        });

        return tx.leagueMembership.update({
          where: { id: requestId },
          data: { status: 'active' },
          include: {
            team: {
              select: { id: true, name: true, imageUrl: true, sportType: true },
            },
          },
        });
      });

      NotificationService.notifyJoinRequestDecision(
        leagueId,
        membership.memberId,
        'approve'
      );
      checkLeagueReady(leagueId).catch(() => {});
      if (membership.team) {
        addTeamToLeagueChannel(leagueId, membership.team.id);
      }

      return result;
    }

    // No fee — just activate
    const updatedMembership = await prisma.leagueMembership.update({
      where: { id: requestId },
      data: { status: 'active' },
      include: {
        team: {
          select: { id: true, name: true, imageUrl: true, sportType: true },
        },
      },
    });

    NotificationService.notifyJoinRequestDecision(
      leagueId,
      membership.memberId,
      'approve'
    );
    checkLeagueReady(leagueId).catch(() => {});
    if (membership.team) {
      addTeamToLeagueChannel(leagueId, membership.team.id);
    }

    return updatedMembership;
  }

  // action === 'decline'
  const updatedMembership = await prisma.leagueMembership.update({
    where: { id: requestId },
    data: { status: 'withdrawn' },
    include: {
      team: {
        select: { id: true, name: true, imageUrl: true, sportType: true },
      },
    },
  });

  NotificationService.notifyJoinRequestDecision(
    leagueId,
    membership.memberId,
    'decline'
  );

  return updatedMembership;
}

export async function inviteRoster(
  leagueId: string,
  rosterId: string,
  userId: string
) {
  if (!rosterId || !userId) {
    throw new ServiceError('Missing required fields: rosterId, userId', 400);
  }

  const league = await prisma.league.findUnique({ where: { id: leagueId } });

  if (!league) {
    throw new ServiceError('League not found', 404);
  }

  if (league.organizerId !== userId) {
    throw new ServiceError(
      'Only the league owner or admins can perform this action',
      403
    );
  }

  const roster = await prisma.team.findUnique({ where: { id: rosterId } });

  if (!roster) {
    throw new ServiceError('Roster not found', 404);
  }

  const existingMembership = await prisma.leagueMembership.findFirst({
    where: {
      leagueId,
      memberType: 'roster',
      memberId: rosterId,
      status: { in: ['active', 'pending'] },
    },
  });

  if (existingMembership) {
    throw new ServiceError('Roster is already a member of this league', 409);
  }

  const membership = await prisma.leagueMembership.create({
    data: {
      leagueId,
      teamId: rosterId,
      memberType: 'roster',
      memberId: rosterId,
      status: 'pending',
    },
    include: {
      team: {
        select: { id: true, name: true, imageUrl: true, sportType: true },
      },
    },
  });

  NotificationService.notifyRosterInvitation(leagueId, rosterId);

  return membership;
}

export async function respondToInvitation(
  leagueId: string,
  invitationId: string,
  accept: boolean,
  userId: string
) {
  if (!userId) {
    throw new ServiceError('Missing required field: userId', 400);
  }

  if (typeof accept !== 'boolean') {
    throw new ServiceError('accept must be a boolean', 400);
  }

  const league = await prisma.league.findUnique({ where: { id: leagueId } });

  if (!league) {
    throw new ServiceError('League not found', 404);
  }

  const membership = await prisma.leagueMembership.findFirst({
    where: {
      id: invitationId,
      leagueId,
      status: 'pending',
      memberType: 'roster',
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          sportType: true,
          balance: true,
          members: {
            where: {
              role: {
                in: ['captain', 'co_captain', 'coach', 'assistant_coach'],
              },
              status: 'active',
            },
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!membership) {
    throw new ServiceError('Invitation not found', 404);
  }

  const isCaptain = membership.team?.members?.some(
    (m: any) => m.userId === userId
  );
  if (!isCaptain) {
    throw new ServiceError(
      'Only the roster owner can respond to invitations',
      403
    );
  }

  if (accept) {
    // Check membership fee
    if (league.membershipFee != null && league.membershipFee > 0) {
      const rosterBalance = membership.team?.balance ?? 0;

      if (rosterBalance < league.membershipFee) {
        throw new ServiceError('Insufficient roster balance', 400, {
          required: league.membershipFee,
          available: rosterBalance,
        });
      }

      const result = await prisma.$transaction(async tx => {
        await tx.team.update({
          where: { id: membership.team!.id },
          data: { balance: { decrement: league.membershipFee! } },
        });

        return tx.leagueMembership.update({
          where: { id: invitationId },
          data: { status: 'active' },
          include: {
            team: {
              select: { id: true, name: true, imageUrl: true, sportType: true },
            },
          },
        });
      });

      // Cleanup duplicate pending memberships
      await prisma.leagueMembership.deleteMany({
        where: {
          leagueId,
          memberType: 'roster',
          memberId: membership.memberId,
          status: 'pending',
          id: { not: invitationId },
        },
      });

      checkLeagueReady(leagueId).catch(() => {});
      if (membership.team) {
        addTeamToLeagueChannel(leagueId, membership.team.id);
      }

      return result;
    }

    // No fee — just activate
    const updatedMembership = await prisma.leagueMembership.update({
      where: { id: invitationId },
      data: { status: 'active' },
      include: {
        team: {
          select: { id: true, name: true, imageUrl: true, sportType: true },
        },
      },
    });

    // Cleanup duplicate pending memberships
    await prisma.leagueMembership.deleteMany({
      where: {
        leagueId,
        memberType: 'roster',
        memberId: membership.memberId,
        status: 'pending',
        id: { not: invitationId },
      },
    });

    checkLeagueReady(leagueId).catch(() => {});
    if (membership.team) {
      addTeamToLeagueChannel(leagueId, membership.team.id);
    }

    return updatedMembership;
  }

  // accept === false — decline
  return prisma.leagueMembership.update({
    where: { id: invitationId },
    data: { status: 'withdrawn' },
    include: {
      team: {
        select: { id: true, name: true, imageUrl: true, sportType: true },
      },
    },
  });
}

export async function leaveLeague(
  leagueId: string,
  teamId: string,
  userId: string
) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });

  if (!league) {
    throw new ServiceError('League not found', 404);
  }

  if (!teamId || !userId) {
    throw new ServiceError('Missing required fields: teamId, userId', 400);
  }

  const teamMember = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });

  if (
    !teamMember ||
    !['captain', 'co_captain', 'coach', 'assistant_coach', 'admin'].includes(
      teamMember.role
    )
  ) {
    throw new ServiceError('Only team managers can withdraw from leagues', 403);
  }

  const membership = await prisma.leagueMembership.findFirst({
    where: { leagueId, teamId, status: 'active' },
  });

  if (!membership) {
    throw new ServiceError('Roster is not a member of this league', 404);
  }

  await prisma.leagueMembership.update({
    where: { id: membership.id },
    data: { status: 'withdrawn', leftAt: new Date() },
  });
}

export interface GetMembersOptions {
  page?: string;
  limit?: string;
  includePending?: string;
}

export async function getMembers(leagueId: string, options: GetMembersOptions) {
  const { page = '1', limit = '50', includePending } = options;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true },
  });

  if (!league) {
    throw new ServiceError('League not found', 404);
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const statusFilter =
    includePending === 'true'
      ? { status: { in: ['active', 'pending'] as string[] } }
      : { status: 'active' as const };

  const baseWhere = {
    leagueId,
    memberType: 'roster' as const,
    ...statusFilter,
  };

  const total = await prisma.leagueMembership.count({ where: baseWhere });

  const memberships = await prisma.leagueMembership.findMany({
    where: baseWhere,
    skip,
    take: limitNum,
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
    },
    orderBy: { joinedAt: 'asc' },
  });

  const data = memberships.map(m => ({
    id: m.id,
    memberType: m.memberType,
    memberId: m.memberId,
    status: m.status,
    joinedAt: m.joinedAt,
    team: m.team
      ? {
          id: m.team.id,
          name: m.team.name,
          imageUrl: m.team.imageUrl,
          sportType: m.team.sportType,
          isPrivate: m.team.isPrivate,
          playerCount: m.team._count.members,
        }
      : null,
    stats: {
      matchesPlayed: m.matchesPlayed,
      wins: m.wins,
      losses: m.losses,
      draws: m.draws,
      points: m.points,
      goalsFor: m.goalsFor,
      goalsAgainst: m.goalsAgainst,
      goalDifference: m.goalDifference,
    },
  }));

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

export async function removeMembership(
  leagueId: string,
  membershipId: string,
  userId: string
) {
  if (!userId) {
    throw new ServiceError('Missing required field: userId', 400);
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, organizerId: true, name: true },
  });

  if (!league) {
    throw new ServiceError('League not found', 404);
  }

  if (league.organizerId !== userId) {
    throw new ServiceError(
      'Only the league commissioner can remove rosters',
      403
    );
  }

  const membership = await prisma.leagueMembership.findFirst({
    where: { id: membershipId, leagueId },
    include: { team: { select: { id: true, name: true } } },
  });

  if (!membership) {
    throw new ServiceError('Membership not found', 404);
  }

  await prisma.leagueMembership.delete({ where: { id: membershipId } });

  return {
    message: `${membership.team?.name ?? 'Roster'} has been removed from ${league.name}`,
    removedMembershipId: membershipId,
    rosterId: membership.memberId,
  };
}
