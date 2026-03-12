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
import { colors, Spacing, TextStyles } from '../../theme';
import { FacilitiesStackParamList } from '../../navigation/types';
import { formatTime12 } from '../../utils/calendarUtils';

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
  createdAt: Date;
  timeSlot: TimeSlot;
}

export function MyRentalsScreen() {
  const navigation = useNavigation<MyRentalsScreenNavigationProp>();

  const [upcomingRentals, setUpcomingRentals] = useState<Rental[]>([]);
  const [pastRentals, setPastRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRentals();
  }, []);

  const loadRentals = async () => {
    try {
      // TODO: Get userId from auth context
      const userId = 'temp-user-id';

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/rentals/my-rentals?userId=${userId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load rentals');
      }

      const data: Rental[] = await response.json();

      // Separate upcoming and past rentals
      const now = new Date();
      const upcoming: Rental[] = [];
      const past: Rental[] = [];

      data.forEach((rental) => {
        const slotDateTime = new Date(rental.timeSlot.date);
        const [hours, minutes] = rental.timeSlot.startTime.split(':').map(Number);
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
    const slotDateTime = new Date(rental.timeSlot.date);
    const [hours, minutes] = rental.timeSlot.startTime.split(':').map(Number);
    slotDateTime.setHours(hours ?? 0, minutes ?? 0, 0, 0);

    const hoursUntilRental = (slotDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);

    if (hoursUntilRental < 2) {
      Alert.alert(
        'Cannot Cancel',
        'Rentals cannot be cancelled less than 2 hours before the start time.',
        [{ text: 'OK' }]
      );
      return;
    }

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
      // TODO: Get userId from auth context
      const userId = 'temp-user-id';

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/rentals/${rentalId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            cancellationReason: 'Cancelled by user',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel rental');
      }

      Alert.alert('Rental Cancelled', 'Your rental has been cancelled successfully.', [
        {
          text: 'OK',
          onPress: () => loadRentals(),
        },
      ]);
    } catch (error: any) {
      console.error('Cancel rental error:', error);
      Alert.alert('Cancellation Failed', error.message || 'Failed to cancel rental. Please try again.');
    }
  };

  const handleCreateEvent = (rental: Rental) => {
    // Navigate to CreateEvent screen with rental details pre-filled
    (navigation as any).navigate('Events', {
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
        ? colors.grass
        : rental.status === 'cancelled'
        ? colors.track
        : rental.status === 'completed'
        ? colors.sky
        : colors.soft;

    const statusIcon =
      rental.status === 'confirmed'
        ? 'checkmark-circle'
        : rental.status === 'cancelled'
        ? 'close-circle'
        : rental.status === 'completed'
        ? 'checkmark-done-circle'
        : 'help-circle';

    return (
      <View key={rental.id} style={styles.rentalCard}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Ionicons name={statusIcon} size={16} color={colors.chalk} />
          <Text style={styles.statusText}>{rental.status.toUpperCase()}</Text>
        </View>

        {/* Facility Info */}
        <TouchableOpacity
          onPress={() => handleViewFacility(rental.timeSlot.court.facility.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.facilityName}>{rental.timeSlot.court.facility.name}</Text>
          <Text style={styles.facilityAddress}>
            {rental.timeSlot.court.facility.street}, {rental.timeSlot.court.facility.city},{' '}
            {rental.timeSlot.court.facility.state}
          </Text>
        </TouchableOpacity>

        {/* Court Info */}
        <View style={styles.courtInfo}>
          <Ionicons name="basketball" size={20} color={colors.grass} />
          <Text style={styles.courtName}>{rental.timeSlot.court.name}</Text>
          <Text style={styles.courtSportType}>• {rental.timeSlot.court.sportType}</Text>
        </View>

        {/* Date and Time */}
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateTimeRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.soft} />
            <Text style={styles.dateTimeText}>{formattedDate}</Text>
          </View>
          <View style={styles.dateTimeRow}>
            <Ionicons name="time-outline" size={18} color={colors.soft} />
            <Text style={styles.dateTimeText}>
              {formatTime12(rental.timeSlot.startTime)} - {formatTime12(rental.timeSlot.endTime)}
            </Text>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Total Price:</Text>
          <Text style={styles.priceValue}>${rental.totalPrice.toFixed(2)}</Text>
        </View>

        {/* Action Buttons */}
        {isUpcoming && rental.status === 'confirmed' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.createEventButton}
              onPress={() => handleCreateEvent(rental)}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.grass} />
              <Text style={styles.createEventButtonText}>Create Event</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelRental(rental)}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.track} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cancellation Info */}
        {rental.status === 'cancelled' && rental.cancellationReason && (
          <View style={styles.cancellationInfo}>
            <Ionicons name="information-circle" size={16} color={colors.soft} />
            <Text style={styles.cancellationText}>{rental.cancellationReason}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.grass} />
        <Text style={styles.loadingText}>Loading your rentals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.grass}
            colors={[colors.grass]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Rentals</Text>
          <Text style={styles.headerSubtitle}>Manage your court and field bookings</Text>
        </View>

        {/* Upcoming Rentals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={24} color={colors.grass} />
            <Text style={styles.sectionTitle}>Upcoming Rentals</Text>
            {upcomingRentals.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{upcomingRentals.length}</Text>
              </View>
            )}
          </View>

          {upcomingRentals.length > 0 ? (
            upcomingRentals.map((rental) => renderRentalCard(rental, true))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={colors.soft} />
              <Text style={styles.emptyStateTitle}>No Upcoming Rentals</Text>
              <Text style={styles.emptyStateSubtitle}>
                Book a court or field to get started
              </Text>
            </View>
          )}
        </View>

        {/* Past Rentals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={24} color={colors.soft} />
            <Text style={styles.sectionTitle}>Past Rentals</Text>
            {pastRentals.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: colors.soft }]}>
                <Text style={styles.countText}>{pastRentals.length}</Text>
              </View>
            )}
          </View>

          {pastRentals.length > 0 ? (
            pastRentals.map((rental) => renderRentalCard(rental, false))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={64} color={colors.soft} />
              <Text style={styles.emptyStateTitle}>No Past Rentals</Text>
              <Text style={styles.emptyStateSubtitle}>
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
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...TextStyles.body,
    color: colors.soft,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...TextStyles.h2,
    color: colors.ink,
  },
  headerSubtitle: {
    ...TextStyles.body,
    color: colors.soft,
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
    color: colors.ink,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.grass,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    ...TextStyles.caption,
    color: colors.chalk,
    fontWeight: '700',
  },
  rentalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: Spacing.md,
  },
  statusText: {
    ...TextStyles.caption,
    color: colors.chalk,
    fontWeight: '700',
  },
  facilityName: {
    ...TextStyles.h4,
    color: colors.ink,
    marginBottom: Spacing.xs,
  },
  facilityAddress: {
    ...TextStyles.caption,
    color: colors.soft,
    marginBottom: Spacing.md,
  },
  courtInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.chalk,
    borderRadius: 8,
  },
  courtName: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
    color: colors.ink,
  },
  courtSportType: {
    ...TextStyles.body,
    color: colors.soft,
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
    color: colors.ink,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: Spacing.md,
  },
  priceLabel: {
    ...TextStyles.body,
    color: colors.soft,
  },
  priceValue: {
    ...TextStyles.h4,
    color: colors.grass,
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
    backgroundColor: colors.chalk,
    borderWidth: 2,
    borderColor: colors.grass,
    borderRadius: 8,
    paddingVertical: Spacing.md,
  },
  createEventButtonText: {
    ...TextStyles.body,
    fontWeight: '600',
    color: colors.grass,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: colors.chalk,
    borderWidth: 2,
    borderColor: colors.track,
    borderRadius: 8,
    paddingVertical: Spacing.md,
  },
  cancelButtonText: {
    ...TextStyles.body,
    fontWeight: '600',
    color: colors.track,
  },
  cancellationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: colors.chalk,
    borderRadius: 6,
  },
  cancellationText: {
    flex: 1,
    ...TextStyles.caption,
    color: colors.soft,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    ...TextStyles.h4,
    color: colors.ink,
    marginTop: Spacing.md,
  },
  emptyStateSubtitle: {
    ...TextStyles.body,
    color: colors.soft,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
