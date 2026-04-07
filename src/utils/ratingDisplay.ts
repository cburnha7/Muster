/**
 * Rating display helpers.
 *
 * Rules:
 * - No games played → "In It for the Love"
 * - Rating at or below decay floor (30) → "In It for the Love"
 * - Percentile below 60 → "In It for the Love"
 * - Otherwise → ordinal percentile string (e.g. "72nd percentile")
 */

const PERCENTILE_THRESHOLD = 60;
const DECAY_FLOOR = 30;
export const LOVE_LABEL = 'In It for the Love';

const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Returns the display string for a percentile value.
 *
 * @param percentile  Cached percentile (0–100), or null if not yet calculated
 * @param gamesPlayed Number of qualified games played in this sport/tier
 * @param rating      The underlying rating value (to check decay floor)
 */
export function formatRatingDisplay(
  percentile: number | null | undefined,
  gamesPlayed: number,
  rating?: number | null
): string {
  if (gamesPlayed === 0) return LOVE_LABEL;
  if (rating != null && rating <= DECAY_FLOOR) return LOVE_LABEL;
  if (percentile == null || percentile < PERCENTILE_THRESHOLD)
    return LOVE_LABEL;
  return `${ordinal(Math.round(percentile))} percentile`;
}

/**
 * Returns true when the love label should be shown (no number displayed).
 */
export function isLoveLabel(
  percentile: number | null | undefined,
  gamesPlayed: number,
  rating?: number | null
): boolean {
  return formatRatingDisplay(percentile, gamesPlayed, rating) === LOVE_LABEL;
}
