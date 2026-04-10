/**
 * Maps a sport key to the appropriate surface/playing-area name.
 * Used for court card labels, "Add Court"/"Add Field" buttons, and modal titles.
 */
const SURFACE_MAP: Record<string, string> = {
  soccer: 'Field',
  basketball: 'Court',
  tennis: 'Court',
  volleyball: 'Court',
  hockey: 'Rink',
  baseball: 'Diamond',
  softball: 'Diamond',
  lacrosse: 'Field',
  flag_football: 'Field',
  kickball: 'Field',
  rugby: 'Field',
  cricket: 'Pitch',
  pickleball: 'Court',
  badminton: 'Court',
  table_tennis: 'Table',
  golf: 'Course',
  swimming: 'Pool',
  running: 'Track',
  cycling: 'Course',
  other: 'Court',
};

export function getSurfaceName(sportKey: string): string {
  return SURFACE_MAP[sportKey?.toLowerCase()] ?? 'Court';
}
