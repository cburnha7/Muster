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
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors, Spacing, TextStyles } from '../../theme';
import { courtService, TimeSlot, Court } from '../../services/api/CourtService';
import { calendarTheme, formatDateForCalendar, formatTime12 } from '../../utils/calendarUtils';
import { TimeSlotGrid, TimeSlot as GridTimeSlot } from '../../components/facilities/TimeSlotGrid';
import { BlockTimeSlotModal } from '../../components/facilities/BlockTimeSlotModal';

interface GroundAvailabilityScreenProps {
  route: {
    params: {
      facilityId: string;
      facilityName: string;
    };
  };
  navigation: any;
}

export function GroundAvailabilityScreen({
  route,
  navigation,
}: GroundAvailabilityScreenProps) {
  const { facilityId, facilityName } = route.params;

  const [selectedDate, setSelectedDate] = useState<string>(formatDateForCalendar(new Date()));
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [selectedCourtForBlock, setSelectedCourtForBlock] = useState<{
    courtId: string;
    courtName: string;
  } | null>(null);

  useEffect(() => {
    loadCourts();
  }, [facilityId]);

  useEffect(() => {
    if (selectedCourtIds.length > 0) {
      loadTimeSlotsForDate();
    }
  }, [selectedDate, selectedCourtIds]);

  const loadCourts = async () => {
    try {
      setLoading(true);
      const courtsData = await courtService.getCourts(facilityId);
      const activeCourts = courtsData.filter((c) => c.isActive);
      setCourts(activeCourts);
      
      if (activeCourts.length > 0) {
        setSelectedCourtIds(activeCourts.map((c) => c.id));
      }
    } catch (error) {
      console.error('Failed to load courts:', error);
      Alert.alert('Error', 'Failed to load courts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlotsForDate = async () => {
    try {
      const allSlots: TimeSlot[] = [];

      for (const courtId of selectedCourtIds) {
        const slots = await courtService.getTimeSlots(facilityId, courtId, {
          startDate: selectedDate,
          endDate: selectedDate,
        });
        allSlots.push(...slots);
      }

      setTimeSlots(allSlots);
    } catch (error) {
      console.error('Failed to load time slots:', error);
      Alert.alert('Error', 'Failed to load availability. Please try again.');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCourts();
    if (selectedCourtIds.length > 0) {
      await loadTimeSlotsForDate();
    }
    setRefreshing(false);
  }, [selectedCourtIds]);

  const handleDateSelect = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const toggleCourtSelection = (courtId: string) => {
    setSelectedCourtIds((prev) => {
      if (prev.includes(courtId)) {
        return prev.filter((id) => id !== courtId);
      } else {
        return [...prev, courtId];
      }
    });
  };

  const handleAddBlockSlot = (courtId: string) => {
    const court = courts.find((c) => c.id === courtId);
    if (court) {
      setSelectedCourtForBlock({ courtId: court.id, courtName: court.name });
      setBlockModalVisible(true);
    }
  };

  const handleBlockSuccess = async () => {
    setBlockModalVisible(false);
    setSelectedCourtForBlock(null);
    await loadTimeSlotsForDate();
  };

  const handleSlotPress = (slot: GridTimeSlot) => {
    if (slot.status === 'blocked') {
      Alert.alert(
        'Blocked Time Slot',
        `Reason: ${slot.blockReason || 'No reason provided'}\n\nWould you like to unblock this slot?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unblock',
            style: 'destructive',
            onPress: () => handleUnblockSlot(slot),
          },
        ]
      );
    } else if (slot.status === 'rented') {
      const startTime = slot.startTime || '';
      const endTime = slot.endTime || '';
      Alert.alert(
        'Rented Time Slot',
        `This slot has been rented.\nCourt: ${slot.courtName || 'Unknown'}\nTime: ${formatTime12(startTime)} - ${formatTime12(endTime)}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleUnblockSlot = async (slot: GridTimeSlot) => {
    if (!slot.id || !slot.courtId) return;

    try {
      await courtService.unblockTimeSlot(facilityId, slot.courtId, slot.id);
      Alert.alert('Success', 'Time slot unblocked successfully');
      await loadTimeSlotsForDate();
    } catch (error: any) {
      console.error('Failed to unblock time slot:', error);
      Alert.alert('Error', error.message || 'Failed to unblock time slot');
    }
  };

  const convertToGridSlots = (): GridTimeSlot[] => {
    return timeSlots.map((slot) => {
      const court = courts.find((c) => c.id === slot.courtId);
      return {
        id: slot.id || '',
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
        blockReason: slot.blockReason || '',
        courtId: slot.courtId || '',
        courtName: court?.name || '',
        price: slot.price || 0,
      };
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.grass} />
        <Text style={styles.loadingText}>Loading availability...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Ground Availability</Text>
          <Text style={styles.headerSubtitle}>{facilityName}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={handleDateSelect}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: colors.grass,
              },
            }}
            theme={calendarTheme}
            minDate={formatDateForCalendar(new Date())}
          />
        </View>

        {courts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Courts</Text>
            <View style={styles.courtSelector}>
              {courts.map((court) => (
                <TouchableOpacity
                  key={court.id}
                  style={[
                    styles.courtChip,
                    selectedCourtIds.includes(court.id) && styles.courtChipSelected,
                  ]}
                  onPress={() => toggleCourtSelection(court.id)}
                >
                  <Text
                    style={[
                      styles.courtChipText,
                      selectedCourtIds.includes(court.id) && styles.courtChipTextSelected,
                    ]}
                  >
                    {court.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {selectedCourtIds.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Availability for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  if (selectedCourtIds.length === 1) {
                    handleAddBlockSlot(selectedCourtIds[0]!);
                  } else {
                    Alert.alert('Select One Court', 'Please select a single court to block a time slot.');
                  }
                }}
              >
                <Ionicons name="add-circle" size={24} color={colors.grass} />
                <Text style={styles.addButtonText}>Block Slot</Text>
              </TouchableOpacity>
            </View>
            <TimeSlotGrid
              timeSlots={convertToGridSlots()}
              onSlotPress={handleSlotPress}
              showCourtName={selectedCourtIds.length > 1}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.soft} />
            <Text style={styles.emptyStateText}>
              Select at least one court to view availability
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legend</Text>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors.grass }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors.track }]} />
              <Text style={styles.legendText}>Blocked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors.sky }]} />
              <Text style={styles.legendText}>Rented</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {selectedCourtForBlock && (
        <BlockTimeSlotModal
          visible={blockModalVisible}
          facilityId={facilityId}
          courtId={selectedCourtForBlock.courtId}
          courtName={selectedCourtForBlock.courtName}
          selectedDate={selectedDate}
          onClose={() => {
            setBlockModalVisible(false);
            setSelectedCourtForBlock(null);
          }}
          onSuccess={handleBlockSuccess}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...TextStyles.body,
    color: colors.textSecondary,
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...TextStyles.h3,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...TextStyles.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: colors.surface,
    marginBottom: Spacing.md,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...TextStyles.h4,
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  addButtonText: {
    ...TextStyles.body,
    color: colors.grass,
    fontWeight: '600',
  },
  courtSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  courtChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courtChipSelected: {
    backgroundColor: colors.grass,
    borderColor: colors.grass,
  },
  courtChipText: {
    ...TextStyles.body,
    color: colors.textPrimary,
  },
  courtChipTextSelected: {
    color: colors.textInverse,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyStateText: {
    ...TextStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  legendText: {
    ...TextStyles.body,
    color: colors.textPrimary,
  },
});
