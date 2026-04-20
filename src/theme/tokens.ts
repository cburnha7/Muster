/**
 * Muster Design Tokens — Single Source of Truth
 *
 * Every color, spacing value, border radius, shadow, and type style
 * in the app must reference a token from this file.
 *
 * Components access colors via useTheme().colors — never import
 * light/dark palettes directly. This enables dark mode.
 */

import { TextStyle, ViewStyle } from 'react-native';

// ─── Semantic Color Contract ─────────────────────────────────
// Both light and dark palettes must satisfy this shape.

export interface SemanticColors {
  // Brand
  cobalt: string;
  cobaltLight: string;
  cobaltDark: string;
  cobaltMid: string;

  // Surfaces
  ink: string;
  inkSecondary: string;
  inkMuted: string;
  /** @alias inkMuted — legacy name used across many components */
  inkFaint: string;
  /** @alias inkSecondary — legacy name */
  inkSoft: string;
  border: string;
  surface: string;
  background: string;

  // Feedback
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  warning: string;
  warningLight: string;

  // Salute
  gold: string;
  goldLight: string;

  // Utility
  white: string;
  black: string;
  overlay: string;
  overlayGrounds: string;
  scrim: string;
  transparent: string;

  // Semantic aliases (for backward compat with old ThemeTokens)
  bgScreen: string;
  bgCard: string;
  bgInput: string;
  bgInputFocus: string;
  bgInputError: string;
  bgSubtle: string;
  borderStrong: string;
  borderFocus: string;
  borderError: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** @alias inkMuted — legacy name */
  textTertiary: string;
  textInverse: string;
  cobaltTint: string;
  pineTint: string;
  goldTint: string;
  heartTint: string;
  tabBar: string;
  tabBarBorder: string;
  header: string;
  headerBorder: string;

  // Legacy brand aliases
  heart: string;
  pine: string;
  cobaltSoft: string;
  pineSoft: string;
  goldSoft: string;
  heartSoft: string;
}

// ─── Light Palette ───────────────────────────────────────────

export const lightColors: SemanticColors = {
  cobalt: '#2040E0',
  cobaltLight: '#EEF1FC',
  cobaltDark: '#1530B0',
  cobaltMid: '#3D56F0',

  ink: '#1C2320',
  inkSecondary: '#6B7C76',
  inkMuted: '#94A3B8',
  inkFaint: '#94A3B8',
  inkSoft: '#6B7C76',
  border: '#E2E4E9',
  surface: '#FFFFFF',
  background: '#F7F4EF',

  success: '#2A7F4F',
  successLight: '#D1FAE5',
  error: '#D0362A',
  errorLight: '#FDECEA',
  warning: '#E8A030',
  warningLight: '#FEF3C7',

  gold: '#D4A017',
  goldLight: '#FEF3C7',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.4)',
  overlayGrounds: 'rgba(32,64,224,0.45)',
  scrim: 'rgba(15,23,42,0.4)',
  transparent: 'transparent',

  bgScreen: '#F7F4EF',
  bgCard: '#FFFFFF',
  bgInput: '#FFFFFF',
  bgInputFocus: '#EEF1FC',
  bgInputError: '#FDECEA',
  bgSubtle: '#F1F5F9',
  borderStrong: '#CBD5E1',
  borderFocus: '#2040E0',
  borderError: '#D0362A',
  textPrimary: '#1C2320',
  textSecondary: '#6B7C76',
  textMuted: '#94A3B8',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  cobaltTint: '#EEF1FC',
  pineTint: '#D1FAE5',
  goldTint: '#FEF3C7',
  heartTint: '#FDECEA',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E4E9',
  header: '#FFFFFF',
  headerBorder: '#E2E4E9',

  heart: '#D0362A',
  pine: '#2A7F4F',
  cobaltSoft: '#EEF1FC',
  pineSoft: '#D1FAE5',
  goldSoft: '#FEF3C7',
  heartSoft: '#FDECEA',
};

// ─── Dark Palette ────────────────────────────────────────────

export const darkColors: SemanticColors = {
  cobalt: '#4D6FFF',
  cobaltLight: '#1A2340',
  cobaltDark: '#3D56F0',
  cobaltMid: '#6B8AFF',

  ink: '#E8ECF0',
  inkSecondary: '#9BA8A3',
  inkMuted: '#5C6B66',
  inkFaint: '#5C6B66',
  inkSoft: '#9BA8A3',
  border: '#2A3530',
  surface: '#1A2020',
  background: '#111816',

  success: '#3DA868',
  successLight: '#132A1E',
  error: '#E85A50',
  errorLight: '#2A1412',
  warning: '#F0B050',
  warningLight: '#2A2010',

  gold: '#E8B830',
  goldLight: '#2A2010',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.6)',
  overlayGrounds: 'rgba(32,64,224,0.55)',
  scrim: 'rgba(0,0,0,0.6)',
  transparent: 'transparent',

  bgScreen: '#111816',
  bgCard: '#1A2020',
  bgInput: '#1A2020',
  bgInputFocus: '#1A2340',
  bgInputError: '#2A1412',
  bgSubtle: '#1E2826',
  borderStrong: '#3A4A44',
  borderFocus: '#4D6FFF',
  borderError: '#E85A50',
  textPrimary: '#E8ECF0',
  textSecondary: '#9BA8A3',
  textMuted: '#5C6B66',
  textTertiary: '#5C6B66',
  textInverse: '#111816',
  cobaltTint: '#1A2340',
  pineTint: '#132A1E',
  goldTint: '#2A2010',
  heartTint: '#2A1412',
  tabBar: '#151C1A',
  tabBarBorder: '#2A3530',
  header: '#151C1A',
  headerBorder: '#2A3530',

  heart: '#E85A50',
  pine: '#3DA868',
  cobaltSoft: '#1A2340',
  pineSoft: '#132A1E',
  goldSoft: '#2A2010',
  heartSoft: '#2A1412',
};

// ─── Static tokens (not affected by dark mode) ──────────────

export const tokenColors = lightColors; // backward compat alias

// ─── Status Badge Tokens ─────────────────────────────────────

export const tokenStatus = {
  open: { bg: lightColors.success, text: lightColors.white },
  few: { bg: lightColors.warning, text: lightColors.white },
  full: { bg: lightColors.error, text: lightColors.white },
  closed: { bg: lightColors.inkSecondary, text: lightColors.white },
  league: { bg: lightColors.cobalt, text: lightColors.white },
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
  return AVATAR_POOL[Math.abs(h) % AVATAR_POOL.length] ?? AVATAR_POOL[0]!;
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

export function makeShadows(isDark: boolean) {
  const base = isDark ? '#000' : '#000';
  const opMul = isDark ? 2.0 : 1.0; // darker shadows in dark mode
  return {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    } as ViewStyle,
    card: {
      shadowColor: base,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06 * opMul,
      shadowRadius: 8,
      elevation: 2,
    } as ViewStyle,
    cardHover: {
      shadowColor: base,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1 * opMul,
      shadowRadius: 16,
      elevation: 4,
    } as ViewStyle,
    modal: {
      shadowColor: base,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14 * opMul,
      shadowRadius: 24,
      elevation: 12,
    } as ViewStyle,
    fab: {
      shadowColor: base,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15 * opMul,
      shadowRadius: 12,
      elevation: 6,
    } as ViewStyle,
  };
}

export const tokenShadow = makeShadows(false);

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
  display: {
    fontFamily: tokenFontFamily.display,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.3,
  } as TextStyle,
  screenTitle: {
    fontFamily: tokenFontFamily.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.2,
  } as TextStyle,
  heading: {
    fontFamily: tokenFontFamily.heading,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.2,
  } as TextStyle,
  subheading: {
    fontFamily: tokenFontFamily.heading,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.1,
  } as TextStyle,
  modalTitle: {
    fontFamily: tokenFontFamily.display,
    fontSize: 20,
    lineHeight: 26,
  } as TextStyle,
  body: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 15,
    lineHeight: 22,
  } as TextStyle,
  bodySm: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 13,
    lineHeight: 19,
  } as TextStyle,
  button: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 16,
    lineHeight: 22,
  } as TextStyle,
  buttonSm: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 14,
    lineHeight: 18,
  } as TextStyle,
  fieldLabel: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 15,
    lineHeight: 20,
  } as TextStyle,
  sectionHeader: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
  label: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
  caption: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,
  error: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,
  input: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 15,
    lineHeight: 22,
  } as TextStyle,
  chip: {
    fontFamily: tokenFontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 18,
  } as TextStyle,
  chipSelected: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 14,
    lineHeight: 18,
  } as TextStyle,
} as const;

export type TypeKey = keyof typeof tokenType;
