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
import { ViewToggle } from '../../components/maps/ViewToggle';
import { GroundsMapViewWrapper } from '../../components/maps/GroundsMapViewWrapper';
import { facilityService } from '../../services/api/FacilityService';
import { colors, Spacing } from '../../theme';
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
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
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
        forceRefresh ? { ...filters } as any : filters,
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

  const renderFacilityItem = useCallback(({ item, index }: { item: Facility; index: number }) => {
    // Format address from facility fields
    const formattedAddress = `${item.city}, ${item.state}`;
    
    return (
      <TouchableOpacity
        style={styles.facilityCard}
        onPress={() => handleFacilityPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.facilityHeader}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <View style={styles.facilityTitleContainer}>
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
          </View>
          
          <View style={styles.facilityInfo}>
            <Ionicons name="location-outline" size={16} color={colors.inkFaint} />
            <Text style={styles.facilityAddress} numberOfLines={1}>
              {formattedAddress}
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
            {item.rating && item.rating > 0 && (
              <View style={styles.rating}>
                <Ionicons name="star" size={14} color={colors.court} />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleFacilityPress, currentUser]);

  const keyExtractor = useCallback((item: Facility) => item.id, []);

  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyState}>
        <Ionicons name="map-outline" size={64} color={colors.inkFaint} />
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
              <Ionicons name="close" size={24} color={colors.ink} />
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
        <ViewToggle
          viewMode={viewMode}
          onToggle={setViewMode}
        />
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Ionicons name="filter" size={24} color={colors.grass} />
          {Object.keys(filters).length > 0 && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      {isLoading && !facilities.length ? (
        <LoadingSpinner />
      ) : viewMode === 'map' ? (
        <GroundsMapViewWrapper
          grounds={facilities}
          onGroundPress={handleFacilityPress}
        />
      ) : (
        <FlatList
          data={[...facilities].sort((a, b) => a.name.localeCompare(b.name))}
          renderItem={renderFacilityItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
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
        <Ionicons name="add" size={28} color={colors.chalk} />
      </TouchableOpacity>

      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalkWarm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: colors.chalkWarm,
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
    backgroundColor: colors.track,
  },
  listContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 80,
  },
  facilityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardContent: {
    flex: 1,
  },
  facilityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.grass,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  facilityTitleContainer: {
    flex: 1,
  },
  facilityName: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  ownerText: {
    fontSize: 12,
    color: colors.court,
    fontWeight: '600',
    marginLeft: 4,
  },
  facilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  facilityAddress: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  sportTypes: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  sportTag: {
    backgroundColor: colors.grass + '15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sportTagText: {
    fontSize: 13,
    color: colors.grass,
    fontWeight: '500',
  },
  moreText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  facilityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  distance: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  emptyState: {
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
  emptySubtitle: {
    fontSize: 16,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: 24,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.chalkWarm,
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
    borderBottomColor: colors.inkFaint,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  filterContent: {
    padding: Spacing.lg,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: Spacing.md,
  },
  sportTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.lg,
    gap: 8,
  },
  sportChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.chalkWarm,
    borderWidth: 1,
    borderColor: colors.inkFaint,
  },
  sportChipSelected: {
    backgroundColor: colors.grass,
    borderColor: colors.grass,
  },
  sportChipText: {
    fontSize: 14,
    color: colors.ink,
  },
  sportChipTextSelected: {
    color: colors.chalk,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.inkFaint,
    gap: 8,
  },
  clearButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inkFaint,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  applyButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    backgroundColor: colors.grass,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.chalk,
  },
});
