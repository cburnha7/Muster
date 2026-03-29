/**
 * Component styles — Kinetic Anchor design system
 *
 * Rules:
 * - NO 1px solid borders. Separation via background shifts only.
 * - Pill shapes for buttons (borderRadius: full).
 * - Cards use lg radius (24) with tonal layering.
 * - Depth via ambient shadows, not structural lines.
 */

import { colors } from './colors';
import { BorderRadius } from './borderRadius';
import { Spacing } from './spacing';
import { Shadows } from './shadows';

export const ComponentStyles = {
  button: {
    primary: {
      backgroundColor: colors.primaryContainer,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.full,
    },
    secondary: {
      backgroundColor: colors.surfaceContainerLowest,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.full,
    },
  },

  /** Interactive card — surface_container_lowest on surface_container_low */
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },

  /** Read-only card — slightly elevated from background */
  cardReadOnly: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },

  /** Input field — carved-out area, no box borders */
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },

  /** Chip — selection state */
  chipSelected: {
    backgroundColor: colors.primaryFixedDim,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },

  /** Chip — default state */
  chip: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },

  /** Live indicator chip */
  chipLive: {
    backgroundColor: colors.secondary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },

  /** Global app background */
  screenBackground: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Legacy aliases
  propertyCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  propertyCardReadOnly: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
} as const;
