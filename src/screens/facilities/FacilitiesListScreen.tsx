import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { debounce } from '../../utils/performance';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { ViewToggle } from '../../components/maps/ViewToggle';
import { GroundsMapViewWrapper } from '../../components/maps/GroundsMapViewWrapper';
import { MyReservationsSection } from '../../components/profile/MyReservationsSection';
import { TabSearchModal, TabSearchResult } from '../../components/search/TabSearchModal';
import { facilityService } from '../../services/api/FacilityService';
import { colors, fonts, Spacing } from '../../theme';
import { searchEventBus } from '../../utils/searchEventBus';
import {
  setFacilities,
  setLoading,
  setError,
  setFilters,
  clearFilters,
  selectFacilities,
  selectFacilityFilters,
  selectFacilitiesPagination,
  selectFacilitiesLoading,
  selectFacilitiesError,
} from '../../store/slices/facilitiesSlice';
import { useAuth } from '../../context/AuthContext';
import { Facility, SportType, FacilityFilters } from '../../types';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useDependentContext } from '../../hooks/useDependentContext';

export function FacilitiesListScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const route = useRoute();

  const facilities = useSelector(selectFacilities);
  const filters = useSelector(selectFacilityFilters);
  const pagination = useSelector(selectFacilitiesPagination);
  const isLoading = useSelector(selectFacilitiesLoading);
  const error = useSelector(selectFacilitiesError);

  const { user: currentUser } = useAuth();
  const { isDependent } = useDependentContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchModalVisible, setSearchModalVisible] = useState(false);

  useEffect(() => {
    const unsub = searchEventBus.subscribeTab('Facilities', () => {
      setSearchModalVisible(true);
    });
    const unsubClose = searchEventBus.subscribeClose(() => {
      setSearchModalVisible(false);
    });
    return () => { unsub(); unsubClose(); };
  }, []);

  const handleSearchGrounds = useCallback(async (query: string, sport: any): Promise<TabSearchResult[]> => {
    try {
      const res = await facilityService.getFacilities({ page: 1, limit: 30 });
      return (res.data || [])
        .filter((f: any) => {
          const nameMatch = !query.trim() || f.name.toLowerCase().includes(query.toLowerCase());
          const sportMatch = !sport || (f.sportTypes || []).includes(sport);
          return nameMatch && sportMatch;
        })
        .map((f: any) => ({ id: f.id, name: f.name, subtitle: `${f.city}, ${f.state}` }));
    } catch { return []; }
  }, []);

  const handleSearchResultPress = useCallback((result: TabSearchResult) => {
    (navigation as any).navigate('FacilityDetails', { facilityId: result.id });
  }, [navigation]);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<FacilityFilters>(filters);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [refreshing, setRefreshing] = useState(false);

  const lastLoadTimeRef = React.useRef<number>(0);

  useEffect(() => {
    loadFacilities();
  }, [filters]);

  useEffect(() => {
    const params = route.params as any;
    const refreshTimestamp = params?.refresh;
    if (refreshTimestamp) {
      lastLoadTimeRef.current = 0;
      loadFacilities(true);
    }
  }, [(route.params as any)?.refresh]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      const hasFacilities = facilities.length > 0;
      if (timeSinceLastLoad > 5000 || !hasFacilities) {
        loadFacilities();
      }
    }, [filters])
  );

  const loadFacilities = async (forceRefresh = false) => {
    try {
      dispatch(setLoading(true));
      const response = await facilityService.getFacilities(
        forceRefresh ? { ...filters } as any : filters,
        { page: 1, limit: pagination.limit }
      );
      dispatch(setFacilities(response));
      lastLoadTimeRef.current = Date.now();
    } catch (err: any) {
      dispatch(setError(err.message || 'Failed to load facilities'));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFacilities(true);
    setRefreshing(false);
  };

  const debouncedSearch = useMemo(
    () => debounce(async (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        try {
          dispatch(setLoading(true));
          const response = await facilityService.searchFacilities(query, filters, {
            page: 1, limit: pagination.limit,
          });
          dispatch(setFacilities({
            data: response.results,
            pagination: {
              page: 1, limit: pagination.limit,
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
    if (currentUser && facility.ownerId === currentUser.id) {
      (navigation as any).navigate('EditFacility', { facilityId: facility.id });
    } else {
      (navigation as any).navigate('FacilityDetails', { facilityId: facility.id });
    }
  };

  const handleCreateFacility = () => {
    (navigation as any).navigate('CreateFacility');
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

  const sortedFacilities = useMemo(
    () => [...facilities].sort((a, b) => a.name.localeCompare(b.name)),
    [facilities]
  );

  const renderFacilityCard = (item: Facility, index: number) => {
    const formattedAddress = `${item.city}, ${item.state}`;
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.facilityCard}
        onPress={() => handleFacilityPress(item)}
        activeOpacity={0.7}
      >
        {/* Owner badge — top right */}
        {item.ownerId === currentUser?.id && (
          <View style={styles.ownerBadge}>
            <Ionicons name="star" size={10} color="#FFFFFF" />
            <Text style={styles.ownerText}>Owner</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <View style={styles.facilityHeader}>
            <View style={styles.facilityTitleContainer}>
              <Text style={styles.facilityName} numberOfLines={1}>{item.name}</Text>
            </View>
          </View>
          <View style={styles.facilityInfo}>
            <Ionicons name="location-outline" size={16} color={colors.inkFaint} />
            <Text style={styles.facilityAddress} numberOfLines={1}>{formattedAddress}</Text>
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
            <View style={{ flex: 1 }} />
            {item.rating && item.rating > 0 && (
              <View style={styles.rating}>
                <Ionicons name="star" size={14} color={colors.gold} />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
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
                    <Text style={[styles.sportChipText, isSelected && styles.sportChipTextSelected]}>
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pine} />
        }
      >
        {/* Grounds section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Grounds</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{facilities.length}</Text>
          </View>
        </View>

          {isLoading && !facilities.length ? (
            <LoadingSpinner />
          ) : viewMode === 'map' ? (
            <View style={styles.mapContainer}>
              <GroundsMapViewWrapper
                grounds={facilities}
                onGroundPress={handleFacilityPress}
              />
            </View>
          ) : sortedFacilities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={64} color={colors.inkFaint} />
              <Text style={styles.emptyTitle}>No Grounds Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search or filters' : 'Be the first to add a ground'}
              </Text>
            </View>
          ) : (
            sortedFacilities.map((item, index) => renderFacilityCard(item, index))
          )}
        

        {/* My Reservations section */}
        {currentUser?.id && (
          <MyReservationsSection userId={currentUser.id} />
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB — hidden for dependents */}
      {!isDependent && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateFacility}>
          <Ionicons name="add" size={28} color={colors.surface} />
        </TouchableOpacity>
      )}

      {renderFilterModal()}

      <TabSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        title="Search Grounds"
        placeholder="Search by ground name..."
        onSearch={handleSearchGrounds}
        onResultPress={handleSearchResultPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: colors.white,
    gap: 6,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    flex: 1,
  },
  countBadge: {
    backgroundColor: `${colors.pine}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.pine,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.white,
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
  mapContainer: {
    height: 400,
  },
  facilityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
    backgroundColor: colors.pine,
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
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8A030',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
    zIndex: 1,
  },
  ownerText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontFamily: fonts.label,
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
    backgroundColor: colors.pine + '15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sportTagText: {
    fontSize: 13,
    color: colors.pine,
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
  emptyState: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.inkFaint,
  },
  sportChipSelected: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  sportChipText: {
    fontSize: 14,
    color: colors.ink,
  },
  sportChipTextSelected: {
    color: colors.surface,
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
    backgroundColor: colors.pine,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
});
