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
import {
  colors,
  fonts,
  typeScale,
  Spacing,
  TextStyles,
  ComponentStyles,
  useTheme,
} from '../../theme';
import { FacilitiesStackParamList } from '../../navigation/types';
import {
  calendarTheme,
  formatDateForCalendar,
  formatTime12,
  createMarkedDates,
} from '../../utils/calendarUtils';
import {
  BulkBookingConfirmationModal,
  BookingConflictModal,
} from '../../components/facilities';
import type { TimeSlot } from '../../components/facilities/TimeSlotGrid';
import {
  VisualDaySchedule,
  ScheduleBlock,
} from '../../components/facilities/VisualDaySchedule';
import type { CartSlot } from '../../components/facilities/BulkBookingConfirmationModal';
import type { ConflictSlot } from '../../components/facilities/BookingConflictModal';
import { useAuth } from '../../context/AuthContext';
import {
  RecurringBookingToggle,
  RecurringConfig,
} from '../../components/bookings/RecurringBookingToggle';
import { RecurringConflictsModal } from '../../components/bookings/RecurringConflictsModal';
import { InsuranceDocumentSelector } from '../../components/bookings/InsuranceDocumentSelector';
import { API_BASE_URL } from '../../services/api/config';
import { ContextualReturnButton } from '../../components/navigation/ContextualReturnButton';

type CourtAvailabilityScreenNavigationProp = NativeStackNavigationProp<
  FacilitiesStackParamList,
  'CourtAvailability'
>;
type CourtAvailabilityScreenRouteProp = RouteProp<
  FacilitiesStackParamList,
  'CourtAvailability'
>;

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

function fmt12Time(t: string): string {
  const p = t.split(':').map(Number);
  const h = p[0] || 0;
  const m = p[1] || 0;
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function toMinHelper(t: string): number {
  const p = t.split(':').map(Number);
  return (p[0] || 0) * 60 + (p[1] || 0);
}

export function CourtAvailabilityScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<CourtAvailabilityScreenNavigationProp>();
  const route = useRoute<CourtAvailabilityScreenRouteProp>();
  const { user } = useAuth();

  const {
    facilityId,
    facilityName,
    courtId,
    eventDate,
    eventStartTime,
    returnTo,
    returnParams,
  } = route.params ?? {};

  // Facility data (for requiresInsurance and requiresBookingConfirmation check)
  const [facilityData, setFacilityData] = useState<{
    requiresInsurance?: boolean;
    requiresBookingConfirmation?: boolean;
  } | null>(null);

  // Insurance document selection (only used when requiresInsurance = true)
  const [selectedInsuranceDocumentId, setSelectedInsuranceDocumentId] =
    useState<string | undefined>(undefined);

  const requiresInsurance = facilityData?.requiresInsurance === true;

  const [selectedDate, setSelectedDate] = useState<string>(
    eventDate || formatDateForCalendar(new Date())
  );
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [availabilityData, setAvailabilityData] =
    useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});

  // Selection cart Ã¢â‚¬â€ persists across court/date changes
  const [selectionCart, setSelectionCart] = useState<Map<string, CartSlot>>(
    new Map()
  );

  // Whole day toggle
  const [wholeDayOn, setWholeDayOn] = useState(false);

  // Visual schedule selection
  const [scheduleStart, setScheduleStart] = useState<string | null>(null);
  const [scheduleEnd, setScheduleEnd] = useState<string | null>(null);
  const [minimumBookingMinutes, setMinimumBookingMinutes] = useState(60);

  // Booking time selection (optional — pre-filled from event creation flow)
  const [bookingStart, setBookingStart] = useState<string | null>(
    eventStartTime || null
  );
  const [bookingEnd, setBookingEnd] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleBlock[]>([]);
  const [slotIncrement, setSlotIncrement] = useState(30);
  const [overlapError, setOverlapError] = useState<string | null>(null);

  // Modals
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictSlot[]>([]);
  const [availableSlotsAfterConflict, setAvailableSlotsAfterConflict] =
    useState<any[]>([]);
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
      .filter(s => s.courtId === selectedCourt.id && s.date === selectedDate)
      .map(s => s.slotId);
  }, [selectionCart, selectedCourt?.id, selectedDate]);

  // Cart summary stats
  const cartSlots = useMemo(
    () => Array.from(selectionCart.values()),
    [selectionCart]
  );
  const cartTotal = useMemo(
    () => cartSlots.reduce((sum, s) => sum + s.price, 0),
    [cartSlots]
  );
  const cartCourtCount = useMemo(
    () => new Set(cartSlots.map(s => s.courtId)).size,
    [cartSlots]
  );
  const cartDayCount = useMemo(
    () => new Set(cartSlots.map(s => s.date)).size,
    [cartSlots]
  );

  const loadCourts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/facilities/${facilityId}/courts`
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
      const response = await fetch(`${API_BASE_URL}/facilities/${facilityId}`);
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
      setOverlapError(null);
      const response = await fetch(
        `${API_BASE_URL}/facilities/${facilityId}/courts/${cId}/schedule?date=${date}&userId=${user?.id || ''}`
      );
      if (!response.ok) throw new Error('Failed to load schedule');
      const data = await response.json();
      setScheduleData(data.schedule || []);
      if (data.minimumBookingMinutes)
        setMinimumBookingMinutes(data.minimumBookingMinutes);
      if (data.slotIncrementMinutes)
        setSlotIncrement(data.slotIncrementMinutes);
      const marked = createMarkedDates([], [], [], selectedDate);
      setMarkedDates(marked);
    } catch (error) {
      console.error('Load schedule error:', error);
      Alert.alert('Error', 'Failed to load court schedule. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Convert availability slots to schedule format
  const scheduleSlots: ScheduleSlot[] = React.useMemo(() => {
    if (!availabilityData?.slots) return [];
    return availabilityData.slots.map(slot => {
      let status: ScheduleSlot['status'] = 'available';
      if (slot.status === 'blocked') status = 'blocked';
      else if (slot.status === 'rented') {
        status =
          (slot as any).rentalUserId === user?.id ? 'own_rental' : 'rented';
      }
      return {
        time: slot.startTime,
        status,
        slotId: slot.id,
        label:
          status === 'rented'
            ? 'Booked'
            : status === 'own_rental'
              ? 'Your Reservation'
              : undefined,
      };
    });
  }, [availabilityData, user?.id]);

  // When schedule selection changes, sync to cart
  React.useEffect(() => {
    if (!scheduleStart || !scheduleEnd || !selectedCourt || !availabilityData)
      return;
    const startMin =
      parseInt(scheduleStart.split(':')[0]) * 60 +
      parseInt(scheduleStart.split(':')[1]);
    const endMin =
      parseInt(scheduleEnd.split(':')[0]) * 60 +
      parseInt(scheduleEnd.split(':')[1]);
    // Clear existing cart for this court/date, add selected slots
    setSelectionCart(prev => {
      const next = new Map(prev);
      // Remove old selections for this court+date
      for (const [key, val] of next) {
        if (val.courtId === selectedCourt.id && val.date === selectedDate) {
          next.delete(key);
        }
      }
      // Add slots in the selected range
      for (const slot of availabilityData.slots) {
        const slotMin =
          parseInt(slot.startTime.split(':')[0]) * 60 +
          parseInt(slot.startTime.split(':')[1]);
        if (
          slot.status === 'available' &&
          slot.id &&
          slotMin >= startMin &&
          slotMin < endMin
        ) {
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
  }, [
    scheduleStart,
    scheduleEnd,
    selectedCourt,
    selectedDate,
    availabilityData,
    facilityId,
  ]);

  // Check for overlap when booking times change
  React.useEffect(() => {
    if (!bookingStart || !bookingEnd || scheduleData.length === 0) {
      setOverlapError(null);
      return;
    }
    const toMin = (t: string) => {
      const p = t.split(':').map(Number);
      return (p[0] || 0) * 60 + (p[1] || 0);
    };
    const startMin = toMin(bookingStart);
    const endMin = toMin(bookingEnd);
    if (endMin <= startMin) {
      setOverlapError(null);
      return;
    }
    const overlap = scheduleData.some(s => {
      if (s.status !== 'booked') return false;
      const bs = toMin(s.startTime);
      const be = toMin(s.endTime);
      return startMin < be && endMin > bs;
    });
    setOverlapError(
      overlap
        ? 'Your selected time overlaps with an existing reservation.'
        : null
    );
  }, [bookingStart, bookingEnd, scheduleData]);

  const handleDateSelect = (day: DateData) => {
    setSelectedDate(day.dateString);
    // Cart persists Ã¢â‚¬â€ no clearing
  };

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court);
    // Cart persists Ã¢â‚¬â€ no clearing
  };

  const addSlotToCart = useCallback(
    (slot: TimeSlot) => {
      if (!selectedCourt || !slot.id) return;
      setSelectionCart(prev => {
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
    },
    [facilityId, selectedCourt, selectedDate]
  );

  const removeSlotFromCart = useCallback((slotId: string) => {
    setSelectionCart(prev => {
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
      setSelectionCart(prev => {
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
      setSelectionCart(prev => {
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

  // Book by time range (when user selects start/end time instead of individual slots)
  const handleBookTimeRange = async () => {
    if (!bookingStart || !bookingEnd || !selectedCourt || !user) return;
    if (overlapError) {
      Alert.alert('Overlap', overlapError);
      return;
    }
    setSubmitting(true);
    try {
      const body: any = {
        userId: user.id,
        facilityId,
        courtId: selectedCourt.id,
        date: selectedDate,
        startTime: bookingStart,
        endTime: bookingEnd,
      };
      if (requiresInsurance && selectedInsuranceDocumentId) {
        body.insuranceDocumentId = selectedInsuranceDocumentId;
      }
      const response = await fetch(`${API_BASE_URL}/rentals/book-range`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id },
        body: JSON.stringify(body),
      });
      if (response.status === 201) {
        const rental = await response.json();
        Alert.alert('Reserved', 'Your court has been reserved.', [
          { text: 'OK', onPress: () => navigateAfterBooking(rental) },
        ]);
      } else if (response.status === 409) {
        const data = await response.json();
        Alert.alert(
          'Conflict',
          data.error || 'Time overlaps with an existing reservation.'
        );
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Booking failed');
      }
    } catch (error: any) {
      Alert.alert('Booking Failed', error.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmBulkBooking = async () => {
    if (cartSlots.length === 0 || !user) return;
    setSubmitting(true);

    try {
      const slots = cartSlots.map(s => ({
        facilityId: s.facilityId,
        courtId: s.courtId,
        slotId: s.slotId,
      }));

      const body: any = { userId: user.id, slots };
      if (requiresInsurance && selectedInsuranceDocumentId) {
        body.insuranceDocumentId = selectedInsuranceDocumentId;
      }

      const response = await fetch(`${API_BASE_URL}/rentals/bulk`, {
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
    const conflictIds = new Set(conflicts.map(c => c.slotId));
    setSelectionCart(prev => {
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
    if (
      cartSlots.length !== 1 ||
      !user ||
      !selectedCourt ||
      !recurringConfig.endDate
    )
      return;
    setSubmitting(true);

    try {
      const slot = cartSlots[0]!;
      // Find the original time slot data to get start/end times
      const slotData = availabilityData?.slots.find(s => s.id === slot.slotId);
      if (!slotData) throw new Error('Slot data not found');

      const response = await fetch(`${API_BASE_URL}/rentals/recurring`, {
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
        setRecurringConfig({
          enabled: false,
          frequency: 'weekly',
          endDate: null,
        });

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

  const isRecurringReady =
    recurringConfig.enabled &&
    cartSlots.length === 1 &&
    recurringConfig.endDate !== null;

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
        <Text style={styles.emptySubtitle}>
          This facility doesn't have any courts set up yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      <ContextualReturnButton />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.facilityName}>{facilityName}</Text>
          <Text style={styles.subtitle}>Select a date and time to book</Text>
        </View>

        {/* Court Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Court</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.courtList}
          >
            {courts.map(court => {
              const courtCartCount = Array.from(selectionCart.values()).filter(
                s => s.courtId === court.id
              ).length;
              return (
                <TouchableOpacity
                  key={court.id}
                  style={[
                    styles.courtCard,
                    selectedCourt?.id === court.id && styles.courtCardSelected,
                  ]}
                  onPress={() => handleCourtSelect(court)}
                >
                  <View style={styles.courtCardHeader}>
                    <Ionicons
                      name={court.isIndoor ? 'home' : 'sunny'}
                      size={20}
                      color={
                        selectedCourt?.id === court.id
                          ? colors.cobalt
                          : colors.inkFaint
                      }
                    />
                    <Text
                      style={[
                        styles.courtName,
                        selectedCourt?.id === court.id &&
                          styles.courtNameSelected,
                      ]}
                    >
                      {court.name}
                    </Text>
                    {courtCartCount > 0 && (
                      <View style={styles.courtBadge}>
                        <Text style={styles.courtBadgeText}>
                          {courtCartCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.courtSportType}>{court.sportType}</Text>
                  {court.pricePerHour != null && (
                    <Text style={styles.courtPrice}>
                      ${court.pricePerHour}/hr
                    </Text>
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

        {/* Start/End Time + Visual Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.label,
                  fontSize: 12,
                  color: colors.inkSoft,
                  marginBottom: 4,
                  textAlign: 'center',
                }}
              >
                Start Time
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  alignItems: 'center',
                }}
                onPress={() => {
                  // Simple time picker — cycle through schedule times
                  if (scheduleData.length === 0) return;
                  const times = scheduleData
                    .filter(s => s.status === 'available')
                    .map(s => s.startTime);
                  if (times.length === 0) return;
                  const idx = bookingStart ? times.indexOf(bookingStart) : -1;
                  const next = times[(idx + 1) % times.length] || times[0];
                  setBookingStart(next || '');
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.headingSemi || fonts.heading,
                    fontSize: 18,
                    color: bookingStart ? colors.ink : colors.inkFaint,
                  }}
                >
                  {bookingStart ? fmt12Time(bookingStart) : 'Select'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.label,
                  fontSize: 12,
                  color: colors.inkSoft,
                  marginBottom: 4,
                  textAlign: 'center',
                }}
              >
                End Time
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  alignItems: 'center',
                }}
                onPress={() => {
                  if (scheduleData.length === 0) return;
                  const times = scheduleData
                    .filter(s => s.status === 'available')
                    .map(s => s.endTime);
                  const unique = [...new Set(times)];
                  if (unique.length === 0) return;
                  const idx = bookingEnd ? unique.indexOf(bookingEnd) : -1;
                  const next = unique[(idx + 1) % unique.length] || unique[0];
                  setBookingEnd(next || '');
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.headingSemi || fonts.heading,
                    fontSize: 18,
                    color: bookingEnd ? colors.ink : colors.inkFaint,
                  }}
                >
                  {bookingEnd ? fmt12Time(bookingEnd) : 'Select'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {overlapError && (
            <View
              style={{
                backgroundColor: colors.heartTint,
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="warning-outline" size={16} color={colors.heart} />
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: colors.heart,
                  flex: 1,
                }}
              >
                {overlapError}
              </Text>
            </View>
          )}

          {loadingSlots ? (
            <View style={styles.loadingSlotsContainer}>
              <ActivityIndicator size="small" color={colors.pine} />
              <Text style={styles.loadingSlotsText}>Loading schedule...</Text>
            </View>
          ) : scheduleData.length > 0 ? (
            <VisualDaySchedule
              schedule={scheduleData}
              proposedStart={bookingStart || null}
              proposedEnd={bookingEnd || null}
              slotIncrementMinutes={slotIncrement}
            />
          ) : (
            <View style={styles.noSlotsContainer}>
              <Ionicons
                name="calendar-outline"
                size={48}
                color={colors.inkFaint}
              />
              <Text style={styles.noSlotsText}>
                No schedule available for this date
              </Text>
            </View>
          )}
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
        {(cartSlots.length > 0 || (bookingStart && bookingEnd)) && (
          <View style={{ height: 120 }} />
        )}
      </ScrollView>

      {/* Time-range booking footer — shown when start/end are selected and cart is empty */}
      {bookingStart && bookingEnd && cartSlots.length === 0 && (
        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <View style={styles.footerStats}>
              <Ionicons name="time-outline" size={18} color={colors.cobalt} />
              <Text style={styles.footerStatsText}>
                {fmt12Time(bookingStart)} – {fmt12Time(bookingEnd)} ·{' '}
                {selectedCourt?.name || 'Court'}
              </Text>
            </View>
            {selectedCourt && (
              <Text style={styles.footerPrice}>
                $
                {(
                  ((selectedCourt.pricePerHour || 0) / 60) *
                  (toMinHelper(bookingEnd) - toMinHelper(bookingStart))
                ).toFixed(2)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.bookButton, submitting && { opacity: 0.6 }]}
            onPress={handleBookTimeRange}
            disabled={submitting || !!overlapError}
          >
            <Text style={styles.bookButtonText}>
              {submitting ? 'Booking...' : 'Confirm Reservation'}
            </Text>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.surface}
            />
          </TouchableOpacity>
        </View>
      )}

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
        confirmLabel={
          returnTo === 'CreateEvent'
            ? 'Book Reservation & Return to Event'
            : undefined
        }
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...TextStyles.body,
    color: colors.inkFaint,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: Spacing.xxl,
  },
  emptyTitle: { ...TextStyles.h3, color: colors.ink, marginTop: Spacing.lg },
  emptySubtitle: {
    ...TextStyles.body,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  facilityName: { ...TextStyles.h2, color: colors.ink },
  subtitle: {
    ...TextStyles.body,
    color: colors.inkFaint,
    marginTop: Spacing.xs,
  },
  section: { padding: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    ...typeScale.h3,
    color: colors.ink,
    marginBottom: Spacing.md,
  },
  availabilityCount: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.cobalt,
  },
  courtList: { flexDirection: 'row' },
  courtCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginRight: Spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: 140,
  },
  courtCardSelected: {
    borderColor: colors.cobalt,
    backgroundColor: colors.white,
  },
  courtCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  courtName: { ...TextStyles.bodyLarge, fontWeight: '600', color: colors.ink },
  courtNameSelected: { color: colors.cobalt },
  courtBadge: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  courtBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.white,
  },
  courtSportType: {
    ...TextStyles.caption,
    color: colors.inkFaint,
    marginTop: Spacing.xs,
  },
  courtPrice: {
    ...TextStyles.body,
    color: colors.cobalt,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  calendar: {
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleText: {
    fontFamily: fonts.semibold,
    ...typeScale.body,
    color: colors.ink,
  },
  // Slots loading / empty
  loadingSlotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  loadingSlotsText: { ...TextStyles.body, color: colors.inkFaint },
  noSlotsContainer: { alignItems: 'center', padding: Spacing.xxl },
  noSlotsText: {
    ...TextStyles.body,
    color: colors.inkFaint,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  // Legend
  legend: {
    padding: Spacing.lg,
    backgroundColor: colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 12,
  },
  legendTitle: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: Spacing.sm,
  },
  legendItems: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { ...TextStyles.body, color: colors.ink },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  footerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  footerStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerStatsText: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.inkFaint,
  },
  footerPrice: {
    fontFamily: fonts.heading,
    ...typeScale.h3,
    color: colors.cobalt,
  },
  bookButton: {
    ...ComponentStyles.button.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  bookButtonText: { fontFamily: fonts.ui, fontSize: 16, color: colors.surface },
});
