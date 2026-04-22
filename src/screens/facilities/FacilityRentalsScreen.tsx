/**
 * FacilityRentalsScreen — calendar view of all incoming rental bookings
 * for a facility owner/manager.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { fonts, Spacing, useTheme } from '../../theme';
import { FacilitiesStackParamList } from '../../navigation/types';
import {
  calendarTheme,
  formatDateForCalendar,
  formatTime12,
} from '../../utils/calendarUtils';
import { API_BASE_URL } from '../../services/api/config';
import TokenStorage from '../../services/auth/TokenStorage';

type Nav = NativeStackNavigationProp<
  FacilitiesStackParamList,
  'FacilityRentals'
>;
type Route = RouteProp<FacilitiesStackParamList, 'FacilityRentals'>;

interface RentalUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface RentalTimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  court: {
    id: string;
    name: string;
    sportType: string;
  };
}

interface Rental {
  id: string;
  status: string;
  totalPrice: number;
  paymentStatus: string;
  cancellationStatus: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  timeSlot: RentalTimeSlot;
  user: RentalUser;
}

export function FacilityRentalsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { facilityId, facilityName } = route.params ?? {};

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    formatDateForCalendar(new Date())
  );

  const loadRentals = useCallback(async () => {
    try {
      const token = await TokenStorage.getAccessToken();
      const res = await fetch(
        `${API_BASE_URL}/rentals/facilities/${facilityId}/rentals`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!res.ok) throw new Error('Failed to load rentals');
      const data = await res.json();
      setRentals(Array.isArray(data) ? data : (data.rentals ?? []));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load rentals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [facilityId]);

  useEffect(() => {
    loadRentals();
  }, [loadRentals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRentals();
  }, [loadRentals]);

  // Build marked dates — dot on each date that has at least one rental
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    for (const r of rentals) {
      const d = r.timeSlot.date?.split('T')[0];
      if (d) {
        marks[d] = {
          ...(marks[d] || {}),
          marked: true,
          dotColor: colors.cobalt,
        };
      }
    }
    // Highlight selected date
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] || {}),
        selected: true,
        selectedColor: colors.cobalt,
      };
    }
    return marks;
  }, [rentals, selectedDate, colors.cobalt]);

  // Filter rentals for the selected date
  const rentalsForDate = useMemo(() => {
    return rentals.filter(r => {
      const d = r.timeSlot.date?.split('T')[0];
      return d === selectedDate;
    });
  }, [rentals, selectedDate]);

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const handleRentalPress = (rental: Rental) => {
    (navigation as any).navigate('PendingReservationDetails', {
      rentalId: rental.id,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return colors.cobalt;
      case 'cancelled':
        return colors.heart;
      case 'completed':
        return colors.ink;
      default:
        return colors.inkFaint;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      case 'completed':
        return 'checkmark-done-circle';
      default:
        return 'help-circle';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
        <ScreenHeader
          title="Rental Bookings"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      <ScreenHeader
        title="Rental Bookings"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        subtitle={facilityName}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cobalt}
          />
        }
      >
        {/* Calendar */}
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: colors.bgCard, shadowColor: colors.ink },
          ]}
        >
          <Calendar
            current={selectedDate}
            onDayPress={handleDayPress}
            markedDates={markedDates}
            theme={calendarTheme}
            style={styles.calendar}
          />
        </View>

        {/* Rentals for selected date */}
        <View style={styles.dateSection}>
          <Text style={[styles.dateSectionTitle, { color: colors.ink }]}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <Text
            style={[styles.dateSectionCount, { color: colors.inkSecondary }]}
          >
            {rentalsForDate.length} booking
            {rentalsForDate.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {rentalsForDate.length === 0 ? (
          <View
            style={[styles.emptyState, { backgroundColor: colors.surface }]}
          >
            <Ionicons
              name="calendar-outline"
              size={32}
              color={colors.inkFaint}
            />
            <Text style={[styles.emptyText, { color: colors.inkFaint }]}>
              No bookings on this day
            </Text>
          </View>
        ) : (
          rentalsForDate.map(rental => {
            const statusColor = getStatusColor(rental.status);
            const statusIcon = getStatusIcon(rental.status);

            return (
              <TouchableOpacity
                key={rental.id}
                style={[
                  styles.rentalCard,
                  {
                    backgroundColor: colors.bgCard,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleRentalPress(rental)}
                activeOpacity={0.7}
              >
                {/* Status + Cancellation badges */}
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColor },
                    ]}
                  >
                    <Ionicons
                      name={statusIcon}
                      size={14}
                      color={colors.white}
                    />
                    <Text style={[styles.statusText, { color: colors.white }]}>
                      {rental.status.toUpperCase()}
                    </Text>
                  </View>
                  {rental.cancellationStatus === 'pending' && (
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: colors.gold },
                      ]}
                    >
                      <Ionicons
                        name="hourglass-outline"
                        size={12}
                        color={colors.white}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: colors.white, fontSize: 9 },
                        ]}
                      >
                        CANCELLATION PENDING
                      </Text>
                    </View>
                  )}
                </View>

                {/* Renter */}
                <View style={styles.renterRow}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={colors.cobalt}
                  />
                  <Text style={[styles.renterName, { color: colors.ink }]}>
                    {rental.user.firstName} {rental.user.lastName}
                  </Text>
                </View>

                {/* Court */}
                <View style={styles.detailRow}>
                  <Ionicons
                    name="basketball-outline"
                    size={16}
                    color={colors.inkFaint}
                  />
                  <Text
                    style={[styles.detailText, { color: colors.inkSecondary }]}
                  >
                    {rental.timeSlot.court.name} ·{' '}
                    {rental.timeSlot.court.sportType}
                  </Text>
                </View>

                {/* Time */}
                <View style={styles.detailRow}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={colors.inkFaint}
                  />
                  <Text
                    style={[styles.detailText, { color: colors.inkSecondary }]}
                  >
                    {formatTime12(rental.timeSlot.startTime)} –{' '}
                    {formatTime12(rental.timeSlot.endTime)}
                  </Text>
                </View>

                {/* Price */}
                <View
                  style={[styles.priceRow, { borderTopColor: colors.border }]}
                >
                  <Text style={[styles.priceLabel, { color: colors.inkFaint }]}>
                    Total
                  </Text>
                  <Text style={[styles.priceValue, { color: colors.cobalt }]}>
                    ${rental.totalPrice.toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  calendarCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  calendar: { borderRadius: 12 },
  dateSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  dateSectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  dateSectionCount: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 32,
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  rentalCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  renterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  renterName: {
    fontFamily: fonts.headingSemi || fonts.heading,
    fontSize: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  priceValue: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
});
