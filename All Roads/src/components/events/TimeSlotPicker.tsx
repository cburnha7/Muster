import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, Spacing, TextStyles } from '../../theme';

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  status: string;
  isSelectable: boolean;
  selectabilityReason: string;
  isUserRental: boolean;
  rentalId: string | null;
}

interface TimeSlotPickerProps {
  facilityId: string;
  courtId: string;
  userId: string;
  selectedSlotIds?: string[]; // Changed to array
  selectedDate?: string; // Date in YYYY-MM-DD format
  onSlotsSelect: (slots: TimeSlot[]) => void; // Changed to array
  rentalMode?: boolean; // If true, only allow selecting user's rental slots
}

export function TimeSlotPicker({
  facilityId,
  courtId,
  userId,
  selectedSlotIds = [],
  selectedDate,
  onSlotsSelect,
  rentalMode = false,
}: TimeSlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      loadSlots();
    }
  }, [facilityId, courtId, userId, selectedDate]);

  const loadSlots = async () => {
    if (!selectedDate) return;
    
    try {
      setLoading(true);
      // Convert selectedDate (YYYY-MM-DD) to the format expected by the API
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/facilities/${facilityId}/courts/${courtId}/slots-for-event?userId=${userId}&startDate=${selectedDate}&endDate=${selectedDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to load time slots');
      }

      const data = await response.json();
      console.log('📊 Raw slots from API:', data.slots.length);
      console.log('📅 Selected date:', selectedDate);
      
      // Filter slots to ONLY show the exact selected date
      const filteredSlots = data.slots.filter((slot: TimeSlot) => {
        const slotDateUTC = new Date(slot.date);
        const year = slotDateUTC.getUTCFullYear();
        const month = String(slotDateUTC.getUTCMonth() + 1).padStart(2, '0');
        const day = String(slotDateUTC.getUTCDate()).padStart(2, '0');
        const slotDateStr = `${year}-${month}-${day}`;
        const matches = slotDateStr === selectedDate;
        
        if (!matches) {
          console.log(`🚫 Filtering out slot from ${slotDateStr} (selected: ${selectedDate})`);
        }
        
        return matches;
      });
      
      console.log('📊 Filtered slots for selected date:', filteredSlots.length);
      
      // Deduplicate slots by ID (just in case)
      const uniqueSlots = Array.from(
        new Map(filteredSlots.map((slot: TimeSlot) => [slot.id, slot])).values()
      );
      
      console.log('📊 Final unique slots:', uniqueSlots.length);
      
      setSlots(uniqueSlots);
      setIsOwner(data.isOwner);
    } catch (error) {
      console.error('Load slots error:', error);
      Alert.alert('Error', 'Failed to load time slots');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const parts = time.split(':');
    if (parts.length < 2) return time;
    
    const hours = parts[0];
    const minutes = parts[1];
    if (!hours || !minutes) return time;
    
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getSlotStyle = (slot: TimeSlot) => {
    if (selectedSlotIds.includes(slot.id)) {
      return styles.slotSelected;
    }
    // If in rental mode, only allow user's rentals
    if (rentalMode) {
      if (slot.isUserRental) {
        return styles.slotUserRental; // User's rentals are selectable
      }
      return styles.slotDisabled; // Everything else is disabled
    }
    if (!slot.isSelectable) {
      return styles.slotDisabled;
    }
    if (slot.isUserRental) {
      return styles.slotUserRental;
    }
    return styles.slotAvailable;
  };

  const getSlotTextStyle = (slot: TimeSlot) => {
    if (selectedSlotIds.includes(slot.id)) {
      return styles.slotTextSelected;
    }
    // If in rental mode, only allow user's rentals
    if (rentalMode) {
      if (slot.isUserRental) {
        return styles.slotText; // User's rentals have normal text
      }
      return styles.slotTextDisabled; // Everything else is grayed out
    }
    if (!slot.isSelectable) {
      return styles.slotTextDisabled;
    }
    return styles.slotText;
  };

  // Check if slots are sequential
  const areSequential = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
    return slot1.endTime === slot2.startTime;
  };

  const handleSlotPress = (slot: TimeSlot) => {
    // If in rental mode, only allow user's rentals
    if (rentalMode) {
      if (!slot.isUserRental) {
        Alert.alert('Unavailable', 'You can only select time slots from your reservations.');
        return;
      }
      // In rental mode, allow selecting any user rental (non-sequential allowed)
      const isSelected = selectedSlotIds.includes(slot.id);
      if (isSelected) {
        // Deselect this slot
        const newSelectedSlots = slots.filter(s => 
          selectedSlotIds.includes(s.id) && s.id !== slot.id
        );
        onSlotsSelect(newSelectedSlots);
      } else {
        // Add this slot to selection
        const newSelectedSlots = [...slots.filter(s => selectedSlotIds.includes(s.id)), slot];
        // Sort by time for display
        newSelectedSlots.sort((a, b) => {
          const aIndex = slots.findIndex(s => s.id === a.id);
          const bIndex = slots.findIndex(s => s.id === b.id);
          return aIndex - bIndex;
        });
        onSlotsSelect(newSelectedSlots);
      }
      return;
    }

    // Owner mode: require sequential selection
    if (!slot.isSelectable && !slot.isUserRental) {
      Alert.alert('Unavailable', slot.selectabilityReason);
      return;
    }

    const currentIndex = slots.findIndex(s => s.id === slot.id);
    const isSelected = selectedSlotIds.includes(slot.id);

    if (isSelected) {
      // Deselect: remove this slot and any after it
      const selectedIndices = selectedSlotIds
        .map(id => slots.findIndex(s => s.id === id))
        .filter(idx => idx !== -1)
        .sort((a, b) => a - b);
      
      const clickedIndex = selectedIndices.indexOf(currentIndex);
      const newSelectedIds = selectedSlotIds.slice(0, clickedIndex);
      const newSelectedSlots = slots.filter(s => newSelectedIds.includes(s.id));
      onSlotsSelect(newSelectedSlots);
    } else {
      // Select: add if sequential or start new selection
      if (selectedSlotIds.length === 0) {
        // First selection
        onSlotsSelect([slot]);
      } else {
        // Check if sequential with last selected
        const selectedIndices = selectedSlotIds
          .map(id => slots.findIndex(s => s.id === id))
          .filter(idx => idx !== -1)
          .sort((a, b) => a - b);
        
        const lastIndex = selectedIndices[selectedIndices.length - 1];
        if (lastIndex === undefined) {
          onSlotsSelect([slot]);
          return;
        }
        
        const lastSlot = slots[lastIndex];
        if (!lastSlot) {
          onSlotsSelect([slot]);
          return;
        }

        if (currentIndex === lastIndex + 1 && areSequential(lastSlot, slot)) {
          // Sequential - add to selection
          const newSelectedSlots = [...slots.filter(s => selectedSlotIds.includes(s.id)), slot];
          onSlotsSelect(newSelectedSlots);
        } else {
          // Not sequential - start new selection
          onSlotsSelect([slot]);
        }
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.grass} />
        <Text style={styles.loadingText}>Loading available time slots...</Text>
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={48} color={colors.soft} />
        <Text style={styles.emptyTitle}>No Time Slots Available</Text>
        <Text style={styles.emptyText}>
          {isOwner
            ? 'No time slots have been created for this date.'
            : 'You have no reservations for this date. Book a time slot first to create an event.'}
        </Text>
      </View>
    );
  }

  const selectableCount = slots.filter(s => s.isSelectable).length;

  if (selectableCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.soft} />
        <Text style={styles.emptyTitle}>No Selectable Slots</Text>
        <Text style={styles.emptyText}>
          {isOwner
            ? 'All time slots for this date are currently booked, rented, or blocked.'
            : 'All your reservations for this date have been used. Book additional time slots to create more events.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Available Time Slots</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {selectableCount} available
          </Text>
        </View>
      </View>

      {!isOwner && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.sky} />
          <Text style={styles.infoText}>
            {rentalMode 
              ? 'Select any of your reservations. You can select multiple non-sequential slots.'
              : 'You can only select from your confirmed reservations. Tap sequential slots to combine them.'}
          </Text>
        </View>
      )}

      {isOwner && selectedSlotIds.length > 0 && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.grass} />
          <Text style={styles.infoText}>
            {selectedSlotIds.length} slot{selectedSlotIds.length > 1 ? 's' : ''} selected. Tap sequential slots to extend your event.
          </Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.slotList}>
          {slots.map((slot) => (
            <TouchableOpacity
              key={slot.id}
              style={[styles.slotItem, getSlotStyle(slot)]}
              onPress={() => handleSlotPress(slot)}
              disabled={!slot.isSelectable || (rentalMode && !slot.isUserRental)}
              activeOpacity={0.7}
            >
              <View style={styles.slotContent}>
                <View style={styles.slotTimeContainer}>
                  <Text style={[styles.slotTime, getSlotTextStyle(slot)]}>
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </Text>
                  {slot.price > 0 && (
                    <Text style={[styles.slotPrice, getSlotTextStyle(slot)]}>
                      ${slot.price}
                    </Text>
                  )}
                </View>
                <View style={styles.slotBadges}>
                  {slot.isUserRental && (
                    <View style={styles.rentalBadge}>
                      <Text style={styles.rentalBadgeText}>Your Rental</Text>
                    </View>
                  )}
                  {selectedSlotIds.includes(slot.id) && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.chalk} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend:</Text>
        <View style={styles.legendItems}>
          {isOwner ? (
            <>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.grass }]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.soft }]} />
                <Text style={styles.legendText}>Unavailable</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.sky }]} />
                <Text style={styles.legendText}>Your Rental</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.soft }]} />
                <Text style={styles.legendText}>Not Reserved</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  label: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
    color: colors.ink,
  },
  badge: {
    backgroundColor: colors.grass + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    ...TextStyles.caption,
    color: colors.grass,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.skyLight + '20',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  infoText: {
    ...TextStyles.caption,
    color: colors.ink,
    flex: 1,
  },
  scrollView: {
    flex: 1,
    marginBottom: Spacing.md,
  },
  slotList: {
    gap: Spacing.sm,
  },
  slotItem: {
    padding: Spacing.md,
    borderRadius: 8,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  slotAvailable: {
    backgroundColor: colors.background,
  },
  slotUserRental: {
    backgroundColor: colors.sky + '10',
    shadowColor: colors.sky,
    shadowOpacity: 0.12,
  },
  slotSelected: {
    backgroundColor: colors.grass,
    shadowColor: colors.grass,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  slotDisabled: {
    backgroundColor: colors.chalk,
    opacity: 0.5,
  },
  slotContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotTimeContainer: {
    flex: 1,
  },
  slotTime: {
    ...TextStyles.body,
    fontWeight: '600',
    color: colors.ink,
  },
  slotPrice: {
    ...TextStyles.caption,
    color: colors.soft,
    marginTop: 2,
  },
  slotBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  slotText: {
    color: colors.ink,
  },
  slotTextSelected: {
    color: colors.textInverse,
  },
  slotTextDisabled: {
    color: colors.soft,
  },
  rentalBadge: {
    backgroundColor: colors.sky + '30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  rentalBadgeText: {
    ...TextStyles.caption,
    fontSize: 10,
    color: colors.sky,
    fontWeight: '600',
  },
  legend: {
    backgroundColor: colors.chalk,
    padding: Spacing.md,
    borderRadius: 8,
  },
  legendTitle: {
    ...TextStyles.caption,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: Spacing.xs,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...TextStyles.caption,
    color: colors.soft,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    ...TextStyles.body,
    color: colors.soft,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyTitle: {
    ...TextStyles.h3,
    color: colors.ink,
  },
  emptyText: {
    ...TextStyles.body,
    color: colors.soft,
    textAlign: 'center',
  },
});
