/**
 * ScheduleParserService — frontend CSV/Excel parsing, field extraction, normalization.
 *
 * Uses papaparse for CSV and xlsx for Excel files.
 * Detects columns via fuzzy header matching and normalizes rows into GameRow objects.
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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
   * Returns -1-based indices (null when no match found).
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

  /**
   * Parse a date string into YYYY-MM-DD format.
   * Handles: MM/DD/YYYY, M/D/YYYY, YYYY-MM-DD.
   * Returns null if the string cannot be parsed.
   */
  private parseDate(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Already ISO: YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // US format: M/D/YYYY or MM/DD/YYYY
    const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const [, m, d, y] = usMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    return null;
  }

  /**
   * Normalize a time string to HH:mm format.
   * Returns null if the string is empty or unparseable.
   */
  private parseTime(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // HH:mm or H:mm (24-hour)
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const [, h, m] = match24;
      return `${h.padStart(2, '0')}:${m}`;
    }

    // 12-hour with AM/PM: H:MM AM, HH:MM PM
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (match12) {
      let [, hStr, m, period] = match12;
      let h = parseInt(hStr, 10);
      if (period.toLowerCase() === 'pm' && h !== 12) h += 12;
      if (period.toLowerCase() === 'am' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m}`;
    }

    return null;
  }

  /**
   * Convert a raw row (keyed by original header) into a GameRow using the
   * detected column mapping. Returns null when required fields are missing.
   */
  normalizeRow(
    raw: Record<string, string>,
    mapping: ColumnMapping,
    headers: string[]
  ): GameRow | null {
    const get = (idx: number | null): string =>
      idx !== null && idx < headers.length
        ? (raw[headers[idx]] ?? '').trim()
        : '';

    const dateStr = this.parseDate(get(mapping.date));
    const homeTeam = get(mapping.homeTeam);
    const awayTeam = get(mapping.awayTeam);

    // date, homeTeam, and awayTeam are required
    if (!dateStr || !homeTeam || !awayTeam) return null;

    const timeRaw = get(mapping.time);
    const locationRaw = get(mapping.location);
    const gameNumberRaw = get(mapping.gameNumber);
    const divisionRaw = get(mapping.division);

    return {
      gameNumber: gameNumberRaw || null,
      date: dateStr,
      time: this.parseTime(timeRaw),
      homeTeam,
      awayTeam,
      location: locationRaw || null,
      division: divisionRaw || null,
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

  /**
   * Parse an Excel ArrayBuffer into GameRows.
   * Reads the first sheet and converts it to JSON with headers.
   */
  parseExcel(fileBuffer: ArrayBuffer): ParseResult {
    const errors: string[] = [];

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(fileBuffer, { type: 'array' });
    } catch (e: any) {
      return {
        success: false,
        gameRows: [],
        errors: [`Failed to read Excel file: ${e.message ?? 'unknown error'}`],
      };
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        gameRows: [],
        errors: ['Excel file contains no sheets.'],
      };
    }

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: '',
      raw: false,
    });

    if (jsonData.length === 0) {
      return {
        success: false,
        gameRows: [],
        errors: [
          'Could not extract any games from this file. Please check the file format and try again.',
        ],
      };
    }

    // Extract headers from the first row's keys
    const headers = Object.keys(jsonData[0]);
    const mapping = this.detectColumns(headers);
    const gameRows: GameRow[] = [];

    for (const row of jsonData) {
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
