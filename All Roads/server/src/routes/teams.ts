import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all teams
router.get('/', async (req, res) => {
  try {
    const { sportType, page = '1', limit = '10' } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    if (sportType) where.sportType = sportType;

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

    // Map isPrivate to isPublic for frontend
    const mappedTeams = teams.map(({ isPrivate, ...rest }) => ({
      ...rest,
      isPublic: !isPrivate,
    }));

    res.json({
      data: mappedTeams,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get team by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

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
              },
            },
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Map isPrivate to isPublic for frontend
    const { isPrivate, ...rest } = team;
    res.json({ ...rest, isPublic: !isPrivate });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Get leagues for a team
router.get('/:id/leagues', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get all league memberships for this team
    const memberships = await prisma.leagueMembership.findMany({
      where: {
        teamId: id,
        status: 'active',
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

    // Extract leagues from memberships and add membership info
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

    res.json(leagues);
  } catch (error) {
    console.error('Get team leagues error:', error);
    res.status(500).json({ error: 'Failed to fetch team leagues' });
  }
});

// Create team
router.post('/', async (req, res) => {
  try {
    const { initialMemberIds, isPublic, ...rest } = req.body;
    const creatorId = req.headers['x-user-id'] as string | undefined;

    // Map frontend isPublic to DB isPrivate, and ensure description has a value
    const teamData = {
      ...rest,
      isPrivate: isPublic === undefined ? false : !isPublic,
      description: rest.description || '',
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
    if (initialMemberIds && Array.isArray(initialMemberIds) && initialMemberIds.length > 0) {
      console.log(`Adding ${initialMemberIds.length} initial members to team ${team.id}`);
      
      // Filter out the creator if they're in the list (already added as captain)
      const memberIds = creatorId 
        ? initialMemberIds.filter((id: string) => id !== creatorId)
        : initialMemberIds;

      if (memberIds.length > 0) {
        await prisma.teamMember.createMany({
          data: memberIds.map((userId: string) => ({
            teamId: team.id,
            userId,
            role: 'member',
            status: 'active',
            joinedAt: new Date(),
          })),
        });
      }

      console.log(`Successfully added ${initialMemberIds.length} members to team ${team.id}`);
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

    // Map isPrivate to isPublic for frontend
    if (completeTeam) {
      const { isPrivate: priv, ...restTeam } = completeTeam;
      res.status(201).json({ ...restTeam, isPublic: !priv });
    } else {
      res.status(201).json(completeTeam);
    }
  } catch (error: any) {
    console.error('Create team error:', error?.message || error);
    console.error('Create team error details:', JSON.stringify(error?.meta || error?.code || ''));
    res.status(500).json({ 
      error: 'Failed to create team',
      details: error?.message || 'Unknown error',
    });
  }
});

// Delete team
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check for active league memberships
    const activeMembership = await prisma.leagueMembership.findFirst({
      where: {
        teamId: id,
        status: 'active',
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true,
          },
        },
      },
    });

    if (activeMembership) {
      return res.status(400).json({
        error: 'Cannot delete team that is currently participating in active leagues',
        league: {
          id: activeMembership.league.id,
          name: activeMembership.league.name,
          sportType: activeMembership.league.sportType,
        },
      });
    }

    // Delete the team (cascade will handle related records)
    await prisma.team.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

export default router;
