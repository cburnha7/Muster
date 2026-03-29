// ── Fonts ───────────────────────────────────────────
// Plus Jakarta Sans — Headlines: geometric clarity, aggressive bold weights
// Inter — Body: high x-height workhorse for glance-and-go legibility

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

// ── Font map for useFonts() ──────────────────────
export const fontAssets = {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
};

// ── Font family names ────────────────────────────
export const fonts = {
  display:       'PlusJakartaSans_800ExtraBold',  // hero / display stats
  displayBold:   'PlusJakartaSans_700Bold',       // display alternate
  heading:       'PlusJakartaSans_700Bold',       // screen headings
  headingSemi:   'PlusJakartaSans_600SemiBold',   // sub-headings
  ui:            'PlusJakartaSans_600SemiBold',   // buttons / tab labels
  label:         'PlusJakartaSans_500Medium',     // badges / caps labels
  semibold:      'Inter_600SemiBold',             // card meta / emphasis
  body:          'Inter_400Regular',              // body copy
  bodyMedium:    'Inter_500Medium',               // medium body
  bodyBold:      'Inter_700Bold',                 // bold body
} as const;

// ── Type scale ───────────────────────────────────
// Display: stadium-scale stats. Headline: section anchors.
// Title: card headers. Body: essential info.
export const typeScale = {
  displayLg:{ fontSize: 56, lineHeight: 62, letterSpacing: -1.2 },
  display:  { fontSize: 48, lineHeight: 52, letterSpacing: -0.8 },
  h1:       { fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  h2:       { fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  h3:       { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  titleLg:  { fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  title:    { fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  bodyLg:   { fontSize: 17, lineHeight: 26, letterSpacing: 0 },
  body:     { fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  bodySm:   { fontSize: 13, lineHeight: 20, letterSpacing: 0 },
  label:    { fontSize: 11, lineHeight: 16, letterSpacing: 1.6 },
  caption:  { fontSize: 10, lineHeight: 14, letterSpacing: 0.4 },
} as const;

export type FontKey = keyof typeof fonts;
export type TypeScaleKey = keyof typeof typeScale;

// ── Text Styles ──────────────────────────────────
// Pre-composed text styles combining font family and type scale
export const TextStyles = {
  displayLarge: {
    fontFamily: fonts.display,
    ...typeScale.displayLg,
  },
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
    fontFamily: fonts.headingSemi,
    ...typeScale.h3,
  },
  titleLarge: {
    fontFamily: fonts.headingSemi,
    ...typeScale.titleLg,
  },
  title: {
    fontFamily: fonts.headingSemi,
    ...typeScale.title,
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
