import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerRanking } from '../../types';
import { colors } from '../../theme';

interface PlayerRankingsTableProps {
  rankings: PlayerRanking[];
  onPlayerPress?: (playerId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  style?: any;
}

type SortMetric = 'rank' | 'matchesPlayed' | 'averageRating' | 'performanceScore';

export const PlayerRankingsTable: React.FC<PlayerRankingsTableProps> = ({ 
  rankings,
  onPlayerPress,
  onLoadMore,
  hasMore = false,
  loading = false,
  style 
}) => {
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
      return <Ionicons name="swap-vertical-outline" size={14} color="#999" />;
    }
    return (
      <Ionicons 
        name={sortAscending ? 'arrow-up' : 'arrow-down'} 
        size={14} 
        color={colors.pine} 
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <TouchableOpacity 
        style={[styles.headerCell, styles.rankCell]}
        onPress={() => handleSort('rank')}
      >
        <Text style={styles.headerText}>#</Text>
        {renderSortIcon('rank')}
      </TouchableOpacity>
      
      <View style={[styles.headerCell, styles.playerCell]}>
        <Text style={styles.headerText}>Player</Text>
      </View>
      
      <View style={[styles.headerCell, styles.teamCell]}>
        <Text style={styles.headerText}>Roster</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.headerCell, styles.statCell]}
        onPress={() => handleSort('matchesPlayed')}
      >
        <Text style={styles.headerText}>MP</Text>
        {renderSortIcon('matchesPlayed')}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.headerCell, styles.statCell]}
        onPress={() => handleSort('averageRating')}
      >
        <Text style={styles.headerText}>Avg</Text>
        {renderSortIcon('averageRating')}
      </TouchableOpacity>
      
      <View style={[styles.headerCell, styles.statCell]}>
        <Text style={styles.headerText}>Votes</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.headerCell, styles.statCell]}
        onPress={() => handleSort('performanceScore')}
      >
        <Text style={styles.headerText}>Score</Text>
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
        {rank <= 3 && <Ionicons name={iconName} size={12} color="#FFFFFF" />}
        <Text style={styles.rankText}>{rank}</Text>
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: PlayerRanking; index: number }) => (
    <TouchableOpacity
      style={[
        styles.row,
        index % 2 === 0 && styles.evenRow,
      ]}
      onPress={() => onPlayerPress?.(item.player.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.cell, styles.rankCell]}>
        {renderRankBadge(item.rank)}
      </View>
      
      <View style={[styles.cell, styles.playerCell]}>
        <Text style={styles.playerName} numberOfLines={1}>
          {item.player.firstName} {item.player.lastName}
        </Text>
      </View>
      
      <View style={[styles.cell, styles.teamCell]}>
        <Text style={styles.teamText} numberOfLines={1}>
          {item.team.name}
        </Text>
      </View>
      
      <View style={[styles.cell, styles.statCell]}>
        <Text style={styles.statText}>{item.stats.matchesPlayed}</Text>
      </View>
      
      <View style={[styles.cell, styles.statCell]}>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={12} color={colors.court} />
          <Text style={styles.ratingText}>
            {item.stats.averageRating.toFixed(1)}
          </Text>
        </View>
      </View>
      
      <View style={[styles.cell, styles.statCell]}>
        <Text style={styles.statText}>{item.stats.totalVotes}</Text>
      </View>
      
      <View style={[styles.cell, styles.statCell]}>
        <Text style={[styles.statText, styles.scoreText]}>
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
          <Text style={styles.loadMoreText}>Loading...</Text>
        ) : (
          <>
            <Text style={styles.loadMoreText}>Load More</Text>
            <Ionicons name="chevron-down" size={16} color={colors.pine} />
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={48} color="#CCC" />
      <Text style={styles.emptyText}>No player rankings yet</Text>
      <Text style={styles.emptySubtext}>
        Rankings will appear after matches are played
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={sortedRankings}
        renderItem={renderItem}
        keyExtractor={(item) => item.player.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
      />

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend:</Text>
        <View style={styles.legendItems}>
          <Text style={styles.legendItem}>MP = Matches Played</Text>
          <Text style={styles.legendItem}>Avg = Average Rating</Text>
          <Text style={styles.legendItem}>Votes = Total Votes Received</Text>
          <Text style={styles.legendItem}>Score = Performance Score</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 2,
    borderBottomColor: colors.pine,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  evenRow: {
    backgroundColor: '#F9FAFB',
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
    color: '#333',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    minWidth: 36,
  },
  goldBadge: {
    backgroundColor: '#FFD700',
  },
  silverBadge: {
    backgroundColor: '#C0C0C0',
  },
  bronzeBadge: {
    backgroundColor: '#CD7F32',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  teamText: {
    fontSize: 13,
    color: '#666',
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.court,
  },
  scoreText: {
    fontWeight: '700',
    color: colors.pine,
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
    color: colors.pine,
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
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  legend: {
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    fontSize: 11,
    color: '#999',
  },
});
