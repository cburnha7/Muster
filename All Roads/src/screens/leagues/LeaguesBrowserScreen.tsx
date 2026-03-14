import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { LeagueCard } from '../../components/ui/LeagueCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { FloatingActionButton } from '../../components/navigation/FloatingActionButton';
import { colors, Spacing } from '../../theme';
import { leagueService } from '../../services/api/LeagueService';
import {
  setLeagues,
  appendLeagues,
  setLoading,
  setLoadingMore,
  setError,
  setFilters,
  clearFilters,
  selectLeagues,
  selectIsLoading,
  selectIsLoadingMore,
  selectError,
  selectFilters,
  selectPagination,
} from '../../store/slices/leaguesSlice';
import { League, LeagueFilters, SportType } from '../../types';

export const LeaguesBrowserScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  // Redux state
  const leagues = useSelector(selectLeagues);
  const isLoading = useSelector(selectIsLoading);
  const isLoadingMore = useSelector(selectIsLoadingMore);
  const error = useSelector(selectError);
  const filters = useSelector(selectFilters);
  const pagination = useSelector(selectPagination);

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [localFilters, setLocalFilters] = useState<LeagueFilters>(filters);

  // Load leagues on mount and when filters change
  useEffect(() => {
    loadLeagues(true);
  }, [filters]);

  // Load leagues function
  const loadLeagues = async (refresh: boolean = false) => {
    try {
      if (refresh) {
        dispatch(setLoading(true));
      } else {
        dispatch(setLoadingMore(true));
      }

      const page = refresh ? 1 : pagination.page + 1;
      const queryFilters: LeagueFilters = { ...filters };
      if (searchQuery) {
        queryFilters.search = searchQuery;
      }

      const response = await leagueService.getLeagues(
        queryFilters,
        page,
        pagination.limit
      );

      if (refresh) {
        dispatch(setLeagues(response));
      } else {
        dispatch(appendLeagues(response));
      }
    } catch (err: any) {
      dispatch(setError(err.message || 'Failed to load leagues'));
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadLeagues(true);
  }, [filters, searchQuery]);

  // Handle load more (infinite scroll)
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && pagination.page < pagination.totalPages) {
      loadLeagues(false);
    }
  }, [isLoadingMore, pagination]);

  // Handle search
  const handleSearch = useCallback(() => {
    loadLeagues(true);
  }, [searchQuery, filters]);

  // Handle filter apply
  const handleFilterApply = () => {
    dispatch(setFilters(localFilters));
    setShowFilterModal(false);
  };

  // Handle filter reset
  const handleFilterReset = () => {
    const resetFilters: LeagueFilters = {};
    setLocalFilters(resetFilters);
    dispatch(clearFilters());
    setShowFilterModal(false);
  };

  // Handle league press
  const handleLeaguePress = (league: League) => {
    (navigation as any).navigate('LeagueDetails', { leagueId: league.id });
  };

  // Handle create league
  const handleCreateLeague = () => {
    (navigation as any).navigate('CreateLeague');
  };

  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.sportType) count++;
    if (filters.isCertified !== undefined) count++;
    if (filters.isActive !== undefined) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  // Render league item
  const renderLeagueItem = ({ item }: { item: League }) => (
    <LeagueCard league={item} onPress={handleLeaguePress} />
  );

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trophy-outline" size={64} color={colors.soft} />
        <Text style={styles.emptyTitle}>No Leagues Found</Text>
        <Text style={styles.emptyText}>
          {searchQuery || activeFiltersCount > 0
            ? 'Try adjusting your search or filters'
            : 'Be the first to create a league!'}
        </Text>
        {(searchQuery || activeFiltersCount > 0) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSearchQuery('');
              dispatch(clearFilters());
            }}
          >
            <Text style={styles.clearButtonText}>Clear Search & Filters</Text>
          </TouchableOpacity>
        )}
        {!searchQuery && activeFiltersCount === 0 && (
          <TouchableOpacity
            style={styles.createLeagueButton}
            onPress={handleCreateLeague}
          >
            <Text style={styles.createLeagueButtonText}>Create League</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render footer (loading indicator for pagination)
  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.grass} />
      </View>
    );
  };

  // Render error state
  if (error && !isLoading && leagues.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.track} />
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <SearchBar
        placeholder="Search leagues..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSearch={handleSearch}
      />

      {/* Filter Bar */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons
            name="filter-outline"
            size={20}
            color={activeFiltersCount > 0 ? colors.chalk : colors.ink}
          />
          <Text
            style={[
              styles.filterButtonText,
              activeFiltersCount > 0 && styles.filterButtonTextActive,
            ]}
          >
            Filters
          </Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateLeague}
        >
          <Ionicons name="add" size={20} color={colors.grass} />
        </TouchableOpacity>
      </View>

      {/* Leagues List */}
      <FlatList
        data={leagues}
        renderItem={renderLeagueItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
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

      {/* Create League FAB */}
      <FloatingActionButton
        icon="add"
        onPress={handleCreateLeague}
        backgroundColor={colors.grass}
      />

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
            <TouchableOpacity onPress={handleFilterReset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Sport Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Sport Type</Text>
              <View style={styles.optionsContainer}>
                {Object.values(SportType).map((sport) => (
                  <TouchableOpacity
                    key={sport}
                    style={[
                      styles.optionButton,
                      localFilters.sportType === sport && styles.optionButtonActive,
                    ]}
                    onPress={() => {
                      const newFilters = { ...localFilters };
                      if (localFilters.sportType === sport) {
                        delete newFilters.sportType;
                      } else {
                        newFilters.sportType = sport;
                      }
                      setLocalFilters(newFilters);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        localFilters.sportType === sport && styles.optionTextActive,
                      ]}
                    >
                      {sport.charAt(0).toUpperCase() + sport.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Certification Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Certification Status</Text>
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    localFilters.isCertified === true && styles.optionButtonActive,
                  ]}
                  onPress={() => {
                    const newFilters = { ...localFilters };
                    if (localFilters.isCertified === true) {
                      delete newFilters.isCertified;
                    } else {
                      newFilters.isCertified = true;
                    }
                    setLocalFilters(newFilters);
                  }}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color={
                      localFilters.isCertified === true ? colors.chalk : colors.court
                    }
                    style={styles.optionIcon}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      localFilters.isCertified === true && styles.optionTextActive,
                    ]}
                  >
                    Certified Only
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Season Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Season Status</Text>
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    localFilters.isActive === true && styles.optionButtonActive,
                  ]}
                  onPress={() => {
                    const newFilters = { ...localFilters };
                    if (localFilters.isActive === true) {
                      delete newFilters.isActive;
                    } else {
                      newFilters.isActive = true;
                    }
                    setLocalFilters(newFilters);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      localFilters.isActive === true && styles.optionTextActive,
                    ]}
                  >
                    Active Only
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    localFilters.isActive === false && styles.optionButtonActive,
                  ]}
                  onPress={() => {
                    const newFilters = { ...localFilters };
                    if (localFilters.isActive === false) {
                      delete newFilters.isActive;
                    } else {
                      newFilters.isActive = false;
                    }
                    setLocalFilters(newFilters);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      localFilters.isActive === false && styles.optionTextActive,
                    ]}
                  >
                    Inactive Only
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.applyButton} onPress={handleFilterApply}>
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
    backgroundColor: colors.chalk,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.chalk,
    borderWidth: 1,
    borderColor: colors.soft,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  filterButtonActive: {
    backgroundColor: colors.grass,
    borderColor: colors.grass,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.ink,
    marginLeft: Spacing.sm,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.chalk,
  },
  filterBadge: {
    backgroundColor: colors.court,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  filterBadgeText: {
    color: colors.chalk,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: colors.soft,
    textAlign: 'center',
    lineHeight: 24,
  },
  clearButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.grass,
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.chalk,
  },
  createLeagueButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: colors.grass,
    borderRadius: 8,
  },
  createLeagueButtonText: {
    color: colors.chalk,
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.chalk,
    borderWidth: 1,
    borderColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: colors.chalk,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 16,
    color: colors.soft,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.grass,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.chalk,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.soft,
  },
  cancelText: {
    fontSize: 16,
    color: colors.sky,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  resetText: {
    fontSize: 16,
    color: colors.track,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  filterSection: {
    marginVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: Spacing.md,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.chalk,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.soft,
  },
  optionButtonActive: {
    backgroundColor: colors.grass,
    borderColor: colors.grass,
  },
  optionIcon: {
    marginRight: Spacing.xs,
  },
  optionText: {
    fontSize: 14,
    color: colors.ink,
  },
  optionTextActive: {
    color: colors.chalk,
    fontWeight: '500',
  },
  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.soft,
  },
  applyButton: {
    backgroundColor: colors.grass,
    borderRadius: 8,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  applyText: {
    color: colors.chalk,
    fontSize: 16,
    fontWeight: '600',
  },
});
