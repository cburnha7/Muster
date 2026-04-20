import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerRanking } from '../../types';
import { useTheme } from '../../theme';

interface PlayerRankingsTableProps {
  rankings: PlayerRanking[];
  onPlayerPress?: (playerId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  style?: any;
}

type SortMetric =
  | 'rank'
  | 'matchesPlayed'
  | 'averageRating'
  | 'performanceScore';

export const PlayerRankingsTable: React.FC<PlayerRankingsTableProps> = ({
  rankings,
  onPlayerPress,
  onLoadMore,
  hasMore = false,
  loading = false,
  style,
}) => {
  const { colors } = useTheme();
  const [sortMetric, setSortMetric] = useState<SortMetric>('rank');
  const [sortAscending, setSortAscending] = useState(false);

  const sortedRankings = React.useMemo(() => {
    const sorted = [...rankings];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortMetric) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'matchesPlayed':
          comparison = b.stats.matchesPlayed - a.stats.matchesPlayed;
          break;
        case 'averageRating':
          comparison = b.stats.averageRating - a.stats.averageRating;
          break;
        case 'performanceScore':
          comparison = b.stats.performanceScore - a.stats.performanceScore;
          break;
      }

      return sortAscending ? -comparison : comparison;
    });

    return sorted;
  }, [rankings, sortMetric, sortAscending]);

  const handleSort = (metric: SortMetric) => {
    if (sortMetric === metric) {
      setSortAscending(!sortAscending);
    } else {
      setSortMetric(metric);
      setSortAscending(false);
    }
  };

  const renderSortIcon = (metric: SortMetric) => {
    if (sortMetric !== metric) {
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

  const renderHeader = () => (
    <View style={[styles.headerRow, { backgroundColor: colors.background, borderBottomColor: colors.cobalt }]}>
      <TouchableOpacity
        style={[styles.headerCell, styles.rankCell]}
        onPress={() => handleSort('rank')}
      >
        <Text style={[styles.headerText, { color: colors.ink }]}>#</Text>
        {renderSortIcon('rank')}
      </TouchableOpacity>

      <View style={[styles.headerCell, styles.playerCell]}>
        <Text style={[styles.headerText, { color: colors.ink }]}>Player</Text>
      </View>

      <View style={[styles.headerCell, styles.teamCell]}>
        <Text style={[styles.headerText, { color: colors.ink }]}>Roster</Text>
      </View>

      <TouchableOpacity
        style={[styles.headerCell, styles.statCell]}
        onPress={() => handleSort('matchesPlayed')}
      >
        <Text style={[styles.headerText, { color: colors.ink }]}>MP</Text>
        {renderSortIcon('matchesPlayed')}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.headerCell, styles.statCell]}
        onPress={() => handleSort('averageRating')}
      >
        <Text style={[styles.headerText, { color: colors.ink }]}>Avg</Text>
        {renderSortIcon('averageRating')}
      </TouchableOpacity>

      <View style={[styles.headerCell, styles.statCell]}>
        <Text style={[styles.headerText, { color: colors.ink }]}>Votes</Text>
      </View>

      <TouchableOpacity
        style={[styles.headerCell, styles.statCell]}
        onPress={() => handleSort('performanceScore')}
      >
        <Text style={[styles.headerText, { color: colors.ink }]}>Score</Text>
        {renderSortIcon('performanceScore')}
      </TouchableOpacity>
    </View>
  );

  const renderRankBadge = (rank: number) => {
    let badgeStyle = styles.rankBadge;
    let iconName: keyof typeof Ionicons.glyphMap = 'trophy-outline';

    if (rank === 1) {
      badgeStyle = [styles.rankBadge, styles.goldBadge];
      iconName = 'trophy';
    } else if (rank === 2) {
      badgeStyle = [styles.rankBadge, styles.silverBadge];
      iconName = 'trophy';
    } else if (rank === 3) {
      badgeStyle = [styles.rankBadge, styles.bronzeBadge];
      iconName = 'trophy';
    }

    return (
      <View style={badgeStyle}>
        {rank <= 3 && (
          <Ionicons name={iconName} size={12} color={colors.white} />
        )}
        <Text style={[styles.rankText, { color: colors.white }]}>{rank}</Text>
      </View>
    );
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: PlayerRanking;
    index: number;
  }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }, index % 2 === 0 && styles.evenRow, index % 2 === 0 && { backgroundColor: colors.background }]}
      onPress={() => onPlayerPress?.(item.player.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.cell, styles.rankCell]}>
        {renderRankBadge(item.rank)}
      </View>

      <View style={[styles.cell, styles.playerCell]}>
        <Text style={[styles.playerName, { color: colors.ink }]} numberOfLines={1}>
          {item.player.firstName} {item.player.lastName}
        </Text>
      </View>

      <View style={[styles.cell, styles.teamCell]}>
        <Text style={[styles.teamText, { color: colors.inkSecondary }]} numberOfLines={1}>
          {item.team.name}
        </Text>
      </View>

      <View style={[styles.cell, styles.statCell]}>
        <Text style={[styles.statText, { color: colors.inkSecondary }]}>{item.stats.matchesPlayed}</Text>
      </View>

      <View style={[styles.cell, styles.statCell]}>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={12} color={colors.gold} />
          <Text style={[styles.ratingText, { color: colors.gold }]}>
            {item.stats.averageRating.toFixed(1)}
          </Text>
        </View>
      </View>

      <View style={[styles.cell, styles.statCell]}>
        <Text style={[styles.statText, { color: colors.inkSecondary }]}>{item.stats.totalVotes}</Text>
      </View>

      <View style={[styles.cell, styles.statCell]}>
        <Text style={[styles.statText, { color: colors.inkSecondary }, styles.scoreText, { color: colors.cobalt }]}>
          {item.stats.performanceScore.toFixed(0)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={onLoadMore}
        disabled={loading}
      >
        {loading ? (
          <Text style={[styles.loadMoreText, { color: colors.cobalt }]}>Loading...</Text>
        ) : (
          <>
            <Text style={[styles.loadMoreText, { color: colors.cobalt }]}>Load More</Text>
            <Ionicons name="chevron-down" size={16} color={colors.cobalt} />
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={48} color={colors.inkMuted} />
      <Text style={[styles.emptyText, { color: colors.inkSecondary }]}>No player rankings yet</Text>
      <Text style={[styles.emptySubtext, { color: colors.inkMuted }]}>
        Rankings will appear after matches are played
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.white }, style]}>
      <FlatList
        data={sortedRankings}
        renderItem={renderItem}
        keyExtractor={item => item.player.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
      />

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Text style={[styles.legendTitle, { color: colors.inkSecondary }]}>Legend:</Text>
        <View style={styles.legendItems}>
          <Text style={[styles.legendItem, { color: colors.inkMuted }]}>MP = Matches Played</Text>
          <Text style={[styles.legendItem, { color: colors.inkMuted }]}>Avg = Average Rating</Text>
          <Text style={[styles.legendItem, { color: colors.inkMuted }]}>Votes = Total Votes Received</Text>
          <Text style={[styles.legendItem, { color: colors.inkMuted }]}>Score = Performance Score</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    width: 50,
  },
  playerCell: {
    flex: 2,
    alignItems: 'flex-start',
  },
  teamCell: {
    flex: 1.5,
    alignItems: 'flex-start',
  },
  statCell: {
    width: 60,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    minWidth: 36,
  },
  goldBadge: {},
  silverBadge: {},
  bronzeBadge: {},
  rankText: {
    fontSize: 13,
    fontWeight: '700',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  teamText: {
    fontSize: 13,
  },
  statText: {
    fontSize: 14,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreText: {
    fontWeight: '700',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
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
