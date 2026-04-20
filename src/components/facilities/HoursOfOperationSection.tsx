import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, TextStyles, useTheme } from '../../theme';
import { TimePickerInput } from '../forms/TimePickerInput';

interface DayHours {
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isClosed: boolean;
}

interface HoursOfOperationSectionProps {
  hours: DayHours[];
  onChange: (hours: DayHours[]) => void;
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function HoursOfOperationSection({
  hours,
  onChange,
}: HoursOfOperationSectionProps): JSX.Element {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);

  // Initialize with default hours if empty
  const getHoursForDay = (dayOfWeek: number): DayHours => {
    const existing = hours.find(h => h.dayOfWeek === dayOfWeek);
    return (
      existing || {
        dayOfWeek,
        startTime: '06:00',
        endTime: '22:00',
        isClosed: false,
      }
    );
  };

  const handleEditDay = (dayOfWeek: number) => {
  const { colors } = useTheme();
    setEditingDay(dayOfWeek);
    setShowEditModal(true);
  };

  const handleToggleClosed = () => {
    if (editingDay === null) return;

    const dayHours = getHoursForDay(editingDay);
    const updatedHours = hours.filter(h => h.dayOfWeek !== editingDay);
    updatedHours.push({
      ...dayHours,
      isClosed: !dayHours.isClosed,
    });
    onChange(updatedHours);
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    if (editingDay === null) return;

    const dayHours = getHoursForDay(editingDay);
    const updatedHours = hours.filter(h => h.dayOfWeek !== editingDay);
    updatedHours.push({
      ...dayHours,
      [field]: value,
    });
    onChange(updatedHours);
  };

  const handleApplyToAll = () => {
    if (editingDay === null) return;

    const templateHours = getHoursForDay(editingDay);
    const newHours = DAYS.map((_, index) => ({
      dayOfWeek: index,
      startTime: templateHours.startTime,
      endTime: templateHours.endTime,
      isClosed: templateHours.isClosed,
    }));
    onChange(newHours);
    setShowEditModal(false);
    setEditingDay(null);
  };

  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const currentDayHours =
    editingDay !== null ? getHoursForDay(editingDay) : null;

  return (
    <View style={[styles.section, { backgroundColor: colors.white, shadowColor: colors.ink }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Hours of Operation</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Set when your ground is available for booking
        </Text>
      </View>

      {DAYS.map((day, index) => {
        const dayHours = getHoursForDay(index);
        return (
          <TouchableOpacity
            key={index}
            style={[styles.dayRow, { borderBottomColor: colors.border }]}
            onPress={() => handleEditDay(index)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayName, { color: colors.textPrimary }]}>{day}</Text>
            {dayHours.isClosed ? (
              <Text style={[styles.closedText, { color: colors.textTertiary }]}>Closed</Text>
            ) : (
              <Text style={[styles.hoursText, { color: colors.textSecondary }]}>
                {formatTimeDisplay(dayHours.startTime)} -{' '}
                {formatTimeDisplay(dayHours.endTime)}
              </Text>
            )}
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        );
      })}

      {/* Edit Hours Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingDay(null);
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.white }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {editingDay !== null ? DAYS[editingDay] : ''}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setEditingDay(null);
                }}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Closed Toggle */}
              <TouchableOpacity
                style={styles.closedToggle}
                onPress={handleToggleClosed}
                activeOpacity={0.7}
              >
                <Text style={[styles.closedToggleLabel, { color: colors.textPrimary }]}>Closed</Text>
                <View
                  style={[
                    styles.toggle, { backgroundColor: colors.border },
                    currentDayHours?.isClosed && styles.toggleActive, currentDayHours?.isClosed && { backgroundColor: colors.cobalt }]}
                >
                  <View
                    style={[
                      styles.toggleThumb, { backgroundColor: colors.white },
                      currentDayHours?.isClosed && styles.toggleThumbActive]}
                  />
                </View>
              </TouchableOpacity>

              {!currentDayHours?.isClosed && (
                <>
                  {/* Opens Time Picker */}
                  <TimePickerInput
                    label="Opens"
                    value={currentDayHours?.startTime || '08:00'}
                    onChange={time => handleTimeChange('startTime', time)}
                  />

                  {/* Closes Time Picker */}
                  <TimePickerInput
                    label="Closes"
                    value={currentDayHours?.endTime || '22:00'}
                    onChange={time => handleTimeChange('endTime', time)}
                  />

                  {/* Apply to All Days */}
                  <TouchableOpacity
                    style={[styles.applyAllButton, { borderColor: colors.border }]}
                    onPress={handleApplyToAll}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={20}
                      color={colors.cobalt}
                    />
                    <Text style={[styles.applyAllText, { color: colors.cobalt }]}>Apply to all days</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: colors.cobalt }]}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingDay(null);
                }}
              >
                <Text style={[styles.doneButtonText, { color: colors.textInverse }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...TextStyles.h3,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    ...TextStyles.caption,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  dayName: {
    ...TextStyles.body,
    fontWeight: '600',
    flex: 1,
  },
  hoursText: {
    ...TextStyles.body,
    marginRight: Spacing.sm,
  },
  closedText: {
    ...TextStyles.body,
    marginRight: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...TextStyles.h3,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  closedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  closedToggleLabel: {
    ...TextStyles.body,
    fontWeight: '600',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {},
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  applyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: Spacing.md,
  },
  applyAllText: {
    ...TextStyles.body,
    fontWeight: '600',
  },
  modalActions: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  doneButton: {
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    ...TextStyles.body,
    fontWeight: '600',
  },
});
