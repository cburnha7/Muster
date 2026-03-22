import express, { Request, Response } from 'express';
import { prisma } from '../index';
import { NotificationService } from '../services/NotificationService';
import { checkBalance } from '../services/balance';
import { recordLeagueTransaction } from '../services/league-ledger';

const router = express.Router();

// GET /api/matches - Get all matches with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      leagueId,
      seasonId,
      teamId,
      status,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    
    if (leagueId) {
      where.leagueId = leagueId;
    }
    
    if (seasonId) {
      where.seasonId = seasonId;
    }
    
    if (teamId) {
      where.OR = [
        { homeTeamId: teamId },
        { awayTeamId: teamId }
      ];
    }
    
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.match.count({ where });

    // Get matches with relations
    const matches = await prisma.match.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true
          }
        },
        season: {
          select: {
            id: true,
            name: true
          }
        },
        homeTeam: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            facility: {
              select: {
                id: true,
                name: true,
                street: true,
                city: true
              }
            }
          }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    });

    res.json({
      data: matches,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// GET /api/matches/:id - Get match by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true,
            organizerId: true
          }
        },
        season: {
          select: {
            id: true,
            name: true
          }
        },
        homeTeam: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            sportType: true
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            sportType: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            startTime: true,
            endTime: true,
            facility: {
              select: {
                id: true,
                name: true,
                street: true,
                city: true,
                state: true,
                latitude: true,
                longitude: true
              }
            }
          }
        }
      }
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json(match);
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

// POST /api/matches - Create new match
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      leagueId,
      seasonId,
      homeTeamId,
      awayTeamId,
      scheduledAt,
      eventId,
      notes,
      userId,
      courtCost
    } = req.body;

    // Validate required fields
    if (!leagueId || !homeTeamId || !awayTeamId || !scheduledAt) {
      return res.status(400).json({ 
        error: 'Missing required fields: leagueId, homeTeamId, awayTeamId, scheduledAt' 
      });
    }

    // Check if league exists and user is operator
    const league = await prisma.league.findUnique({
      where: { id: leagueId }
    });

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (userId && league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can create matches' });
    }

    // Validate teams are different
    if (homeTeamId === awayTeamId) {
      return res.status(400).json({ error: 'Home and away teams must be different' });
    }

    // Validate both teams are league members
    const homeMembership = await prisma.leagueMembership.findFirst({
      where: {
        leagueId,
        teamId: homeTeamId,
        status: 'active'
      }
    });

    const awayMembership = await prisma.leagueMembership.findFirst({
      where: {
        leagueId,
        teamId: awayTeamId,
        status: 'active'
      }
    });

    if (!homeMembership) {
      return res.status(400).json({ error: 'Home team is not a member of this league' });
    }

    if (!awayMembership) {
      return res.status(400).json({ error: 'Away team is not a member of this league' });
    }

    // If event linked, validate it exists
    if (eventId) {
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
    }

    // Paid league: require courtCost and verify league balance covers it
    if (league.pricingType === 'paid') {
      if (courtCost === undefined || courtCost === null) {
        return res.status(400).json({ error: 'courtCost is required for paid league games' });
      }

      const balanceResult = await checkBalance(leagueId, courtCost);
      if (!balanceResult.sufficient) {
        return res.status(400).json({
          error: 'Insufficient league balance',
          shortfall: balanceResult.shortfall,
        });
      }
    }

    // Create match
    const match = await prisma.match.create({
      data: {
        leagueId,
        seasonId,
        homeTeamId,
        awayTeamId,
        scheduledAt: new Date(scheduledAt),
        eventId,
        notes
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true,
            pricingType: true
          }
        },
        homeTeam: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        }
      }
    });

    // In a free league, the home roster manager is the booking host.
    // Notify them that they need to book a facility and assign the rental to this game.
    if (league.pricingType === 'free') {
      NotificationService.notifyHomeManagerBookFacility(match.id).catch(err =>
        console.error('Failed to send home manager facility notification:', err)
      );
    }

    res.status(201).json(match);
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

// PUT /api/matches/:id - Update match
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      scheduledAt,
      status,
      notes,
      userId
    } = req.body;

    // Check if match exists
    const existingMatch = await prisma.match.findUnique({
      where: { id },
      include: {
        league: true
      }
    });

    if (!existingMatch) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if user is league operator
    if (userId && existingMatch.league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can update matches' });
    }

    // Update match
    const match = await prisma.match.update({
      where: { id },
      data: {
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(status && { status }),
        ...(notes !== undefined && { notes })
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true
          }
        },
        homeTeam: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        }
      }
    });

    res.json(match);
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ error: 'Failed to update match' });
  }
});

// DELETE /api/matches/:id - Delete match
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Check if match exists
    const existingMatch = await prisma.match.findUnique({
      where: { id },
      include: {
        league: true
      }
    });

    if (!existingMatch) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if user is league operator
    if (userId && existingMatch.league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can delete matches' });
    }

    // Delete match
    await prisma.match.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

// PATCH /api/matches/:id/rental - Assign a facility rental to a match
// Used by the home roster manager to link their confirmed rental to a free league game
router.patch('/:id/rental', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rentalId, userId } = req.body;

    if (!rentalId) {
      return res.status(400).json({ error: 'Missing required field: rentalId' });
    }

    // Fetch match with league info
    const existingMatch = await prisma.match.findUnique({
      where: { id },
      include: {
        league: {
          select: {
            id: true,
            pricingType: true,
            organizerId: true,
          }
        },
        homeTeam: {
          select: {
            id: true,
            members: {
              where: { role: 'captain', status: 'active' },
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!existingMatch) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Only the home roster manager can assign a rental in a free league
    const homeManagerIds = existingMatch.homeTeam.members.map(m => m.userId);
    const isHomeManager = userId && homeManagerIds.includes(userId);
    const isCommissioner = userId && existingMatch.league.organizerId === userId;

    if (!isHomeManager && !isCommissioner) {
      return res.status(403).json({ error: 'Only the home roster manager or league commissioner can assign a rental to this game' });
    }

    // Verify the rental exists and belongs to the requesting user
    const rental = await prisma.facilityRental.findUnique({
      where: { id: rentalId },
      select: {
        id: true,
        userId: true,
        status: true,
        totalPrice: true,
        timeSlot: {
          select: {
            court: {
              select: {
                facility: {
                  select: { id: true }
                }
              }
            }
          }
        }
      }
    });

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    if (rental.status !== 'confirmed') {
      return res.status(400).json({ error: 'Only confirmed rentals can be assigned to a game' });
    }

    // Branch on league pricing type:
    // - Paid league: commissioner books facility, game is confirmed immediately (no away confirmation needed)
    // - Free league: home manager books facility, away manager must confirm within 48h
    const isPaidLeague = existingMatch.league.pricingType === 'paid';

    const updateData: any = { rentalId };

    if (isPaidLeague) {
      // Paid league: confirm immediately — the league is paying, no away confirmation needed
      updateData.status = 'confirmed';
    } else {
      // Free league: set to pending_away_confirm with 48h deadline
      const confirmationDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
      updateData.status = 'pending_away_confirm';
      updateData.confirmationDeadline = confirmationDeadline;
    }

    const match = await prisma.match.update({
      where: { id },
      data: updateData,
      include: {
        league: {
          select: { id: true, name: true, sportType: true }
        },
        homeTeam: {
          select: { id: true, name: true, imageUrl: true }
        },
        awayTeam: {
          select: { id: true, name: true, imageUrl: true }
        },
        rental: {
          select: {
            id: true,
            status: true,
            totalPrice: true,
            timeSlot: {
              select: {
                date: true,
                startTime: true,
                endTime: true,
                court: {
                  select: {
                    name: true,
                    facility: {
                      select: { id: true, name: true, street: true, city: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Record court cost in the league ledger for paid leagues
    if (isPaidLeague && existingMatch.seasonId && rental) {
      const courtCost = rental.totalPrice;
      const facilityId = rental.timeSlot?.court?.facility?.id;

      recordLeagueTransaction({
        leagueId: existingMatch.league.id,
        seasonId: existingMatch.seasonId,
        type: 'court_cost',
        amount: -courtCost,
        description: `Court cost for ${match.homeTeam.name} vs ${match.awayTeam.name}`,
        facilityId: facilityId ?? undefined,
        rentalId: rental.id,
        matchId: id as string,
      }).catch(err =>
        console.error('Failed to record league ledger transaction:', err)
      );
    }

    // Only send away confirmation notification for free leagues
    if (!isPaidLeague && match.rental?.timeSlot?.court) {
      const { court } = match.rental.timeSlot;
      const venueDetails = {
        facilityName: court.facility.name,
        courtName: court.name,
        facilityAddress: `${court.facility.street}, ${court.facility.city}`,
        date: match.rental.timeSlot.date instanceof Date
          ? match.rental.timeSlot.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
          : String(match.rental.timeSlot.date),
        startTime: match.rental.timeSlot.startTime,
        endTime: match.rental.timeSlot.endTime,
      };

      const confirmationDeadline = updateData.confirmationDeadline;
      NotificationService.notifyAwayManagerConfirmation(match.id, venueDetails, confirmationDeadline).catch(err =>
        console.error('Failed to send away manager confirmation notification:', err)
      );
    }

    res.json(match);
  } catch (error) {
    console.error('Error assigning rental to match:', error);
    res.status(500).json({ error: 'Failed to assign rental to match' });
  }
});

// PATCH /api/matches/:id/confirm - Away roster manager confirms a free league game
router.patch('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    // Fetch match with away roster members
    const existingMatch = await prisma.match.findUnique({
      where: { id },
      include: {
        awayTeam: {
          select: {
            id: true,
            members: {
              where: { role: 'captain', status: 'active' },
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!existingMatch) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Match must be in pending_away_confirm status
    if (existingMatch.status !== 'pending_away_confirm') {
      return res.status(400).json({ error: 'Match is not awaiting away roster confirmation' });
    }

    // Verify the requesting user is the away roster manager (captain)
    const awayManagerIds = existingMatch.awayTeam.members.map((m: { userId: string }) => m.userId);
    if (!awayManagerIds.includes(userId)) {
      return res.status(403).json({ error: 'Only the away roster manager can confirm this game' });
    }

    // Verify the confirmation deadline hasn't passed
    if (existingMatch.confirmationDeadline && new Date() > existingMatch.confirmationDeadline) {
      return res.status(400).json({ error: 'Confirmation deadline has passed' });
    }

    // Update match status to confirmed
    const match = await prisma.match.update({
      where: { id },
      data: {
        status: 'confirmed',
      },
      include: {
        league: {
          select: { id: true, name: true, sportType: true }
        },
        homeTeam: {
          select: { id: true, name: true, imageUrl: true }
        },
        awayTeam: {
          select: { id: true, name: true, imageUrl: true }
        }
      }
    });

    res.json(match);
  } catch (error) {
    console.error('Error confirming match:', error);
    res.status(500).json({ error: 'Failed to confirm match' });
  }
});

export default router;

// POST /api/matches/:id/result - Record match result
router.post('/:id/result', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { homeScore, awayScore, userId } = req.body;

    // Validate required fields
    if (homeScore === undefined || awayScore === undefined) {
      return res.status(400).json({ error: 'Missing required fields: homeScore, awayScore' });
    }

    // Validate scores are non-negative
    if (homeScore < 0 || awayScore < 0) {
      return res.status(400).json({ error: 'Scores must be non-negative' });
    }

    // Check if match exists
    const existingMatch = await prisma.match.findUnique({
      where: { id },
      include: {
        league: true
      }
    });

    if (!existingMatch) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if user is league operator
    if (userId && existingMatch.league.organizerId !== userId) {
      return res.status(403).json({ error: 'Only the league operator can record match results' });
    }

    // Calculate outcome
    let outcome: string;
    if (homeScore > awayScore) {
      outcome = 'home_win';
    } else if (homeScore < awayScore) {
      outcome = 'away_win';
    } else {
      outcome = 'draw';
    }

    // Get points config from league
    const pointsConfig = existingMatch.league.pointsConfig as any;
    const winPoints = pointsConfig.win || 3;
    const drawPoints = pointsConfig.draw || 1;
    const lossPoints = pointsConfig.loss || 0;

    // Update match
    const match = await prisma.match.update({
      where: { id },
      data: {
        homeScore,
        awayScore,
        outcome,
        status: 'completed',
        playedAt: new Date()
      }
    });

    // Update home team membership stats
    const homeMembership = await prisma.leagueMembership.findFirst({
      where: {
        leagueId: existingMatch.leagueId,
        teamId: existingMatch.homeTeamId,
        status: 'active'
      }
    });

    if (homeMembership) {
      await prisma.leagueMembership.update({
        where: { id: homeMembership.id },
        data: {
          matchesPlayed: { increment: 1 },
          wins: outcome === 'home_win' ? { increment: 1 } : homeMembership.wins,
          losses: outcome === 'away_win' ? { increment: 1 } : homeMembership.losses,
          draws: outcome === 'draw' ? { increment: 1 } : homeMembership.draws,
          points: {
            increment: outcome === 'home_win' ? winPoints : outcome === 'draw' ? drawPoints : lossPoints
          },
          goalsFor: { increment: homeScore },
          goalsAgainst: { increment: awayScore },
          goalDifference: { increment: homeScore - awayScore }
        }
      });
    }

    // Update away team membership stats
    const awayMembership = await prisma.leagueMembership.findFirst({
      where: {
        leagueId: existingMatch.leagueId,
        teamId: existingMatch.awayTeamId,
        status: 'active'
      }
    });

    if (awayMembership) {
      await prisma.leagueMembership.update({
        where: { id: awayMembership.id },
        data: {
          matchesPlayed: { increment: 1 },
          wins: outcome === 'away_win' ? { increment: 1 } : awayMembership.wins,
          losses: outcome === 'home_win' ? { increment: 1 } : awayMembership.losses,
          draws: outcome === 'draw' ? { increment: 1 } : awayMembership.draws,
          points: {
            increment: outcome === 'away_win' ? winPoints : outcome === 'draw' ? drawPoints : lossPoints
          },
          goalsFor: { increment: awayScore },
          goalsAgainst: { increment: homeScore },
          goalDifference: { increment: awayScore - homeScore }
        }
      });
    }

    // TODO: Send notifications to participating teams

    // ── Bracket advancement: resolve placeholder in next bracket game ──
    if (existingMatch.bracketFlag && existingMatch.gameNumber) {
      const winnerId = outcome === 'home_win' ? existingMatch.homeTeamId
        : outcome === 'away_win' ? existingMatch.awayTeamId
        : null;
      const loserId = outcome === 'home_win' ? existingMatch.awayTeamId
        : outcome === 'away_win' ? existingMatch.homeTeamId
        : null;

      if (winnerId || loserId) {
        // Find the winning and losing team names
        const winnerTeam = winnerId ? await prisma.team.findUnique({ where: { id: winnerId }, select: { id: true, name: true } }) : null;
        const loserTeam = loserId ? await prisma.team.findUnique({ where: { id: loserId }, select: { id: true, name: true } }) : null;

        const winnerLabel = `Winner of Game ${existingMatch.gameNumber}`;
        const loserLabel = `Loser of Game ${existingMatch.gameNumber}`;

        // Find bracket matches in this league that reference this game's winner or loser
        const pendingBracketMatches = await prisma.match.findMany({
          where: {
            leagueId: existingMatch.leagueId,
            bracketFlag: { not: null },
            status: 'pending_bracket',
            OR: [
              { placeholderHome: { contains: `Game ${existingMatch.gameNumber}` } },
              { placeholderAway: { contains: `Game ${existingMatch.gameNumber}` } },
            ],
          },
          include: { event: true },
        });

        for (const bm of pendingBracketMatches) {
          const updates: any = {};
          const eventUpdates: any = {};
          let newTitle = bm.event?.title || '';

          // Resolve home placeholder
          if (bm.placeholderHome && bm.placeholderHome === winnerLabel && winnerTeam) {
            updates.homeTeamId = winnerTeam.id;
            updates.placeholderHome = null;
            newTitle = newTitle.replace(winnerLabel, winnerTeam.name);
          } else if (bm.placeholderHome && bm.placeholderHome === loserLabel && loserTeam) {
            updates.homeTeamId = loserTeam.id;
            updates.placeholderHome = null;
            newTitle = newTitle.replace(loserLabel, loserTeam.name);
          }

          // Resolve away placeholder
          if (bm.placeholderAway && bm.placeholderAway === winnerLabel && winnerTeam) {
            updates.awayTeamId = winnerTeam.id;
            updates.placeholderAway = null;
            newTitle = newTitle.replace(winnerLabel, winnerTeam.name);
          } else if (bm.placeholderAway && bm.placeholderAway === loserLabel && loserTeam) {
            updates.awayTeamId = loserTeam.id;
            updates.placeholderAway = null;
            newTitle = newTitle.replace(loserLabel, loserTeam.name);
          }

          if (Object.keys(updates).length > 0) {
            // If both sides are now resolved, promote to scheduled
            const resolvedHome = updates.homeTeamId || bm.homeTeamId;
            const resolvedAway = updates.awayTeamId || bm.awayTeamId;
            if (resolvedHome && resolvedAway) {
              updates.status = 'scheduled';
            }

            await prisma.match.update({ where: { id: bm.id }, data: updates });

            // Update the linked event title and eligibility
            if (bm.eventId) {
              const eligTeams = [resolvedHome, resolvedAway].filter(Boolean);
              await prisma.event.update({
                where: { id: bm.eventId },
                data: {
                  title: newTitle,
                  eligibilityRestrictedToTeams: eligTeams,
                },
              });
            }
          }
        }
      }
    }

    // Return updated match with full details
    const updatedMatch = await prisma.match.findUnique({
      where: { id },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true
          }
        },
        homeTeam: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        }
      }
    });

    res.json(updatedMatch);
  } catch (error) {
    console.error('Error recording match result:', error);
    res.status(500).json({ error: 'Failed to record match result' });
  }
});
