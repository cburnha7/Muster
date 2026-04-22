import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { fonts, Spacing, TextStyles, useTheme } from '../../theme';
import { FacilitiesStackParamList } from '../../navigation/types';
import { formatTime12 } from '../../utils/calendarUtils';
import { API_BASE_URL } from '../../services/api/config';
import TokenStorage from '../../services/auth/TokenStorage';

type MyRentalsScreenNavigationProp = NativeStackNavigationProp<
  FacilitiesStackParamList,
  'FacilitiesList'
>;

interface TimeSlot {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  price: number;
  court: {
    id: string;
    name: string;
    sportType: string;
    facility: {
      id: string;
      name: string;
      street: string;
      city: string;
      state: string;
    };
  };
}

interface Rental {
  id: string;
  status: string;
  totalPrice: number;
  paymentStatus: string;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  cancellationStatus: string | null;
  createdAt: Date;
  timeSlot: TimeSlot;
}

export function MyRentalsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<MyRentalsScreenNavigationProp>();
  const user = useSelector(selectUser);

  const [upcomingRentals, setUpcomingRentals] = useState<Rental[]>([]);
  const [pastRentals, setPastRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRentals();
  }, [user?.id]);

  const loadRentals = async () => {
    if (!user?.id) return;
    try {
      const token = await TokenStorage.getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/rentals/my-rentals?userId=${user.id}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load rentals');
      }

      const data: Rental[] = await response.json();

      // Separate upcoming and past rentals
      const now = new Date();
      const upcoming: Rental[] = [];
      const past: Rental[] = [];

      data.forEach(rental => {
        const slotDateTime = new Date(rental.timeSlot.date);
        const [hours, minutes] = rental.timeSlot.startTime
          .split(':')
          .map(Number);
        slotDateTime.setHours(hours ?? 0, minutes ?? 0, 0, 0);

        if (slotDateTime > now && rental.status !== 'cancelled') {
          upcoming.push(rental);
        } else {
          past.push(rental);
        }
      });

      setUpcomingRentals(upcoming);
      setPastRentals(past);
    } catch (error) {
      console.error('Load rentals error:', error);
      Alert.alert('Error', 'Failed to load rentals. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRentals();
  }, []);

  const handleCancelRental = (rental: Rental) => {
    Alert.alert(
      'Cancel Rental',
      `Are you sure you want to cancel your rental at ${rental.timeSlot.court.facility.name}?\n\nYou will receive a full refund if payment was made.`,
      [
        {
          text: 'No, Keep It',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => confirmCancelRental(rental.id),
        },
      ]
    );
  };

  const confirmCancelRental = async (rentalId: string) => {
    try {
      const token = await TokenStorage.getAccessToken();
      const response = await fetch(`${API_BASE_URL}/rentals/${rentalId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cancellationReason: 'Cancelled by user',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel rental');
      }

      const data = await response.json();

      if (data.cancellationStatus === 'pending') {
        Alert.alert(
          'Cancellation Request Submitted',
          'Your cancellation request has been submitted and is pending approval from the ground owner.',
          [
            {
              text: 'OK',
              onPress: () => loadRentals(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Rental Cancelled',
          'Your rental has been cancelled successfully.',
          [
            {
              text: 'OK',
              onPress: () => loadRentals(),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Cancel rental error:', error);
      Alert.alert(
        'Cancellation Failed',
        error.message || 'Failed to cancel rental. Please try again.'
      );
    }
  };

  const handleCreateEvent = (rental: Rental) => {
    // Navigate to CreateEvent screen with rental details pre-filled
    (navigation as any).navigate('Home', {
      screen: 'CreateEvent',
      params: { rentalId: rental.id },
    });
  };

  const handleViewFacility = (facilityId: string) => {
    navigation.navigate('FacilityDetails', { facilityId });
  };

  const renderRentalCard = (rental: Rental, isUpcoming: boolean) => {
    const slotDate = new Date(rental.timeSlot.date);
    const formattedDate = slotDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const statusColor =
      rental.status === 'confirmed'
        ? colors.cobalt
        : rental.status === 'cancelled'
          ? colors.heart
          : rental.status === 'completed'
            ? colors.ink
            : colors.inkFaint;

    const statusIcon =
      rental.status === 'confirmed'
        ? 'checkmark-circle'
        : rental.status === 'cancelled'
          ? 'close-circle'
          : rental.status === 'completed'
            ? 'checkmark-done-circle'
            : 'help-circle';

    return (
      <View
        key={rental.id}
        style={[
          styles.rentalCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {/* Status Badge */}
        <View style={styles.badgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons name={statusIcon} size={16} color={colors.surface} />
            <Text style={[styles.statusText, { color: colors.surface }]}>
              {rental.status.toUpperCase()}
            </Text>
          </View>

          {/* Cancellation Pending Badge */}
          {rental.cancellationStatus === 'pending' && (
            <View
              style={[
                styles.statusBadge,
                styles.cancellationPendingBadge,
                { backgroundColor: colors.gold },
              ]}
            >
              <Ionicons
                name="hourglass-outline"
                size={14}
                color={colors.surface}
              />
              <Text
                style={[
                  styles.cancellationPendingText,
                  { color: colors.surface },
                ]}
              >
                CANCELLATION PENDING
              </Text>
            </View>
          )}
        </View>

        {/* Facility Info */}
        <TouchableOpacity
          onPress={() => handleViewFacility(rental.timeSlot.court.facility.id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.facilityName, { color: colors.ink }]}>
            {rental.timeSlot.court.facility.name}
          </Text>
          <Text style={[styles.facilityAddress, { color: colors.inkFaint }]}>
            {rental.timeSlot.court.facility.street},{' '}
            {rental.timeSlot.court.facility.city},{' '}
            {rental.timeSlot.court.facility.state}
          </Text>
        </TouchableOpacity>

        {/* Court Info */}
        <View style={[styles.courtInfo, { backgroundColor: colors.white }]}>
          <Ionicons name="basketball" size={20} color={colors.cobalt} />
          <Text style={[styles.courtName, { color: colors.ink }]}>
            {rental.timeSlot.court.name}
          </Text>
          <Text style={[styles.courtSportType, { color: colors.inkFaint }]}>
            • {rental.timeSlot.court.sportType}
          </Text>
        </View>

        {/* Date and Time */}
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateTimeRow}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.inkFaint}
            />
            <Text style={[styles.dateTimeText, { color: colors.ink }]}>
              {formattedDate}
            </Text>
          </View>
          <View style={styles.dateTimeRow}>
            <Ionicons name="time-outline" size={18} color={colors.inkFaint} />
            <Text style={[styles.dateTimeText, { color: colors.ink }]}>
              {formatTime12(rental.timeSlot.startTime)} -{' '}
              {formatTime12(rental.timeSlot.endTime)}
            </Text>
          </View>
        </View>

        {/* Price */}
        <View
          style={[styles.priceContainer, { borderTopColor: colors.border }]}
        >
          <Text style={[styles.priceLabel, { color: colors.inkFaint }]}>
            Total Price:
          </Text>
          <Text style={[styles.priceValue, { color: colors.cobalt }]}>
            ${rental.totalPrice.toFixed(2)}
          </Text>
        </View>

        {/* Action Buttons */}
        {isUpcoming && rental.status === 'confirmed' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.createEventButton,
                { backgroundColor: colors.white, borderColor: colors.cobalt },
              ]}
              onPress={() => handleCreateEvent(rental)}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={colors.cobalt}
              />
              <Text
                style={[styles.createEventButtonText, { color: colors.cobalt }]}
              >
                Create Event
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.white, borderColor: colors.heart },
                rental.cancellationStatus === 'pending' &&
                  styles.cancelButtonDisabled,
                rental.cancellationStatus === 'pending' && {
                  borderColor: colors.inkFaint,
                },
              ]}
              onPress={() => handleCancelRental(rental)}
              disabled={rental.cancellationStatus === 'pending'}
            >
              <Ionicons
                name="close-circle-outline"
                size={20}
                color={
                  rental.cancellationStatus === 'pending'
                    ? colors.inkFaint
                    : colors.heart
                }
              />
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.heart },
                  rental.cancellationStatus === 'pending' &&
                    styles.cancelButtonTextDisabled,
                  rental.cancellationStatus === 'pending' && {
                    color: colors.inkFaint,
                  },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cancellation Info */}
        {rental.status === 'cancelled' && rental.cancellationReason && (
          <View
            style={[styles.cancellationInfo, { backgroundColor: colors.white }]}
          >
            <Ionicons
              name="information-circle"
              size={16}
              color={colors.inkFaint}
            />
            <Text style={[styles.cancellationText, { color: colors.inkFaint }]}>
              {rental.cancellationReason}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
          { backgroundColor: colors.bgScreen },
        ]}
      >
        <ActivityIndicator size="large" color={colors.cobalt} />
        <Text style={[styles.loadingText, { color: colors.inkFaint }]}>
          Loading your rentals...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
        { backgroundColor: colors.bgScreen },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cobalt}
            colors={[colors.cobalt]}
          />
        }
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.ink }]}>
            My Rentals
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.inkFaint }]}>
            Manage your court and field bookings
          </Text>
        </View>

        {/* Upcoming Rentals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={24} color={colors.cobalt} />
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              Upcoming Rentals
            </Text>
            {upcomingRentals.length > 0 && (
              <View
                style={[styles.countBadge, { backgroundColor: colors.cobalt }]}
              >
                <Text style={[styles.countText, { color: colors.surface }]}>
                  {upcomingRentals.length}
                </Text>
              </View>
            )}
          </View>

          {upcomingRentals.length > 0 ? (
            upcomingRentals.map(rental => renderRentalCard(rental, true))
          ) : (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={64}
                color={colors.inkFaint}
              />
              <Text style={[styles.emptyStateTitle, { color: colors.ink }]}>
                No Upcoming Rentals
              </Text>
              <Text
                style={[styles.emptyStateSubtitle, { color: colors.inkFaint }]}
              >
                Book a court or field to get started
              </Text>
            </View>
          )}
        </View>

        {/* Past Rentals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={24} color={colors.inkFaint} />
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              Past Rentals
            </Text>
            {pastRentals.length > 0 && (
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: colors.cobalt },
                  { backgroundColor: colors.inkFaint },
                ]}
              >
                <Text style={[styles.countText, { color: colors.surface }]}>
                  {pastRentals.length}
                </Text>
              </View>
            )}
          </View>

          {pastRentals.length > 0 ? (
            pastRentals.map(rental => renderRentalCard(rental, false))
          ) : (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="time-outline" size={64} color={colors.inkFaint} />
              <Text style={[styles.emptyStateTitle, { color: colors.ink }]}>
                No Past Rentals
              </Text>
              <Text
                style={[styles.emptyStateSubtitle, { color: colors.inkFaint }]}
              >
                Your rental history will appear here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...TextStyles.body,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...TextStyles.h2,
  },
  headerSubtitle: {
    ...TextStyles.body,
    marginTop: Spacing.xs,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...TextStyles.h3,
    flex: 1,
  },
  countBadge: {
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    ...TextStyles.caption,
    fontWeight: '700',
  },
  rentalCard: {
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    ...TextStyles.caption,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cancellationPendingBadge: {},
  cancellationPendingText: {
    fontFamily: fonts.label,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.8,
  },
  facilityName: {
    ...TextStyles.h4,
    marginBottom: Spacing.xs,
  },
  facilityAddress: {
    ...TextStyles.caption,
    marginBottom: Spacing.md,
  },
  courtInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
  },
  courtName: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
  },
  courtSportType: {
    ...TextStyles.body,
  },
  dateTimeContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateTimeText: {
    ...TextStyles.body,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginBottom: Spacing.md,
  },
  priceLabel: {
    ...TextStyles.body,
  },
  priceValue: {
    ...TextStyles.h4,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  createEventButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: Spacing.md,
  },
  createEventButtonText: {
    ...TextStyles.body,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: Spacing.md,
  },
  cancelButtonText: {
    ...TextStyles.body,
    fontWeight: '600',
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonTextDisabled: {},
  cancellationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 6,
  },
  cancellationText: {
    flex: 1,
    ...TextStyles.caption,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    ...TextStyles.h4,
    marginTop: Spacing.md,
  },
  emptyStateSubtitle: {
    ...TextStyles.body,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
