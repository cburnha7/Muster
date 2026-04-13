// ─────────────────────────────────────────────────────────────
// Muster colour palette — v3 (Bright & Sharp)
// Never import this directly in components.
// Use useTheme() from src/theme/ThemeContext.tsx instead.
// ─────────────────────────────────────────────────────────────

// Brand accent colours — identical in both modes
export const brand = {
  cobalt: '#2563EB',
  cobaltLight: '#3B82F6',
  cobaltMid: '#60A5FA',
  cobaltSoft: '#DBEAFE',

  pine: '#059669',
  pineSoft: '#D1FAE5',

  gold: '#D97706',
  goldSoft: '#FEF3C7',

  heart: '#DC2626',
  heartSoft: '#FEE2E2',
} as const;

// Status badge token pairs
export const statusTokens = {
  open: { bg: '#059669', text: '#FFFFFF' },
  few: { bg: '#D97706', text: '#FFFFFF' },
  full: { bg: '#DC2626', text: '#FFFFFF' },
  closed: { bg: '#475569', text: '#FFFFFF' },
  league: { bg: '#2563EB', text: '#FFFFFF' },
} as const;

// Sport colour pairs
export const sportTokens = {
  soccer: {
    solid: '#16A34A',
    solidText: '#FFFFFF',
    soft: '#DCFCE7',
    softText: '#14532D',
  },
  basketball: {
    solid: '#EA580C',
    solidText: '#FFFFFF',
    soft: '#FFEDD5',
    softText: '#7C2D12',
  },
  hockey: {
    solid: '#0284C7',
    solidText: '#FFFFFF',
    soft: '#E0F2FE',
    softText: '#0C4A6E',
  },
  tennis: {
    solid: '#CA8A04',
    solidText: '#FFFFFF',
    soft: '#FEF9C3',
    softText: '#713F12',
  },
  volleyball: {
    solid: '#7C3AED',
    solidText: '#FFFFFF',
    soft: '#EDE9FE',
    softText: '#4C1D95',
  },
  rugby: {
    solid: '#BE123C',
    solidText: '#FFFFFF',
    soft: '#FFE4E6',
    softText: '#881337',
  },
  pickleball: {
    solid: '#0891B2',
    solidText: '#FFFFFF',
    soft: '#CFFAFE',
    softText: '#155E75',
  },
  softball: {
    solid: '#CA8A04',
    solidText: '#FFFFFF',
    soft: '#FEF9C3',
    softText: '#713F12',
  },
  baseball: {
    solid: '#DC2626',
    solidText: '#FFFFFF',
    soft: '#FEE2E2',
    softText: '#991B1B',
  },
  flag_football: {
    solid: '#EA580C',
    solidText: '#FFFFFF',
    soft: '#FFEDD5',
    softText: '#7C2D12',
  },
  kickball: {
    solid: '#BE123C',
    solidText: '#FFFFFF',
    soft: '#FFE4E6',
    softText: '#881337',
  },
  other: {
    solid: '#475569',
    solidText: '#FFFFFF',
    soft: '#F1F5F9',
    softText: '#1E293B',
  },
} as const;

export type SportKey = keyof typeof sportTokens;

// Avatar colour pool
const AVATAR_POOL = [
  '#2563EB',
  '#059669',
  '#7C3AED',
  '#0284C7',
  '#EA580C',
  '#BE123C',
  '#D97706',
  '#0F766E',
] as const;

export const getAvatarColor = (userId: string): string => {
  let h = 0;
  for (let i = 0; i < userId.length; i++)
    h = userId.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_POOL[Math.abs(h) % AVATAR_POOL.length];
};

// ─── Semantic token maps ─────────────────────────────────────
export const lightTokens = {
  bgScreen: '#F8FAFF',
  bgCard: '#FFFFFF',
  bgInput: '#FFFFFF',
  bgInputFocus: '#EFF6FF',
  bgInputError: '#FFF5F5',
  bgSubtle: '#F1F5F9',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  borderFocus: '#2563EB',
  borderError: '#DC2626',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  cobaltTint: '#DBEAFE',
  pineTint: '#D1FAE5',
  goldTint: '#FEF3C7',
  heartTint: '#FEE2E2',

  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  header: '#FFFFFF',
  headerBorder: '#E2E8F0',
} as const;

export const darkTokens = {
  bgScreen: '#0A0F1E',
  bgCard: '#131929',
  bgInput: '#1A2238',
  bgInputFocus: '#1A2B4A',
  bgInputError: '#2A1215',
  bgSubtle: '#1A2238',

  border: '#1E2D45',
  borderStrong: '#2A3D5C',
  borderFocus: '#3B82F6',
  borderError: '#EF4444',

  textPrimary: '#F0F4FF',
  textSecondary: '#8BA3C7',
  textMuted: '#4A6080',
  textInverse: '#FFFFFF',

  cobaltTint: '#1A2B4A',
  pineTint: '#0F2E1F',
  goldTint: '#2A1F08',
  heartTint: '#2A1215',

  tabBar: '#0F1623',
  tabBarBorder: '#1E2D45',
  header: '#0F1623',
  headerBorder: '#1E2D45',
} as const;

export type ThemeTokens = typeof lightTokens;

// ─── Backward-compatible aliases ─────────────────────────────
// Existing components reference old token names. These aliases
// prevent mass breakage while we migrate screen by screen.
export const colors = {
  ...brand,
  ...lightTokens,
  // Old names → new values
  cobaltDark: '#1D4ED8',
  cobaltTint: lightTokens.cobaltTint,
  pineTint: lightTokens.pineTint,
  pineLight: '#34D399',
  goldLight: '#FBBF24',
  goldTint: lightTokens.goldTint,
  vermillion: '#EA580C',
  heartTint: lightTokens.heartTint,
  white: '#FFFFFF',
  surface: '#F8FAFF',
  border: lightTokens.border,
  ink: lightTokens.textPrimary,
  inkSoft: lightTokens.textSecondary,
  inkFaint: lightTokens.textMuted,
  overlay: 'rgba(37, 99, 235, 0.6)',
  scrim: 'rgba(15, 23, 42, 0.4)',
  // Sport badge colors (old format)
  sportSoccer: '#16A34A',
  sportBasket: '#EA580C',
  sportHockey: '#0284C7',
  sportTennis: '#CA8A04',
  sportVolley: '#7C3AED',
  sportRugby: '#BE123C',
  sportOther: '#475569',
  // Avatar colors
  avatar1: '#2563EB',
  avatar2: '#059669',
  avatar3: '#DC2626',
  avatar4: '#7C3AED',
  avatar5: '#0284C7',
  avatar6: '#EA580C',
  avatar7: '#BE123C',
  avatar8: '#0284C7',
  // Status tokens (old format)
  statusOpen: '#D1FAE5',
  statusOpenText: '#059669',
  statusFull: '#FEE2E2',
  statusFullText: '#DC2626',
  statusFew: '#FEF3C7',
  statusFewText: '#D97706',
  statusClosed: '#F1F5F9',
  statusClosedText: '#475569',
  statusLeague: '#DBEAFE',
  statusLeagueText: '#2563EB',
} as const;

// Backward-compatible aliases for Material Design 3 tokens
(colors as any).primary = brand.cobalt;
(colors as any).primaryContainer = brand.cobaltLight;
(colors as any).primaryFixed = brand.cobaltSoft;
(colors as any).onPrimary = '#FFFFFF';
(colors as any).onPrimaryContainer = brand.cobalt;
(colors as any).secondary = brand.pine;
(colors as any).secondaryContainer = brand.pineSoft;
(colors as any).onSecondary = '#FFFFFF';
(colors as any).onSecondaryContainer = brand.pine;
(colors as any).tertiary = brand.gold;
(colors as any).tertiaryContainer = brand.goldSoft;
(colors as any).error = brand.heart;
(colors as any).errorContainer = brand.heartSoft;
(colors as any).onError = '#FFFFFF';
(colors as any).onErrorContainer = brand.heart;
(colors as any).background = '#F8FAFF';
(colors as any).onBackground = lightTokens.textPrimary;
(colors as any).onSurface = lightTokens.textPrimary;
(colors as any).onSurfaceVariant = lightTokens.textSecondary;
(colors as any).surfaceContainerLowest = '#FFFFFF';
(colors as any).surfaceContainerLow = '#F8FAFF';
(colors as any).surfaceContainer = '#F1F5F9';
(colors as any).surfaceContainerHigh = lightTokens.border;
(colors as any).outline = lightTokens.textSecondary;
(colors as any).outlineVariant = lightTokens.border;
(colors as any).textPrimary = lightTokens.textPrimary;
(colors as any).textSecondary = lightTokens.textSecondary;
(colors as any).textTertiary = lightTokens.textMuted;

export type ColorKey = keyof typeof colors;

export const avatarColors = AVATAR_POOL as unknown as string[];

export const sportColors: Record<string, { bg: string; text: string }> = {
  soccer: { bg: '#DCFCE7', text: '#16A34A' },
  basketball: { bg: '#FFEDD5', text: '#EA580C' },
  hockey: { bg: '#E0F2FE', text: '#0284C7' },
  tennis: { bg: '#FEF9C3', text: '#CA8A04' },
  volleyball: { bg: '#EDE9FE', text: '#7C3AED' },
  rugby: { bg: '#FFE4E6', text: '#BE123C' },
  other: { bg: '#F1F5F9', text: '#475569' },
};
