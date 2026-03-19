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
      backgroundColor: colors.pine,
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
      borderColor: colors.pine,
    },
  },

  /** Editable property card — create / edit screens */
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    padding: 16,
    marginBottom: 8,
  },

  /** Read-only property card — detail / view screens */
  propertyCardReadOnly: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    padding: 16,
    marginBottom: 8,
  },

  /** Global app background */
  screenBackground: {
    flex: 1,
    backgroundColor: colors.cream,
  },
} as const;
