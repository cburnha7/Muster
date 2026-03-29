export const colors = {
  // ── Cobalt blue — PRIMARY ─────────────────────
  cobalt:       '#2040E0', // primary brand blue
  cobaltLight:  '#3D56F0', // hover / active
  cobaltDark:   '#1530B0', // pressed
  cobaltTint:   '#EEF1FD', // blue background tint

  // ── Pine green — HIGHLIGHT ────────────────────
  pine:         '#2D5F3F', // highlight green
  pineLight:    '#3D8C5E', // hover
  pineDark:     '#1E4229', // pressed
  pineTint:     '#EBF5EF', // green background tint

  // ── Heart red ─────────────────────────────────
  heart:        '#C0392B', // alerts / destructive
  vermillion:   '#E05A20', // red accent
  heartTint:    '#FDECEA', // red background tint

  // ── Gold — SALUTE ─────────────────────────────
  gold:         '#D4A017', // salute accent
  goldLight:    '#F0BE40', // salute glow
  goldTint:     '#FEF3CD', // gold background tint

  // ── Surfaces ──────────────────────────────────
  white:        '#FFFFFF', // app background
  surface:      '#F8F8F8', // card background
  border:       '#E8E8E8', // dividers / outlines

  // ── Ink / text ────────────────────────────────
  ink:          '#0F1F3D', // primary text
  inkSoft:      '#4A5568', // secondary text
  inkFaint:     '#9AA5B4', // placeholder / disabled

  // ── Transparency helpers ───────────────────────
  overlay:      'rgba(32, 64, 224, 0.6)',
  scrim:        'rgba(15, 31, 61, 0.4)',
} as const;

export type ColorKey = keyof typeof colors;
