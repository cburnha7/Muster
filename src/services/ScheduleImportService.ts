import { GameRow, ConfirmedGame, ImportResult } from '../types/scheduleImport';
import { facilityService } from './api/FacilityService';
import { teamService } from './api/TeamService';
import { eventService } from './api/EventService';
import { Team } from '../types';

/**
 * Identifies which team in a game row is the opponent based on the roster name.
 * Uses case-insensitive substring matching.
 */
export function identifyOpponent(
  gameRow: GameRow,
  rosterName: string
): { opponentName: string; isHomeTeam: boolean; matched: boolean } {
  const homeLower = gameRow.homeTeam.toLowerCase().trim();
  const awayLower = gameRow.awayTeam.toLowerCase().trim();
  const rosterLower = rosterName.toLowerCase().trim();

  if (homeLower.includes(rosterLower) || rosterLower.includes(homeLower)) {
    return { opponentName: gameRow.awayTeam, isHomeTeam: true, matched: true };
  }
  if (awayLower.includes(rosterLower) || rosterLower.includes(awayLower)) {
    return { opponentName: gameRow.homeTeam, isHomeTeam: false, matched: true };
  }
  return { opponentName: '', isHomeTeam: true, matched: false };
}

class ScheduleImportService {
  /**
   * Builds the event payload for a confirmed game.
   */
  buildEventPayload(
    game: ConfirmedGame,
    team: Team,
    userId: string,
    facilityId: string | null,
    opponentRosterId: string | null
  ): any {
    const startTime = game.time
      ? new Date(`${game.date}T${game.time}`)
      : new Date(`${game.date}T00:00:00`);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    const payload: any = {
      title: `${team.name} vs ${game.opponentName}`,
      sportType: team.sportType,
      organizerId: userId,
      eventType: 'game',
      scheduledStatus: game.time ? 'scheduled' : 'unscheduled',
      startTime,
      endTime,
      eligibility: {
        restrictedToTeams: [
          team.id,
          ...(opponentRosterId ? [opponentRosterId] : []),
        ],
      },
      maxParticipants: team.maxMembers || 30,
      price: 0,
      skillLevel: team.skillLevel || 'all_levels',
    };

    if (facilityId) {
      payload.facilityId = facilityId;
    } else if (game.location) {
      payload.locationName = game.location;
      payload.locationAddress = game.location;
    }

    return payload;
  }

  /**
   * Searches existing facilities by name and returns the first match ID, or null.
   */
  async matchFacility(locationName: string): Promise<string | null> {
    try {
      const result = await facilityService.searchFacilities(locationName);
      const locationLower = locationName.toLowerCase().trim();
      const match = result.results.find(
        f => f.name.toLowerCase().trim() === locationLower
      );
      return match ? match.id : null;
    } catch {
      return null;
    }
  }

  /**
   * Searches existing rosters by name and returns the first match ID, or null.
   */
  async matchOpponentRoster(opponentName: string): Promise<string | null> {
    try {
      const result = await teamService.searchTeams(opponentName);
      const opponentLower = opponentName.toLowerCase().trim();
      const match = result.results.find(
        t => t.name.toLowerCase().trim() === opponentLower
      );
      return match ? match.id : null;
    } catch {
      return null;
    }
  }

  /**
   * Creates events from confirmed games. Continues on individual failures.
   */
  async createEventsFromGames(
    confirmedGames: ConfirmedGame[],
    team: Team,
    userId: string
  ): Promise<ImportResult> {
    const result: ImportResult = { created: 0, failed: 0, errors: [] };

    for (const game of confirmedGames) {
      try {
        const facilityId = game.location
          ? await this.matchFacility(game.location)
          : null;
        const opponentRosterId = game.opponentName
          ? await this.matchOpponentRoster(game.opponentName)
          : null;

        const payload = this.buildEventPayload(
          game,
          team,
          userId,
          facilityId,
          opponentRosterId
        );
        await eventService.createEvent(payload);
        result.created++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(
          `Failed to create event for game on ${game.date}: ${error?.message || 'Unknown error'}`
        );
      }
    }

    return result;
  }
}

export const scheduleImportService = new ScheduleImportService();
