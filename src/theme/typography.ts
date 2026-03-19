// Install via expo-google-fonts:
// npx expo install @expo-google-fonts/fraunces @expo-google-fonts/nunito

import {
  Fraunces_300Light,
  Fraunces_300Light_Italic,
  Fraunces_700Bold,
  Fraunces_700Bold_Italic,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';

import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';

// ── Font map for useFonts() ──────────────────────
export const fontAssets = {
  Fraunces_300Light,
  Fraunces_300Light_Italic,
  Fraunces_700Bold,
  Fraunces_700Bold_Italic,
  Fraunces_900Black,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
};

// ── Font family names ────────────────────────────
export const fonts = {
  display:       'Fraunces_700Bold',       // hero / marketing text
  displayItalic: 'Fraunces_700Bold_Italic',// italic accent
  displayLight:  'Fraunces_300Light_Italic',// soft italic moments
  heading:       'Fraunces_900Black',      // screen headings
  ui:            'Nunito_900Black',        // buttons / tab labels
  label:         'Nunito_800ExtraBold',    // badges / caps labels
  semibold:      'Nunito_700Bold',         // card meta / emphasis
  body:          'Nunito_400Regular',      // body copy
} as const;

// ── Type scale ───────────────────────────────────
export const typeScale = {
  display:  { fontSize: 48, lineHeight: 52, letterSpacing: -0.8 },
  h1:       { fontSize: 32, lineHeight: 36, letterSpacing: -0.5 },
  h2:       { fontSize: 24, lineHeight: 28, letterSpacing: -0.3 },
  h3:       { fontSize: 20, lineHeight: 24, letterSpacing: -0.2 },
  bodyLg:   { fontSize: 17, lineHeight: 26, letterSpacing: 0 },
  body:     { fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  bodySm:   { fontSize: 13, lineHeight: 20, letterSpacing: 0 },
  label:    { fontSize: 11, lineHeight: 16, letterSpacing: 1.6 },
  caption:  { fontSize: 10, lineHeight: 14, letterSpacing: 1.8 },
} as const;

export type FontKey = keyof typeof fonts;
export type TypeScaleKey = keyof typeof typeScale;

// ── Text Styles ──────────────────────────────────
// Pre-composed text styles combining font family and type scale
export const TextStyles = {
  display: {
    fontFamily: fonts.display,
    ...typeScale.display,
  },
  h1: {
    fontFamily: fonts.heading,
    ...typeScale.h1,
  },
  h2: {
    fontFamily: fonts.heading,
    ...typeScale.h2,
  },
  h3: {
    fontFamily: fonts.semibold,
    ...typeScale.h3,
  },
  bodyLarge: {
    fontFamily: fonts.body,
    ...typeScale.bodyLg,
  },
  body: {
    fontFamily: fonts.body,
    ...typeScale.body,
  },
  bodySmall: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
  },
  label: {
    fontFamily: fonts.label,
    ...typeScale.label,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: fonts.body,
    ...typeScale.caption,
  },
} as const;
