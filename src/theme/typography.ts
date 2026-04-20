import { TextStyle } from 'react-native';
import { tokenFontFamily, tokenType } from './tokens';

// Re-export from tokens for backward compat
export const fontFamilies = tokenFontFamily;

// Type scale — re-export from tokens
export const typeScale = {
  displayLg: {
    fontFamily: tokenFontFamily.display,
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: -0.5,
  } as TextStyle,
  display: tokenType.display,
  displayItalic: {
    fontFamily: tokenFontFamily.displayItalic,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.3,
  } as TextStyle,
  heading: tokenType.heading,
  headingSm: tokenType.subheading,
  ui: tokenType.button,
  uiSm: tokenType.buttonSm,
  label: tokenType.label,
  labelSm: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  } as TextStyle,
  body: tokenType.body,
  bodySm: tokenType.bodySm,
  caption: tokenType.caption,
} as const;

export type TypeKey = keyof typeof typeScale;

// ─── Backward-compatible aliases ─────────────────────────────
// Existing components use `fonts.heading`, `fonts.body`, etc.
// These map old DM Sans references to Nunito equivalents.
export const fonts = {
  display: tokenFontFamily.display,
  displayBold: tokenFontFamily.display,
  displayItalic: tokenFontFamily.displayItalic,
  heading: tokenFontFamily.heading,
  headingSemi: tokenFontFamily.uiSemiBold,
  ui: tokenFontFamily.uiBold,
  label: tokenFontFamily.uiSemiBold,
  semibold: tokenFontFamily.uiSemiBold,
  body: tokenFontFamily.uiRegular,
  bodyMedium: tokenFontFamily.uiMedium,
  bodyBold: tokenFontFamily.uiBold,
} as const;

export type FontKey = keyof typeof fonts;
export type TypeScaleKey = TypeKey;

// Pre-composed text styles (backward compat)
export const TextStyles = {
  displayLarge: typeScale.displayLg,
  display: typeScale.display,
  h1: typeScale.heading,
  h2: { ...typeScale.headingSm, fontSize: 24, lineHeight: 30 } as TextStyle,
  h3: typeScale.headingSm,
  titleLarge: {
    ...typeScale.headingSm,
    fontSize: 22,
    lineHeight: 28,
  } as TextStyle,
  title: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 16,
    lineHeight: 22,
  } as TextStyle,
  bodyLarge: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 17,
    lineHeight: 26,
  } as TextStyle,
  body: typeScale.body,
  bodySmall: typeScale.bodySm,
  label: typeScale.label,
  caption: typeScale.caption,
} as const;
