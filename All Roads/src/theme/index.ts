/**
 * Theme system for Muster
 * Central export for all theme-related constants and utilities
 * 
 * IMPORTANT: Always import from this file to use theme tokens
 * - Colors: import { colors } from 'src/theme'
 * - Typography: import { Typography, TextStyles } from 'src/theme'
 * - Brand: import { Brand } from 'src/theme'
 * - Icon: import { MusterIcon } from 'src/theme'
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';
export * from './borderRadius';
export * from './brand';
export { MusterIcon } from './MusterIcon';

import { colors, lightColors, darkColors, getThemeColors } from './colors';
import { Typography, TextStyles } from './typography';
import { Spacing } from './spacing';
import { Shadows } from './shadows';
import { BorderRadius } from './borderRadius';
import { Brand } from './brand';

// Re-export for convenience
export { lightColors, darkColors, getThemeColors };

/**
 * Responsive breakpoints for web support
 */
export const Breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

/**
 * Media query helpers for web styling
 */
export const MediaQueries = {
  mobile: `@media (max-width: ${Breakpoints.tablet - 1}px)`,
  tablet: `@media (min-width: ${Breakpoints.tablet}px) and (max-width: ${Breakpoints.desktop - 1}px)`,
  desktop: `@media (min-width: ${Breakpoints.desktop}px)`,
  wide: `@media (min-width: ${Breakpoints.wide}px)`,
  tabletAndUp: `@media (min-width: ${Breakpoints.tablet}px)`,
  desktopAndUp: `@media (min-width: ${Breakpoints.desktop}px)`,
} as const;

/**
 * Container max widths for responsive layouts
 */
export const ContainerWidths = {
  mobile: '100%',
  tablet: 720,
  desktop: 960,
  wide: 1200,
} as const;

/**
 * Complete theme object
 */
export const Theme = {
  brand: Brand,
  colors: colors,
  typography: Typography,
  textStyles: TextStyles,
  spacing: Spacing,
  shadows: Shadows,
  borderRadius: BorderRadius,
  breakpoints: Breakpoints,
  mediaQueries: MediaQueries,
  containerWidths: ContainerWidths,
} as const;

/**
 * Common component styles
 */
export const ComponentStyles = {
  button: {
    primary: {
      backgroundColor: colors.grass,
      color: colors.textInverse,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      ...TextStyles.bodyLarge,
      fontWeight: Typography.fontWeight.semibold,
    },
    secondary: {
      backgroundColor: colors.surface,
      color: colors.grass,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      ...TextStyles.bodyLarge,
      fontWeight: Typography.fontWeight.semibold,
    },
    accent: {
      backgroundColor: colors.court,
      color: colors.textInverse,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      ...TextStyles.bodyLarge,
      fontWeight: Typography.fontWeight.semibold,
    },
    destructive: {
      backgroundColor: colors.error,
      color: colors.textInverse,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      ...TextStyles.bodyLarge,
      fontWeight: Typography.fontWeight.semibold,
    },
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...Shadows.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...TextStyles.bodyLarge,
    color: colors.textPrimary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: Spacing.lg,
  },
  screenHeader: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Shadows.sm,
  },
} as const;

export default Theme;
