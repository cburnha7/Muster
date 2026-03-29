// ── Tonal Architecture ──────────────────────────────
// Built for athletic energy: high-chroma primaries, crisp neutrals.
// Depth is achieved through luminosity shifts, not borders.

export const colors = {
  // ── Primary (Electric Blue) ──────────────────────
  primary:            '#0052FF',
  primaryContainer:   '#003EC7',
  onPrimary:          '#FFFFFF',
  primaryFixed:       '#DDE1FF',
  primaryFixedDim:    '#B8C4FF',
  onPrimaryFixed:     '#001A5C',
  onPrimaryFixedVariant: '#1A2A5C',

  // ── Secondary (Active Green) ─────────────────────
  secondary:          '#006D32',
  secondaryContainer: '#55FD8C',
  onSecondary:        '#FFFFFF',

  // ── Tertiary (Cool Grey) ─────────────────────────
  tertiary:           '#434E62',
  tertiaryContainer:  '#5A6578',

  // ── Surface Hierarchy (Tonal Layering) ───────────
  background:         '#F7F9FB',
  surface:            '#F7F9FB',
  surfaceContainerLow:    '#F2F4F6',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainer:       '#ECEEF0',
  surfaceContainerHigh:   '#E4E6E8',
  surfaceDim:             '#D8DADC',

  // ── On-Surface / Text ────────────────────────────
  onSurface:          '#191C1E',
  onSurfaceVariant:   '#43474E',
  inverseSurface:     '#2E3133',
  inverseOnSurface:   '#F0F1F3',

  // ── Outline ──────────────────────────────────────
  outline:            '#73777F',
  outlineVariant:     '#C3C6CF',

  // ── Error ────────────────────────────────────────
  error:              '#BA1A1A',
  errorContainer:     '#FFDAD6',
  onError:            '#FFFFFF',
  onErrorContainer:   '#410002',

  // ── Transparency helpers ─────────────────────────
  overlay:    'rgba(25, 28, 30, 0.6)',
  scrim:      'rgba(25, 28, 30, 0.4)',

  // ── Legacy aliases (backward compat) ─────────────
  pine:         '#0052FF',
  pineLight:    '#3375FF',
  pineDark:     '#003EC7',
  heart:        '#BA1A1A',
  heartLight:   '#FFDAD6',
  heartDark:    '#93000A',
  vermillion:   '#BA1A1A',
  navy:         '#191C1E',
  navyLight:    '#43474E',
  navyDark:     '#111315',
  bronze:       '#C3C6CF',
  bronzeLight:  '#E4E6E8',
  bronzeDark:   '#73777F',
  chalk:        '#F7F9FB',
  cream:        '#F2F4F6',
  white:        '#FFFFFF',
  border:       '#C3C6CF',
  ink:          '#191C1E',
  inkMid:       '#2E3133',
  inkSoft:      '#43474E',
  inkFaint:     '#73777F',
  gold:         '#D4A017',
  goldLight:    '#F0BE40',
  grass:        '#0052FF',
  grassLight:   '#3375FF',
  grassDark:    '#003EC7',
  track:        '#BA1A1A',
  trackLight:   '#FFDAD6',
  sky:          '#191C1E',
  skyLight:     '#43474E',
  soft:         '#73777F',
  court:        '#C3C6CF',
  courtLight:   '#E4E6E8',
  textTertiary: '#73777F',
  chalkWarm:    '#F2F4F6',
  pineTint:     '#DDE1FF',
  heartTint:    '#FFDAD6',
  goldTint:     '#FEF3CD',
  navyTint:     '#DDE1FF',
  textPrimary:  '#191C1E',
  textSecondary:'#43474E',
  textMuted:    '#73777F',
  textInverse:  '#FFFFFF',
  fieldBackground: '#ECEEF0',
  fieldBorder:  '#C3C6CF',
} as const;

export type ColorKey = keyof typeof colors;
