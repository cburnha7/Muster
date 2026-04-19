/**
 * Format a sport type enum value for display.
 * flag_football → Flag Football
 * table_tennis → Table Tennis
 */
export function formatSportType(value: string): string {
  if (!value) return '';
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
