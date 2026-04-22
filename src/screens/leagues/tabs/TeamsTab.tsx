import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../../components/ui/ErrorDisplay';
import { leagueService } from '../../../services/api/LeagueService';
import { LeagueMembership, Team } from '../../../types';
import { fonts, useTheme } from '../../../theme';

interface TeamsTabProps {
  leagueId: string;
}

export const TeamsTab: React.FC<TeamsTabProps> = ({ leagueId }) => {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [memberships, setMemberships] = useState<LeagueMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadMembers(true);
  }, [leagueId]);

  const loadMembers = async (
    reset: boolean = false,
    forceRefresh: boolean = false
  ) => {
    if (!hasMore && !reset && !forceRefresh) return;

    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else if (reset) {
        setIsLoading(true);
      }
      setError(null);

      const currentPage = reset ? 1 : page;

      const response = await leagueService.getMembers(
        leagueId,
        currentPage,
        20
      );

      const newMemberships = reset
        ? response.data
        : [...memberships, ...response.data];
      setMemberships(newMemberships);
      setPage(currentPage + 1);
      setHasMore(response.pagination.page < response.pagination.totalPages);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load league rosters';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setMemberships([]);
    setHasMore(true);
    loadMembers(true, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadMembers(false);
    }
  };

  const handleRosterPress = (team: Team) => {
    navigation.navigate('TeamDetails', { teamId: team.id });
  };

  /** Format win/loss record; show "0-0" when no completed matches */
  const formatRecord = (membership: LeagueMembership): string => {
    const wins = membership.wins ?? 0;
    const losses = membership.losses ?? 0;
    return `${wins}-${losses}`;
  };

  // Only show active memberships (Requirement 7.3)
  const activeRosterMemberships = memberships.filter(
    m => m.status === 'active' && m.memberType === 'roster'
  );

  const renderRosterRow = ({ item }: { item: LeagueMembership }) => {
    if (!item.team) return null;

    const playerCount = item.team.members?.length ?? 0;
    const record = formatRecord(item);

    return (
      <TouchableOpacity
        style={[styles.rosterRow, { backgroundColor: colors.surface }]}
        onPress={() => handleRosterPress(item.team!)}
        activeOpacity={0.7}
      >
        {/* Roster icon / logo */}
        {item.team.logo ? (
          <Image source={{ uri: item.team.logo }} style={styles.rosterLogo} />
        ) : (
          <View style={[styles.rosterLogoPlaceholder, { backgroundColor: colors.bgCard }]}>
            <Ionicons name="people" size={20} color={colors.cobalt} />
          </View>
        )}

        {/* Name + player count */}
        <View style={styles.rosterInfo}>
          <Text style={[styles.rosterName, { color: colors.ink }]} numberOfLines={1}>
            {item.team.name}
          </Text>
          <Text style={[styles.playerCount, { color: colors.inkFaint }]}>
            {playerCount} {playerCount === 1 ? 'player' : 'players'}
          </Text>
        </View>

        {/* Win / Loss record */}
        <Text style={[styles.record, { color: colors.ink }]}>{record}</Text>

        <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: colors.inkFaint }]}>No rosters in this league yet</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || isRefreshing) return null;

    return (
      <View style={styles.footer}>
        <LoadingSpinner />
      </View>
    );
  };

  if (isLoading && !isRefreshing && memberships.length === 0) {
    return <LoadingSpinner />;
  }

  if (error && !isRefreshing && memberships.length === 0) {
    return <ErrorDisplay message={error} onRetry={() => loadMembers(true)} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      <FlatList
        data={activeRosterMemberships}
        renderItem={renderRosterRow}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.cobalt}
            colors={[colors.cobalt]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
  },
  rosterLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  rosterLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rosterInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rosterName: {
    fontSize: 15,
    fontFamily: fonts.semibold,
  },
  playerCount: {
    fontSize: 13,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  record: {
    fontSize: 15,
    fontFamily: fonts.label,
    marginRight: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: fonts.body,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
