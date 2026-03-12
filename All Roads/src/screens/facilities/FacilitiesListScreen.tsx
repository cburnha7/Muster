import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { debounce, getOptimalBatchSize, getOptimalWindowSize } from '../../utils/performance';
import { SearchBar } from '../../components/ui/SearchBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { facilityService } from '../../services/api/FacilityService';
import { colors, Spacing, TextStyles } from '../../theme';
import {
  setFacilities,
  appendFacilities,
  setLoading,
  setLoadingMore,
  setError,
  setFilters,
  clearFilters,
  selectFacilities,
  selectFacilityFilters,
  selectFacilitiesPagination,
  selectFacilitiesLoading,
  selectFacilitiesLoadingMore,
  selectFacilitiesError,
} from '../../store/slices/facilitiesSlice';
import { useAuth } from '../../context/AuthContext';
import { Facility, SportType, FacilityFilters } from '../../types';
import { useRoute, useFocusEffect } from '@react-navigation/native';

export function FacilitiesListScreen(): JSX.Element {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const route = useRoute();

  const facilities = useSelector(selectFacilities);
  const filters = useSelector(selectFacilityFilters);
  const pagination = useSelector(selectFacilitiesPagination);
  const isLoading = useSelector(selectFacilitiesLoading);
  const isLoadingMore = useSelector(selectFacilitiesLoadingMore);
  const error = useSelector(selectFacilitiesError);
  
  const { user: currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<FacilityFilters>(filters);
  
  // Track last load time with a ref to avoid triggering re-renders
  const lastLoadTimeRef = React.useRef<number>(0);

  useEffect(() => {
    loadFacilities();
  }, [filters]);

  // Watch for refresh parameter from navigation
  useEffect(() => {
    const params = route.params as any;
    const refreshTimestamp = params?.refresh;
    
    if (refreshTimestamp) {
      console.log('🔄 Force refresh triggered at:', refreshTimestamp);
      lastLoadTimeRef.current = 0; // Reset cache
      // Force reload by adding cache-busting parameter
      loadFacilities(true);
    }
  }, [(route.params as any)?.refresh]); // Watch the specific refresh value

  // Reload facilities when screen comes into focus, but only if data is stale (>5 seconds old)
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      const hasFacilities = facilities.length > 0;
      
      // Only reload if more than 5 seconds since last load or no facilities
      if (timeSinceLastLoad > 5000 || !hasFacilities) {
        console.log('🔄 Reloading facilities (stale or empty)');
        loadFacilities();
      } else {
        console.log('✅ Using cached facilities (fresh data, loaded', Math.round(timeSinceLastLoad / 1000), 'seconds ago)');
      }
    }, [filters])
  );

  const loadFacilities = async (forceRefresh = false) => {
    try {
      dispatch(setLoading(true));
      const response = await facilityService.getFacilities(
        forceRefresh ? { ...filters, _t: Date.now() } : filters,
        {
          page: 1,
          limit: pagination.limit,
        }
      );
      dispatch(setFacilities(response));
      lastLoadTimeRef.current = Date.now();
    } catch (err: any) {
      dispatch(setError(err.message || 'Failed to load facilities'));
    }
  };

  const loadMoreFacilities = async () => {
    if (isLoadingMore || pagination.page >= pagination.totalPages) {
      return;
    }

    try {
      dispatch(setLoadingMore(true));
      const nextPage = pagination.page + 1;
      const response = await facilityService.getFacilities(filters, {
        page: nextPage,
        limit: pagination.limit,
      });
      dispatch(appendFacilities(response));
    } catch (err: any) {
      dispatch(setError(err.message || 'Failed to load more facilities'));
    }
  };

  const debouncedSearch = useMemo(
    () => debounce(async (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        try {
          dispatch(setLoading(true));
          const response = await facilityService.searchFacilities(query, filters, {
            page: 1,
            limit: pagination.limit,
          });
          dispatch(setFacilities({
            data: response.results,
            pagination: {
              page: 1,
              limit: pagination.limit,
              total: response.total,
              totalPages: Math.ceil(response.total / pagination.limit),
            },
          }));
        } catch (err: any) {
          dispatch(setError(err.message || 'Search failed'));
        }
      } else {
        loadFacilities();
      }
    }, 300),
    [filters, pagination.limit, loadFacilities, dispatch]
  );

  const handleSearch = useCallback((query: string) => {
    debouncedSearch(query);
  }, [debouncedSearch]);

  const handleFacilityPress = (facility: Facility) => {
    // If user is the owner, navigate to EditFacility screen
    if (currentUser && facility.ownerId === currentUser.id) {
      navigation.navigate('EditFacility' as never, { facilityId: facility.id } as never);
    } else {
      // Otherwise, navigate to FacilityDetails screen
      navigation.navigate('FacilityDetails' as never, { facilityId: facility.id } as never);
    }
  };

  const handleCreateFacility = () => {
    navigation.navigate('CreateFacility' as never);
  };

  const handleApplyFilters = () => {
    dispatch(setFilters(localFilters));
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    dispatch(clearFilters());
    setShowFilters(false);
  };

  const renderFacilityItem = useCallback(({ item, index }: { item: Facility; index: number }) => (
    <TouchableOpacity
      style={styles.facilityCard}
      onPress={() => handleFacilityPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>{index + 1}</Text>
      </View>
      
      <View style={styles.facilityContent}>
        <View style={styles.facilityHeader}>
          <Text style={styles.facilityName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.ownerId === currentUser?.id && (
            <View style={styles.ownerBadge}>
              <Ionicons name="star" size={12} color={colors.court} />
              <Text style={styles.ownerText}>Your Ground</Text>
            </View>
          )}
        </View>
        
        <View style={styles.facilityInfo}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.facilityAddress} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
        
        {item.sportTypes && item.sportTypes.length > 0 && (
          <View style={styles.sportTypes}>
            {item.sportTypes.slice(0, 3).map((sport, idx) => (
              <View key={idx} style={styles.sportTag}>
                <Text style={styles.sportTagText}>
                  {sport.charAt(0).toUpperCase() + sport.slice(1)}
                </Text>
              </View>
            ))}
            {item.sportTypes.length > 3 && (
              <Text style={styles.moreText}>+{item.sportTypes.length - 3}</Text>
            )}
          </View>
        )}
        
        <View style={styles.facilityFooter}>
          {item.rating && (
            <View style={styles.rating}>
              <Ionicons name="star" size={14} color={colors.court} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
          {item.distance && (
            <Text style={styles.distance}>{item.distance.toFixed(1)} km away</Text>
          )}
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  ), [handleFacilityPress, currentUser]);

  const keyExtractor = useCallback((item: Facility) => item.id, []);

  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyState}>
        <Ionicons name="map-outline" size={64} color={colors.soft} />
        <Text style={styles.emptyTitle}>No Grounds Found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery
            ? 'Try adjusting your search or filters'
            : 'Be the first to add a ground'}
        </Text>
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Grounds</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            <Text style={styles.filterLabel}>Sport Type</Text>
            <View style={styles.sportTypeContainer}>
              {Object.values(SportType).map((sport) => {
                const isSelected = localFilters.sportTypes?.includes(sport);
                return (
                  <TouchableOpacity
                    key={sport}
                    style={[styles.sportChip, isSelected && styles.sportChipSelected]}
                    onPress={() => {
                      const currentSports = localFilters.sportTypes || [];
                      const newSports = isSelected
                        ? currentSports.filter((s) => s !== sport)
                        : [...currentSports, sport];
                      setLocalFilters({ ...localFilters, sportTypes: newSports });
                    }}
                  >
                    <Text
                      style={[styles.sportChipText, isSelected && styles.sportChipTextSelected]}
                    >
                      {sport.charAt(0).toUpperCase() + sport.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderMapPlaceholder = () => (
    <View style={styles.mapContainer}>
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map" size={48} color={colors.soft} />
        <Text style={styles.mapPlaceholderText}>Map view coming soon</Text>
        <Text style={styles.mapPlaceholderSubtext}>
          Pins will correlate with numbers below
        </Text>
      </View>
    </View>
  );

  if (error && !facilities.length) {
    return (
      <View style={styles.container}>
        <ErrorDisplay message={error} onRetry={loadFacilities} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSearch={handleSearch}
          placeholder="Search grounds..."
          style={styles.searchBar}
        />
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Ionicons name="filter" size={24} color={colors.grass} />
          {Object.keys(filters).length > 0 && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      {isLoading && !facilities.length ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={facilities}
          renderItem={renderFacilityItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderMapPlaceholder}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadFacilities} />
          }
          onEndReached={loadMoreFacilities}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMore}>
                <LoadingSpinner size="small" />
              </View>
            ) : null
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={getOptimalBatchSize()}
          windowSize={getOptimalWindowSize()}
          initialNumToRender={getOptimalBatchSize()}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateFacility}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flex: 1,
    marginRight: Spacing.md,
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
    backgroundColor: colors.track,
  },
  mapContainer: {
    height: 250,
    backgroundColor: colors.surface,
    marginBottom: Spacing.md,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.chalk,
  },
  mapPlaceholderText: {
    ...TextStyles.h4,
    color: colors.textSecondary,
    marginTop: Spacing.md,
  },
  mapPlaceholderSubtext: {
    ...TextStyles.caption,
    color: colors.textTertiary,
    marginTop: Spacing.xs,
  },
  listContent: {
    paddingBottom: 80,
  },
  facilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.grass,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  numberText: {
    ...TextStyles.body,
    color: colors.textInverse,
    fontWeight: '700',
  },
  facilityContent: {
    flex: 1,
  },
  facilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  facilityName: {
    ...TextStyles.h4,
    color: colors.textPrimary,
    flex: 1,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.courtLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: Spacing.sm,
  },
  ownerText: {
    ...TextStyles.caption,
    color: colors.ink,
    fontWeight: '600',
    marginLeft: 2,
  },
  facilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  facilityAddress: {
    ...TextStyles.body,
    color: colors.textSecondary,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  sportTypes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sportTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  sportTagText: {
    ...TextStyles.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  moreText: {
    ...TextStyles.caption,
    color: colors.textTertiary,
    fontSize: 11,
  },
  facilityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  ratingText: {
    ...TextStyles.caption,
    color: colors.textSecondary,
    marginLeft: 2,
    fontWeight: '600',
  },
  distance: {
    ...TextStyles.caption,
    color: colors.textTertiary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...TextStyles.h3,
    color: colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...TextStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: Spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.grass,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...TextStyles.h3,
    color: colors.textPrimary,
  },
  filterContent: {
    padding: Spacing.lg,
  },
  filterLabel: {
    ...TextStyles.h4,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  sportTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.lg,
  },
  sportChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sportChipSelected: {
    backgroundColor: colors.grass,
  },
  sportChipText: {
    ...TextStyles.body,
    color: colors.textSecondary,
  },
  sportChipTextSelected: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    marginRight: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  clearButtonText: {
    ...TextStyles.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.grass,
    alignItems: 'center',
  },
  applyButtonText: {
    ...TextStyles.body,
    fontWeight: '600',
    color: colors.textInverse,
  },
});
