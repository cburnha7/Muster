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

const formatSport = (sportType: SportType): string =>
  sportType.charAt(0).toUpperCase() + sportType.slice(1).replace(/_/g, ' ');

export const TeamCard: React.FC<TeamCardProps> = ({ team, onPress, style, currentUserId }) => {
  const sport = team.sportTypes?.[0] || team.sportType;
  const availableSlots = team.maxMembers - team.members.length;
  const isFull = availableSlots <= 0;

  const isManager = currentUserId && (
    team.captainId === currentUserId ||
    team.members.some(
      (m) => m.userId === currentUserId && (m.role === 'captain' || m.role === 'co_captain') && m.status === 'active'
    )
  );

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={() => onPress?.(team)} activeOpacity={0.7}>
      <Ionicons name={getSportIcon(sport) as any} size={22} color={colors.pine} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{team.name}</Text>
        <Text style={styles.meta}>
          {formatSport(sport)} · {isFull ? 'Full' : `${availableSlots} spots`}
        </Text>
      </View>
      {isManager && (
        <View style={styles.managerBadge}>
          <Ionicons name="star" size={10} color="#FFFFFF" />
          <Text style={styles.managerText}>Manager</Text>
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
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
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
  managerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8A030',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  managerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: fonts.label,
  },
});
