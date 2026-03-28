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

const formatSport = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

export const LeagueCard: React.FC<LeagueCardProps> = ({ league, onPress, isOwner, style }) => {
  const seasonName = league.seasonName || league.name;

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={() => onPress?.(league)} activeOpacity={0.7}>
      <Ionicons name={getSportIcon(league.sportType) as any} size={22} color={colors.pine} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{seasonName}</Text>
        <Text style={styles.meta}>{formatSport(league.sportType)}</Text>
      </View>
      {isOwner && (
        <View style={styles.badge}>
          <Ionicons name="star" size={10} color="#FFFFFF" />
          <Text style={styles.badgeText}>Commissioner</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 6,
    gap: 10,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  body: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8A030',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: fonts.label,
  },
});
