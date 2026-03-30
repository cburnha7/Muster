export const SPORT_COLORS: Record<string, string> = {
  basketball:    '#FF6B35',
  soccer:        '#22C55E',
  tennis:        '#EAB308',
  pickleball:    '#14B8A6',
  volleyball:    '#3B82F6',
  badminton:     '#8B5CF6',
  flag_football: '#EF4444',
  baseball:      '#EF4444',
  softball:      '#F59E0B',
  kickball:      '#F97316',
  other:         '#6B7280',
};

export function getSportColor(sport?: string | null): string {
  if (!sport) return '#0052FF';
  const key = sport.toLowerCase().replace(/ /g, '_');
  return SPORT_COLORS[key] ?? '#0052FF';
}

/** Returns the sport color at ~10% opacity as a hex string */
export function getSportTint(sport?: string | null): string {
  const color = getSportColor(sport);
  return color + '1A'; // 1A ≈ 10% opacity in hex
}
