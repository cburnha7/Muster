/**
 * Schedule Import Types
 * Shared across parsing, review, and import services.
 */

/** A single parsed game row from a schedule file */
export interface GameRow {
  gameNumber: string | null;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm or null for TBD
  homeTeam: string;
  awayTeam: string;
  location: string | null;
  division: string | null;
}

/** Result of parsing a schedule file */
export interface ParseResult {
  success: boolean;
  gameRows: GameRow[];
  errors: string[];
}

/** A confirmed game ready for event creation */
export interface ConfirmedGame extends GameRow {
  isHomeTeam: boolean;
  opponentName: string;
}

/** Result of creating events from confirmed games */
export interface ImportResult {
  created: number;
  failed: number;
  errors: string[];
}

/** Column mapping detected from file headers */
export interface ColumnMapping {
  gameNumber: number | null;
  date: number | null;
  time: number | null;
  homeTeam: number | null;
  awayTeam: number | null;
  location: number | null;
  division: number | null;
}
