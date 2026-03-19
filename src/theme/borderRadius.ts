/**
 * Border radius system for the Sports Booking App
 * Provides consistent corner radius values
 */

export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  round: 9999, // Fully rounded
} as const;

export type BorderRadiusKey = keyof typeof BorderRadius;

/**
 * Get border radius value by key
 */
export function getBorderRadius(key: BorderRadiusKey): number {
  return BorderRadius[key];
}
