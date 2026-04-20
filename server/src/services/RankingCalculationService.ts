import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TeamStanding {
  rank: number;
  teamId: string;
  teamName: string;
  teamImageUrl?: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form?: string[]; // Last 5 matches: 'W', 'L', 'D'
}

interface PlayerRanking {
  rank: number;
  playerId: string;
  playerName: string;
  playerImageUrl?: string;
  teamId: string;
  teamName: string;
  matchesPlayed: number;
  averageRating: number;
  totalVotes: number;
  performanceScore: number;
}

export class RankingCalculationService {
  /**
   * Calculate team standings for a league/season
   */
  static async calculateStandings(
    leagueId: string,
    seasonId?: string
  ): Promise<TeamStanding[]> {
    try {
      const where: any = { leagueId, status: 'active' };
      if (seasonId) {
        where.seasonId = seasonId;
      }

      const memberships = await prisma.leagueMembership.findMany({
        where,
        include: {
          team: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      });

      // Sort by points DESC, goal difference DESC, goals scored DESC
      const sorted = memberships.sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        if (a.goalDifference !== b.goalDifference)
          return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });

      // Get recent form for each team
      const standings: TeamStanding[] = await Promise.all(
        sorted.map(async (membership, index) => {
          const form = await this.getRecentForm(
            leagueId,
            membership.teamId!,
            seasonId
          );

          if (!membership.team) {
            return {
              rank: index + 1,
              teamId: membership.teamId!,
              teamName: 'Unknown',
              matchesPlayed: membership.matchesPlayed,
              wins: membership.wins,
              losses: membership.losses,
              draws: membership.draws,
              points: membership.points,
              goalsFor: membership.goalsFor,
              goalsAgainst: membership.goalsAgainst,
              goalDifference: membership.goalDifference,
              form,
            };
          }

          return {
            rank: index + 1,
            teamId: membership.team.id,
            teamName: membership.team.name,
            teamImageUrl: membership.team.imageUrl || undefined,
            matchesPlayed: membership.matchesPlayed,
            wins: membership.wins,
            losses: membership.losses,
            draws: membership.draws,
            points: membership.points,
            goalsFor: membership.goalsFor,
            goalsAgainst: membership.goalsAgainst,
            goalDifference: membership.goalDifference,
            form,
          };
        })
      );

      return standings;
    } catch (error) {
      console.error('Error calculating standings:', error);
      throw error;
    }
  }

  /**
   * Get recent form (last 5 matches) for a team
   */
  private static async getRecentForm(
    leagueId: string,
    teamId: string,
    seasonId?: string
  ): Promise<string[]> {
    try {
      const where: any = {
        leagueId,
        status: 'completed',
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      };

      if (seasonId) {
        where.seasonId = seasonId;
      }

      const matches = await prisma.match.findMany({
        where,
        orderBy: { playedAt: 'desc' },
        take: 5,
        select: {
          homeTeamId: true,
          awayTeamId: true,
          outcome: true,
        },
      });

      return matches.map(match => {
        if (match.outcome === 'draw') return 'D';

        const isHome = match.homeTeamId === teamId;
        const won =
          (isHome && match.outcome === 'home_win') ||
          (!isHome && match.outcome === 'away_win');

        return won ? 'W' : 'L';
      });
    } catch (error) {
      console.error('Error getting recent form:', error);
      return [];
    }
  }

  /**
   * Calculate player rankings for a league/season
   */
  static async calculatePlayerRankings(
    leagueId: string,
    seasonId?: string
  ): Promise<PlayerRanking[]> {
    try {
      // Get all completed matches for this league/season
      const matchWhere: any = { leagueId, status: 'completed' };
      if (seasonId) {
        matchWhere.seasonId = seasonId;
      }

      const matches = await prisma.match.findMany({
        where: matchWhere,
        select: { eventId: true },
      });

      const eventIds = matches
        .filter(m => m.eventId)
        .map(m => m.eventId as string);

      if (eventIds.length === 0) {
        return [];
      }

      // Get game participations for these events
      const participations = await prisma.gameParticipation.findMany({
        where: {
          eventId: { in: eventIds },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
        },
      });

      // Aggregate by player
      const playerStatsMap = new Map<
        string,
        {
          player: any;
          teamId?: string;
          teamName?: string;
          matchesPlayed: number;
          totalGameScore: number;
          totalVotes: number;
        }
      >();

      for (const p of participations) {
        const playerId = p.userId;

        if (!playerStatsMap.has(playerId)) {
          // Get player's team (first team they're a member of)
          const teamMember = await prisma.teamMember.findFirst({
            where: { userId: playerId },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          playerStatsMap.set(playerId, {
            player: p.user,
            teamId: teamMember?.team.id,
            teamName: teamMember?.team.name,
            matchesPlayed: 0,
            totalGameScore: 0,
            totalVotes: 0,
          });
        }

        const stats = playerStatsMap.get(playerId)!;
        stats.matchesPlayed++;
        stats.totalGameScore += p.gameScore;
        stats.totalVotes += p.votesReceived;
      }

      // Calculate rankings
      const rankings: PlayerRanking[] = Array.from(playerStatsMap.values()).map(
        stats => {
          const averageRating =
            stats.matchesPlayed > 0
              ? stats.totalGameScore / stats.matchesPlayed
              : 0;

          const performanceScore =
            stats.matchesPlayed > 0
              ? averageRating * 0.6 +
                (stats.totalVotes / stats.matchesPlayed) * 0.4
              : 0;

          return {
            rank: 0, // Will be set after sorting
            playerId: stats.player.id,
            playerName: `${stats.player.firstName} ${stats.player.lastName}`,
            playerImageUrl: stats.player.profileImage || undefined,
            teamId: stats.teamId || '',
            teamName: stats.teamName || 'No Team',
            matchesPlayed: stats.matchesPlayed,
            averageRating,
            totalVotes: stats.totalVotes,
            performanceScore,
          };
        }
      );

      // Sort by performance score DESC
      rankings.sort((a, b) => b.performanceScore - a.performanceScore);

      // Assign ranks
      rankings.forEach((ranking, index) => {
        ranking.rank = index + 1;
      });

      return rankings;
    } catch (error) {
      console.error('Error calculating player rankings:', error);
      throw error;
    }
  }

  /**
   * Handle tied rankings with secondary criteria
   */
  static handleTiedRankings(standings: TeamStanding[]): TeamStanding[] {
    // Already handled in the sort logic (points, goal difference, goals scored)
    // Could add head-to-head record as additional tiebreaker if needed
    return standings;
  }

  /**
   * Recalculate standings after a match result is recorded
   * This is called automatically by the match result endpoint
   */
  static async recalculateAfterMatch(matchId: string): Promise<void> {
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: {
          leagueId: true,
          seasonId: true,
        },
      });

      if (!match) {
        throw new Error('Match not found');
      }

      // Standings are automatically updated by the match result endpoint
      // This method is here for future enhancements like caching

      // Could implement caching here:
      // - Calculate standings
      // - Store in Redis with 5-second TTL
      // - Return cached standings if available
    } catch (error) {
      console.error('Error recalculating standings:', error);
      throw error;
    }
  }
}
