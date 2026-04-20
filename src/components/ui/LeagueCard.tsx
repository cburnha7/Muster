import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableCard } from './PressableCard';
import { tokenSpacing, tokenRadius, tokenFontFamily } from '../../theme/tokens';
import { useTheme } from '../../theme';
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
  const { colors } = useTheme();
  const seasonName = league.seasonName || league.name;
  const sportColor = getSportColor(league.sportType);

  return (
    <PressableCard
      style={[styles.card, { backgroundColor: colors.surface }, style]}
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
          <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
            {seasonName}
          </Text>
          {isOwner && (
            <View
              style={[
                styles.commissionerBadge,
                {
                  backgroundColor: colors.cobaltLight,
                  borderColor: colors.cobalt,
                },
              ]}
            >
              <Text style={[styles.commissionerText, { color: colors.cobalt }]}>
                Commissioner
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.meta, { color: colors.inkSecondary }]}>
          {formatSport(league.sportType)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </PressableCard>
  );
};

export const LeagueCard = React.memo(LeagueCardInner);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexShrink: 1,
  },
  commissionerBadge: {
    paddingHorizontal: tokenSpacing.sm,
    paddingVertical: 2,
    borderRadius: tokenRadius.pill,
    borderWidth: 1,
  },
  commissionerText: {
    fontSize: 10,
    fontFamily: tokenFontFamily.uiSemiBold,
    letterSpacing: 0.4,
  },
  meta: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 13,
  },
});
