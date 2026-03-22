// Scheduling types for league event generation and management

/**
 * Basic roster identification used across scheduling interfaces.
 */
export interface RosterInfo {
  id: string;
  name: string;
}

/**
 * Preview of a generated schedule before confirmation.
 * Returned by the schedule generator for Commissioner review.
 */
export interface SchedulePreview {
  events: SchedulePreviewEvent[];
  totalGames: number;
  format: 'season' | 'season_with_playoffs' | 'tournament';
}

/**
 * A single event in a schedule preview.
 */
export interface SchedulePreviewEvent {
  homeRoster: RosterInfo;
  awayRoster: RosterInfo;
  scheduledAt: string;
  round: number;
  flag?: 'playoffs' | 'tournament';
  gameNumber?: number;
}

/**
 * A playoff event extending the base preview event.
 * Playoff rounds are appended after the regular season.
 */
export interface PlayoffEvent extends SchedulePreviewEvent {
  flag: 'playoffs';
  playoffRound: number;
}

/**
 * A tournament bracket event extending the base preview event.
 * Includes bracket positioning and placeholder labels for undetermined matchups.
 */
export interface TournamentEvent extends SchedulePreviewEvent {
  flag: 'tournament';
  bracketRound: number;
  bracketPosition: number;
  placeholderLabel?: string;
}

/**
 * Event payload sent when the Commissioner confirms the schedule.
 * Used by the confirm-schedule endpoint to persist shell events.
 */
export interface ConfirmableEvent {
  homeRosterId: string;
  homeRosterName: string;
  awayRosterId: string;
  awayRosterName: string;
  scheduledAt: string;
  round: number;
  flag?: 'playoffs' | 'tournament';
  gameNumber?: number;
}
