import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NotificationTemplate {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class NotificationService {
  /**
   * Send notification when a match is scheduled
   */
  static async notifyMatchScheduled(matchId: string): Promise<void> {
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          league: {
            select: {
              name: true
            }
          },
          homeTeam: {
            select: {
              name: true,
              members: {
                select: {
                  userId: true
                }
              }
            }
          },
          awayTeam: {
            select: {
              name: true,
              members: {
                select: {
                  userId: true
                }
              }
            }
          }
        }
      });

      if (!match) return;

      // Get user IDs from both teams
      const userIds = [
        ...match.homeTeam.members.map(m => m.userId),
        ...match.awayTeam.members.map(m => m.userId)
      ];

      const notification: NotificationTemplate = {
        title: 'Match Scheduled',
        body: `${match.homeTeam.name} vs ${match.awayTeam.name} in ${match.league.name}`,
        data: {
          type: 'match_scheduled',
          matchId: match.id,
          leagueId: match.leagueId
        }
      };

      // TODO: Implement actual notification sending
      // For now, just log
      console.log('Sending match scheduled notification to', userIds.length, 'users');
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending match scheduled notification:', error);
    }
  }

  /**
   * Send notification when match result is recorded
   */
  static async notifyMatchResult(matchId: string): Promise<void> {
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          league: {
            select: {
              name: true
            }
          },
          homeTeam: {
            select: {
              name: true,
              members: {
                select: {
                  userId: true
                }
              }
            }
          },
          awayTeam: {
            select: {
              name: true,
              members: {
                select: {
                  userId: true
                }
              }
            }
          }
        }
      });

      if (!match || !match.homeScore === undefined || !match.awayScore === undefined) return;

      // Get user IDs from both teams
      const userIds = [
        ...match.homeTeam.members.map(m => m.userId),
        ...match.awayTeam.members.map(m => m.userId)
      ];

      const notification: NotificationTemplate = {
        title: 'Match Result',
        body: `${match.homeTeam.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.name}`,
        data: {
          type: 'match_result',
          matchId: match.id,
          leagueId: match.leagueId
        }
      };

      // TODO: Implement actual notification sending
      console.log('Sending match result notification to', userIds.length, 'users');
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending match result notification:', error);
    }
  }

  /**
   * Send notification when league rules are updated
   */
  static async notifyRulesUpdated(leagueId: string): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          memberships: {
            where: { status: 'active' },
            include: {
              team: {
                select: {
                  members: {
                    select: {
                      userId: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!league) return;

      // Get all user IDs from all teams
      const userIds = league.memberships.flatMap(m => 
        m.team.members.map(member => member.userId)
      );

      // Remove duplicates
      const uniqueUserIds = [...new Set(userIds)];

      const notification: NotificationTemplate = {
        title: 'League Rules Updated',
        body: `${league.name} has updated their rules`,
        data: {
          type: 'rules_updated',
          leagueId: league.id
        }
      };

      // TODO: Implement actual notification sending
      console.log('Sending rules updated notification to', uniqueUserIds.length, 'users');
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending rules updated notification:', error);
    }
  }

  /**
   * Send notification when league achieves certification
   */
  static async notifyCertificationAchieved(leagueId: string): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          memberships: {
            where: { status: 'active' },
            include: {
              team: {
                select: {
                  members: {
                    select: {
                      userId: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!league) return;

      // Get all user IDs from all teams
      const userIds = league.memberships.flatMap(m => 
        m.team.members.map(member => member.userId)
      );

      // Remove duplicates
      const uniqueUserIds = [...new Set(userIds)];

      const notification: NotificationTemplate = {
        title: 'League Certified!',
        body: `${league.name} is now a certified league`,
        data: {
          type: 'certification_achieved',
          leagueId: league.id
        }
      };

      // TODO: Implement actual notification sending
      console.log('Sending certification notification to', uniqueUserIds.length, 'users');
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending certification notification:', error);
    }
  }

  /**
   * Check user notification preferences before sending
   */
  private static async shouldSendNotification(userId: string, notificationType: string): Promise<boolean> {
    // TODO: Implement user notification preferences check
    // For now, always return true
    return true;
  }

  /**
   * Queue notification for batch delivery
   */
  private static async queueNotification(
    userIds: string[],
    notification: NotificationTemplate
  ): Promise<void> {
    // TODO: Implement notification queue
    // Could use Redis, Bull, or similar queue system
    console.log('Queuing notification for', userIds.length, 'users');
  }
}
