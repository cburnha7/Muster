/**
 * Component styles — Muster design system
 *
 * All values derive from tokens.ts.
 */

import { tokenColors, tokenSpacing, tokenRadius, tokenShadow } from './tokens';

export const ComponentStyles = {
  button: {
    primary: {
      backgroundColor: tokenColors.cobalt,
      paddingVertical: tokenSpacing.md,
      paddingHorizontal: tokenSpacing.xl,
      borderRadius: tokenRadius.lg,
    },
    secondary: {
      backgroundColor: tokenColors.transparent,
      borderWidth: 1.5,
      borderColor: tokenColors.border,
      paddingVertical: tokenSpacing.md,
      paddingHorizontal: tokenSpacing.xl,
      borderRadius: tokenRadius.lg,
    },
  },

  card: {
    backgroundColor: tokenColors.surface,
    borderRadius: tokenRadius.lg,
    ...tokenShadow.card,
    padding: tokenSpacing.lg,
    marginBottom: tokenSpacing.md,
  },

  cardReadOnly: {
    backgroundColor: tokenColors.background,
    borderRadius: tokenRadius.lg,
    padding: tokenSpacing.lg,
    marginBottom: tokenSpacing.md,
  },

  input: {
    backgroundColor: tokenColors.surface,
    borderWidth: 1.5,
    borderColor: tokenColors.border,
    borderRadius: tokenRadius.md,
    paddingVertical: tokenSpacing.md,
    paddingHorizontal: tokenSpacing.lg,
  },

  chipSelected: {
    backgroundColor: tokenColors.cobalt,
    borderRadius: tokenRadius.pill,
    paddingVertical: tokenSpacing.sm,
    paddingHorizontal: tokenSpacing.md,
  },

  chip: {
    backgroundColor: tokenColors.surface,
    borderWidth: 1.5,
    borderColor: tokenColors.border,
    borderRadius: tokenRadius.pill,
    paddingVertical: tokenSpacing.sm,
    paddingHorizontal: tokenSpacing.md,
  },

  chipLive: {
    backgroundColor: tokenColors.success,
    borderRadius: tokenRadius.pill,
    paddingVertical: tokenSpacing.sm,
    paddingHorizontal: tokenSpacing.md,
  },

  screenBackground: {
    flex: 1,
    backgroundColor: tokenColors.background,
  },

  // Legacy aliases
  propertyCard: {
    backgroundColor: tokenColors.surface,
    borderRadius: tokenRadius.lg,
    ...tokenShadow.card,
    padding: tokenSpacing.lg,
    marginBottom: tokenSpacing.sm,
  },
  propertyCardReadOnly: {
    backgroundColor: tokenColors.background,
    borderRadius: tokenRadius.lg,
    ...tokenShadow.card,
    padding: tokenSpacing.lg,
    marginBottom: tokenSpacing.sm,
  },
} as const;
