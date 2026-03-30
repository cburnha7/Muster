import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SportType } from '../../types';
import { colors, fonts } from '../../theme';

interface LeagueCardProps {
  league: any;
  onPress?: (league: any) => void;
  isOwner?: boolean;
  style?: any;
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

const formatSport = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

export const LeagueCard: React.FC<LeagueCardProps> = ({ league, onPress, isOwner, style }) => {
  const seasonName = league.seasonName || league.name;
  const sportColor = getSportColor(league.sportType);

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={() => onPress?.(league)} activeOpacity={0.85}>
      <View style={[styles.iconCircle, { backgroundColor: sportColor + '14' }]}>
        <Ionicons name={getSportIcon(league.sportType) as any} size={20} color={sportColor} />
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{seasonName}</Text>
          {isOwner && (
            <View style={styles.commissionerBadge}>
              <Text style={styles.commissionerText}>Commissioner</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta}>{formatSport(league.sportType)}</Text>
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
  commissionerBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  commissionerText: {
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
});
