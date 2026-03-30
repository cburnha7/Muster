import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Team, SportType } from '../../types';
import { colors, fonts } from '../../theme';

interface TeamCardProps {
  team: Team;
  onPress?: (team: Team) => void;
  style?: any;
  compact?: boolean;
  currentUserId?: string | undefined;
}

const getSportIcon = (sportType: SportType): string => {
  switch (sportType) {
    case SportType.BASKETBALL: return 'basketball-outline';
    case SportType.SOCCER: return 'football-outline';
    case SportType.TENNIS:
    case SportType.PICKLEBALL: return 'tennisball-outline';
    case SportType.VOLLEYBALL: return 'american-football-outline';
    case SportType.SOFTBALL:
    case SportType.BASEBALL: return 'baseball-outline';
    case SportType.FLAG_FOOTBALL: return 'flag-outline';
    default: return 'fitness-outline';
  }
};

const getSportColor = (sportType: SportType): string => {
  switch (sportType) {
    case SportType.BASKETBALL: return '#E86825';
    case SportType.SOCCER: return '#006D32';
    case SportType.TENNIS:
    case SportType.PICKLEBALL: return '#C4A017';
    case SportType.VOLLEYBALL: return '#8B5CF6';
    case SportType.SOFTBALL:
    case SportType.BASEBALL: return '#BA1A1A';
    case SportType.FLAG_FOOTBALL: return '#0052FF';
    default: return colors.primary;
  }
};

const formatSport = (sportType: SportType): string =>
  sportType.charAt(0).toUpperCase() + sportType.slice(1).replace(/_/g, ' ');

export const TeamCard: React.FC<TeamCardProps> = ({ team, onPress, style, currentUserId }) => {
  const sport = team.sportTypes?.[0] || team.sportType;
  const availableSlots = team.maxMembers - team.members.length;
  const isFull = availableSlots <= 0;
  const sportColor = getSportColor(sport);

  const isManager = currentUserId && (
    team.captainId === currentUserId ||
    team.members.some(
      (m) => m.userId === currentUserId && (m.role === 'captain' || m.role === 'co_captain') && m.status === 'active'
    )
  );

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={() => onPress?.(team)} activeOpacity={0.85}>
      {/* Sport icon with tinted background */}
      <View style={[styles.iconCircle, { backgroundColor: sportColor + '14' }]}>
        <Ionicons name={getSportIcon(sport) as any} size={20} color={sportColor} />
      </View>

      {/* Team info */}
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{team.name}</Text>
          {isManager && (
            <View style={styles.managerBadge}>
              <Text style={styles.managerText}>Manager</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta}>
          {formatSport(sport)}{' '}
          <Text style={styles.metaDot}>&middot;</Text>{' '}
          {isFull ? (
            <Text style={styles.metaFull}>Full</Text>
          ) : (
            <Text>{team.members.length}/{team.maxMembers} players</Text>
          )}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.outlineVariant} />
    </TouchableOpacity>
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
  managerBadge: {
    backgroundColor: colors.primary,
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
