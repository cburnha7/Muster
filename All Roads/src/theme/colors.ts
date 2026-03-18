export const colors = {
  // ── Brand greens ──────────────────────────────
  grass:      '#3D8C5E', // primary brand
  grassLight: '#5BAB79', // hover / active states
  grassDark:  '#2A6644', // pressed states

  // ── Accent ────────────────────────────────────
  court:      '#E8A030', // accent — salute colour
  courtLight: '#F4BC60', // salute glow / highlights

  // ── Supporting ────────────────────────────────
  sky:        '#5B9FD4', // info / links
  skyLight:   '#85BEE8', // info hover
  track:      '#D45B5B', // errors / alerts
  trackLight: '#E88585', // error hover

  // ── Neutrals ──────────────────────────────────
  chalk:      '#F7F4EE', // light background (legacy)
  chalkWarm:  '#EEEBE3', // app background — new global default
  ink:        '#1C2320', // dark background / primary text
  inkMid:     '#2A3430', // card backgrounds (dark mode)
  inkSoft:    '#3A4440', // secondary dark surface
  inkFaint:   '#6B7C76', // secondary / placeholder text

  // ── Transparency helpers ───────────────────────
  overlay:    'rgba(28, 35, 32, 0.6)',
  scrim:      'rgba(28, 35, 32, 0.4)',
} as const;

export type ColorKey = keyof typeof colors;
