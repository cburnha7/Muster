/**
 * ScheduleParserService — frontend CSV parsing, field extraction, normalization.
 *
 * Uses papaparse for CSV. Excel files are not supported on the client —
 * export to CSV first, or use the server-side PDF parser.
 */

import Papa from 'papaparse';
import { GameRow, ParseResult, ColumnMapping } from '../types/scheduleImport';

/** Lowercase aliases for each logical column */
const COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  gameNumber: ['game', 'game #', 'game no', 'number', '#'],
  date: ['date', 'game date'],
  time: ['time', 'game time', 'start time'],
  homeTeam: ['home', 'home team'],
  awayTeam: ['away', 'away team', 'visitor', 'visiting'],
  location: ['location', 'field', 'venue', 'site'],
  division: ['division', 'div', 'league'],
};

class ScheduleParserService {
  /**
   * Fuzzy-match an array of header strings to logical column indices.
   */
  detectColumns(headers: string[]): ColumnMapping {
    const lower = headers.map(h => h.trim().toLowerCase());

    const mapping: ColumnMapping = {
      gameNumber: null,
      date: null,
      time: null,
      homeTeam: null,
      awayTeam: null,
      location: null,
      division: null,
    };

    for (const key of Object.keys(COLUMN_ALIASES) as (keyof ColumnMapping)[]) {
      for (const alias of COLUMN_ALIASES[key]) {
        const idx = lower.indexOf(alias);
        if (idx !== -1) {
          mapping[key] = idx;
          break;
        }
      }
    }

    return mapping;
  }

  private parseDate(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
    }

    const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const [, m, d, y] = usMatch;
      return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
    }

    return null;
  }

  private parseTime(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const [, h, m] = match24;
      return `${h!.padStart(2, '0')}:${m}`;
    }

    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (match12) {
      const [, hStr, m, period] = match12;
      let h = parseInt(hStr!, 10);
      if (period!.toLowerCase() === 'pm' && h !== 12) h += 12;
      if (period!.toLowerCase() === 'am' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m}`;
    }

    return null;
  }

  normalizeRow(
    raw: Record<string, string>,
    mapping: ColumnMapping,
    headers: string[]
  ): GameRow | null {
    const get = (idx: number | null): string =>
      idx !== null && idx < headers.length
        ? (raw[headers[idx]!] ?? '').trim()
        : '';

    const dateStr = this.parseDate(get(mapping.date));
    const homeTeam = get(mapping.homeTeam);
    const awayTeam = get(mapping.awayTeam);

    if (!dateStr || !homeTeam || !awayTeam) return null;

    return {
      gameNumber: get(mapping.gameNumber) || null,
      date: dateStr,
      time: this.parseTime(get(mapping.time)),
      homeTeam,
      awayTeam,
      location: get(mapping.location) || null,
      division: get(mapping.division) || null,
    };
  }

  /**
   * Parse a CSV string into GameRows.
   */
  parseCSV(fileContent: string): ParseResult {
    const errors: string[] = [];

    const parsed = Papa.parse<Record<string, string>>(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      errors.push(...parsed.errors.map(e => `Row ${e.row}: ${e.message}`));
    }

    const headers = parsed.meta.fields ?? [];
    if (headers.length === 0) {
      return {
        success: false,
        gameRows: [],
        errors: ['No headers found in CSV file.'],
      };
    }

    const mapping = this.detectColumns(headers);
    const gameRows: GameRow[] = [];

    for (const row of parsed.data) {
      const normalized = this.normalizeRow(row, mapping, headers);
      if (normalized) gameRows.push(normalized);
    }

    if (gameRows.length === 0) {
      return {
        success: false,
        gameRows: [],
        errors: errors.length
          ? errors
          : [
              'Could not extract any games from this file. Please check the file format and try again.',
            ],
      };
    }

    return { success: true, gameRows, errors };
  }
}

export const scheduleParserService = new ScheduleParserService();
