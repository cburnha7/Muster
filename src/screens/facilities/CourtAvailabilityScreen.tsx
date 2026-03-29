import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, typeScale, Spacing, TextStyles, ComponentStyles } from '../../theme';
import { FacilitiesStackParamList } from '../../navigation/types';
import {
  calendarTheme,
  formatDateForCalendar,
  formatTime12,
  createMarkedDates,
} from '../../utils/calendarUtils';
import {
  TimeSlotGrid,
  BulkBookingConfirmationModal,
  BookingConflictModal,
} from '../../components/facilities';
import type { TimeSlot } from '../../components/facilities/TimeSlotGrid';
import type { CartSlot } from '../../components/facilities/BulkBookingConfirmationModal';
import type { ConflictSlot } from '../../components/facilities/BookingConflictModal';
import { useAuth } from '../../context/AuthContext';
import { RecurringBookingToggle, RecurringConfig } from '../../components/bookings/RecurringBookingToggle';
import { RecurringConflictsModal } from '../../components/bookings/RecurringConflictsModal';
import { InsuranceDocumentSelector } from '../../components/bookings/InsuranceDocumentSelector';

type CourtAvailabilityScreenNavigationProp = NativeStackNavigationProp<
  FacilitiesStackParamList,
  'CourtAvailability'
>;
type CourtAvailabilityScreenRouteProp = RouteProp<FacilitiesStackParamList, 'CourtAvailability'>;

interface Court {
  id: string;
  name: string;
  sportType: string;
  capacity: number;
  isIndoor: boolean;
  pricePerHour: number | null;
}

interface AvailabilityData {
  date: Date;
  courtId: string;
  courtName: string;
  totalSlots: number;
  availableSlots: number;
  slots: TimeSlot[];
}

export function CourtAvailabilityScreen() {
  const navigation = useNavigation<CourtAvailabilityScreenNavigationProp>();
  const route = useRoute<CourtAvailabilityScreenRouteProp>();
  const { user } = useAuth();

  const { facilityId, facilityName, courtId, eventDate, eventStartTime, returnTo, returnParams } = route.params;

  // Facility data (for requiresInsurance and requiresBookingConfirmation check)
  const [facilityData, setFacilityData] = useState<{ requiresInsurance?: boolean; requiresBookingConfirmation?: boolean } | null>(null);

  // Insurance document selection (only used when requiresInsurance = true)
  const [selectedInsuranceDocumentId, setSelectedInsuranceDocumentId] = useState<string | undefined>(undefined);

  const requiresInsurance = facilityData?.requiresInsurance === true;

  const [selectedDate, setSelectedDate] = useState<string>(
    eventDate || formatDateForCalendar(new Date())
  );
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});

  // Selection cart Ã¢â‚¬â€ persists across court/date changes
  const [selectionCart, setSelectionCart] = useState<Map<string, CartSlot>>(new Map());

  // Whole day toggle
  const [wholeDayOn, setWholeDayOn] = useState(false);

  // Modals
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictSlot[]>([]);
  const [availableSlotsAfterConflict, setAvailableSlotsAfterConflict] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Recurring booking state
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig>({
    enabled: false,
    frequency: 'weekly',
    endDate: null,
  });
  const [showRecurringConflicts, setShowRecurringConflicts] = useState(false);
  const [recurringConflicts, setRecurringConflicts] = useState<any[]>([]);
  const [recurringAvailableCount, setRecurringAvailableCount] = useState(0);

  // Clear cart on unmount
  useEffect(() => {
    return () => setSelectionCart(new Map());
  }, []);

  // Load courts on mount
  useEffect(() => {
    loadCourts();
    loadFacilityData();
  }, [facilityId]);

  // Load availability when court or date changes
  useEffect(() => {
    if (selectedCourt) {
      loadAvailability(selectedCourt.id, selectedDate);
    }
  }, [selectedCourt, selectedDate]);

  // Reset whole-day toggle when court or date changes
  useEffect(() => {
    setWholeDayOn(false);
  }, [selectedCourt?.id, selectedDate]);

  // Derive selected slot IDs for the current court/date view
  const currentViewSelectedIds = useMemo(() => {
    if (!selectedCourt) return [];
    return Array.from(selectionCart.values())
      .filter((s) => s.courtId === selectedCourt.id && s.date === selectedDate)
      .map((s) => s.slotId);
  }, [selectionCart, selectedCourt?.id, selectedDate]);

  // Cart summary stats
  const cartSlots = useMemo(() => Array.from(selectionCart.values()), [selectionCart]);
  const cartTotal = useMemo(() => cartSlots.reduce((sum, s) => sum + s.price, 0), [cartSlots]);
  const cartCourtCount = useMemo(() => new Set(cartSlots.map((s) => s.courtId)).size, [cartSlots]);
  const cartDayCount = useMemo(() => new Set(cartSlots.map((s) => s.date)).size, [cartSlots]);

  const loadCourts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/facilities/${facilityId}/courts`
      );
      if (!response.ok) throw new Error('Failed to load courts');
      const data = await response.json();
      setCourts(data);
      if (courtId) {
        const court = data.find((c: Court) => c.id === courtId);
        setSelectedCourt(court || data[0]);
      } else {
        setSelectedCourt(data[0]);
      }
    } catch (error) {
      console.error('Load courts error:', error);
      Alert.alert('Error', 'Failed to load courts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadFacilityData = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/facilities/${facilityId}`
      );
      if (!response.ok) throw new Error('Failed to load facility');
      const data = await response.json();
      setFacilityData(data);
    } catch (error) {
      console.error('Load facility data error:', error);
    }
  };

  const loadAvailability = async (cId: string, date: string) => {
    try {
      setLoadingSlots(true);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/facilities/${facilityId}/courts/${cId}/availability?date=${date}`
      );
      if (!response.ok) throw new Error('Failed to load availability');
      const data: AvailabilityData = await response.json();
      setAvailabilityData(data);
      const marked = createMarkedDates([], [], [], selectedDate);
      setMarkedDates(marked);
    } catch (error) {
      console.error('Load availability error:', error);
      Alert.alert('Error', 'Failed to load availability. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (day: DateData) => {
    setSelectedDate(day.dateString);
    // Cart persists Ã¢â‚¬â€ no clearing
  };

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court);
    // Cart persists Ã¢â‚¬â€ no clearing
  };

  const addSlotToCart = useCallback((slot: TimeSlot) => {
    if (!selectedCourt || !slot.id) return;
    setSelectionCart((prev) => {
      const next = new Map(prev);
      next.set(slot.id!, {
        slotId: slot.id!,
        facilityId,
        courtId: selectedCourt.id,
        courtName: selectedCourt.name,
        date: selectedDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: slot.price || 0,
      });
      return next;
    });
  }, [facilityId, selectedCourt, selectedDate]);

  const removeSlotFromCart = useCallback((slotId: string) => {
    setSelectionCart((prev) => {
      const next = new Map(prev);
      next.delete(slotId);
      return next;
    });
  }, []);

  const handleSlotPress = (slot: TimeSlot) => {
    if (slot.status !== 'available' || !slot.id) {
      if (slot.status !== 'available') {
        Alert.alert(
          'Unavailable',
          slot.status === 'blocked'
            ? `This time slot is blocked${slot.blockReason ? `: ${slot.blockReason}` : '.'}`
            : 'This time slot is already rented.'
        );
      }
      return;
    }

    if (selectionCart.has(slot.id)) {
      removeSlotFromCart(slot.id);
      // If user deselects while whole-day is on, turn it off
      if (wholeDayOn) setWholeDayOn(false);
    } else {
      addSlotToCart(slot);
    }
  };

  const handleWholeDayToggle = (value: boolean) => {
    setWholeDayOn(value);
    if (!selectedCourt || !availabilityData) return;

    if (value) {
      // Add all available slots for current court+date
      setSelectionCart((prev) => {
        const next = new Map(prev);
        for (const slot of availabilityData.slots) {
          if (slot.status === 'available' && slot.id) {
            next.set(slot.id, {
              slotId: slot.id,
              facilityId,
              courtId: selectedCourt.id,
              courtName: selectedCourt.name,
              date: selectedDate,
              startTime: slot.startTime,
              endTime: slot.endTime,
              price: slot.price || 0,
            });
          }
        }
        return next;
      });
    } else {
      // Remove all slots for current court+date
      setSelectionCart((prev) => {
        const next = new Map(prev);
        for (const slot of availabilityData.slots) {
          if (slot.id) next.delete(slot.id);
        }
        return next;
      });
    }
  };

  /**
   * After a successful booking, navigate back to the event screen (if returnTo is set)
   * or to the Profile tab.
   */
  const navigateAfterBooking = (rental?: any) => {
    if (returnTo && rental) {
      const ts = rental.timeSlot;
      const bookingParams = {
        fromReservation: true,
        facilityId: ts?.court?.facility?.id || facilityId,
        facilityName: ts?.court?.facility?.name || facilityName,
        courtId: ts?.court?.id,
        courtName: ts?.court?.name,
        courtSportType: ts?.court?.sportType,
        timeSlotId: ts?.id,
        reservedDate: ts?.date,
        reservedStartTime: ts?.startTime,
        reservedEndTime: ts?.endTime,
        ...(returnParams || {}),
      };
      (navigation as any).navigate('Home', {
        screen: returnTo,
        params: bookingParams,
      });
    } else {
      (navigation as any).navigate('Facilities', { screen: 'FacilitiesList' });
    }
  };

  const handleConfirmBulkBooking = async () => {
    if (cartSlots.length === 0 || !user) return;
    setSubmitting(true);

    try {
      const slots = cartSlots.map((s) => ({
        facilityId: s.facilityId,
        courtId: s.courtId,
        slotId: s.slotId,
      }));

      const body: any = { userId: user.id, slots };
      if (requiresInsurance && selectedInsuranceDocumentId) {
        body.insuranceDocumentId = selectedInsuranceDocumentId;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/rentals/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.status === 201) {
        setShowConfirmation(false);
        setSelectionCart(new Map());

        const data = await response.json();
        navigateAfterBooking(data.rentals?.[0]);
      } else if (response.status === 409) {
        const data = await response.json();
        setShowConfirmation(false);
        setConflicts(data.conflicts);
        setAvailableSlotsAfterConflict(data.availableSlots);
        setShowConflict(true);
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Booking failed');
      }
    } catch (error: any) {
      console.error('Bulk booking error:', error);
      Alert.alert('Booking Failed', error.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookAvailableAfterConflict = async () => {
    // Remove conflict slots from cart, then resubmit
    const conflictIds = new Set(conflicts.map((c) => c.slotId));
    setSelectionCart((prev) => {
      const next = new Map(prev);
      for (const id of conflictIds) {
        next.delete(id);
      }
      return next;
    });
    setShowConflict(false);

    // Small delay to let state update, then trigger confirm
    setTimeout(() => {
      setShowConfirmation(true);
    }, 100);
  };

  // ─── Recurring booking flow ───────────────────────────────────────
  const handleRecurringBooking = async (skipConflicts = false) => {
    if (cartSlots.length !== 1 || !user || !selectedCourt || !recurringConfig.endDate) return;
    setSubmitting(true);

    try {
      const slot = cartSlots[0]!;
      // Find the original time slot data to get start/end times
      const slotData = availabilityData?.slots.find((s) => s.id === slot.slotId);
      if (!slotData) throw new Error('Slot data not found');

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/rentals/recurring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          courtId: slot.courtId,
          facilityId: slot.facilityId,
          slotStartTime: slotData.startTime,
          slotEndTime: slotData.endTime,
          frequency: recurringConfig.frequency,
          startDate: selectedDate,
          endDate: recurringConfig.endDate.toISOString().split('T')[0],
          skipConflicts,
        }),
      });

      if (response.status === 201) {
        setShowConfirmation(false);
        setShowRecurringConflicts(false);
        setSelectionCart(new Map());
        setRecurringConfig({ enabled: false, frequency: 'weekly', endDate: null });

        const data = await response.json();
        navigateAfterBooking(data.rentals?.[0]);
      } else if (response.status === 409) {
        const data = await response.json();
        setShowConfirmation(false);
        setRecurringConflicts(data.conflicts);
        setRecurringAvailableCount(data.availableCount);
        setShowRecurringConflicts(true);
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Recurring booking failed');
      }
    } catch (error: any) {
      console.error('Recurring booking error:', error);
      Alert.alert('Booking Failed', error.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isRecurringReady = recurringConfig.enabled && cartSlots.length === 1 && recurringConfig.endDate !== null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.cobalt} />
        <Text style={styles.loadingText}>Loading courts...</Text>
      </View>
    );
  }

  if (courts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="basketball-outline" size={64} color={colors.inkFaint} />
        <Text style={styles.emptyTitle}>No Courts Available</Text>
        <Text style={styles.emptySubtitle}>This facility doesn't have any courts set up yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.facilityName}>{facilityName}</Text>
          <Text style={styles.subtitle}>Select a date and time to book</Text>
        </View>

        {/* Court Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Court</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courtList}>
            {courts.map((court) => {
              const courtCartCount = Array.from(selectionCart.values()).filter(
                (s) => s.courtId === court.id
              ).length;
              return (
                <TouchableOpacity
                  key={court.id}
                  style={[styles.courtCard, selectedCourt?.id === court.id && styles.courtCardSelected]}
                  onPress={() => handleCourtSelect(court)}
                >
                  <View style={styles.courtCardHeader}>
                    <Ionicons
                      name={court.isIndoor ? 'home' : 'sunny'}
                      size={20}
                      color={selectedCourt?.id === court.id ? colors.cobalt : colors.inkFaint}
                    />
                    <Text style={[styles.courtName, selectedCourt?.id === court.id && styles.courtNameSelected]}>
                      {court.name}
                    </Text>
                    {courtCartCount > 0 && (
                      <View style={styles.courtBadge}>
                        <Text style={styles.courtBadgeText}>{courtCartCount}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.courtSportType}>{court.sportType}</Text>
                  {court.pricePerHour != null && (
                    <Text style={styles.courtPrice}>${court.pricePerHour}/hr</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <Calendar
            current={selectedDate}
            onDayPress={handleDateSelect}
            markedDates={markedDates}
            minDate={formatDateForCalendar(new Date())}
            theme={calendarTheme}
            style={styles.calendar}
          />
        </View>

        {/* Whole Day Toggle */}
        {availabilityData && availabilityData.slots.some((s) => s.status === 'available') && (
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Ionicons name="sunny" size={18} color={colors.gold} />
              <Text style={styles.toggleText}>Book the Whole Day</Text>
            </View>
            <Switch
              value={wholeDayOn}
              onValueChange={handleWholeDayToggle}
              trackColor={{ false: '#DDD', true: colors.cobaltLight }}
              thumbColor={wholeDayOn ? colors.cobalt : '#F4F4F4'}
            />
          </View>
        )}

        {/* Time Slots */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Time Slots</Text>
            {availabilityData && (
              <Text style={styles.availabilityCount}>
                {availabilityData.availableSlots} of {availabilityData.totalSlots} available
              </Text>
            )}
          </View>

          {loadingSlots ? (
            <View style={styles.loadingSlotsContainer}>
              <ActivityIndicator size="small" color={colors.cobalt} />
              <Text style={styles.loadingSlotsText}>Loading time slots...</Text>
            </View>
          ) : availabilityData && availabilityData.slots.length > 0 ? (
            <TimeSlotGrid
              timeSlots={availabilityData.slots}
              onSlotPress={handleSlotPress}
              selectable={true}
              selectedSlots={currentViewSelectedIds}
              currentUserId={user?.id}
            />
          ) : (
            <View style={styles.noSlotsContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.inkFaint} />
              <Text style={styles.noSlotsText}>No time slots available for this date</Text>
            </View>
          )}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.cobalt }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.ink }]} />
              <Text style={styles.legendText}>Reserved</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.heart }]} />
              <Text style={styles.legendText}>Blocked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.gold }]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
          </View>
        </View>

        {/* Recurring Booking Toggle — shown when exactly 1 slot is selected */}
        {cartSlots.length === 1 && selectedCourt && (
          <View style={{ paddingHorizontal: Spacing.lg }}>
            <RecurringBookingToggle
              value={recurringConfig}
              onChange={setRecurringConfig}
              minEndDate={(() => {
                const d = new Date(selectedDate + 'T00:00:00Z');
                if (recurringConfig.frequency === 'weekly') {
                  d.setUTCDate(d.getUTCDate() + 7);
                } else {
                  d.setUTCMonth(d.getUTCMonth() + 1);
                }
                return d;
              })()}
            />
          </View>
        )}

        {/* Spacer for footer */}
        {cartSlots.length > 0 && <View style={{ height: 120 }} />}
      </ScrollView>

      {/* Selection Summary Footer */}
      {cartSlots.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <View style={styles.footerStats}>
              <Ionicons name="cart" size={18} color={colors.cobalt} />
              <Text style={styles.footerStatsText}>
                {cartSlots.length} slot{cartSlots.length !== 1 ? 's' : ''}
                {cartCourtCount > 1 ? ` Ã‚Â· ${cartCourtCount} courts` : ''}
                {cartDayCount > 1 ? ` Ã‚Â· ${cartDayCount} days` : ''}
              </Text>
            </View>
            <Text style={styles.footerPrice}>${cartTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => {
              if (isRecurringReady) {
                handleRecurringBooking(false);
              } else {
                setShowConfirmation(true);
              }
            }}
          >
            <Text style={styles.bookButtonText}>
              {isRecurringReady
                ? `Book Recurring ${recurringConfig.frequency === 'weekly' ? 'Weekly' : 'Monthly'}`
                : `Book ${cartSlots.length} Slot${cartSlots.length !== 1 ? 's' : ''}`}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.surface} />
          </TouchableOpacity>
        </View>
      )}

      {/* Bulk Confirmation Modal */}
      <BulkBookingConfirmationModal
        visible={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmBulkBooking}
        facilityName={facilityName}
        cartSlots={cartSlots}
        loading={submitting}
        insuranceContent={
          requiresInsurance && user ? (
            <InsuranceDocumentSelector
              userId={user.id}
              onSelect={setSelectedInsuranceDocumentId}
              selectedDocumentId={selectedInsuranceDocumentId}
            />
          ) : undefined
        }
        confirmDisabled={requiresInsurance && !selectedInsuranceDocumentId}
      />

      {/* Conflict Modal */}
      <BookingConflictModal
        visible={showConflict}
        onClose={() => setShowConflict(false)}
        onBookAvailable={handleBookAvailableAfterConflict}
        conflicts={conflicts}
        availableCount={availableSlotsAfterConflict.length}
        loading={submitting}
      />

      {/* Recurring Conflicts Modal */}
      <RecurringConflictsModal
        visible={showRecurringConflicts}
        conflicts={recurringConflicts}
        availableCount={recurringAvailableCount}
        onSkipAndConfirm={() => handleRecurringBooking(true)}
        onCancel={() => setShowRecurringConflicts(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
  loadingText: { marginTop: Spacing.md, ...TextStyles.body, color: colors.inkFaint },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white, padding: Spacing.xxl },
  emptyTitle: { ...TextStyles.h3, color: colors.ink, marginTop: Spacing.lg },
  emptySubtitle: { ...TextStyles.body, color: colors.inkFaint, textAlign: 'center', marginTop: Spacing.sm },
  header: { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  facilityName: { ...TextStyles.h2, color: colors.ink },
  subtitle: { ...TextStyles.body, color: colors.inkFaint, marginTop: Spacing.xs },
  section: { padding: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontFamily: fonts.semibold, ...typeScale.h3, color: colors.ink, marginBottom: Spacing.md },
  availabilityCount: { fontFamily: fonts.label, fontSize: 11, color: colors.cobalt },
  courtList: { flexDirection: 'row' },
  courtCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: Spacing.md,
    marginRight: Spacing.md, borderWidth: 2, borderColor: '#EEE', minWidth: 140,
  },
  courtCardSelected: { borderColor: colors.cobalt, backgroundColor: colors.white },
  courtCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  courtName: { ...TextStyles.bodyLarge, fontWeight: '600', color: colors.ink },
  courtNameSelected: { color: colors.cobalt },
  courtBadge: {
    backgroundColor: colors.gold, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  courtBadgeText: { fontFamily: fonts.label, fontSize: 10, color: '#FFF' },
  courtSportType: { ...TextStyles.caption, color: colors.inkFaint, marginTop: Spacing.xs },
  courtPrice: { ...TextStyles.body, color: colors.cobalt, fontWeight: '600', marginTop: Spacing.xs },
  calendar: {
    borderRadius: 12, backgroundColor: '#FFF',
    shadowColor: colors.ink, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
    elevation: 2, overflow: 'hidden',
  },
  // Toggle row
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    padding: Spacing.md, backgroundColor: '#FFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#EEE',
  },
  toggleLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleText: { fontFamily: fonts.semibold, ...typeScale.body, color: colors.ink },
  // Slots loading / empty
  loadingSlotsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  loadingSlotsText: { ...TextStyles.body, color: colors.inkFaint },
  noSlotsContainer: { alignItems: 'center', padding: Spacing.xxl },
  noSlotsText: { ...TextStyles.body, color: colors.inkFaint, marginTop: Spacing.md, textAlign: 'center' },
  // Legend
  legend: { padding: Spacing.lg, backgroundColor: '#FFF', marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderRadius: 12 },
  legendTitle: { ...TextStyles.bodyLarge, fontWeight: '600', color: colors.ink, marginBottom: Spacing.sm },
  legendItems: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { ...TextStyles.body, color: colors.ink },
  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: '#EEE',
    backgroundColor: colors.white,
  },
  footerSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  footerStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerStatsText: { fontFamily: fonts.body, ...typeScale.bodySm, color: colors.inkFaint },
  footerPrice: { fontFamily: fonts.heading, ...typeScale.h3, color: colors.cobalt },
  bookButton: {
    ...ComponentStyles.button.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  bookButtonText: { fontFamily: fonts.ui, fontSize: 16, color: colors.surface },
});