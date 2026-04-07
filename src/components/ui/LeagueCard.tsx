import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableCard } from './PressableCard';
// Types imported as needed by consuming components
import { colors, fonts } from '../../theme';
import { getSportIcon, formatSport } from '../../utils/sportUtils';
import { getSportColor } from '../../constants/sportColors';

interface LeagueCardProps {
  league: any;
  onPress?: (league: any) => void;
  isOwner?: boolean;
  style?: any;
}

export const LeagueCard: React.FC<LeagueCardProps> = ({
  league,
  onPress,
  isOwner,
  style,
}) => {
  const seasonName = league.seasonName || league.name;
  const sportColor = getSportColor(league.sportType);

  return (
    <PressableCard
      style={[styles.card, style]}
      onPress={() => onPress?.(league)}
    >
      <View style={[styles.iconCircle, { backgroundColor: sportColor + '14' }]}>
        <Ionicons
          name={getSportIcon(league.sportType) as any}
          size={20}
          color={sportColor}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {seasonName}
          </Text>
          {isOwner && (
            <View style={styles.commissionerBadge}>
              <Text style={styles.commissionerText}>Commissioner</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta}>{formatSport(league.sportType)}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={16}
        color={colors.outlineVariant}
      />
    </PressableCard>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: fonts.headingSemi,
    fontSize: 15,
    color: colors.onSurface,
    flexShrink: 1,
  },
  // Commissioner badge — cobalt tint (leadership role, distinct from Manager)
  commissionerBadge: {
    backgroundColor: colors.cobaltTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.cobalt,
  },
  commissionerText: {
    color: colors.cobalt,
    fontSize: 10,
    fontFamily: fonts.label,
    letterSpacing: 0.4,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
});
