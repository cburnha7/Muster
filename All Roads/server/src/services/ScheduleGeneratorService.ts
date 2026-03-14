import { PrismaClient } from '@prisma/client';
import { NotificationService } from './NotificationService';

const prisma = new PrismaClient();

interface RosterInfo {
  id: string;
  name: string;
}

interface ShellEvent {
  homeRoster: RosterInfo;
  awayRoster: RosterInfo;
  scheduledAt: Date;
  round: number;
}

export class ScheduleGeneratorService {
  /**
   * Generate round-robin shell events for a league.
   * Creates Event + Match records in a transaction.
   */
  static async generateRoundRobin(leagueId: string): Promise<{ eventsCreated: number }> {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        memberships: {
          where: { status: 'active', memberType: 'roster' },
          include: {
            team: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!league) throw new Error('League not found');
    if (league.scheduleGenerated) throw new Error('Schedule already generated for this league');

    const rosters: RosterInfo[] = league.memberships
      .filter(m => m.team)
      .map(m => ({ id: m.team!.id, name: m.team!.name }));

    if (rosters.length < 2) {
      throw new Error('At least 2 active rosters required to generate a schedule');
    }

    if (!league.preferredGameDays?.length || !league.seasonGameCount) {
      throw new Error('Schedule configuration incomplete: preferredGameDays and seasonGameCount are required');
    }

    const matchups = this.generateMatchups(rosters, league.seasonGameCount);
    const shellEvents = this.distributeMatchups(
      matchups,
      league.preferredGameDays,
      league.preferredTimeWindowStart || '18:00',
      league.preferredTimeWindowEnd || '21:00',
      league.registrationCloseDate
        ? new Date(new Date(league.registrationCloseDate).getTime() + 7 * 24 * 60 * 60 * 1000)
        : league.startDate
          ? new Date(league.startDate)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    // Create all events and matches in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdEvents: string[] = [];

      for (const shell of shellEvents) {
        const event = await tx.event.create({
          data: {
            title: `${shell.homeRoster.name} vs ${shell.awayRoster.name}`,
            description: `League match: ${league.name} — Round ${shell.round}`,
            sportType: league.sportType,
            skillLevel: league.skillLevel,
            eventType: 'league',
            status: 'active',
            startTime: shell.scheduledAt,
            endTime: new Date(shell.scheduledAt.getTime() + 2 * 60 * 60 * 1000), // 2hr default
            maxParticipants: 50,
            price: 0,
            organizerId: league.organizerId,
            facilityId: null,
            scheduledStatus: 'unscheduled',
            eligibilityRestrictedToLeagues: [leagueId],
            eligibilityRestrictedToTeams: [shell.homeRoster.id, shell.awayRoster.id],
          }
        });

        await tx.match.create({
          data: {
            leagueId,
            homeTeamId: shell.homeRoster.id,
            awayTeamId: shell.awayRoster.id,
            scheduledAt: shell.scheduledAt,
            status: 'scheduled',
            eventId: event.id,
            seasonId: league.seasonId || undefined,
          }
        });

        createdEvents.push(event.id);
      }

      // Mark schedule as generated
      await tx.league.update({
        where: { id: leagueId },
        data: { scheduleGenerated: true }
      });

      return createdEvents;
    });

    return { eventsCreated: result.length };
  }

  /**
   * Generate round-robin matchups for the given rosters.
   * Repeats rounds as needed to reach seasonGameCount total matches.
   */
  private static generateMatchups(rosters: RosterInfo[], seasonGameCount: number): Array<{ home: RosterInfo; away: RosterInfo; round: number }> {
    const n = rosters.length;
    // For odd number of rosters, add a "bye" placeholder
    const rosterList = [...rosters];
    if (n % 2 !== 0) {
      rosterList.push({ id: 'BYE', name: 'BYE' });
    }

    const totalRosters = rosterList.length;
    const roundsPerCycle = totalRosters - 1;
    const matchups: Array<{ home: RosterInfo; away: RosterInfo; round: number }> = [];

    let roundNum = 1;
    let cycle = 0;

    while (matchups.length < seasonGameCount) {
      // Standard round-robin rotation
      for (let round = 0; round < roundsPerCycle && matchups.length < seasonGameCount; round++) {
        const roundMatchups: Array<{ home: RosterInfo; away: RosterInfo }> = [];

        for (let i = 0; i < totalRosters / 2; i++) {
          const homeIdx = i === 0 ? 0 : ((round + i - 1) % (totalRosters - 1)) + 1;
          const awayIdx = i === 0
            ? ((round + totalRosters / 2 - 1) % (totalRosters - 1)) + 1
            : ((round + totalRosters - 1 - i - 1) % (totalRosters - 1)) + 1;

          const home = rosterList[homeIdx];
          const away = rosterList[awayIdx];

          // Skip bye matchups
          if (home.id === 'BYE' || away.id === 'BYE') continue;

          // Alternate home/away in second cycle
          if (cycle % 2 === 0) {
            roundMatchups.push({ home, away });
          } else {
            roundMatchups.push({ home: away, away: home });
          }
        }

        for (const m of roundMatchups) {
          if (matchups.length >= seasonGameCount) break;
          matchups.push({ ...m, round: roundNum });
        }
        roundNum++;
      }
      cycle++;
    }

    return matchups;
  }

  /**
   * Distribute matchups across preferred game days with times within the window.
   */
  private static distributeMatchups(
    matchups: Array<{ home: RosterInfo; away: RosterInfo; round: number }>,
    preferredGameDays: number[],
    timeWindowStart: string,
    timeWindowEnd: string,
    startDate: Date
  ): ShellEvent[] {
    const events: ShellEvent[] = [];
    const sortedDays = [...preferredGameDays].sort((a, b) => a - b);

    const [startH, startM] = timeWindowStart.split(':').map(Number);
    const [endH, endM] = timeWindowEnd.split(':').map(Number);
    const windowMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    // Space games 2 hours apart within the window
    const gamesPerSlot = Math.max(1, Math.floor(windowMinutes / 120));

    let currentDate = new Date(startDate);
    let matchIdx = 0;

    while (matchIdx < matchups.length) {
      // Find next preferred game day
      const dayOfWeek = currentDate.getDay();
      const nextDay = sortedDays.find(d => d >= dayOfWeek) ?? sortedDays[0];
      let daysToAdd = nextDay >= dayOfWeek ? nextDay - dayOfWeek : 7 - dayOfWeek + nextDay;
      if (daysToAdd === 0 && matchIdx > 0 && events.length > 0) {
        // Already used this day, move to next occurrence
        const nextNextDay = sortedDays.find(d => d > dayOfWeek) ?? sortedDays[0];
        daysToAdd = nextNextDay > dayOfWeek ? nextNextDay - dayOfWeek : 7 - dayOfWeek + nextNextDay;
        if (daysToAdd === 0) daysToAdd = 7;
      }

      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + daysToAdd);

      // Schedule up to gamesPerSlot matches on this day
      for (let slot = 0; slot < gamesPerSlot && matchIdx < matchups.length; slot++) {
        const matchup = matchups[matchIdx];
        const gameTime = new Date(currentDate);
        gameTime.setHours(startH + slot * 2, startM, 0, 0);

        events.push({
          homeRoster: matchup.home,
          awayRoster: matchup.away,
          scheduledAt: gameTime,
          round: matchup.round,
        });
        matchIdx++;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return events;
  }

  /**
   * Update a shell event's scheduled status when a facility is assigned.
   * Notifies all players on both rosters.
   */
  static async markEventScheduled(eventId: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        matches: {
          include: {
            homeTeam: {
              include: { members: { where: { status: 'active' }, select: { userId: true } } }
            },
            awayTeam: {
              include: { members: { where: { status: 'active' }, select: { userId: true } } }
            }
          }
        },
        facility: { select: { name: true, street: true, city: true } }
      }
    });

    if (!event || event.scheduledStatus !== 'unscheduled') return;

    await prisma.event.update({
      where: { id: eventId },
      data: { scheduledStatus: 'scheduled' }
    });

    // Notify all players on both rosters
    if (event.matches.length > 0 && event.facility) {
      const match = event.matches[0];
      const playerIds = [
        ...match.homeTeam.members.map(m => m.userId),
        ...match.awayTeam.members.map(m => m.userId),
      ];

      for (const playerId of playerIds) {
        try {
          NotificationService.sendNotification(playerId, {
            title: 'Game Scheduled',
            body: `${event.title} — ${event.facility.name}, ${event.facility.city}`,
            data: { eventId: event.id, type: 'event_scheduled' }
          });
        } catch {
          // Non-critical: continue if notification fails
        }
      }
    }
  }
}
