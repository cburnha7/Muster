/**
 * Shared screen-level typography and layout tokens.
 *
 * Every tab screen and its child screens should import these instead of
 * defining their own section-title / chip / empty-state styles.
 */

import { StyleSheet } from 'react-native';
import { fonts } from './typography';
import { colors } from './colors';

export const ScreenStyles = StyleSheet.create({
  /* ── Primary section header ("My Teams", "Games near you", …) ── */
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: (colors as any).onSurface,
    letterSpacing: -0.3,
  },

  /* ── Section header row (title + optional "See all") ── */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },

  /* ── "See all" / secondary link ── */
  sectionLink: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    color: colors.cobalt,
  },

  /* ── Sport filter pill (unselected) ── */
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: (colors as any).surfaceContainerLowest,
  },

  /* ── Sport filter pill (selected) ── */
  chipActive: {
    backgroundColor: colors.cobalt,
  },

  /* ── Chip label (unselected) ── */
  chipText: {
    fontFamily: fonts.headingSemi,
    fontSize: 13,
    color: (colors as any).onSurfaceVariant,
  },

  /* ── Chip label (selected) ── */
  chipTextActive: {
    color: '#FFFFFF',
  },

  /* ── Chip scroll row ── */
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* ── Empty state container ── */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },

  /* ── Empty state title ── */
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: (colors as any).onSurface,
    textAlign: 'center',
    marginTop: 12,
  },

  /* ── Empty state subtitle ── */
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: (colors as any).onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
  },

  /* ── Empty state action button ── */
  emptyAction: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: colors.cobalt,
  },

  /* ── Empty state action label ── */
  emptyActionText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#FFFFFF',
  },

  /* ── Card primary title ── */
  cardTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 15,
    color: (colors as any).onSurface,
  },

  /* ── Card secondary / meta line ── */
  cardMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: (colors as any).onSurfaceVariant,
  },
});
