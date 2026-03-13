/**
 * Component styles for the Muster app
 * Provides reusable component style patterns
 */

import { colors } from './colors';
import { BorderRadius } from './borderRadius';
import { Spacing } from './spacing';

export const ComponentStyles = {
  button: {
    primary: {
      backgroundColor: colors.grass,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
    },
    secondary: {
      backgroundColor: 'transparent',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
      borderWidth: 2,
      borderColor: colors.grass,
    },
  },
} as const;
