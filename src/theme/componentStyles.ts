/**
 * Component styles — Muster design system
 *
 * All values derive from tokens.ts.
 */

import { lightColors, tokenSpacing, tokenRadius, tokenShadow } from './tokens';

export const ComponentStyles = {
  button: {
    primary: {
      backgroundColor: lightColors.cobalt,
      paddingVertical: tokenSpacing.md,
      paddingHorizontal: tokenSpacing.xl,
      borderRadius: tokenRadius.lg,
    },
    secondary: {
      backgroundColor: lightColors.transparent,
      borderWidth: 1.5,
      borderColor: lightColors.border,
      paddingVertical: tokenSpacing.md,
      paddingHorizontal: tokenSpacing.xl,
      borderRadius: tokenRadius.lg,
    },
  },

  card: {
    backgroundColor: lightColors.surface,
    borderRadius: tokenRadius.lg,
    ...tokenShadow.card,
    padding: tokenSpacing.lg,
    marginBottom: tokenSpacing.md,
  },

  cardReadOnly: {
    backgroundColor: lightColors.background,
    borderRadius: tokenRadius.lg,
    padding: tokenSpacing.lg,
    marginBottom: tokenSpacing.md,
  },

  input: {
    backgroundColor: lightColors.surface,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    borderRadius: tokenRadius.md,
    paddingVertical: tokenSpacing.md,
    paddingHorizontal: tokenSpacing.lg,
  },

  chipSelected: {
    backgroundColor: lightColors.cobalt,
    borderRadius: tokenRadius.pill,
    paddingVertical: tokenSpacing.sm,
    paddingHorizontal: tokenSpacing.md,
  },

  chip: {
    backgroundColor: lightColors.surface,
    borderWidth: 1.5,
    borderColor: lightColors.border,
    borderRadius: tokenRadius.pill,
    paddingVertical: tokenSpacing.sm,
    paddingHorizontal: tokenSpacing.md,
  },

  chipLive: {
    backgroundColor: lightColors.success,
    borderRadius: tokenRadius.pill,
    paddingVertical: tokenSpacing.sm,
    paddingHorizontal: tokenSpacing.md,
  },

  screenBackground: {
    flex: 1,
    backgroundColor: lightColors.background,
  },

  // Legacy aliases
  propertyCard: {
    backgroundColor: lightColors.surface,
    borderRadius: tokenRadius.lg,
    ...tokenShadow.card,
    padding: tokenSpacing.lg,
    marginBottom: tokenSpacing.sm,
  },
  propertyCardReadOnly: {
    backgroundColor: lightColors.background,
    borderRadius: tokenRadius.lg,
    ...tokenShadow.card,
    padding: tokenSpacing.lg,
    marginBottom: tokenSpacing.sm,
  },
} as const;
