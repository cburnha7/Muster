import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match, MatchStatus } from '../../types';
import { useTheme } from '../../theme';

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
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    });
  };

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case 'scheduled':
        return colors.ink;
      case 'in_progress':
        return colors.warning;
      case 'completed':
        return colors.cobalt;
      case 'cancelled':
        return colors.error;
      default:
        return colors.inkMuted;
    }
  };

  const getStatusText = (status: MatchStatus) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
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
  const hasScores =
    match.homeScore !== null &&
    match.homeScore !== undefined &&
    match.awayScore !== null &&
    match.awayScore !== undefined;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.white, shadowColor: colors.black }, style]}
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
        <Text style={[styles.statusText, { color: colors.white }]}>{getStatusText(match.status)}</Text>
      </View>

      {/* Match Details */}
      <View style={styles.matchInfo}>
        {/* Date and Time */}
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateTimeRow}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.inkSecondary}
            />
            <Text style={[styles.dateTimeText, { color: colors.inkSecondary }]}>
              {formatDate(match.scheduledAt)}
            </Text>
          </View>
          <View style={styles.dateTimeRow}>
            <Ionicons
              name="time-outline"
              size={14}
              color={colors.inkSecondary}
            />
            <Text style={[styles.dateTimeText, { color: colors.inkSecondary }]}>
              {formatTime(match.scheduledAt)}
            </Text>
          </View>
        </View>

        {/* Teams and Scores */}
        <View style={styles.teamsContainer}>
          {/* Home Team */}
          <View style={styles.teamRow}>
            <View style={styles.teamInfo}>
              <Ionicons
                name="home-outline"
                size={16}
                color={colors.inkSecondary}
              />
              <Text style={[styles.teamName, { color: colors.ink }]} numberOfLines={1}>
                {match.homeTeam?.name || 'Home Team'}
              </Text>
            </View>
            {hasScores && (
              <Text
                style={[
                  styles.score, { color: colors.inkSecondary },
                  isCompleted &&
                    match.outcome === 'home_win' &&
                    styles.winningScore]}
              >
                {match.homeScore}
              </Text>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <Text style={[styles.vsText, { color: colors.inkMuted }]}>vs</Text>
          </View>

          {/* Away Team */}
          <View style={styles.teamRow}>
            <View style={styles.teamInfo}>
              <Ionicons
                name="airplane-outline"
                size={16}
                color={colors.inkSecondary}
              />
              <Text style={[styles.teamName, { color: colors.ink }]} numberOfLines={1}>
                {match.awayTeam?.name || 'Away Team'}
              </Text>
            </View>
            {hasScores && (
              <Text
                style={[
                  styles.score, { color: colors.inkSecondary },
                  isCompleted &&
                    match.outcome === 'away_win' &&
                    styles.winningScore]}
              >
                {match.awayScore}
              </Text>
            )}
          </View>
        </View>

        {/* Event Link */}
        {match.event && (
          <View style={[styles.eventLink, { borderTopColor: colors.border }]}>
            <Ionicons name="link-outline" size={14} color={colors.cobalt} />
            <Text style={[styles.eventText, { color: colors.cobalt }]} numberOfLines={1}>
              Linked to event: {match.event.title}
            </Text>
          </View>
        )}

        {/* Location */}
        {(match.event?.facility?.name || match.event?.locationName) && (
          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={colors.inkSecondary}
            />
            <Text style={[styles.locationText, { color: colors.inkSecondary }]} numberOfLines={1}>
              {match.event?.facility?.name ||
                match.event?.locationName ||
                'TBD'}
            </Text>
          </View>
        )}

        {/* Notes */}
        {match.notes && (
          <View style={[styles.notesContainer, { backgroundColor: colors.background }]}>
            <Ionicons
              name="document-text-outline"
              size={14}
              color={colors.inkSecondary}
            />
            <Text style={[styles.notesText, { color: colors.inkSecondary }]} numberOfLines={2}>
              {match.notes}
            </Text>
          </View>
        )}
      </View>

      {/* Outcome Badge (for completed matches) */}
      {isCompleted && match.outcome && (
        <View style={[styles.outcomeContainer, { borderTopColor: colors.border }]}>
          {match.outcome === 'draw' ? (
            <View style={[styles.drawBadge, { backgroundColor: colors.border }]}>
              <Text style={[styles.drawText, { color: colors.inkSecondary }]}>Draw</Text>
            </View>
          ) : (
            <View style={[styles.winnerBadge, { backgroundColor: colors.warningLight }]}>
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
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  matchInfo: {
    gap: 12,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 13,
  },
  teamsContainer: {
    gap: 8,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  score: {
    fontSize: 24,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
  winningScore: {},
  divider: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  eventText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    flex: 1,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 8,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  outcomeContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  winnerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  drawBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  drawText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
