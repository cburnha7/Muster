/**
 * Muster Brand Constants
 * Core brand values and identity
 * 
 * Brand Identity v1.0 - 2025
 */

export const Brand = {
  // App Identity
  name: 'Muster',
  tagline: 'Find a game. Find your people.',
  mechanic: 'Salute', // In-app recognition system
  
  // Brand Colors (semantic names)
  colors: {
    // Primary
    grass: '#3D8C5E',      // Primary brand color - represents sports fields, growth, activity
    grassLight: '#5BAB79', // Hover/active states
    grassDark: '#2A6644',  // Pressed states
    
    // Accent
    court: '#E8A030',      // Accent/salute color - represents energy, competition, achievement
    courtLight: '#F4BC60', // Salute glow effect
    
    // Supporting
    sky: '#5B9FD4',        // Info/links
    skyLight: '#85BEE8',   // Light variant
    track: '#D45B5B',      // Errors/alerts
    
    // Neutrals
    chalk: '#F7F4EE',      // Light background
    ink: '#1C2320',        // Dark background/text
    inkMid: '#2A3430',     // Card backgrounds (dark mode)
    inkSoft: '#3A4440',    // Soft dark variant
    soft: '#6B7C76',       // Secondary text
    mid: '#4A6058',        // Mid-tone text
  },
  
  // App Icon
  icon: {
    backgroundColor: '#2A3430', // inkMid
    foregroundColor: '#FFFFFF',
  },
  
  // Splash Screen
  splash: {
    backgroundColor: '#3D8C5E', // grass
    textColor: '#FFFFFF',
  },
  
  // Typography (requires font installation)
  // Display/Heading: Fraunces (serif)
  // UI/Body: Nunito (sans-serif)
  fonts: {
    display: 'Fraunces_700Bold',      // 52px - Display text
    heading: 'Fraunces_900Black',     // 28px - Headings
    ui: 'Nunito_900Black',            // 14px - Buttons/UI
    body: 'Nunito_400Regular',        // 15px - Body text
    label: 'Nunito_800ExtraBold',     // 10px caps - Labels
  },
} as const;

export type BrandColorKey = keyof typeof Brand.colors;
