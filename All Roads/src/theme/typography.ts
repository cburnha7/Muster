/**
 * Typography system for Muster
 * Defines font sizes, weights, and line heights
 * 
 * Brand Typography v1.0:
 * - Display/Heading: Fraunces (serif) - elegant, distinctive
 * - UI/Body: Nunito (sans-serif) - friendly, readable
 * 
 * Note: Custom fonts (Fraunces, Nunito) require installation via expo-google-fonts
 * Currently using system fonts as fallback
 * 
 * To install custom fonts:
 * npm install @expo-google-fonts/fraunces @expo-google-fonts/nunito expo-font
 */

export const Typography = {
  // Font Families
  fontFamily: {
    display: 'Fraunces_700Bold',
    heading: 'Fraunces_900Black',
    ui: 'Nunito_900Black',
    body: 'Nunito_400Regular',
    label: 'Nunito_800ExtraBold',
    regular: 'Nunito_400Regular',
    medium: 'Nunito_600SemiBold',
    semibold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
  },

  // Font Sizes (from brand guidelines)
  fontSize: {
    display: 52,      // Display text - Fraunces 700
    h1: 34,           // Large headings
    h2: 28,           // Section headings - Fraunces 900
    h3: 22,           // Subsection headings
    h4: 20,           // Card titles
    ui: 14,           // Buttons/UI - Nunito 900
    bodyLarge: 17,    // Emphasized body
    body: 15,         // Standard body - Nunito 400
    caption: 13,      // Captions
    label: 10,        // Labels - Nunito 800 caps
    small: 11,        // Fine print
  },

  // Font Weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },

  // Line Heights
  lineHeight: {
    display: 52,      // 1.0 - tight for display
    h1: 41,
    h2: 34,
    h3: 28,
    h4: 25,
    ui: 18,
    bodyLarge: 22,
    body: 25,         // 1.65 - comfortable reading
    caption: 18,
    label: 16,
    small: 13,
  },
} as const;

/**
 * Text style presets
 */
export const TextStyles = {
  // Display text - hero sections
  display: {
    fontFamily: Typography.fontFamily.display,
    fontSize: Typography.fontSize.display,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.lineHeight.display,
    letterSpacing: -0.5,
  },
  // Headings
  h1: {
    fontFamily: Typography.fontFamily.heading,
    fontSize: Typography.fontSize.h1,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.lineHeight.h1,
  },
  h2: {
    fontFamily: Typography.fontFamily.heading,
    fontSize: Typography.fontSize.h2,
    fontWeight: Typography.fontWeight.black,
    lineHeight: Typography.lineHeight.h2,
  },
  h3: {
    fontFamily: Typography.fontFamily.heading,
    fontSize: Typography.fontSize.h3,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.lineHeight.h3,
  },
  h4: {
    fontFamily: Typography.fontFamily.body,
    fontSize: Typography.fontSize.h4,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.lineHeight.h4,
  },
  // UI elements
  ui: {
    fontFamily: Typography.fontFamily.ui,
    fontSize: Typography.fontSize.ui,
    fontWeight: Typography.fontWeight.black,
    lineHeight: Typography.lineHeight.ui,
    letterSpacing: 0.56, // 0.04em
  },
  // Body text
  bodyLarge: {
    fontFamily: Typography.fontFamily.body,
    fontSize: Typography.fontSize.bodyLarge,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: Typography.lineHeight.bodyLarge,
  },
  body: {
    fontFamily: Typography.fontFamily.body,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: Typography.lineHeight.body,
  },
  bodyBold: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.lineHeight.body,
  },
  // Small text
  caption: {
    fontFamily: Typography.fontFamily.body,
    fontSize: Typography.fontSize.caption,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: Typography.lineHeight.caption,
  },
  captionBold: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.lineHeight.caption,
  },
  label: {
    fontFamily: Typography.fontFamily.label,
    fontSize: Typography.fontSize.label,
    fontWeight: Typography.fontWeight.extrabold,
    lineHeight: Typography.lineHeight.label,
    letterSpacing: 2, // 0.2em
    textTransform: 'uppercase' as const,
  },
  small: {
    fontFamily: Typography.fontFamily.body,
    fontSize: Typography.fontSize.small,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: Typography.lineHeight.small,
  },
} as const;

export type TextStyleKey = keyof typeof TextStyles;
