import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { matchService } from '../../services/api/MatchService';
import { courtService } from '../../services/api/CourtService';
import { selectUser } from '../../store/slices/authSlice';
import { colors, fonts, Spacing } from '../../theme';
import { Match } from '../../types';

/** Extended rental type matching the actual API response (court includes nested facility) */
interface RentalItem {
  id: string;
  userId: string;
  status: string;
  totalPrice: number;
  timeSlot?: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    court?: {
      id: string;
      name: string;
      sportType: string;
      facility?: {
        id: string;
        name: string;
        street?: string;
        city?: string;
      };
    };
  };
}

type AssignFacilityRouteProp = RouteProp<
  { AssignFacility: { matchId: string } },
  'AssignFacility'
>;

export const AssignFacilityScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<AssignFacilityRouteProp>();
  const user = useSelector(selectUser);
  const { matchId } = route.params;

  const [match, setMatch] = useState<Match | null>(null);
  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingData(true);
      setError(null);
      const [matchData, userRentals] = await Promise.all([
        matchService.getMatchById(matchId),
        courtService.getMyRentals(user!.id, { status: 'confirmed', upcoming: true }),
      ]);
      setMatch(matchData);
      // Filter out rentals already assigned to another match
      const availableRentals = userRentals.filter(
        (r) => r.status === 'confirmed'
      );
      setRentals(availableRentals);
    } catch (err) {
      setError('Failed to load data. Please try again.');
    } finally {
      setLoadingData(false);
    }
  }, [matchId, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async () => {
    if (!selectedRentalId || !user?.id) return;

    setAssigning(true);
    try {
      await matchService.assignRental(matchId, selectedRentalId, user.id);
      Alert.alert('Facility Assigned', 'The rental has been linked to this game.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to assign facility.';
      Alert.alert('Error', message);
    } finally {
      setAssigning(false);
    }
  };

  const handleBookNew = () => {
    navigation.navigate('Facilities', { screen: 'FacilitiesList' });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const formatTime = (time: string) => {
    const parts = time.split(':');
    const h = parseInt(parts[0] ?? '0', 10);
    const minutes = parts[1] ?? '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  if (loadingData) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Assign Facility"
          leftIcon="arrow-back"
          onLeftPress={handleCancel}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.pine} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Assign Facility"
          leftIcon="arrow-back"
          onLeftPress={handleCancel}
        />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Assign Facility"
        leftIcon="arrow-back"
        onLeftPress={handleCancel}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Match info */}
        {match && (
          <View style={styles.matchInfo}>
            <Text style={styles.sectionLabel}>GAME DETAILS</Text>
            <Text style={styles.matchTeams}>
              {match.homeTeam?.name ?? 'Home'} vs {match.awayTeam?.name ?? 'Away'}
            </Text>
            <Text style={styles.matchDate}>
              {formatDate(String(match.scheduledAt))}
            </Text>
          </View>
        )}

        {/* Rental list */}
        <Text style={styles.sectionLabel}>YOUR CONFIRMED RENTALS</Text>
        {rentals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={colors.inkFaint} />
            <Text style={styles.emptyText}>No available rentals</Text>
            <Text style={styles.emptySubtext}>
              You don't have any confirmed rentals to assign. Rent a facility first.
            </Text>
          </View>
        ) : (
          rentals.map((rental) => {
            const isSelected = selectedRentalId === rental.id;
            const slot = rental.timeSlot;
            const court = slot?.court;
            const facility = court?.facility;

            return (
              <TouchableOpacity
                key={rental.id}
                testID={`rental-card-${rental.id}`}
                style={[styles.rentalCard, isSelected && styles.rentalCardSelected]}
                onPress={() => setSelectedRentalId(rental.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${facility?.name ?? 'Facility'}, ${court?.name ?? 'Court'}`}
              >
                <View style={styles.rentalCardHeader}>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={isSelected ? colors.pine : colors.inkFaint}
                  />
                  <Text style={styles.facilityName}>
                    {facility?.name ?? 'Unknown Facility'}
                  </Text>
                </View>
                <Text style={styles.courtName}>{court?.name ?? 'Court'}</Text>
                {slot && (
                  <Text style={styles.slotDetails}>
                    {formatDate(slot.date)} · {formatTime(slot.startTime)} –{' '}
                    {formatTime(slot.endTime)}
                  </Text>
                )}
                <Text style={styles.rentalPrice}>
                  ${rental.totalPrice.toFixed(2)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* Book new facility button */}
        <TouchableOpacity
          style={styles.bookNewButton}
          onPress={handleBookNew}
          testID="book-new-facility"
          accessibilityRole="button"
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.navy} />
          <Text style={styles.bookNewText}>Rent a new facility</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          accessibilityRole="button"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.assignButton,
            (!selectedRentalId || assigning) && styles.assignButtonDisabled,
          ]}
          onPress={handleAssign}
          disabled={!selectedRentalId || assigning}
          testID="confirm-assign"
          accessibilityRole="button"
          accessibilityState={{ disabled: !selectedRentalId || assigning }}
        >
          {assigning ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.assignButtonText}>Assign Facility</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.heart,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    backgroundColor: colors.pine,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  matchInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.inkFaint,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  matchTeams: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
    marginBottom: Spacing.xs,
  },
  matchDate: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyText: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.ink,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xxl,
  },
  rentalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rentalCardSelected: {
    borderColor: colors.pine,
  },
  rentalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  facilityName: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.ink,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  courtName: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
    marginLeft: Spacing.xxxl,
  },
  slotDetails: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginLeft: Spacing.xxxl,
    marginTop: Spacing.xs,
  },
  rentalPrice: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.pine,
    marginLeft: Spacing.xxxl,
    marginTop: Spacing.xs,
  },
  bookNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  bookNewText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.navy,
    marginLeft: Spacing.sm,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginRight: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inkFaint,
  },
  cancelButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.ink,
  },
  assignButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 8,
    backgroundColor: colors.pine,
  },
  assignButtonDisabled: {
    opacity: 0.5,
  },
  assignButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
