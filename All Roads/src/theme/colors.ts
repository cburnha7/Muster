/**
 * Color palette for Muster
 * All colors follow the brand guidelines v1.0
 * 
 * Primary: colors.grass (#3D8C5E) - Main brand color
 * Accent: colors.court (#E8A030) - Salute/achievement color
 */

import { Brand } from './brand';

// Light mode colors
export const lightColors = {
  // Brand Colors
  grass: Brand.colors.grass,           // #3D8C5E - Primary brand color
  grassLight: Brand.colors.grassLight, // #5BAB79 - Hover/active
  grassDark: Brand.colors.grassDark,   // #2A6644 - Pressed
  court: Brand.colors.court,           // #E8A030 - Accent/salute color
  courtLight: Brand.colors.courtLight, // #F4BC60 - Salute glow
  sky: Brand.colors.sky,               // #5B9FD4 - Info/links
  skyLight: Brand.colors.skyLight,     // #85BEE8 - Light variant
  track: Brand.colors.track,           // #D45B5B - Errors/alerts
  chalk: Brand.colors.chalk,           // #F7F4EE - Light background
  ink: Brand.colors.ink,               // #1C2320 - Dark background/text
  inkMid: Brand.colors.inkMid,         // #2A3430 - Card backgrounds (dark)
  inkSoft: Brand.colors.inkSoft,       // #3A4440 - Soft dark
  soft: Brand.colors.soft,             // #6B7C76 - Secondary text
  mid: Brand.colors.mid,               // #4A6058 - Mid-tone text
  
  // Alias for compatibility
  primary: Brand.colors.grass,
  primaryLight: Brand.colors.grassLight,
  primaryDark: Brand.colors.grassDark,
  accent: Brand.colors.court,
  
  // Secondary Colors (mapped to brand colors)
  success: Brand.colors.grass,         // Use grass for success
  warning: '#FF9500',
  error: Brand.colors.track,           // Use track for errors
  info: Brand.colors.sky,              // Use sky for info

  // Neutral Colors
  background: '#FFFFFF',
  surface: Brand.colors.chalk,         // #F7F4EE - Use chalk for surfaces
  border: '#E5E5EA',
  
  // Text Colors
  textPrimary: Brand.colors.ink,       // #1C2320
  textSecondary: Brand.colors.soft,    // #6B7C76
  textTertiary: '#C7C7CC',
  textInverse: '#FFFFFF',

  // Overlay Colors
  overlay: 'rgba(28, 35, 32, 0.5)',    // ink with opacity
  overlayLight: 'rgba(28, 35, 32, 0.3)',

  // Status Colors
  online: Brand.colors.grass,
  offline: Brand.colors.soft,
  pending: '#FF9500',
  cancelled: Brand.colors.track,
  confirmed: Brand.colors.grass,

  // Sport Type Colors (for visual differentiation)
  basketball: Brand.colors.court,      // #E8A030 - court orange
  soccer: Brand.colors.grass,          // #3D8C5E - grass green
  tennis: '#FFD700',
  volleyball: '#9C27B0',
  badminton: Brand.colors.sky,         // #5B9FD4 - sky blue
  other: Brand.colors.soft,
} as const;

// Dark mode colors
export const darkColors = {
  // Brand Colors (adjusted for dark mode)
  grass: Brand.colors.grassLight,      // #5BAB79 - Lighter for dark bg
  grassLight: '#81C784',
  grassDark: Brand.colors.grass,       // #3D8C5E
  court: Brand.colors.court,           // #E8A030
  courtLight: Brand.colors.courtLight, // #F4BC60
  sky: Brand.colors.sky,               // #5B9FD4
  skyLight: Brand.colors.skyLight,     // #85BEE8
  track: '#E88585',                    // Lighter track for dark
  chalk: Brand.colors.chalk,           // #F7F4EE
  ink: Brand.colors.ink,               // #1C2320
  inkMid: Brand.colors.inkMid,         // #2A3430
  inkSoft: Brand.colors.inkSoft,       // #3A4440
  soft: Brand.colors.soft,             // #6B7C76
  mid: Brand.colors.mid,               // #4A6058
  
  // Alias for compatibility
  primary: Brand.colors.grassLight,
  primaryLight: '#81C784',
  primaryDark: Brand.colors.grass,
  accent: Brand.colors.court,
  
  // Secondary Colors
  success: Brand.colors.grassLight,
  warning: '#FF9500',
  error: '#E88585',
  info: Brand.colors.skyLight,

  // Neutral Colors
  background: '#000000',
  surface: Brand.colors.inkMid,        // #2A3430
  border: Brand.colors.inkSoft,        // #3A4440
  
  // Text Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#98989D',
  textTertiary: '#48484A',
  textInverse: Brand.colors.ink,

  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',

  // Status Colors
  online: Brand.colors.grassLight,
  offline: '#98989D',
  pending: '#FF9500',
  cancelled: '#E88585',
  confirmed: Brand.colors.grassLight,

  // Sport Type Colors
  basketball: Brand.colors.court,
  soccer: Brand.colors.grassLight,
  tennis: '#FFD700',
  volleyball: '#B24FC9',
  badminton: Brand.colors.skyLight,
  other: '#98989D',
} as const;

// Default to light mode (can be changed based on system preference)
export const colors = lightColors;

export type ColorKey = keyof typeof lightColors;

// Legacy export for backward compatibility
export const Colors = colors;

/**
 * Get color by key with fallback
 */
export function getColor(key: ColorKey, fallback: string = colors.grass): string {
  return colors[key] || fallback;
}

/**
 * Get sport type color
 */
export function getSportColor(sportType: string): string {
  const sportKey = sportType.toLowerCase() as keyof typeof colors;
  return colors[sportKey] || colors.other;
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  const statusKey = status.toLowerCase() as keyof typeof colors;
  return colors[statusKey] || colors.textSecondary;
}

/**
 * Get colors based on color scheme
 */
export function getThemeColors(isDark: boolean) {
  return isDark ? darkColors : lightColors;
}
