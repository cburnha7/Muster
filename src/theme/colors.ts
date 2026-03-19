export const colors = {
  // ── Pine green ────────────────────────────────
  pine:       '#2D5F3F', // primary figure / brand green
  pineLight:  '#3D8C5E', // hover / active states
  pineDark:   '#1E4229', // pressed states

  // ── Heart red ─────────────────────────────────
  heart:      '#C0392B', // centre figure / primary accent
  heartLight: '#D45B5B', // hover / highlights
  heartDark:  '#962D22', // pressed states

  // ── Navy ──────────────────────────────────────
  navy:       '#1B2A4A', // right figure / info / links
  navyLight:  '#2E4470', // hover
  navyDark:   '#111B30', // pressed

  // ── Bronze / background ───────────────────────
  bronze:     '#C4A882', // icon background
  bronzeLight:'#D4B99A', // light variant
  bronzeDark: '#A8845A', // dark variant

  // ── Cream / surfaces ──────────────────────────
  chalk:      '#F7F4EE', // light surface
  cream:      '#EEEBE3', // app background (slightly darker)

  // ── Ink / text ────────────────────────────────
  ink:        '#1B2A4A', // primary text / dark background (navy)
  inkMid:     '#2A3A5A', // card backgrounds (dark mode)
  inkSoft:    '#3A4A6A', // secondary dark surface
  inkFaint:   '#6B7A96', // secondary / placeholder text

  // ── Transparency helpers ───────────────────────
  overlay:    'rgba(27, 42, 74, 0.6)',
  scrim:      'rgba(27, 42, 74, 0.4)',

  // ── Legacy aliases (deprecated) ────────────────
  // These map old color names to new palette for backward compatibility
  grass:      '#2D5F3F', // → use colors.pine
  grassLight: '#3D8C5E', // → use colors.pineLight
  grassDark:  '#1E4229', // → use colors.pineDark
  track:      '#C0392B', // → use colors.heart
  trackLight: '#D45B5B', // → use colors.heartLight
  sky:        '#1B2A4A', // → use colors.navy
  skyLight:   '#2E4470', // → use colors.navyLight
  soft:       '#6B7A96', // → use colors.inkFaint
  court:      '#C4A882', // → use colors.bronze (accent)
  courtLight: '#D4B99A', // → use colors.bronzeLight
  background: '#EEEBE3', // → use colors.cream
  textTertiary: '#6B7A96', // → use colors.inkFaint
  chalkWarm: '#EEEBE3', // → use colors.cream
} as const;

export type ColorKey = keyof typeof colors;
