/**
 * Spacing system for the Sports Booking App
 * Provides consistent spacing values throughout the app
 */

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
} as const;

export type SpacingKey = keyof typeof Spacing;

/**
 * Get spacing value by key
 */
export function getSpacing(key: SpacingKey): number {
  return Spacing[key];
}

/**
 * Get multiple spacing values
 */
export function getSpacings(...keys: SpacingKey[]): number[] {
  return keys.map(key => Spacing[key]);
}
