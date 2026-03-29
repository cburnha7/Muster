import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, Spacing } from '../../theme';
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
        <Text style={styles.emptyStateText}>No time slots available</Text>
        <Text style={styles.emptyStateSubtext}>
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
                styles.slotCard,
                { borderLeftColor: slotColor, borderLeftWidth: 4 },
                isSelected && styles.slotCardSelected,
              ]}
              onPress={() => handleSlotPress(slot)}
              onLongPress={() => handleSlotLongPress(slot)}
              disabled={!isInteractive}
              activeOpacity={isInteractive ? 0.7 : 1}
            >
              <View style={styles.slotHeader}>
                <View style={styles.slotTime}>
                  <Ionicons name="time-outline" size={16} color={colors.ink} />
                  <Text style={styles.slotTimeText}>
                    {formatTime12(slot.startTime)} - {formatTime12(slot.endTime)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: slotColor }]}>
                  <Ionicons
                    name={getSlotIcon(slot)}
                    size={12}
                    color={colors.surface}
                  />
                  <Text style={styles.statusBadgeText}>{getSlotLabel(slot)}</Text>
                </View>
              </View>

              {showCourtName && slot.courtName && (
                <View style={styles.courtInfo}>
                  <Ionicons name="location-outline" size={14} color={colors.inkFaint} />
                  <Text style={styles.courtName}>{slot.courtName}</Text>
                </View>
              )}

              {slot.blockReason && (
                <View style={styles.blockReasonContainer}>
                  <Ionicons
                    name="information-circle-outline"
                    size={14}
                    color={colors.heart}
                  />
                  <Text style={styles.blockReasonText} numberOfLines={2}>
                    {slot.blockReason}
                  </Text>
                </View>
              )}

              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
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
    backgroundColor: colors.background,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  slotCardSelected: {
    backgroundColor: colors.surface,
    borderColor: colors.gold,
  },
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
    color: colors.ink,
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
    color: colors.surface,
  },
  courtInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  courtName: {
    fontSize: 13,
    color: colors.inkFaint,
  },
  blockReasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  blockReasonText: {
    flex: 1,
    fontSize: 12,
    color: colors.heart,
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
    color: colors.ink,
    marginTop: Spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.inkFaint,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
