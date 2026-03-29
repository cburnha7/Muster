/**
 * Spacing system — Breathable white space
 *
 * High-end design requires the "luxury of space."
 * Use generous spacing to avoid cramming content.
 */

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,       // standard section gap / card content separation
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 64,
} as const;

export type SpacingKey = keyof typeof Spacing;

export function getSpacing(key: SpacingKey): number {
  return Spacing[key];
}

export function getSpacings(...keys: SpacingKey[]): number[] {
  return keys.map(key => Spacing[key]);
}
