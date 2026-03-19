import type { Match } from '../../../types';
import type { ScheduleEvent } from '../../../store/slices/scheduleSlice';

/**
 * Maps backend Match objects to frontend ScheduleEvent objects.
 *
 * The backend uses "team" terminology (homeTeamId, awayTeamId, homeTeam.name)
 * while the frontend uses "roster" terminology per brand guidelines
 * (homeRosterId, awayRosterId, homeRosterName, awayRosterName).
 */
export function mapMatchesToScheduleEvents(matches: Match[]): ScheduleEvent[] {
  return matches.map((match) => ({
    id: match.id,
    homeRosterId: match.homeTeamId,
    homeRosterName: match.homeTeam?.name ?? '',
    awayRosterId: match.awayTeamId,
    awayRosterName: match.awayTeam?.name ?? '',
    scheduledAt: typeof match.scheduledAt === 'string'
      ? match.scheduledAt
      : match.scheduledAt.toISOString(),
    round: match.round ?? 1,
  }));
}
