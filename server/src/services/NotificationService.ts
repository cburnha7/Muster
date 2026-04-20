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
              name: true,
            },
          },
          homeTeam: {
            select: {
              name: true,
              members: {
                select: {
                  userId: true,
                },
              },
            },
          },
          awayTeam: {
            select: {
              name: true,
              members: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      if (!match || !match.homeTeam || !match.awayTeam) return;

      // Get user IDs from both teams
      const userIds = [
        ...match.homeTeam.members.map(m => m.userId),
        ...match.awayTeam.members.map(m => m.userId),
      ];

      const notification: NotificationTemplate = {
        title: 'Match Scheduled',
        body: `${match.homeTeam.name} vs ${match.awayTeam.name} in ${match.league.name}`,
        data: {
          type: 'match_scheduled',
          matchId: match.id,
          leagueId: match.leagueId,
        },
      };

      // TODO: Implement actual notification sending
      // For now, just log
      console.log(
        'Sending match scheduled notification to',
        userIds.length,
        'users'
      );
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
              name: true,
            },
          },
          homeTeam: {
            select: {
              name: true,
              members: {
                select: {
                  userId: true,
                },
              },
            },
          },
          awayTeam: {
            select: {
              name: true,
              members: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      if (
        !match ||
        !match.homeTeam ||
        !match.awayTeam ||
        match.homeScore === undefined ||
        match.awayScore === undefined
      )
        return;

      // Get user IDs from both teams
      const userIds = [
        ...match.homeTeam.members.map(m => m.userId),
        ...match.awayTeam.members.map(m => m.userId),
      ];

      const notification: NotificationTemplate = {
        title: 'Match Result',
        body: `${match.homeTeam.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.name}`,
        data: {
          type: 'match_result',
          matchId: match.id,
          leagueId: match.leagueId,
        },
      };

      // TODO: Implement actual notification sending
      console.log(
        'Sending match result notification to',
        userIds.length,
        'users'
      );
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
                      userId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!league) return;

      // Get all user IDs from all teams
      const userIds = league.memberships.flatMap(m =>
        m.team ? m.team.members.map(member => member.userId) : []
      );

      // Remove duplicates
      const uniqueUserIds = [...new Set(userIds)];

      const notification: NotificationTemplate = {
        title: 'League Rules Updated',
        body: `${league.name} has updated their rules`,
        data: {
          type: 'rules_updated',
          leagueId: league.id,
        },
      };

      // TODO: Implement actual notification sending
      console.log(
        'Sending rules updated notification to',
        uniqueUserIds.length,
        'users'
      );
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
                      userId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!league) return;

      // Get all user IDs from all teams
      const userIds = league.memberships.flatMap(m =>
        m.team ? m.team.members.map(member => member.userId) : []
      );

      // Remove duplicates
      const uniqueUserIds = [...new Set(userIds)];

      const notification: NotificationTemplate = {
        title: 'League Certified!',
        body: `${league.name} is now a certified league`,
        data: {
          type: 'certification_achieved',
          leagueId: league.id,
        },
      };

      // TODO: Implement actual notification sending
      console.log(
        'Sending certification notification to',
        uniqueUserIds.length,
        'users'
      );
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending certification notification:', error);
    }
  }

  /**
   * Notify league owner when a roster requests to join a public Team League
   */
  static async notifyJoinRequest(
    leagueId: string,
    rosterId: string
  ): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { name: true, organizerId: true },
      });

      if (!league) return;

      const roster = await prisma.team.findUnique({
        where: { id: rosterId },
        select: { name: true },
      });

      const notification: NotificationTemplate = {
        title: 'New Join Request',
        body: `${roster?.name ?? 'A roster'} has requested to join ${league.name}`,
        data: {
          type: 'join_request',
          leagueId,
          rosterId,
        },
      };

      console.log(
        'Sending join request notification to league owner',
        league.organizerId
      );
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
        select: { name: true },
      });

      if (!league) return;

      // Find the roster captain (owner)
      const captain = await prisma.teamMember.findFirst({
        where: { teamId: rosterId, role: 'captain', status: 'active' },
        select: { userId: true },
      });

      if (!captain) return;

      const roster = await prisma.team.findUnique({
        where: { id: rosterId },
        select: { name: true },
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
          rosterId,
        },
      };

      console.log(
        'Sending join request decision notification to roster owner',
        captain.userId
      );
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending join request decision notification:', error);
    }
  }

  /**
   * Notify roster owner about an invitation to a private Team League
   */
  static async notifyRosterInvitation(
    leagueId: string,
    rosterId: string
  ): Promise<void> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { name: true },
      });

      if (!league) return;

      // Find the roster captain (owner)
      const captain = await prisma.teamMember.findFirst({
        where: { teamId: rosterId, role: 'captain', status: 'active' },
        select: { userId: true },
      });

      if (!captain) return;

      const notification: NotificationTemplate = {
        title: 'League Invitation',
        body: `Your roster has been invited to join ${league.name}`,
        data: {
          type: 'league_invitation',
          leagueId,
          rosterId,
        },
      };

      console.log(
        'Sending league invitation notification to roster owner',
        captain.userId
      );
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
        select: { name: true },
      });

      if (!league) return;

      // Get all players from the assigned rosters
      const members = await prisma.teamMember.findMany({
        where: {
          teamId: { in: rosterIds },
          status: 'active',
        },
        select: { userId: true },
      });

      const uniqueUserIds = [...new Set(members.map(m => m.userId))];

      const notification: NotificationTemplate = {
        title: 'New League Event',
        body: `Your roster has been assigned to "${eventTitle}" in ${league.name}`,
        data: {
          type: 'event_roster_assignment',
          leagueId,
        },
      };

      console.log(
        'Sending event assignment notification to',
        uniqueUserIds.length,
        'players'
      );
      console.log('Notification:', notification);
    } catch (error) {
      console.error(
        'Error sending event roster assignment notification:',
        error
      );
    }
  }

  /**
   * Notify the home roster manager that they need to book a facility for a free league game.
   * In free leagues, the home roster manager is the booking host.
   */
  static async notifyHomeManagerBookFacility(matchId: string): Promise<void> {
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          league: {
            select: {
              name: true,
              sportType: true,
            },
          },
          homeTeam: {
            select: {
              id: true,
              name: true,
              members: {
                where: { role: 'captain', status: 'active' },
                select: { userId: true },
              },
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!match || !match.homeTeam || !match.awayTeam) return;

      // Find the home roster manager (captain)
      const homeManagerUserIds = match.homeTeam.members.map(m => m.userId);

      if (homeManagerUserIds.length === 0) {
        console.warn(
          `No manager found for home roster ${match.homeTeam.id} — cannot send facility booking notification`
        );
        return;
      }

      const scheduledDate = match.scheduledAt.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });

      const notification: NotificationTemplate = {
        title: 'Facility Needed',
        body: `Your roster ${match.homeTeam.name} is home vs ${match.awayTeam.name} on ${scheduledDate} in ${match.league.name}. Book a facility and assign the rental to this game.`,
        data: {
          type: 'home_book_facility',
          matchId: match.id,
          leagueId: match.leagueId,
          homeTeamId: match.homeTeam.id,
          awayTeamId: match.awayTeam.id,
        },
      };

      console.log(
        'Sending facility booking notification to home roster manager(s)',
        homeManagerUserIds
      );
      console.log('Notification:', notification);
    } catch (error) {
      console.error(
        'Error sending home manager facility booking notification:',
        error
      );
    }
  }

  /**
   * Notify the away roster manager that they need to confirm a free league game.
   * Includes venue details, game date/time, opponent roster name, and 48h deadline.
   */
  static async notifyAwayManagerConfirmation(
    matchId: string,
    venueDetails: {
      facilityName: string;
      courtName: string;
      facilityAddress: string;
      date: string;
      startTime: string;
      endTime: string;
    },
    confirmationDeadline: Date
  ): Promise<void> {
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          league: {
            select: {
              name: true,
            },
          },
          homeTeam: {
            select: {
              id: true,
              name: true,
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              members: {
                where: { role: 'captain', status: 'active' },
                select: { userId: true },
              },
            },
          },
        },
      });

      if (!match || !match.homeTeam || !match.awayTeam) return;

      const awayManagerUserIds = match.awayTeam.members.map(m => m.userId);

      if (awayManagerUserIds.length === 0) {
        console.warn(
          `No manager found for away roster ${match.awayTeam.id} — cannot send confirmation request`
        );
        return;
      }

      const deadlineStr = confirmationDeadline.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      const notification: NotificationTemplate = {
        title: 'Confirm Game',
        body: `${match.homeTeam.name} has booked ${venueDetails.facilityName} (${venueDetails.courtName}) for your game on ${venueDetails.date}, ${venueDetails.startTime}–${venueDetails.endTime}. Confirm by ${deadlineStr} or the game will lapse.`,
        data: {
          type: 'away_confirm_game',
          matchId: match.id,
          leagueId: match.leagueId,
          homeTeamId: match.homeTeam.id,
          awayTeamId: match.awayTeam.id,
          facilityName: venueDetails.facilityName,
          courtName: venueDetails.courtName,
          facilityAddress: venueDetails.facilityAddress,
          date: venueDetails.date,
          startTime: venueDetails.startTime,
          endTime: venueDetails.endTime,
          confirmationDeadline: confirmationDeadline.toISOString(),
        },
      };

      console.log(
        'Sending away confirmation request to roster manager(s)',
        awayManagerUserIds
      );
      console.log('Notification:', notification);
    } catch (error) {
      console.error(
        'Error sending away manager confirmation notification:',
        error
      );
    }
  }

  /**
   * Notify the league commissioner when a roster reaches the strike threshold (3+)
   * in a season. Surfaces the option to remove the roster from the league.
   */
  static async notifyCommissionerStrikeThreshold(
    rosterId: string,
    seasonId: string,
    strikeCount: number
  ): Promise<void> {
    try {
      const roster = await prisma.team.findUnique({
        where: { id: rosterId },
        select: { id: true, name: true },
      });

      if (!roster) return;

      const season = await prisma.season.findUnique({
        where: { id: seasonId },
        include: {
          league: {
            select: { id: true, name: true, organizerId: true },
          },
        },
      });

      if (!season || !season.league) return;

      const notification: NotificationTemplate = {
        title: 'Roster Strike Threshold Reached',
        body: `${roster.name} has reached ${strikeCount} strikes in ${season.league.name} (${season.name}). You may remove this roster from the league.`,
        data: {
          type: 'strike_threshold_reached',
          rosterId: roster.id,
          rosterName: roster.name,
          seasonId: season.id,
          leagueId: season.league.id,
          strikeCount,
        },
      };

      console.log(
        `Sending strike threshold notification to commissioner ${season.league.organizerId}`
      );
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending strike threshold notification:', error);
    }
  }

  /**
   * Notify the roster manager when their roster's balance status transitions to 'low'.
   * Sent as a push notification to prompt the manager to top up their account.
   */
  static async notifyLowBalance(
    rosterId: string,
    rosterName: string
  ): Promise<void> {
    try {
      const captain = await prisma.teamMember.findFirst({
        where: { teamId: rosterId, role: 'captain', status: 'active' },
        select: { userId: true },
      });

      if (!captain) {
        console.warn(
          `No manager found for roster ${rosterId} — cannot send low balance notification`
        );
        return;
      }

      const notification: NotificationTemplate = {
        title: 'Low Balance',
        body: `${rosterName}'s balance is running low. Top up to avoid being blocked from upcoming games.`,
        data: {
          type: 'low_balance',
          rosterId,
          rosterName,
        },
      };

      await NotificationService.queueNotification(
        [captain.userId],
        notification
      );

      console.log(
        `Sending low balance notification for roster ${rosterName} to manager ${captain.userId}`
      );
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending low balance notification:', error);
    }
  }

  /**
   * Notify the roster manager when their roster's balance status transitions to 'blocked'.
   * Includes the exact top-up amount required to return to a usable state.
   */
  static async notifyBlockedBalance(
    rosterId: string,
    rosterName: string,
    topUpAmount: number
  ): Promise<void> {
    try {
      const captain = await prisma.teamMember.findFirst({
        where: { teamId: rosterId, role: 'captain', status: 'active' },
        select: { userId: true },
      });

      if (!captain) {
        console.warn(
          `No manager found for roster ${rosterId} — cannot send blocked balance notification`
        );
        return;
      }

      const formattedAmount = `$${topUpAmount.toFixed(2)}`;

      const notification: NotificationTemplate = {
        title: 'Balance Blocked',
        body: `${rosterName} is blocked from games. Top up at least ${formattedAmount} to resume scheduling.`,
        data: {
          type: 'blocked_balance',
          rosterId,
          rosterName,
          topUpAmount,
        },
      };

      await NotificationService.queueNotification(
        [captain.userId],
        notification
      );

      console.log(
        `Sending blocked balance notification for roster ${rosterName} to manager ${captain.userId}`
      );
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending blocked balance notification:', error);
    }
  }

  /**
   * Notify both roster managers and the league commissioner when a booking
   * transitions to 'payment_hold' because a capture-window re-authorization
   * failed (manager balance now insufficient).
   */
  static async notifyPaymentHold(
    bookingId: string,
    failedParticipantRosterId: string
  ): Promise<void> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          participants: {
            select: {
              rosterId: true,
              role: true,
            },
          },
        },
      });

      if (!booking) return;

      // Collect all roster manager user IDs from participants
      const rosterIds = [...new Set(booking.participants.map(p => p.rosterId))];
      const captains = await prisma.teamMember.findMany({
        where: {
          teamId: { in: rosterIds },
          role: 'captain',
          status: 'active',
        },
        select: { userId: true, teamId: true },
      });

      const managerUserIds = captains.map(c => c.userId);

      // Find the commissioner if this booking is linked to a league match
      let commissionerUserId: string | null = null;
      if (booking.rentalId) {
        const match = await prisma.match.findFirst({
          where: { rentalId: booking.rentalId },
          select: {
            league: {
              select: { organizerId: true },
            },
          },
        });
        commissionerUserId = match?.league?.organizerId ?? null;
      }

      const failedRoster = await prisma.team.findUnique({
        where: { id: failedParticipantRosterId },
        select: { name: true },
      });

      const notification: NotificationTemplate = {
        title: 'Payment Hold',
        body: `Booking ${bookingId} is on hold — re-authorization failed for ${failedRoster?.name ?? 'a roster'}. The manager's balance may be insufficient.`,
        data: {
          type: 'payment_hold',
          bookingId,
          failedRosterId: failedParticipantRosterId,
        },
      };

      const allRecipients = [
        ...new Set([
          ...managerUserIds,
          ...(commissionerUserId ? [commissionerUserId] : []),
        ]),
      ];

      await NotificationService.queueNotification(allRecipients, notification);

      console.log(
        `[payment-hold] Notifying ${allRecipients.length} user(s) about booking ${bookingId} payment hold`
      );
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending payment hold notification:', error);
    }
  }

  /**
   * Notify a guardian that their dependent has turned 18 and is eligible
   * for account transfer. Includes the dependent's name and a prompt to
   * initiate the transfer.
   */
  static async notifyDependentTurned18(
    guardianId: string,
    dependentId: string,
    dependentName: string
  ): Promise<void> {
    try {
      const notification: NotificationTemplate = {
        title: 'Account Transfer Available',
        body: `${dependentName} has turned 18 and is eligible for an independent Muster account. Tap here to start the transfer.`,
        data: {
          type: 'dependent_turned_18',
          dependentId,
        },
      };

      await NotificationService.queueNotification([guardianId], notification);

      console.log(
        `[age-check] Sending transfer notification for dependent ${dependentId} to guardian ${guardianId}`
      );
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending dependent turned 18 notification:', error);
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
      console.log(
        `Event ${eventId} auto-opened: ${event.currentParticipants}/${event.minimumPlayerCount} players`
      );
    } catch (error) {
      console.error('Error sending event auto-opened notification:', error);
    }
  }

  /**
   * Send notification when a user's trial expires in 7 days
   */
  static async notifyTrialExpiring7d(
    userId: string,
    trialTier: string,
    expiryDate: Date
  ): Promise<void> {
    try {
      const notification: NotificationTemplate = {
        title: 'Trial Expiring Soon',
        body: `Your ${trialTier} trial expires in 7 days on ${expiryDate.toLocaleDateString()}. Subscribe now to keep your tier.`,
        data: {
          type: 'trial_expiring_7d',
          trialTier,
          expiryDate: expiryDate.toISOString(),
        },
      };

      await NotificationService.queueNotification([userId], notification);

      console.log(
        `[trial-expiry] Sending 7-day expiry notification for user ${userId} (tier: ${trialTier}, expires: ${expiryDate.toISOString()})`
      );
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending trial expiring 7d notification:', error);
    }
  }

  /**
   * Send notification when a user's trial expires in 1 day
   */
  static async notifyTrialExpiring1d(
    userId: string,
    trialTier: string,
    expiryDate: Date
  ): Promise<void> {
    try {
      const notification: NotificationTemplate = {
        title: 'Trial Expires Tomorrow',
        body: `Your ${trialTier} trial expires tomorrow on ${expiryDate.toLocaleDateString()}. Subscribe now to keep your tier.`,
        data: {
          type: 'trial_expiring_1d',
          trialTier,
          expiryDate: expiryDate.toISOString(),
        },
      };

      await NotificationService.queueNotification([userId], notification);

      console.log(
        `[trial-expiry] Sending 1-day expiry notification for user ${userId} (tier: ${trialTier}, expires: ${expiryDate.toISOString()})`
      );
      console.log('Notification:', notification);
    } catch (error) {
      console.error('Error sending trial expiring 1d notification:', error);
    }
  }

  /**
   * Send notification when an insurance document is approaching expiry (30-day warning).
   */
  static async notifyReservationApproved(
    renterId: string,
    facilityName: string,
    courtName: string,
    date: string,
    startTime: string,
    rentalId: string,
    facilityId: string
  ): Promise<void> {
    try {
      const notification: NotificationTemplate = {
        title: 'Reservation Approved',
        body: `Your reservation at ${facilityName} (${courtName}) on ${date} at ${startTime} has been approved.`,
        data: {
          type: 'reservation_approved',
          rentalId,
          facilityId,
        },
      };

      await NotificationService.queueNotification([renterId], notification);

      console.log(
        `[reservation-approval] Approved notification sent to user ${renterId} for rental ${rentalId}`
      );
    } catch (error) {
      console.error('Error sending reservation approved notification:', error);
    }
  }

  static async notifyReservationDenied(
    renterId: string,
    facilityName: string,
    courtName: string,
    date: string,
    startTime: string,
    rentalId: string,
    facilityId: string
  ): Promise<void> {
    try {
      const notification: NotificationTemplate = {
        title: 'Reservation Denied',
        body: `Your reservation at ${facilityName} (${courtName}) on ${date} at ${startTime} has been denied.`,
        data: {
          type: 'reservation_denied',
          rentalId,
          facilityId,
        },
      };

      await NotificationService.queueNotification([renterId], notification);

      console.log(
        `[reservation-approval] Denied notification sent to user ${renterId} for rental ${rentalId}`
      );
    } catch (error) {
      console.error('Error sending reservation denied notification:', error);
    }
  }

  static async notifyInsuranceDocumentExpiring(
    userId: string,
    policyName: string,
    expiryDate: Date
  ): Promise<void> {
    try {
      const notification: NotificationTemplate = {
        title: 'Insurance Document Expiring Soon',
        body: `Your insurance document "${policyName}" expires on ${expiryDate.toLocaleDateString()}. Please upload a new document to maintain coverage.`,
        data: {
          type: 'insurance_document_expiring',
          policyName,
          expiryDate: expiryDate.toISOString(),
        },
      };

      await NotificationService.queueNotification([userId], notification);

      console.log(
        `[insurance-expiry] Sending expiry warning for user ${userId} (policy: ${policyName}, expires: ${expiryDate.toISOString()})`
      );
    } catch (error) {
      console.error(
        'Error sending insurance document expiry notification:',
        error
      );
    }
  }

  /**
   * Check user notification preferences before sending
   */
  private static async shouldSendNotification(
    userId: string,
    notificationType: string
  ): Promise<boolean> {
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
