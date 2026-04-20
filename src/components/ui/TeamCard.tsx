import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableCard } from './PressableCard';
import { Team } from '../../types';
import {
  tokenColors,
  tokenSpacing,
  tokenRadius,
  tokenType,
  tokenShadow,
  tokenFontFamily,
} from '../../theme/tokens';
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
    <PressableCard style={[styles.card, style]} onPress={() => onPress?.(team)}>
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
          <Text style={styles.name} numberOfLines={1}>
            {team.name}
          </Text>
          {isManager && (
            <View style={styles.managerBadge}>
              <Text style={styles.managerText}>Manager</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta}>
          {formatSport(sport)} <Text style={styles.metaDot}>&middot;</Text>{' '}
          {isFull ? (
            <Text style={styles.metaFull}>Full</Text>
          ) : (
            <Text>
              {team.members.length}/{team.maxMembers} players
            </Text>
          )}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={tokenColors.border} />
    </PressableCard>
  );
};

export const TeamCard = React.memo(TeamCardInner);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokenColors.surface,
    borderRadius: tokenRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: tokenSpacing.sm,
    gap: tokenSpacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: tokenRadius.md,
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
    gap: tokenSpacing.sm,
  },
  name: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 15,
    color: tokenColors.ink,
    flexShrink: 1,
  },
  // Manager badge — pine green (positive role)
  managerBadge: {
    backgroundColor: tokenColors.success,
    paddingHorizontal: tokenSpacing.sm,
    paddingVertical: 2,
    borderRadius: tokenRadius.pill,
  },
  managerText: {
    color: tokenColors.white,
    fontSize: 10,
    fontFamily: tokenFontFamily.uiSemiBold,
    letterSpacing: 0.4,
  },
  meta: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 13,
    color: tokenColors.inkSecondary,
  },
  metaDot: {
    color: tokenColors.border,
  },
  metaFull: {
    color: tokenColors.error,
  },
});
