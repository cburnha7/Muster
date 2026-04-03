export const colors = {
  // ── Cobalt blue — PRIMARY ─────────────────────
  cobalt: '#2040E0', // primary brand — buttons, CTAs, active states
  cobaltLight: '#3D56F0', // hover
  cobaltDark: '#1530B0', // pressed
  cobaltTint: '#EEF1FD', // blue tint — badges, backgrounds

  // ── Pine green — SUCCESS / OPEN ───────────────
  pine: '#2D5F3F', // success, open, available
  pineLight: '#3D8C5E', // hover
  pineTint: '#EBF5EF', // green tint

  // ── Gold — SALUTE ONLY ────────────────────────
  gold: '#D4A017', // salute accent
  goldLight: '#F0BE40', // salute glow
  goldTint: '#FEF3CD', // gold tint

  // ── Heart red — ERRORS / STEP OUT ────────────
  heart: '#C0392B', // errors, destructive, Step Out
  vermillion: '#E05A20', // red accent
  heartTint: '#FDECEA', // red tint

  // ── SPORT TYPE BADGES ─────────────────────────
  sportSoccer: '#1A7F5A', // deep green
  sportBasket: '#C45C1A', // burnt orange
  sportHockey: '#1A5FA0', // steel blue
  sportTennis: '#7A5C1A', // warm brown
  sportVolley: '#8B1A6B', // plum
  sportRugby: '#5C1A1A', // deep maroon
  sportOther: '#3A4A6A', // slate

  // ── AVATAR PALETTE (player cards) ────────────
  avatar1: '#2040E0', // cobalt
  avatar2: '#2D5F3F', // pine
  avatar3: '#C0392B', // heart
  avatar4: '#7B4EA0', // violet
  avatar5: '#1A7A8A', // teal
  avatar6: '#C45C1A', // amber
  avatar7: '#8B1A6B', // plum
  avatar8: '#1A5FA0', // steel

  // ── STATUS TONES ──────────────────────────────
  statusOpen: '#EBF5EF', // available — pine tint
  statusOpenText: '#2D5F3F',
  statusFull: '#FDECEA', // full — heart tint
  statusFullText: '#C0392B',
  statusFew: '#FEF3CD', // few spots — gold tint
  statusFewText: '#9A7200',
  statusClosed: '#F0F0F0', // closed / completed
  statusClosedText: '#6B7C76',
  statusLeague: '#EEF1FD', // league / roster — cobalt tint
  statusLeagueText: '#2040E0',

  // ── Surfaces ──────────────────────────────────
  white: '#FFFFFF', // app background
  surface: '#F8F8F8', // card background
  border: '#E8E8E8', // dividers

  // ── Ink / text ────────────────────────────────
  ink: '#0F1F3D', // primary text
  inkSoft: '#4A5568', // secondary text
  inkFaint: '#9AA5B4', // placeholder / disabled

  // ── Transparency ──────────────────────────────
  overlay: 'rgba(32, 64, 224, 0.6)',
  scrim: 'rgba(15, 31, 61, 0.4)',
} as const;

export type ColorKey = keyof typeof colors;

// ── Backward-compatible aliases ──────────────────
// Many components still reference the old Material Design 3 tokens.
// These aliases map them to the new brand palette so nothing breaks.
(colors as any).primary = colors.cobalt;
(colors as any).primaryContainer = colors.cobaltLight;
(colors as any).primaryFixed = colors.cobaltTint;
(colors as any).onPrimary = colors.white;
(colors as any).onPrimaryContainer = colors.cobalt;
(colors as any).secondary = colors.pine;
(colors as any).secondaryContainer = colors.pineTint;
(colors as any).onSecondary = colors.white;
(colors as any).onSecondaryContainer = colors.pine;
(colors as any).tertiary = colors.gold;
(colors as any).tertiaryContainer = colors.goldTint;
(colors as any).error = colors.heart;
(colors as any).errorContainer = colors.heartTint;
(colors as any).onError = colors.white;
(colors as any).onErrorContainer = colors.heart;
(colors as any).background = colors.white;
(colors as any).onBackground = colors.ink;
(colors as any).onSurface = colors.ink;
(colors as any).onSurfaceVariant = colors.inkSoft;
(colors as any).surfaceContainerLowest = colors.white;
(colors as any).surfaceContainerLow = colors.surface;
(colors as any).surfaceContainerHigh = colors.border;
(colors as any).outline = colors.inkSoft;
(colors as any).outlineVariant = colors.border;
(colors as any).textPrimary = colors.ink;
(colors as any).textSecondary = colors.inkSoft;
(colors as any).textTertiary = colors.inkFaint;

// ── Avatar color picker (assign by user ID) ──────
export const avatarColors = [
  colors.avatar1,
  colors.avatar2,
  colors.avatar3,
  colors.avatar4,
  colors.avatar5,
  colors.avatar6,
  colors.avatar7,
  colors.avatar8,
];

export const getAvatarColor = (userId: string): string => {
  const index = userId.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
};

// ── Sport badge colors ────────────────────────────
export const sportColors: Record<string, { bg: string; text: string }> = {
  soccer: { bg: '#E8F5EF', text: '#1A7F5A' },
  basketball: { bg: '#FDF0E6', text: '#C45C1A' },
  hockey: { bg: '#E6EFF8', text: '#1A5FA0' },
  tennis: { bg: '#F5F0E6', text: '#7A5C1A' },
  volleyball: { bg: '#F5E6F2', text: '#8B1A6B' },
  rugby: { bg: '#F5E6E6', text: '#5C1A1A' },
  other: { bg: '#ECEEF2', text: '#3A4A6A' },
};
