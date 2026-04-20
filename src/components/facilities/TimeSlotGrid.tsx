import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, useTheme } from '../../theme';
import { formatTime12 } from '../../utils/calendarUtils';

export interface TimeSlot {
  id?: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'blocked' | 'rented';
  blockReason?: string;
  courtId?: string;
  courtName?: string;
  price?: number;
  rentalUserId?: string | null;
}

interface TimeSlotGridProps {
  timeSlots: TimeSlot[];
  onSlotPress?: (slot: TimeSlot) => void;
  onSlotLongPress?: (slot: TimeSlot) => void;
  selectable?: boolean;
  selectedSlots?: string[];
  showCourtName?: boolean;
  currentUserId?: string;
}

export function TimeSlotGrid({
  timeSlots,
  onSlotPress,
  onSlotLongPress,
  selectable = false,
  selectedSlots = [],
  showCourtName = false,
  currentUserId,
}: TimeSlotGridProps) {
  const { colors } = useTheme();
  const getSlotColor = (slot: TimeSlot, isSelected: boolean): string => {
    if (isSelected) {
      return colors.gold;
    }

    switch (slot.status) {
      case 'available':
        return colors.cobalt;
      case 'blocked':
        return colors.heart;
      case 'rented':
        // Check if rented by current user
        if (currentUserId && slot.rentalUserId === currentUserId) {
          return colors.ink; // Blue for user's own rentals
        }
        return colors.inkFaint; // Gray for other users' rentals
      default:
        return colors.inkFaint;
    }
  };

  const getSlotIcon = (slot: TimeSlot): any => {
    switch (slot.status) {
      case 'available':
        return 'checkmark-circle';
      case 'blocked':
        return 'close-circle';
      case 'rented':
        // Check if rented by current user
        if (currentUserId && slot.rentalUserId === currentUserId) {
          return 'lock-closed';
        }
        return 'ban';
      default:
        return 'help-circle';
    }
  };

  const getSlotLabel = (slot: TimeSlot): string => {
    switch (slot.status) {
      case 'available':
        return 'Available';
      case 'blocked':
        return 'Blocked';
      case 'rented':
        // Check if rented by current user
        if (currentUserId && slot.rentalUserId === currentUserId) {
          return 'Reserved';
        }
        return 'Unavailable';
      default:
        return 'Unknown';
    }
  };

  const isSlotSelected = (slot: TimeSlot): boolean => {
    if (!slot.id) return false;
    return selectedSlots.includes(slot.id);
  };

  const handleSlotPress = (slot: TimeSlot) => {
    if (onSlotPress) {
      onSlotPress(slot);
    }
  };

  const handleSlotLongPress = (slot: TimeSlot) => {
    if (onSlotLongPress) {
      onSlotLongPress(slot);
    }
  };

  if (timeSlots.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="time-outline" size={48} color={colors.inkFaint} />
        <Text style={[styles.emptyStateText, { color: colors.ink }]}>No time slots available</Text>
        <Text style={[styles.emptyStateSubtext, { color: colors.inkFaint }]}>
          Time slots will appear here once created
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {timeSlots.map((slot, index) => {
          const isSelected = isSlotSelected(slot);
          const slotColor = getSlotColor(slot, isSelected);
          const isInteractive = selectable || onSlotPress || onSlotLongPress;

          return (
            <TouchableOpacity
              key={slot.id || `${slot.startTime}-${index}`}
              style={[
                styles.slotCard, { backgroundColor: colors.background, borderColor: colors.border },
                { borderLeftColor: slotColor, borderLeftWidth: 4 },
                isSelected && styles.slotCardSelected, isSelected && { backgroundColor: colors.surface, borderColor: colors.gold }]}
              onPress={() => handleSlotPress(slot)}
              onLongPress={() => handleSlotLongPress(slot)}
              disabled={!isInteractive}
              activeOpacity={isInteractive ? 0.7 : 1}
            >
              <View style={styles.slotHeader}>
                <View style={styles.slotTime}>
                  <Ionicons name="time-outline" size={16} color={colors.ink} />
                  <Text style={[styles.slotTimeText, { color: colors.ink }]}>
                    {formatTime12(slot.startTime)} -{' '}
                    {formatTime12(slot.endTime)}
                  </Text>
                </View>
                <View
                  style={[styles.statusBadge, { backgroundColor: slotColor }]}
                >
                  <Ionicons
                    name={getSlotIcon(slot)}
                    size={12}
                    color={colors.surface}
                  />
                  <Text style={[styles.statusBadgeText, { color: colors.surface }]}>
                    {getSlotLabel(slot)}
                  </Text>
                </View>
              </View>

              {showCourtName && slot.courtName && (
                <View style={styles.courtInfo}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={colors.inkFaint}
                  />
                  <Text style={[styles.courtName, { color: colors.inkFaint }]}>{slot.courtName}</Text>
                </View>
              )}

              {slot.blockReason && (
                <View style={[styles.blockReasonContainer, { borderTopColor: colors.border }]}>
                  <Ionicons
                    name="information-circle-outline"
                    size={14}
                    color={colors.heart}
                  />
                  <Text style={[styles.blockReasonText, { color: colors.heart }]} numberOfLines={2}>
                    {slot.blockReason}
                  </Text>
                </View>
              )}

              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.gold}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    gap: Spacing.md,
  },
  slotCard: {
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    position: 'relative',
  },
  slotCardSelected: {},
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  slotTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  slotTimeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  courtInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  courtName: {
    fontSize: 13,
  },
  blockReasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  blockReasonText: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
  },
  selectedIndicator: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
