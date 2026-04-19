/**
 * Shared sport utility functions.
 * Single source of truth for sport icons, labels, and formatting.
 * Replaces duplicated inline functions across 14+ card/detail components.
 */

import { SportType } from '../types';
import { formatSportType } from './formatters';

/**
 * Map a sport type to an Ionicons icon name.
 * Used in cards and detail screens for sport indicators.
 */
export function getSportIcon(sportType: SportType | string): string {
  const key = (
    typeof sportType === 'string' ? sportType : sportType
  ).toLowerCase();
  switch (key) {
    case 'basketball':
      return 'basketball-outline';
    case 'soccer':
      return 'football-outline';
    case 'tennis':
      return 'tennisball-outline';
    case 'volleyball':
      return 'basketball-outline';
    case 'pickleball':
      return 'tennisball-outline';
    case 'badminton':
      return 'tennisball-outline';
    case 'flag_football':
      return 'american-football-outline';
    case 'baseball':
      return 'baseball-outline';
    case 'softball':
      return 'baseball-outline';
    case 'kickball':
      return 'football-outline';
    case 'hockey':
      return 'hockey-puck';
    case 'lacrosse':
      return 'basketball-outline';
    case 'rugby':
      return 'american-football-outline';
    case 'cricket':
      return 'baseball-outline';
    case 'table_tennis':
      return 'tennisball-outline';
    case 'golf':
      return 'golf-outline';
    case 'swimming':
      return 'water-outline';
    case 'running':
      return 'walk-outline';
    case 'cycling':
      return 'bicycle-outline';
    default:
      return 'basketball-outline';
  }
}

/**
 * Format a sport type key into a human-readable label.
 * e.g., "flag_football" → "Flag Football"
 */
export function formatSport(sportType: string): string {
  return formatSportType(sportType);
}
