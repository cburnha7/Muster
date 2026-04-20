// ─────────────────────────────────────────────────────────────
// Muster colour palette — v4 (Token-based)
// All values derive from src/theme/tokens.ts
// Never import this directly in components.
// Use useTheme() from src/theme/ThemeContext.tsx instead.
// ─────────────────────────────────────────────────────────────

import {
  tokenColors,
  tokenStatus,
  tokenSport,
  avatarColors as _avatarColors,
  getAvatarColor as _getAvatarColor,
  SportKey as _SportKey,
} from './tokens';

// Re-export token-based values
export type SportKey = _SportKey;
export const getAvatarColor = _getAvatarColor;
export const avatarColors = _avatarColors;

// Brand accent colours
export const brand = {
  cobalt: tokenColors.cobalt,
  cobaltLight: tokenColors.cobaltMid,
  cobaltMid: tokenColors.cobaltMid,
  cobaltSoft: tokenColors.cobaltLight,

  pine: tokenColors.success,
  pineSoft: tokenColors.successLight,

  gold: tokenColors.gold,
  goldSoft: tokenColors.goldLight,

  heart: tokenColors.error,
  heartSoft: tokenColors.errorLight,
} as const;

// Status badge token pairs
export const statusTokens = tokenStatus;

// Sport colour pairs
export const sportTokens = tokenSport;

// ─── Semantic token maps ─────────────────────────────────────
export const lightTokens = {
  bgScreen: tokenColors.background,
  bgCard: tokenColors.surface,
  bgInput: tokenColors.surface,
  bgInputFocus: tokenColors.cobaltLight,
  bgInputError: tokenColors.errorLight,
  bgSubtle: '#F1F5F9',

  border: tokenColors.border,
  borderStrong: '#CBD5E1',
  borderFocus: tokenColors.cobalt,
  borderError: tokenColors.error,

  textPrimary: tokenColors.ink,
  textSecondary: tokenColors.inkSecondary,
  textMuted: tokenColors.inkMuted,
  textInverse: tokenColors.white,

  cobaltTint: tokenColors.cobaltLight,
  pineTint: tokenColors.successLight,
  goldTint: tokenColors.goldLight,
  heartTint: tokenColors.errorLight,

  tabBar: tokenColors.surface,
  tabBarBorder: tokenColors.border,
  header: tokenColors.surface,
  headerBorder: tokenColors.border,
} as const;

export const darkTokens = lightTokens; // Muster is light-mode only

export type ThemeTokens = typeof lightTokens;

// ─── Backward-compatible `colors` export ─────────────────────
export const colors = {
  ...brand,
  ...lightTokens,
  // Direct token aliases
  cobaltDark: tokenColors.cobaltDark,
  cobaltTint: lightTokens.cobaltTint,
  pineTint: lightTokens.pineTint,
  pineLight: '#34D399',
  goldLight: '#FBBF24',
  goldTint: lightTokens.goldTint,
  vermillion: '#EA580C',
  heartTint: lightTokens.heartTint,
  white: tokenColors.white,
  surface: tokenColors.surface,
  background: tokenColors.background,
  border: tokenColors.border,
  ink: tokenColors.ink,
  inkSoft: tokenColors.inkSecondary,
  inkSecondary: tokenColors.inkSecondary,
  inkFaint: tokenColors.inkMuted,
  inkMuted: tokenColors.inkMuted,
  overlay: tokenColors.overlay,
  scrim: tokenColors.scrim,
  // Feedback
  success: tokenColors.success,
  successLight: tokenColors.successLight,
  error: tokenColors.error,
  errorLight: tokenColors.errorLight,
  warning: tokenColors.warning,
  warningLight: tokenColors.warningLight,
  // Text semantic aliases
  textPrimary: tokenColors.ink,
  textSecondary: tokenColors.inkSecondary,
  textTertiary: tokenColors.inkMuted,
  textMuted: tokenColors.inkMuted,
  textInverse: tokenColors.white,
  // Sport badge colors (old format)
  sportSoccer: '#16A34A',
  sportBasket: '#EA580C',
  sportHockey: '#0284C7',
  sportTennis: '#CA8A04',
  sportVolley: '#7C3AED',
  sportRugby: '#BE123C',
  sportOther: '#475569',
  // Avatar colors
  avatar1: '#2040E0',
  avatar2: '#2A7F4F',
  avatar3: '#D0362A',
  avatar4: '#7C3AED',
  avatar5: '#0284C7',
  avatar6: '#EA580C',
  avatar7: '#BE123C',
  avatar8: '#0284C7',
  // Status tokens (old format)
  statusOpen: tokenColors.successLight,
  statusOpenText: tokenColors.success,
  statusFull: tokenColors.errorLight,
  statusFullText: tokenColors.error,
  statusFew: tokenColors.warningLight,
  statusFewText: tokenColors.warning,
  statusClosed: '#F1F5F9',
  statusClosedText: tokenColors.inkSecondary,
  statusLeague: tokenColors.cobaltLight,
  statusLeagueText: tokenColors.cobalt,
} as const;

export type ColorKey = keyof typeof colors;

export const sportColors: Record<string, { bg: string; text: string }> = {
  soccer: { bg: '#DCFCE7', text: '#16A34A' },
  basketball: { bg: '#FFEDD5', text: '#EA580C' },
  hockey: { bg: '#E0F2FE', text: '#0284C7' },
  tennis: { bg: '#FEF9C3', text: '#CA8A04' },
  volleyball: { bg: '#EDE9FE', text: '#7C3AED' },
  rugby: { bg: '#FFE4E6', text: '#BE123C' },
  other: { bg: '#F1F5F9', text: '#475569' },
};
