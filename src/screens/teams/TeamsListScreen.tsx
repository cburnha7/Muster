import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, Spacing } from '../../theme';
import { SearchBar } from '../../components/ui/SearchBar';
import { TeamCard } from '../../components/ui/TeamCard';
import { CollapsibleSection } from '../../components/ui/CollapsibleSection';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { teamService } from '../../services/api/TeamService';
import { userService } from '../../services/api/UserService';
import { setUserTeams } from '../../store/slices/teamsSlice';
import { Team } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface Section {
  title: string;
  data: Team[];
  emptyMessage: string;
}

export function TeamsListScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useAuth();

  const [myRosters, setMyRosters] = useState<Team[]>([]);
  const [publicRosters, setPublicRosters] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [myRes, allRes] = await Promise.all([
        userService.getUserTeams(),
        teamService.getTeams({}, { page: 1, limit: 100 }),
      ]);

      const myTeams = myRes?.data ?? [];
      const myTeamIds = new Set(myTeams.map((t) => t.id));

      setMyRosters([...myTeams]);
      dispatch(setUserTeams(myTeams));
      // Public rosters: public, user is not a member, exclude private
      setPublicRosters(
        (allRes?.data ?? []).filter((t) => t.isPublic && !myTeamIds.has(t.id))
      );
    } catch (err: any) {
      console.error('Error loading rosters:', err);
      setError(err.message || 'Failed to load rosters');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleTeamPress = (team: Team) => {
    (navigation as any).navigate('TeamDetails', { teamId: team.id });
  };

  const handleCreateTeam = () => {
    (navigation as any).navigate('CreateTeam');
  };

  const handleJoinTeam = () => {
    (navigation as any).navigate('JoinTeam');
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadData();
      return;
    }
    try {
      setLoading(true);
      const response = await teamService.searchTeams(query, {}, { page: 1, limit: 50 });
      const myRes = await userService.getUserTeams();
      const myTeamIds = new Set((myRes?.data ?? []).map((t) => t.id));
      const myTeamsList = myRes?.data ?? [];
      dispatch(setUserTeams(myTeamsList));
      const results = response.results ?? [];
      setMyRosters(myTeamsList.filter((t) =>
        t.name.toLowerCase().includes(query.toLowerCase())
      ));
      setPublicRosters(results.filter((t) => t.isPublic && !myTeamIds.has(t.id)));
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const filterBySearch = (teams: Team[]) => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase();
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  };

  const sections: Section[] = [
    {
      title: 'My Rosters',
      data: [...filterBySearch(myRosters)].sort((a, b) => a.name.localeCompare(b.name)),
      emptyMessage: searchQuery ? 'No matching rosters' : 'You haven\'t joined any rosters yet',
    },
    {
      title: 'Public Rosters',
      data: [...filterBySearch(publicRosters)].sort((a, b) => a.name.localeCompare(b.name)),
      emptyMessage: searchQuery ? 'No matching public rosters' : 'No public rosters available',
    },
  ];

  if (error && !myRosters.length && !publicRosters.length) {
    return (
      <View style={styles.container}>
        <ErrorDisplay message={error} onRetry={loadData} />
      </View>
    );
  }

  if (loading && !refreshing && !myRosters.length && !publicRosters.length) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSearch={handleSearch}
          placeholder="Search rosters..."
          style={styles.searchBar}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pine} />
        }
      >
        {sections.map((section) => (
          <CollapsibleSection
            key={section.title}
            title={section.title}
            count={section.data.length}
          >
            {section.data.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>{section.emptyMessage}</Text>
              </View>
            ) : (
              section.data.map((item) => (
                <TeamCard
                  key={item.id}
                  team={item}
                  onPress={() => handleTeamPress(item)}
                  currentUserId={user?.id ?? undefined}
                />
              ))
            )}
          </CollapsibleSection>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateTeam}>
        <Ionicons name="add" size={28} color={colors.chalk} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.joinButton} onPress={handleJoinTeam}>
        <Text style={styles.joinButtonText}>Join with Code</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: colors.cream,
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptySection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptySectionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.pine,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  joinButton: {
    position: 'absolute',
    bottom: 84,
    right: 16,
    backgroundColor: colors.pine,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 24,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  joinButtonText: {
    fontFamily: fonts.ui,
    color: colors.chalk,
    fontSize: 14,
  },
});
