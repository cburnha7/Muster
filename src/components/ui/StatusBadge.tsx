/**
 * StatusBadge — shared pill-shaped status indicator for cards.
 *
 * Replaces inline badge implementations across BookingCard, EventCard,
 * and LeagueCard. Use for short labels that describe the state of a
 * parent entity (booking, event, roster, league).
 *
 * Do NOT use for:
 * - Count/notification badges (different shape, different sizing)
 * - Sport/category chips (different color system)
 * - Skill-rating badges (computed color)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { tokenFontFamily, tokenSpacing, tokenRadius } from '../../theme/tokens';

export type StatusBadgeVariant =
  | 'cancelled' // bg: error, text: white — irreversible terminal state
  | 'live' // bg: gold, text: white, leading dot — active/in-progress
  | 'past' // bg: ink, text: white — completed/historical
  | 'pending' // bg: goldLight, text: gold, border: gold — awaiting action (outlined)
  | 'pendingFilled' // bg: gold tint, text: gold — awaiting action (no border)
  | 'host' // bg: success, text: white — ownership/host indicator
  | 'spots' // bg: successLight/errorLight, text: success/error — capacity
  | 'commissioner'; // bg: cobaltLight, text: cobalt, border: cobalt — role

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  /** Text content. Component does NOT uppercase; pass the exact string. */
  children: string;
  /** Optional leading icon name (Ionicons). Renders at 10px. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Leading dot indicator (used by "Live"). Mutually exclusive with icon. */
  dot?: boolean;
  /** For the 'spots' variant: true = full (error colors), false = available (success colors) */
  isFull?: boolean;
}

export function StatusBadge({
  variant,
  children,
  icon,
  dot,
  isFull = false,
}: StatusBadgeProps) {
  const { colors } = useTheme();

  const config = getVariantConfig(variant, colors, isFull);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg },
        config.border ? { borderWidth: 1, borderColor: config.border } : null,
        variant === 'spots' && styles.spotsSize,
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: config.text }]} />}
      {icon && !dot && <Ionicons name={icon} size={10} color={config.text} />}
      <Text
        style={[
          styles.text,
          { color: config.text },
          variant === 'spots' && styles.spotsText,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

function getVariantConfig(
  variant: StatusBadgeVariant,
  colors: any,
  isFull: boolean
): { bg: string; text: string; border?: string } {
  switch (variant) {
    case 'cancelled':
      return { bg: colors.error, text: colors.white };
    case 'live':
      return { bg: colors.gold, text: colors.white };
    case 'past':
      return { bg: colors.ink, text: colors.white };
    case 'pending':
      return { bg: colors.goldLight, text: colors.gold, border: colors.gold };
    case 'pendingFilled':
      return {
        bg: colors.goldTint ?? 'rgba(196,168,130,0.15)',
        text: colors.gold,
      };
    case 'host':
      return { bg: colors.success, text: colors.white };
    case 'spots':
      return isFull
        ? { bg: colors.errorLight, text: colors.error }
        : { bg: colors.successLight, text: colors.success };
    case 'commissioner':
      return {
        bg: colors.cobaltLight,
        text: colors.cobalt,
        border: colors.cobalt,
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokenSpacing.sm,
    paddingVertical: 3,
    borderRadius: tokenRadius.pill,
    gap: tokenSpacing.xs,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  text: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  // Slightly larger variant for the capacity/spots badge
  spotsSize: {
    paddingHorizontal: tokenSpacing.md,
    paddingVertical: 6,
    borderRadius: tokenRadius.lg,
  },
  spotsText: {
    fontSize: 12,
  },
});
