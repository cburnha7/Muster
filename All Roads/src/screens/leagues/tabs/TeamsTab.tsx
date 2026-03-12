import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TeamCard } from '../../../components/ui/TeamCard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../../components/ui/ErrorDisplay';
import { leagueService } from '../../../services/api/LeagueService';
import { LeagueMembership, Team } from '../../../types';
import { colors } from '../../../theme';

interface TeamsTabProps {
  leagueId: string;
}

export const TeamsTab: React.FC<TeamsTabProps> = ({ leagueId }) => {
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

  const loadMembers = async (reset: boolean = false, forceRefresh: boolean = false) => {
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
      
      const newMemberships = reset ? response.data : [...memberships, ...response.data];
      setMemberships(newMemberships);
      setPage(currentPage + 1);
      setHasMore(response.pagination.page < response.pagination.totalPages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load league members';
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

  const handleTeamPress = (team: Team) => {
    navigation.navigate('TeamDetails', { teamId: team.id });
  };

  const renderTeamCard = ({ item }: { item: LeagueMembership }) => {
    if (!item.team) return null;
    
    return (
      <TeamCard
        team={item.team}
        onPress={handleTeamPress}
      />
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No teams in this league yet</Text>
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
    <View style={styles.container}>
      <FlatList
        data={memberships}
        renderItem={renderTeamCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.grass}
            colors={[colors.grass]}
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
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
