import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableCard } from './PressableCard';
// Types imported as needed by consuming components
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

interface LeagueCardProps {
  league: any;
  onPress?: (league: any) => void;
  isOwner?: boolean;
  style?: any;
}

const LeagueCardInner: React.FC<LeagueCardProps> = ({
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

      <Ionicons name="chevron-forward" size={16} color={tokenColors.border} />
    </PressableCard>
  );
};

export const LeagueCard = React.memo(LeagueCardInner);

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
  // Commissioner badge — cobalt tint (leadership role, distinct from Manager)
  commissionerBadge: {
    backgroundColor: tokenColors.cobaltLight,
    paddingHorizontal: tokenSpacing.sm,
    paddingVertical: 2,
    borderRadius: tokenRadius.pill,
    borderWidth: 1,
    borderColor: tokenColors.cobalt,
  },
  commissionerText: {
    color: tokenColors.cobalt,
    fontSize: 10,
    fontFamily: tokenFontFamily.uiSemiBold,
    letterSpacing: 0.4,
  },
  meta: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 13,
    color: tokenColors.inkSecondary,
  },
});
