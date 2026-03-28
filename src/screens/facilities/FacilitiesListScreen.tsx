import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { debounce } from '../../utils/performance';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { FormSelect } from '../../components/forms/FormSelect';
import { GroundsMapViewWrapper } from '../../components/maps/GroundsMapViewWrapper';
import { TabSearchModal, TabSearchResult } from '../../components/search/TabSearchModal';
import { facilityService } from '../../services/api/FacilityService';
import { courtService, Rental } from '../../services/api/CourtService';
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
  const [sportFilter, setSportFilter] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [reservations, setReservations] = useState<Rental[]>([]);
  const [reservationsModalVisible, setReservationsModalVisible] = useState(false);

  useEffect(() => {
    const unsub = searchEventBus.subscribeTab('Facilities', () => {
      // Inline search — just let the header pill handle text input
      // The query comes via subscribeQuery
    });
    const unsubQuery = searchEventBus.subscribeQuery((q) => setSearchQuery(q));
    const unsubClose = searchEventBus.subscribeClose(() => {
      setSearchModalVisible(false);
    });
    return () => { unsub(); unsubQuery(); unsubClose(); };
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
    await loadReservations();
    setRefreshing(false);
  };

  const loadReservations = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const rentals = await courtService.getMyRentals(currentUser.id, { upcoming: true });
      // Filter to future only
      const now = new Date();
      const future = (rentals || []).filter((r: Rental) => {
        if (!r.timeSlot?.date) return false;
        return new Date(r.timeSlot.date) >= now;
      });
      setReservations(future);
    } catch { setReservations([]); }
  }, [currentUser?.id]);

  useEffect(() => { loadReservations(); }, [loadReservations]);

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

  // Filtered + limited display list
  const displayFacilities = useMemo(() => {
    let list = [...sortedFacilities];
    // Sport filter
    if (sportFilter) list = list.filter((f) => (f.sportTypes || []).includes(sportFilter as SportType));
    // Free only
    if (freeOnly) list = list.filter((f) => !f.pricePerHour || f.pricePerHour === 0);
    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || f.city?.toLowerCase().includes(q));
    }
    // Limit to 10
    return list.slice(0, 10);
  }, [sortedFacilities, sportFilter, freeOnly, searchQuery]);

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
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
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
              <View style={{ flex: 1 }} />
              {item.rating && item.rating > 0 && (
                <View style={styles.rating}>
                  <Ionicons name="star" size={14} color={colors.gold} />
                  <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          )}
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
      {/* Sport filter + free toggle */}
      <View style={styles.filterBar}>
        <View style={{ flex: 1 }}>
          <FormSelect label="" options={[
            { label: 'All Sports', value: '' },
            { label: 'Basketball', value: SportType.BASKETBALL },
            { label: 'Pickleball', value: SportType.PICKLEBALL },
            { label: 'Tennis', value: SportType.TENNIS },
            { label: 'Soccer', value: SportType.SOCCER },
            { label: 'Softball', value: SportType.SOFTBALL },
            { label: 'Baseball', value: SportType.BASEBALL },
            { label: 'Volleyball', value: SportType.VOLLEYBALL },
            { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
            { label: 'Kickball', value: SportType.KICKBALL },
          ]} value={sportFilter} onSelect={(o) => setSportFilter(String(o.value))} placeholder="Sport" />
        </View>
        <TouchableOpacity style={[styles.freeToggle, freeOnly && styles.freeToggleActive]} onPress={() => setFreeOnly(!freeOnly)}>
          <Text style={[styles.freeToggleText, freeOnly && styles.freeToggleTextActive]}>Free</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pine} />
        }
      >
        {/* Map */}
        <View style={styles.mapContainer}>
          <GroundsMapViewWrapper
            grounds={displayFacilities}
            onGroundPress={handleFacilityPress}
          />
        </View>

        {/* Numbered facility list */}
        {isLoading && !facilities.length ? (
          <LoadingSpinner />
        ) : displayFacilities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={48} color={colors.inkFaint} />
            <Text style={styles.emptyTitle}>No grounds found</Text>
          </View>
        ) : (
          displayFacilities.map((item, index) => renderFacilityCard(item, index))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Reservations button */}
      {reservations.length > 0 && (
        <TouchableOpacity style={styles.reservationsBtn} onPress={() => setReservationsModalVisible(true)} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={18} color={colors.pine} />
          <Text style={styles.reservationsBtnText}>Reservations ({reservations.length})</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
        </TouchableOpacity>
      )}

      {/* Reservations modal */}
      <Modal visible={reservationsModalVisible} transparent animationType="fade" onRequestClose={() => setReservationsModalVisible(false)}>
        <Pressable style={styles.resBackdrop} onPress={() => setReservationsModalVisible(false)}>
          <View style={styles.resModal}>
            <View style={styles.resHeader}>
              <Text style={styles.resTitle}>Reservations</Text>
              <TouchableOpacity onPress={() => setReservationsModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.resScroll} showsVerticalScrollIndicator={false}>
              {reservations.map((r) => {
                const isPending = r.status !== 'confirmed';
                const facilityName = (r.timeSlot as any)?.court?.facility?.name || (r.timeSlot as any)?.court?.name || 'Ground';
                const courtName = r.timeSlot?.court?.name || '';
                const date = r.timeSlot?.date ? new Date(r.timeSlot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
                const formatT = (t: string) => { const [hh, mm] = t.split(':').map(Number); const h12 = (hh ?? 0) % 12 || 12; const ap = (hh ?? 0) >= 12 ? 'PM' : 'AM'; return `${h12}:${String(mm ?? 0).padStart(2, '0')} ${ap}`; };
                const time = r.timeSlot ? `${formatT(r.timeSlot.startTime)} – ${formatT(r.timeSlot.endTime)}` : '';
                return (
                  <TouchableOpacity key={r.id} style={styles.resCard} onPress={() => { setReservationsModalVisible(false); (navigation as any).navigate('CourtAvailability', { facilityId: (r.timeSlot as any)?.court?.facilityId }); }} activeOpacity={0.7}>
                    <View style={styles.resCardBody}>
                      <View style={styles.resCardTop}>
                        <Text style={styles.resCardFacility} numberOfLines={1}>{facilityName}</Text>
                        {isPending && <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>Pending</Text></View>}
                      </View>
                      <Text style={styles.resCardCourt}>{courtName}</Text>
                      <Text style={styles.resCardMeta}>{date} · {time}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

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
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  freeToggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  freeToggleActive: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  freeToggleText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.ink,
  },
  freeToggleTextActive: {
    color: '#FFFFFF',
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
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
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
  reservationsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  reservationsBtnText: {
    flex: 1,
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.pine,
  },
  resBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 70,
  },
  resModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  resHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
  },
  resScroll: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  resCardBody: { flex: 1 },
  resCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resCardFacility: { fontFamily: fonts.label, fontSize: 15, color: colors.ink, flex: 1 },
  pendingBadge: { backgroundColor: colors.goldTint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  pendingBadgeText: { fontFamily: fonts.label, fontSize: 10, color: colors.gold },
  resCardCourt: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  resCardMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, marginTop: 1 },
});
