import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableCard } from './PressableCard';
import { Team } from '../../types';
import { colors, fonts, useTheme } from '../../theme';
import { getSportIcon, formatSport } from '../../utils/sportUtils';
import { getSportColor } from '../../constants/sportColors';

interface TeamCardProps {
  team: Team;
  onPress?: (team: Team) => void;
  style?: any;
  compact?: boolean;
  currentUserId?: string | undefined;
}

const TeamCardInner: React.FC<TeamCardProps> = ({
  team,
  onPress,
  style,
  currentUserId,
}) => {
  const { colors: themeColors } = useTheme();
  const sport = team.sportTypes?.[0] || team.sportType;
  const availableSlots = team.maxMembers - team.members.length;
  const isFull = availableSlots <= 0;
  const sportColor = getSportColor(sport);

  const isManager =
    currentUserId &&
    (team.captainId === currentUserId ||
      team.members.some(
        m =>
          m.userId === currentUserId &&
          (m.role === 'captain' || m.role === 'co_captain') &&
          m.status === 'active'
      ));

  return (
    <PressableCard
      style={[styles.card, { backgroundColor: themeColors.bgCard }, style]}
      onPress={() => onPress?.(team)}
    >
      {/* Sport icon with tinted background */}
      <View style={[styles.iconCircle, { backgroundColor: sportColor + '14' }]}>
        <Ionicons
          name={getSportIcon(sport) as any}
          size={20}
          color={sportColor}
        />
      </View>

      {/* Team info */}
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, { color: themeColors.textPrimary }]}
            numberOfLines={1}
          >
            {team.name}
          </Text>
          {isManager && (
            <View style={styles.managerBadge}>
              <Text style={styles.managerText}>Manager</Text>
            </View>
          )}
        </View>
        <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
          {formatSport(sport)}{' '}
          <Text style={[styles.metaDot, { color: themeColors.border }]}>
            &middot;
          </Text>{' '}
          {isFull ? (
            <Text style={styles.metaFull}>Full</Text>
          ) : (
            <Text>
              {team.members.length}/{team.maxMembers} players
            </Text>
          )}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={themeColors.border} />
    </PressableCard>
  );
};

export const TeamCard = React.memo(TeamCardInner);

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
  // Manager badge — pine green (positive role)
  managerBadge: {
    backgroundColor: colors.pine,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  managerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: fonts.label,
    letterSpacing: 0.4,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  metaDot: {
    color: colors.outlineVariant,
  },
  metaFull: {
    color: colors.error,
  },
});
