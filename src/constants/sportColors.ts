import { tokenSport } from '../theme/tokens';
import { lightColors } from '../theme/tokens';

/**
 * Sport Colors — re-exported from design tokens.
 *
 * Use `tokenSport[key].solid` for the primary sport color.
 * This file exists for backward compatibility; prefer importing
 * directly from `src/theme/tokens` in new code.
 */
export const SPORT_COLORS: Record<string, string> = {
  basketball: tokenSport.basketball.solid,
  soccer: tokenSport.soccer.solid,
  tennis: tokenSport.tennis.solid,
  pickleball: tokenSport.pickleball.solid,
  volleyball: tokenSport.volleyball.solid,
  badminton: tokenSport.other.solid,
  flag_football: tokenSport.flag_football.solid,
  baseball: tokenSport.baseball.solid,
  softball: tokenSport.softball.solid,
  kickball: tokenSport.kickball.solid,
  other: tokenSport.other.solid,
};

export function getSportColor(sport?: string | null): string {
  if (!sport) return lightColors.cobalt;
  const key = sport.toLowerCase().replace(/ /g, '_');
  return SPORT_COLORS[key] ?? lightColors.cobalt;
}

/** Returns the sport color at ~10% opacity as a hex string */
export function getSportTint(sport?: string | null): string {
  const color = getSportColor(sport);
  return color + '1A'; // 1A ≈ 10% opacity in hex
}
