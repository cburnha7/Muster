/**
 * Muster Design Tokens — Single Source of Truth
 *
 * Every color, spacing value, border radius, shadow, and type style
 * in the app must reference a token from this file.
 *
 * NEVER hardcode hex values, pixel numbers, or font family strings
 * in component files. Import from here or from the barrel (src/theme).
 */

import { TextStyle, ViewStyle } from 'react-native';

// ─── Colors ──────────────────────────────────────────────────

export const tokenColors = {
  // Brand
  cobalt: '#2040E0',
  cobaltLight: '#EEF1FC',
  cobaltDark: '#1530B0',
  cobaltMid: '#3D56F0',

  // Neutrals
  ink: '#1C2320',
  inkSecondary: '#6B7C76',
  inkMuted: '#94A3B8',
  border: '#E2E4E9',
  surface: '#FFFFFF',
  background: '#F7F4EF',

  // Feedback
  success: '#2A7F4F',
  successLight: '#D1FAE5',
  error: '#D0362A',
  errorLight: '#FDECEA',
  warning: '#E8A030',
  warningLight: '#FEF3C7',

  // Salute
  gold: '#D4A017',
  goldLight: '#FEF3C7',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.4)',
  overlayGrounds: 'rgba(32,64,224,0.45)',
  scrim: 'rgba(15,23,42,0.4)',
  transparent: 'transparent',
} as const;

// ─── Status Badge Tokens ─────────────────────────────────────

export const tokenStatus = {
  open: { bg: tokenColors.success, text: tokenColors.white },
  few: { bg: tokenColors.warning, text: tokenColors.white },
  full: { bg: tokenColors.error, text: tokenColors.white },
  closed: { bg: tokenColors.inkSecondary, text: tokenColors.white },
  league: { bg: tokenColors.cobalt, text: tokenColors.white },
} as const;

// ─── Sport Badge Tokens ──────────────────────────────────────

export const tokenSport = {
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

export type SportKey = keyof typeof tokenSport;

// ─── Avatar Colors ───────────────────────────────────────────

const AVATAR_POOL = [
  '#2040E0',
  '#2A7F4F',
  '#7C3AED',
  '#0284C7',
  '#EA580C',
  '#BE123C',
  '#D4A017',
  '#0F766E',
] as const;

export const avatarColors = AVATAR_POOL as unknown as string[];

export function getAvatarColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++)
    h = userId.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_POOL[Math.abs(h) % AVATAR_POOL.length];
}

// ─── Spacing ─────────────────────────────────────────────────

export const tokenSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type SpacingKey = keyof typeof tokenSpacing;

// ─── Border Radius ───────────────────────────────────────────

export const tokenRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export type RadiusKey = keyof typeof tokenRadius;

// ─── Shadows ─────────────────────────────────────────────────

export const tokenShadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  } as ViewStyle,
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  } as ViewStyle,
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
  } as ViewStyle,
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  } as ViewStyle,
} as const;

export type ShadowKey = keyof typeof tokenShadow;

// ─── Typography ──────────────────────────────────────────────

export const tokenFontFamily = {
  display: 'Fraunces_700Bold',
  displayItalic: 'Fraunces_700Bold_Italic',
  heading: 'Fraunces_900Black',
  uiBold: 'Nunito_700Bold',
  uiSemiBold: 'Nunito_600SemiBold',
  uiMedium: 'Nunito_500Medium',
  uiRegular: 'Nunito_400Regular',
} as const;

export const tokenType = {
  /** Screen hero / display text — Fraunces 700, 36px */
  display: {
    fontFamily: tokenFontFamily.display,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.3,
  } as TextStyle,

  /** Screen title — Fraunces 700, 28px */
  screenTitle: {
    fontFamily: tokenFontFamily.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.2,
  } as TextStyle,

  /** Section heading — Fraunces 900, 26px */
  heading: {
    fontFamily: tokenFontFamily.heading,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.2,
  } as TextStyle,

  /** Sub-heading — Fraunces 900, 20px */
  subheading: {
    fontFamily: tokenFontFamily.heading,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.1,
  } as TextStyle,

  /** Modal title — Fraunces 700, 20px */
  modalTitle: {
    fontFamily: tokenFontFamily.display,
    fontSize: 20,
    lineHeight: 26,
  } as TextStyle,

  /** Body text — Nunito 400, 15px */
  body: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 15,
    lineHeight: 22,
  } as TextStyle,

  /** Small body — Nunito 400, 13px */
  bodySm: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 13,
    lineHeight: 19,
  } as TextStyle,

  /** Button / tab label — Nunito 700, 16px */
  button: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 16,
    lineHeight: 22,
  } as TextStyle,

  /** Small button — Nunito 700, 14px */
  buttonSm: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 14,
    lineHeight: 18,
  } as TextStyle,

  /** Form field label — Nunito 700, 15px */
  fieldLabel: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 15,
    lineHeight: 20,
  } as TextStyle,

  /** Section header (uppercase) — Nunito 700, 13px */
  sectionHeader: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Badge / caps label — Nunito 600, 11px */
  label: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Caption — Nunito 400, 12px */
  caption: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,

  /** Inline error — Nunito 400, 13px */
  error: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,

  /** Input text — Nunito 400, 15px */
  input: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 15,
    lineHeight: 22,
  } as TextStyle,

  /** Chip text — Nunito 500, 14px */
  chip: {
    fontFamily: tokenFontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 18,
  } as TextStyle,

  /** Chip selected text — Nunito 700, 14px */
  chipSelected: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 14,
    lineHeight: 18,
  } as TextStyle,
} as const;

export type TypeKey = keyof typeof tokenType;
