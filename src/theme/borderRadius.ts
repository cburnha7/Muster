import { tokenRadius } from './tokens';

export const BorderRadius = {
  none: 0,
  sm: tokenRadius.sm,
  md: tokenRadius.md,
  lg: tokenRadius.lg,
  xl: tokenRadius.xl,
  full: tokenRadius.pill,
} as const;

export type BorderRadiusKey = keyof typeof BorderRadius;

export function getBorderRadius(key: BorderRadiusKey): number {
  return BorderRadius[key];
}
