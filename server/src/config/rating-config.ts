/**
 * Platform Rating Configuration
 *
 * Defines minimum player counts for game qualification and age bracket rules.
 * Games that do not meet minimums are excluded from all rating calculations.
 * Practice events are always excluded regardless of player count.
 */

// ── Sport minimum player counts ──────────────────────────────────────────────

export interface SoccerMinimum {
  /** Age bracket label (e.g. "U9") */
  bracket: string;
  /** Maximum age (turning this year) that falls in this bracket */
  maxAge: number;
  /** Minimum total players required (both sides combined) */
  minPlayers: number;
  /** Format description */
  format: string;
}

/** Soccer minimums vary by age bracket */
export const SOCCER_MINIMUMS: SoccerMinimum[] = [
  { bracket: 'U9', maxAge: 8, minPlayers: 14, format: '7v7' },
  { bracket: 'U12', maxAge: 11, minPlayers: 18, format: '9v9' },
  { bracket: 'Open', maxAge: Infinity, minPlayers: 22, format: '11v11' },
];

/** Minimum players required per sport (non-soccer) */
export const SPORT_MINIMUMS: Record<string, number> = {
  basketball: 10, // 5v5
  baseball: 18, // 9v9
  softball: 18, // 9v9
  hockey: 12, // 6v6
  volleyball: 12, // 6v6
  flag_football: 14, // 7v7
  pickleball: 4, // 2v2
  tennis: 2, // singles minimum; doubles = 4 (checked separately)
  lacrosse: 20, // 10v10
  kickball: 18, // 9v9
};

/**
 * Returns the minimum player count for a given sport and average player age.
 * For soccer, age determines the format. For tennis, doubles requires 4.
 */
export function getMinimumPlayers(
  sport: string,
  averageAge?: number,
  isDoubles?: boolean
): number {
  const s = sport.toLowerCase();

  if (s === 'soccer') {
    const age = averageAge ?? Infinity;
    for (const row of SOCCER_MINIMUMS) {
      if (age <= row.maxAge) return row.minPlayers;
    }
    return SOCCER_MINIMUMS[SOCCER_MINIMUMS.length - 1].minPlayers;
  }

  if (s === 'tennis') {
    return isDoubles ? 4 : 2;
  }

  return SPORT_MINIMUMS[s] ?? 2;
}

// ── Age brackets ─────────────────────────────────────────────────────────────

export interface AgeBracket {
  label: string;
  /** Minimum age turning this calendar year (inclusive) */
  minTurning: number;
  /** Maximum age turning this calendar year (inclusive) */
  maxTurning: number;
}

/**
 * Age brackets are determined by the age a player turns during the current
 * calendar year (i.e. birth year subtracted from current year).
 *
 * Senior players (50+) appear in BOTH Senior and Adult percentile rankings.
 */
export const AGE_BRACKETS: AgeBracket[] = [
  { label: 'U6', minTurning: 5, maxTurning: 5 },
  { label: 'U7', minTurning: 6, maxTurning: 6 },
  { label: 'U8', minTurning: 7, maxTurning: 7 },
  { label: 'U9', minTurning: 8, maxTurning: 8 },
  { label: 'U10', minTurning: 9, maxTurning: 9 },
  { label: 'U11', minTurning: 10, maxTurning: 10 },
  { label: 'U12', minTurning: 11, maxTurning: 11 },
  { label: 'U13', minTurning: 12, maxTurning: 12 },
  { label: 'U14', minTurning: 13, maxTurning: 13 },
  { label: 'U15', minTurning: 14, maxTurning: 14 },
  { label: 'U16', minTurning: 15, maxTurning: 15 },
  { label: 'U17', minTurning: 16, maxTurning: 16 },
  { label: 'U18', minTurning: 17, maxTurning: 17 },
  { label: 'Adult', minTurning: 18, maxTurning: 49 },
  { label: 'Senior', minTurning: 50, maxTurning: Infinity },
];

/**
 * Returns the age a player turns during the given calendar year.
 * Uses birth year only (not birth month/day) per spec.
 */
export function getTurningAge(
  dateOfBirth: Date,
  referenceYear?: number
): number {
  const year = referenceYear ?? new Date().getFullYear();
  return year - dateOfBirth.getFullYear();
}

/**
 * Returns the age bracket label for a player based on their date of birth.
 */
export function getAgeBracketLabel(dateOfBirth: Date): string {
  const turning = getTurningAge(dateOfBirth);
  for (const bracket of AGE_BRACKETS) {
    if (turning >= bracket.minTurning && turning <= bracket.maxTurning) {
      return bracket.label;
    }
  }
  return 'Adult';
}

/**
 * Returns all bracket labels a player belongs to.
 * Senior players also appear in Adult rankings.
 */
export function getPlayerBrackets(dateOfBirth: Date): string[] {
  const label = getAgeBracketLabel(dateOfBirth);
  if (label === 'Senior') return ['Senior', 'Adult'];
  return [label];
}

// ── Rating algorithm constants ────────────────────────────────────────────────

export const RATING_CONFIG = {
  /** Starting rating for every new player in every sport */
  DEFAULT_RATING: 50,

  /** Rolling window: number of recent game scores averaged for current rating */
  ROLLING_WINDOW: 10,

  /** Points added/subtracted per position moved in post-game ranking */
  POSITION_CHANGE_POINTS: 1.5,

  /** Outperformance bonus multiplier per rating-gap point */
  OUTPERFORMANCE_MULTIPLIER: 0.05,

  /** Diminishing returns weights for repeated opponents */
  OPPONENT_WEIGHTS: [1.0, 0.5, 0.25] as const, // index = games played (capped at 2)

  /** Days without a qualified game before decay begins */
  DECAY_INACTIVITY_DAYS: 60,

  /** Rating points lost per month during decay */
  DECAY_RATE_PER_MONTH: 0.5,

  /** Minimum rating — decay cannot push below this */
  DECAY_FLOOR: 30,

  /** Hard cap on any single game score */
  SCORE_MIN: 0,
  SCORE_MAX: 100,

  /** Platform maximum rating (used to normalise competitiveness factor) */
  PLATFORM_MAX: 100,

  /** Percentile threshold below which the label is shown instead of a number */
  DISPLAY_THRESHOLD_PERCENTILE: 60,

  /** Label shown when percentile is below threshold, no games played, or rating is at decay floor */
  LOVE_LABEL: 'In It for the Love',
} as const;
