export const colors = {
  // ── Pine green ────────────────────────────────
  pine:        '#2D5F3F', // primary brand green
  pineLight:   '#3D8C5E', // hover / active states
  pineDark:    '#1E4229', // pressed states

  // ── Heart red ─────────────────────────────────
  heart:       '#C0392B', // primary red
  vermillion:  '#E05A20', // red accent / light variant

  // ── Navy ──────────────────────────────────────
  navy:        '#1B2A4A', // primary blue / ink
  navyLight:   '#2E4470', // hover
  navyDark:    '#111B30', // pressed

  // ── Gold ──────────────────────────────────────
  gold:        '#D4A017', // salute accent
  goldLight:   '#F0BE40', // salute glow / highlights

  // ── Surfaces ──────────────────────────────────
  white:       '#FFFFFF', // app background
  surface:     '#F8F8F8', // card background
  border:      '#E8E8E8', // dividers / outlines

  // ── Ink / text ────────────────────────────────
  ink:         '#1B2A4A', // primary text (navy)
  inkSoft:     '#4A5568', // secondary text
  inkFaint:    '#9AA5B4', // placeholder / disabled

  // ── Semantic tints ────────────────────────────
  pineTint:    '#EBF5EF', // green background tint
  heartTint:   '#FDECEA', // red background tint
  goldTint:    '#FEF3CD', // gold background tint
  navyTint:    '#EEF2FF', // navy background tint

  // ── Transparency helpers ───────────────────────
  overlay:     'rgba(27, 42, 74, 0.6)',
  scrim:       'rgba(27, 42, 74, 0.4)',
} as const;

export type ColorKey = keyof typeof colors;
