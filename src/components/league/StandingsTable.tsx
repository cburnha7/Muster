import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TeamStanding, MatchOutcome } from '../../types';
import { useTheme } from '../../theme';

interface StandingsTableProps {
  standings: TeamStanding[];
  onTeamPress?: (teamId: string) => void;
  style?: any;
}

type SortColumn = 'rank' | 'points' | 'goalDifference' | 'goalsFor';

export const StandingsTable: React.FC<StandingsTableProps> = ({
  standings,
  onTeamPress,
  style,
}) => {
  const { colors } = useTheme();
  const [sortColumn, setSortColumn] = useState<SortColumn>('rank');
  const [sortAscending, setSortAscending] = useState(false);

  const sortedStandings = React.useMemo(() => {
    const sorted = [...standings];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'points':
          comparison = b.membership.points - a.membership.points;
          break;
        case 'goalDifference':
          comparison =
            b.membership.goalDifference - a.membership.goalDifference;
          break;
        case 'goalsFor':
          comparison = b.membership.goalsFor - a.membership.goalsFor;
          break;
      }

      return sortAscending ? -comparison : comparison;
    });

    return sorted;
  }, [standings, sortColumn, sortAscending]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortAscending(!sortAscending);
    } else {
      setSortColumn(column);
      setSortAscending(false);
    }
  };

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return (
        <Ionicons
          name="swap-vertical-outline"
          size={14}
          color={colors.inkMuted}
        />
      );
    }
    return (
      <Ionicons
        name={sortAscending ? 'arrow-up' : 'arrow-down'}
        size={14}
        color={colors.cobalt}
      />
    );
  };

  const renderFormIndicator = (form: MatchOutcome[]) => {
    if (!form || form.length === 0) return null;

    return (
      <View style={styles.formContainer}>
        {form.slice(-5).map((outcome, index) => {
          let color = colors.inkMuted;
          let label = 'D';

          if (outcome === 'home_win' || outcome === 'away_win') {
            color = colors.cobalt;
            label = 'W';
          } else if (outcome === 'draw') {
            color = colors.warning;
            label = 'D';
          } else {
            color = colors.error;
            label = 'L';
          }

          return (
            <View
              key={index}
              style={[styles.formDot, { backgroundColor: color }]}
            >
              <Text style={styles.formText}>{label}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={[styles.headerCell, styles.rankCell]}
              onPress={() => handleSort('rank')}
            >
              <Text style={styles.headerText}>#</Text>
              {renderSortIcon('rank')}
            </TouchableOpacity>

            <View style={[styles.headerCell, styles.teamCell]}>
              <Text style={styles.headerText}>Roster</Text>
            </View>

            <View style={[styles.headerCell, styles.statCell]}>
              <Text style={styles.headerText}>P</Text>
            </View>

            <View style={[styles.headerCell, styles.statCell]}>
              <Text style={styles.headerText}>W</Text>
            </View>

            <View style={[styles.headerCell, styles.statCell]}>
              <Text style={styles.headerText}>D</Text>
            </View>

            <View style={[styles.headerCell, styles.statCell]}>
              <Text style={styles.headerText}>L</Text>
            </View>

            <TouchableOpacity
              style={[styles.headerCell, styles.statCell]}
              onPress={() => handleSort('points')}
            >
              <Text style={styles.headerText}>Pts</Text>
              {renderSortIcon('points')}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerCell, styles.statCell]}
              onPress={() => handleSort('goalsFor')}
            >
              <Text style={styles.headerText}>GF</Text>
              {renderSortIcon('goalsFor')}
            </TouchableOpacity>

            <View style={[styles.headerCell, styles.statCell]}>
              <Text style={styles.headerText}>GA</Text>
            </View>

            <TouchableOpacity
              style={[styles.headerCell, styles.statCell]}
              onPress={() => handleSort('goalDifference')}
            >
              <Text style={styles.headerText}>GD</Text>
              {renderSortIcon('goalDifference')}
            </TouchableOpacity>

            <View style={[styles.headerCell, styles.formHeaderCell]}>
              <Text style={styles.headerText}>Form</Text>
            </View>
          </View>

          {/* Rows */}
          {sortedStandings.map((standing, index) => (
            <TouchableOpacity
              key={standing.team.id}
              style={[styles.row, index % 2 === 0 && styles.evenRow]}
              onPress={() => onTeamPress?.(standing.team.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.cell, styles.rankCell]}>
                <Text style={styles.rankText}>{standing.rank}</Text>
              </View>

              <View style={[styles.cell, styles.teamCell]}>
                <Text style={styles.teamText} numberOfLines={1}>
                  {standing.team.name}
                </Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={styles.statText}>
                  {standing.stats.matchesPlayed}
                </Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={styles.statText}>{standing.stats.wins}</Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={styles.statText}>{standing.stats.draws}</Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={styles.statText}>{standing.stats.losses}</Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={[styles.statText, styles.pointsText]}>
                  {standing.stats.points}
                </Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={styles.statText}>{standing.stats.goalsFor}</Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={styles.statText}>
                  {standing.stats.goalsAgainst}
                </Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text
                  style={[
                    styles.statText,
                    standing.stats.goalDifference > 0 && styles.positiveGD,
                    standing.stats.goalDifference < 0 && styles.negativeGD,
                  ]}
                >
                  {standing.stats.goalDifference > 0 ? '+' : ''}
                  {standing.stats.goalDifference}
                </Text>
              </View>

              <View style={[styles.cell, styles.formCell]}>
                {renderFormIndicator(standing.stats.form)}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend:</Text>
        <View style={styles.legendItems}>
          <Text style={styles.legendItem}>P = Played</Text>
          <Text style={styles.legendItem}>W = Wins</Text>
          <Text style={styles.legendItem}>D = Draws</Text>
          <Text style={styles.legendItem}>L = Losses</Text>
          <Text style={styles.legendItem}>Pts = Points</Text>
          <Text style={styles.legendItem}>GF = Goals For</Text>
          <Text style={styles.legendItem}>GA = Goals Against</Text>
          <Text style={styles.legendItem}>GD = Goal Difference</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
  },
  table: {
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 2,
    borderBottomColor: colors.cobalt,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  evenRow: {
    backgroundColor: colors.background,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 4,
  },
  cell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankCell: {
    width: 40,
  },
  teamCell: {
    width: 150,
    alignItems: 'flex-start',
  },
  statCell: {
    width: 50,
  },
  formHeaderCell: {
    width: 120,
  },
  formCell: {
    width: 120,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkSecondary,
  },
  teamText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink,
  },
  statText: {
    fontSize: 14,
    color: colors.inkSecondary,
  },
  pointsText: {
    fontWeight: '700',
    color: colors.cobalt,
  },
  positiveGD: {
    color: colors.cobalt,
    fontWeight: '600',
  },
  negativeGD: {
    color: colors.error,
    fontWeight: '600',
  },
  formContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  formDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  legend: {
    padding: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSecondary,
    marginBottom: 6,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    fontSize: 11,
    color: colors.inkMuted,
  },
});
