import { TextStyle } from 'react-native';

// Font families loaded via expo-google-fonts
export const fontFamilies = {
  display: 'Fraunces_700Bold',
  displayItalic: 'Fraunces_700Bold_Italic',
  heading: 'Fraunces_900Black',
  uiBold: 'DMSans_700Bold',
  uiSemiBold: 'DMSans_600SemiBold',
  uiMedium: 'DMSans_500Medium',
  uiRegular: 'DMSans_400Regular',
} as const;

// Type scale — colour is injected by useTheme() at usage time
export const typeScale = {
  displayLg: {
    fontFamily: fontFamilies.display,
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: -0.5,
  } as TextStyle,
  display: {
    fontFamily: fontFamilies.display,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.3,
  } as TextStyle,
  displayItalic: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.3,
  } as TextStyle,
  heading: {
    fontFamily: fontFamilies.heading,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.2,
  } as TextStyle,
  headingSm: {
    fontFamily: fontFamilies.heading,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.1,
  } as TextStyle,
  ui: {
    fontFamily: fontFamilies.uiBold,
    fontSize: 16,
    lineHeight: 22,
  } as TextStyle,
  uiSm: {
    fontFamily: fontFamilies.uiBold,
    fontSize: 14,
    lineHeight: 18,
  } as TextStyle,
  label: {
    fontFamily: fontFamilies.uiSemiBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
  labelSm: {
    fontFamily: fontFamilies.uiSemiBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  } as TextStyle,
  body: {
    fontFamily: fontFamilies.uiRegular,
    fontSize: 15,
    lineHeight: 22,
  } as TextStyle,
  bodySm: {
    fontFamily: fontFamilies.uiRegular,
    fontSize: 13,
    lineHeight: 19,
  } as TextStyle,
  caption: {
    fontFamily: fontFamilies.uiRegular,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,
} as const;

export type TypeKey = keyof typeof typeScale;

// ─── Backward-compatible aliases ─────────────────────────────
// Existing components use `fonts.heading`, `fonts.body`, etc.
export const fonts = {
  display: fontFamilies.display,
  displayBold: fontFamilies.display,
  displayItalic: fontFamilies.displayItalic,
  heading: fontFamilies.heading,
  headingSemi: fontFamilies.uiSemiBold,
  ui: fontFamilies.uiBold,
  label: fontFamilies.uiSemiBold,
  semibold: fontFamilies.uiSemiBold,
  body: fontFamilies.uiRegular,
  bodyMedium: fontFamilies.uiMedium,
  bodyBold: fontFamilies.uiBold,
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
    fontFamily: fontFamilies.uiSemiBold,
    fontSize: 16,
    lineHeight: 22,
  } as TextStyle,
  bodyLarge: {
    fontFamily: fontFamilies.uiRegular,
    fontSize: 17,
    lineHeight: 26,
  } as TextStyle,
  body: typeScale.body,
  bodySmall: typeScale.bodySm,
  label: typeScale.label,
  caption: typeScale.caption,
} as const;
