export const brand = {
  name:     'Muster',
  tagline:  'the Troops.',
  mechanic: 'Salute', // in-app peer recognition system
} as const;

// ── Salute system constants ──────────────────────
export const salute = {
  maxPerGame:        3,    // max salutes a player can give per game
  windowHours:       24,   // hours after game end to submit salutes
  defaultAverage:    1.0,  // starting average for new players
  rollingWindowDays: 365,  // days used to calculate salute average
} as const;

// ── Error codes ──────────────────────────────────
export const errorCodes = {
  SELF_SALUTE:           'SELF_SALUTE',
  DUPLICATE_SALUTE:      'DUPLICATE_SALUTE',
  SALUTE_LIMIT_EXCEEDED: 'SALUTE_LIMIT_EXCEEDED',
  NON_PARTICIPANT:       'NON_PARTICIPANT',
  WINDOW_CLOSED:         'WINDOW_CLOSED',
  GAME_NOT_FOUND:        'GAME_NOT_FOUND',
  PLAYER_NOT_FOUND:      'PLAYER_NOT_FOUND',
} as const;

export type ErrorCode = keyof typeof errorCodes;
