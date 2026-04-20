import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match, MatchStatus } from '../../types';
import { useTheme } from '../../theme';
import { tokenFontFamily, tokenSpacing, tokenRadius } from '../../theme/tokens';

interface MatchCardProps {
  match: Match;
  onPress?: (match: Match) => void;
  style?: any;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const formatTime = (date: Date | string | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    });
  };

  const getStatusColor = (status: MatchStatus | string) => {
    switch (status) {
      case 'scheduled':
        return colors.cobalt;
      case 'pending':
        return colors.warning;
      case 'in_progress':
        return colors.warning;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.inkMuted;
    }
  };

  const getStatusText = (status: MatchStatus | string) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const isCompleted = match.status === 'completed';
  const isPending = match.status === 'pending';
  const hasScores =
    match.homeScore !== null &&
    match.homeScore !== undefined &&
    match.awayScore !== null &&
    match.awayScore !== undefined;

  // Team names — use real names or placeholders
  const homeName =
    match.homeTeam?.name ?? (match as any).placeholderHome ?? 'Team TBD';
  const awayName =
    match.awayTeam?.name ?? (match as any).placeholderAway ?? 'Team TBD';
  const homeIsPlaceholder = !match.homeTeam?.name;
  const awayIsPlaceholder = !match.awayTeam?.name;

  // Suggested days
  const suggestedDays: string[] = (match as any).suggestedDays ?? [];

  // Date and time
  const dateStr = formatDate(match.scheduledAt);
  const timeStr = formatTime(match.scheduledAt);

  // Location
  const locationName =
    match.event?.facility?.name ?? (match.event as any)?.locationName ?? null;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.surface, shadowColor: colors.black },
        style,
      ]}
      onPress={() => onPress?.(match)}
      activeOpacity={0.7}
    >
      {/* Status Badge */}
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(match.status) },
        ]}
      >
        <Text style={styles.statusText}>{getStatusText(match.status)}</Text>
      </View>

      {/* Round indicator */}
      {(match as any).bracketRound && (
        <Text style={[styles.roundLabel, { color: colors.inkMuted }]}>
          Round {(match as any).bracketRound}
        </Text>
      )}

      {/* Teams */}
      <View style={styles.teamsContainer}>
        <View style={styles.teamRow}>
          <View style={styles.teamInfo}>
            <Ionicons
              name="home-outline"
              size={16}
              color={colors.inkSecondary}
            />
            <Text
              style={[
                styles.teamName,
                { color: homeIsPlaceholder ? colors.inkMuted : colors.ink },
                homeIsPlaceholder && styles.placeholderText,
              ]}
              numberOfLines={1}
            >
              {homeName}
            </Text>
          </View>
          {hasScores && (
            <Text style={[styles.score, { color: colors.ink }]}>
              {match.homeScore}
            </Text>
          )}
        </View>

        <View style={styles.divider}>
          <Text style={[styles.vsText, { color: colors.inkMuted }]}>vs</Text>
        </View>

        <View style={styles.teamRow}>
          <View style={styles.teamInfo}>
            <Ionicons
              name="airplane-outline"
              size={16}
              color={colors.inkSecondary}
            />
            <Text
              style={[
                styles.teamName,
                { color: awayIsPlaceholder ? colors.inkMuted : colors.ink },
                awayIsPlaceholder && styles.placeholderText,
              ]}
              numberOfLines={1}
            >
              {awayName}
            </Text>
          </View>
          {hasScores && (
            <Text style={[styles.score, { color: colors.ink }]}>
              {match.awayScore}
            </Text>
          )}
        </View>
      </View>

      {/* Meta row: suggested days, date, location */}
      <View style={styles.metaRow}>
        {suggestedDays.length > 0 && (
          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.inkSecondary}
            />
            <Text style={[styles.metaText, { color: colors.inkSecondary }]}>
              {suggestedDays.join(' / ')}
            </Text>
          </View>
        )}

        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={colors.inkSecondary} />
          <Text style={[styles.metaText, { color: colors.inkSecondary }]}>
            {dateStr ?? 'Date TBD'}
            {timeStr ? ` at ${timeStr}` : ''}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Ionicons
            name="location-outline"
            size={14}
            color={colors.inkSecondary}
          />
          <Text style={[styles.metaText, { color: colors.inkSecondary }]}>
            {locationName ?? 'Location TBD'}
          </Text>
        </View>
      </View>

      {/* Outcome Badge */}
      {isCompleted && match.outcome && (
        <View
          style={[styles.outcomeContainer, { borderTopColor: colors.border }]}
        >
          {match.outcome === 'draw' ? (
            <View
              style={[styles.drawBadge, { backgroundColor: colors.border }]}
            >
              <Text style={[styles.drawText, { color: colors.inkSecondary }]}>
                Draw
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.winnerBadge,
                { backgroundColor: colors.warningLight },
              ]}
            >
              <Ionicons name="trophy" size={14} color={colors.gold} />
              <Text style={[styles.winnerText, { color: colors.gold }]}>
                {match.outcome === 'home_win'
                  ? match.homeTeam?.name
                  : match.awayTeam?.name}{' '}
                wins
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: tokenRadius.md,
    padding: tokenSpacing.lg,
    marginVertical: tokenSpacing.sm,
    marginHorizontal: tokenSpacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: tokenSpacing.md,
    paddingVertical: tokenSpacing.xs,
    borderRadius: tokenRadius.md,
    marginBottom: tokenSpacing.sm,
  },
  statusText: {
    fontSize: 12,
    fontFamily: tokenFontFamily.uiSemiBold,
    color: '#FFFFFF',
  },
  roundLabel: {
    fontSize: 11,
    fontFamily: tokenFontFamily.uiSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: tokenSpacing.sm,
  },
  teamsContainer: {
    gap: tokenSpacing.sm,
    marginBottom: tokenSpacing.md,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenSpacing.sm,
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontFamily: tokenFontFamily.uiSemiBold,
    flex: 1,
  },
  placeholderText: {
    fontStyle: 'italic',
  },
  score: {
    fontSize: 24,
    fontFamily: tokenFontFamily.uiBold,
    minWidth: 40,
    textAlign: 'center',
  },
  divider: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  vsText: {
    fontSize: 12,
    fontFamily: tokenFontFamily.uiSemiBold,
  },
  metaRow: {
    gap: tokenSpacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenSpacing.sm,
  },
  metaText: {
    fontSize: 13,
    fontFamily: tokenFontFamily.uiRegular,
  },
  outcomeContainer: {
    marginTop: tokenSpacing.md,
    paddingTop: tokenSpacing.md,
    borderTopWidth: 1,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokenSpacing.md,
    paddingVertical: 6,
    borderRadius: tokenRadius.lg,
    alignSelf: 'flex-start',
  },
  winnerText: {
    fontSize: 13,
    fontFamily: tokenFontFamily.uiSemiBold,
  },
  drawBadge: {
    paddingHorizontal: tokenSpacing.md,
    paddingVertical: 6,
    borderRadius: tokenRadius.lg,
    alignSelf: 'flex-start',
  },
  drawText: {
    fontSize: 13,
    fontFamily: tokenFontFamily.uiSemiBold,
  },
});
