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
   * Notify league owner when a roster requests to join a public Team League
   */
  static async notifyJoinRequest(leagueId: string, rosterId: string): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { name: true, organizerId: true }
      });

      if (!league) return;

      const roster = await prisma.team.findUnique({
        where: { id: rosterId },
        select: { name: true }
      });

      const notification: NotificationTemplate = {
        title: 'New Join Request',
        body: `${roster?.name ?? 'A roster'} has requested to join ${league.name}`,
        data: {
          type: 'join_request',
          leagueId,
          rosterId
        }
      };

      console.log('Sending join request notification to league owner', league.organizerId);
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending join request notification:', error);
    }
  }

  /**
   * Notify roster owner when their join request is approved or declined
   */
  static async notifyJoinRequestDecision(
    leagueId: string,
    rosterId: string,
    action: 'approve' | 'decline'
  ): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { name: true }
      });

      if (!league) return;

      // Find the roster captain (owner)
      const captain = await prisma.teamMember.findFirst({
        where: { teamId: rosterId, role: 'captain', status: 'active' },
        select: { userId: true }
      });

      if (!captain) return;

      const roster = await prisma.team.findUnique({
        where: { id: rosterId },
        select: { name: true }
      });

      const approved = action === 'approve';
      const notification: NotificationTemplate = {
        title: approved ? 'Join Request Approved' : 'Join Request Declined',
        body: approved
          ? `${roster?.name ?? 'Your roster'} has been accepted into ${league.name}`
          : `${roster?.name ?? 'Your roster'}'s request to join ${league.name} was declined`,
        data: {
          type: approved ? 'join_request_approved' : 'join_request_declined',
          leagueId,
          rosterId
        }
      };

      console.log('Sending join request decision notification to roster owner', captain.userId);
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending join request decision notification:', error);
    }
  }

  /**
   * Notify roster owner about an invitation to a private Team League
   */
  static async notifyRosterInvitation(leagueId: string, rosterId: string): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { name: true }
      });

      if (!league) return;

      // Find the roster captain (owner)
      const captain = await prisma.teamMember.findFirst({
        where: { teamId: rosterId, role: 'captain', status: 'active' },
        select: { userId: true }
      });

      if (!captain) return;

      const notification: NotificationTemplate = {
        title: 'League Invitation',
        body: `Your roster has been invited to join ${league.name}`,
        data: {
          type: 'league_invitation',
          leagueId,
          rosterId
        }
      };

      console.log('Sending league invitation notification to roster owner', captain.userId);
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending roster invitation notification:', error);
    }
  }

  /**
   * Notify all players of assigned rosters when they are assigned to a Team League event
   */
  static async notifyEventRosterAssignment(
    leagueId: string,
    eventTitle: string,
    rosterIds: string[]
  ): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { name: true }
      });

      if (!league) return;

      // Get all players from the assigned rosters
      const members = await prisma.teamMember.findMany({
        where: {
          teamId: { in: rosterIds },
          status: 'active'
        },
        select: { userId: true }
      });

      const uniqueUserIds = [...new Set(members.map(m => m.userId))];

      const notification: NotificationTemplate = {
        title: 'New League Event',
        body: `Your roster has been assigned to "${eventTitle}" in ${league.name}`,
        data: {
          type: 'event_roster_assignment',
          leagueId
        }
      };

      console.log('Sending event assignment notification to', uniqueUserIds.length, 'players');
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending event roster assignment notification:', error);
    }
  }

  /**
   * Send notification when event is auto-opened to public
   */
  async sendEventAutoOpenedNotification(
    userId: string,
    userEmail: string,
    eventId: string
  ): Promise<void> {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          title: true,
          startTime: true,
          minimumPlayerCount: true,
          currentParticipants: true,
        },
      });

      if (!event) return;

      const notification: NotificationTemplate = {
        title: 'Event Opened to Public',
        body: `Your invite-only event "${event.title}" has been automatically opened to the public because it didn't reach the minimum ${event.minimumPlayerCount} players within 2 days of the event date.`,
        data: {
          type: 'event_auto_opened',
          eventId: eventId,
        },
      };

      // TODO: Implement actual notification sending (push notification, email, etc.)
      console.log('Sending event auto-opened notification to user', userId);
      console.log('Notification:', notification);
      
      // Log for monitoring
      console.log(`Event ${eventId} auto-opened: ${event.currentParticipants}/${event.minimumPlayerCount} players`);
    } catch (error) {
      console.error('Error sending event auto-opened notification:', error);
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
