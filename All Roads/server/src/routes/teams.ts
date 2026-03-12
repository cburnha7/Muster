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

    res.json({
      data: teams,
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

    res.json(team);
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
    const team = await prisma.team.create({
      data: req.body,
    });

    res.status(201).json(team);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
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
