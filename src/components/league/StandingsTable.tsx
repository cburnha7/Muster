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
              <Text style={[styles.formText, { color: colors.white }]}>{label}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.white }, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.headerRow, { backgroundColor: colors.background, borderBottomColor: colors.cobalt }]}>
            <TouchableOpacity
              style={[styles.headerCell, styles.rankCell]}
              onPress={() => handleSort('rank')}
            >
              <Text style={[styles.headerText, { color: colors.ink }]}>#</Text>
              {renderSortIcon('rank')}
            </TouchableOpacity>

            <View style={[styles.headerCell, styles.teamCell]}>
              <Text style={[styles.headerText, { color: colors.ink }]}>Roster</Text>
            </View>

            <View style={[styles.headerCell, styles.statCell]}>
              <Text style={[styles.headerText, { color: colors.ink }]}>P</Text>
            </View>

            <View style={[styles.headerCell, styles.statCell]}>
              <Text style={[styles.headerText, { color: colors.ink }]}>W</Text>
            </View>

            <View style={[styles.headerCell, styles.statCell]}>
              <Text style={[styles.headerText, { color: colors.ink }]}>D</Text>
            </View>

            <View style={[styles.headerCell, styles.statCell]}>
              <Text style={[styles.headerText, { color: colors.ink }]}>L</Text>
            </View>

            <TouchableOpacity
              style={[styles.headerCell, styles.statCell]}
              onPress={() => handleSort('points')}
            >
              <Text style={[styles.headerText, { color: colors.ink }]}>Pts</Text>
              {renderSortIcon('points')}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerCell, styles.statCell]}
              onPress={() => handleSort('goalsFor')}
            >
              <Text style={[styles.headerText, { color: colors.ink }]}>GF</Text>
              {renderSortIcon('goalsFor')}
            </TouchableOpacity>

            <View style={[styles.headerCell, styles.statCell]}>
              <Text style={[styles.headerText, { color: colors.ink }]}>GA</Text>
            </View>

            <TouchableOpacity
              style={[styles.headerCell, styles.statCell]}
              onPress={() => handleSort('goalDifference')}
            >
              <Text style={[styles.headerText, { color: colors.ink }]}>GD</Text>
              {renderSortIcon('goalDifference')}
            </TouchableOpacity>

            <View style={[styles.headerCell, styles.formHeaderCell]}>
              <Text style={[styles.headerText, { color: colors.ink }]}>Form</Text>
            </View>
          </View>

          {/* Rows */}
          {sortedStandings.map((standing, index) => (
            <TouchableOpacity
              key={standing.team.id}
              style={[styles.row, { borderBottomColor: colors.border }, index % 2 === 0 && styles.evenRow, index % 2 === 0 && { backgroundColor: colors.background }]}
              onPress={() => onTeamPress?.(standing.team.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.cell, styles.rankCell]}>
                <Text style={[styles.rankText, { color: colors.inkSecondary }]}>{standing.rank}</Text>
              </View>

              <View style={[styles.cell, styles.teamCell]}>
                <Text style={[styles.teamText, { color: colors.ink }]} numberOfLines={1}>
                  {standing.team.name}
                </Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={[styles.statText, { color: colors.inkSecondary }]}>
                  {standing.stats.matchesPlayed}
                </Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={[styles.statText, { color: colors.inkSecondary }]}>{standing.stats.wins}</Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={[styles.statText, { color: colors.inkSecondary }]}>{standing.stats.draws}</Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={[styles.statText, { color: colors.inkSecondary }]}>{standing.stats.losses}</Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={[styles.statText, { color: colors.inkSecondary }, styles.pointsText, { color: colors.cobalt }]}>
                  {standing.stats.points}
                </Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={[styles.statText, { color: colors.inkSecondary }]}>{standing.stats.goalsFor}</Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text style={[styles.statText, { color: colors.inkSecondary }]}>
                  {standing.stats.goalsAgainst}
                </Text>
              </View>

              <View style={[styles.cell, styles.statCell]}>
                <Text
                  style={[
                    styles.statText, { color: colors.inkSecondary },
                    standing.stats.goalDifference > 0 && styles.positiveGD, standing.stats.goalDifference > 0 && { color: colors.cobalt },
                    standing.stats.goalDifference < 0 && styles.negativeGD, standing.stats.goalDifference < 0 && { color: colors.error }]}
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
      <View style={[styles.legend, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Text style={[styles.legendTitle, { color: colors.inkSecondary }]}>Legend:</Text>
        <View style={styles.legendItems}>
          <Text style={[styles.legendItem, { color: colors.inkMuted }]}>P = Played</Text>
          <Text style={[styles.legendItem, { color: colors.inkMuted }]}>W = Wins</Text>
          <Text style={[styles.legendItem, { color: colors.inkMuted }]}>D = Draws</Text>
          <Text style={[styles.legendItem, { color: colors.inkMuted }]}>L = Losses</Text>
          <Text style={[styles.legendItem, { color: colors.inkMuted }]}>Pts = Points</Text>
          <Text style={[styles.legendItem, { color: colors.inkMuted }]}>GF = Goals For</Text>
          <Text style={[styles.legendItem, { color: colors.inkMuted }]}>GA = Goals Against</Text>
          <Text style={[styles.legendItem, { color: colors.inkMuted }]}>GD = Goal Difference</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  table: {
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  evenRow: {},
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
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
  },
  teamText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statText: {
    fontSize: 14,
  },
  pointsText: {
    fontWeight: '700',
  },
  positiveGD: {
    fontWeight: '600',
  },
  negativeGD: {
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
  },
  legend: {
    padding: 12,
    borderTopWidth: 1,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    fontSize: 11,
  },
});
