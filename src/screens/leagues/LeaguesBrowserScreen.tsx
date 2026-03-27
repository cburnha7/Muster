import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LeagueCard } from '../../components/ui/LeagueCard';
import { SearchBar, SearchBarHandle } from '../../components/ui/SearchBar';
import { CollapsibleSection } from '../../components/ui/CollapsibleSection';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { colors, fonts, Spacing } from '../../theme';
import { leagueService } from '../../services/api/LeagueService';
import { userService } from '../../services/api/UserService';
import { selectUser } from '../../store/slices/authSlice';
import { selectActiveUserId } from '../../store/slices/contextSlice';
import { SportType } from '../../types';
import { useDependentContext } from '../../hooks/useDependentContext';

// Use a flexible type since data comes from multiple API sources with different shapes
type LeagueItem = any;

interface Section {
  title: string;
  data: LeagueItem[];
  emptyMessage: string;
}

export const LeaguesBrowserScreen: React.FC = () => {
  const navigation = useNavigation();
  const currentUser = useSelector(selectUser);
  const activeUserId = useSelector(selectActiveUserId);
  const { isDependent } = useDependentContext();

  const [myLeagues, setMyLeagues] = useState<LeagueItem[]>([]);
  const [publicLeagues, setPublicLeagues] = useState<LeagueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchBarRef = useRef<SearchBarHandle>(null);

  useEffect(() => {
    const unsub = require('../../utils/searchEventBus').searchEventBus.subscribeTab('Leagues', () => {
      searchBarRef.current?.focus();
    });
    return unsub;
  }, []);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sportFilter, setSportFilter] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>();

  const loadData = useCallback(async () => {
    try {
      // Clear cached responses so the active user's data is fetched fresh
      await userService.clearCache();
      await leagueService.clearCache();

      const [myRes, allRes] = await Promise.all([
        userService.getUserLeagues(),
        leagueService.getLeagues({}, 1, 100),
      ]);

      const myLeagueList: LeagueItem[] = myRes ?? [];
      const myLeagueIds = new Set(myLeagueList.map((l: any) => l.id));

      setMyLeagues(myLeagueList);
      // Public leagues: visibility is public, user is not already a member
      setPublicLeagues(
        (allRes?.data ?? []).filter(
          (l: any) => (l.visibility === 'public' || !l.visibility) && !myLeagueIds.has(l.id)
        )
      );
    } catch (err: any) {
      console.error('Error loading leagues:', err);
      setError(err.message || 'Failed to load leagues');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeUserId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Re-fetch when active user context changes (guardian ↔ dependent)
  React.useEffect(() => {
    setMyLeagues([]);
    setPublicLeagues([]);
    setLoading(true);
    loadData();
  }, [activeUserId]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleLeaguePress = (league: LeagueItem) => {
    (navigation as any).navigate('LeagueDetails', { leagueId: league.id });
  };

  const handleCreateLeague = () => {
    (navigation as any).navigate('CreateLeague');
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const applyFilters = (leagues: LeagueItem[]) => {
    let filtered = leagues;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((l) => l.name.toLowerCase().includes(q));
    }
    if (sportFilter) {
      filtered = filtered.filter((l) => l.sportType === sportFilter);
    }
    if (activeFilter !== undefined) {
      filtered = filtered.filter((l) => l.isActive === activeFilter);
    }
    return filtered;
  };

  const sections: Section[] = [
    {
      title: 'My Leagues',
      data: [...applyFilters(myLeagues)].sort((a, b) => a.name.localeCompare(b.name)),
      emptyMessage: searchQuery ? 'No matching leagues' : 'You\'re not part of any leagues yet',
    },
    {
      title: 'Public Leagues',
      data: [...applyFilters(publicLeagues)].sort((a, b) => a.name.localeCompare(b.name)),
      emptyMessage: searchQuery ? 'No matching public leagues' : 'No public leagues available',
    },
  ];

  const activeFiltersCount = (sportFilter ? 1 : 0) + (activeFilter !== undefined ? 1 : 0);

  if (error && !myLeagues.length && !publicLeagues.length) {
    return (
      <View style={styles.container}>
        <ErrorDisplay message={error} onRetry={loadData} />
      </View>
    );
  }

  if (loading && !refreshing && !myLeagues.length && !publicLeagues.length) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
                <LeagueCard
                  key={item.id}
                  league={item}
                  onPress={handleLeaguePress}
                  isOwner={item.organizerId === currentUser?.id}
                />
              ))
            )}
          </CollapsibleSection>
        ))}
      </ScrollView>

      {/* FAB — hidden for dependents */}
      {!isDependent && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateLeague}>
          <Ionicons name="add" size={28} color={colors.chalk} />
        </TouchableOpacity>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => { setSportFilter(undefined); setActiveFilter(undefined); setShowFilterModal(false); }}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sport Type</Text>
              <View style={styles.optionsContainer}>
                {Object.values(SportType).map((sport) => (
                  <TouchableOpacity
                    key={sport}
                    style={[styles.optionButton, sportFilter === sport && styles.optionButtonActive]}
                    onPress={() => setSportFilter(sportFilter === sport ? undefined : sport)}
                  >
                    <Text style={[styles.optionText, sportFilter === sport && styles.optionTextActive]}>
                      {sport.charAt(0).toUpperCase() + sport.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[styles.optionButton, activeFilter === true && styles.optionButtonActive]}
                  onPress={() => setActiveFilter(activeFilter === true ? undefined : true)}
                >
                  <Text style={[styles.optionText, activeFilter === true && styles.optionTextActive]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, activeFilter === false && styles.optionButtonActive]}
                  onPress={() => setActiveFilter(activeFilter === false ? undefined : false)}
                >
                  <Text style={[styles.optionText, activeFilter === false && styles.optionTextActive]}>Inactive</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilterModal(false)}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

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
  filterButton: {
    padding: Spacing.sm,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.heart,
  },
  listContent: {
    flexGrow: 1,
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.inkFaint,
  },
  cancelText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.navy,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
  },
  resetText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.heart,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  filterSection: {
    marginVertical: Spacing.lg,
  },
  filterSectionTitle: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inkFaint,
    backgroundColor: colors.cream,
  },
  optionButtonActive: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  optionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  optionTextActive: {
    color: colors.chalk,
  },
  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.inkFaint,
  },
  applyButton: {
    backgroundColor: colors.pine,
    borderRadius: 8,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  applyText: {
    fontFamily: fonts.ui,
    color: colors.chalk,
    fontSize: 16,
  },
});
