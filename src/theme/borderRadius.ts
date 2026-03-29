/**
 * Border radius system — Pill-first geometry
 *
 * Mirrors the rounded pillars of the Muster logo.
 * Default to `lg` (2rem) for cards, `full` for buttons.
 */

export const BorderRadius = {
  none: 0,
  sm: 8,
  md: 16,        // inputs, chips
  lg: 24,        // cards — mirrors logo geometry (≈2rem)
  xl: 32,        // large cards, modals
  full: 9999,    // pill buttons, avatars
} as const;

export type BorderRadiusKey = keyof typeof BorderRadius;

export function getBorderRadius(key: BorderRadiusKey): number {
  return BorderRadius[key];
}
