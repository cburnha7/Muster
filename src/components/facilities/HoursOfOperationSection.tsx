import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, Spacing, TextStyles } from '../../theme';

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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIME_OPTIONS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

export function HoursOfOperationSection({ hours, onChange }: HoursOfOperationSectionProps): JSX.Element {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Initialize with default hours if empty
  const getHoursForDay = (dayOfWeek: number): DayHours => {
    const existing = hours.find(h => h.dayOfWeek === dayOfWeek);
    return existing || {
      dayOfWeek,
      startTime: '06:00',
      endTime: '22:00',
      isClosed: false,
    };
  };

  const handleEditDay = (dayOfWeek: number) => {
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

  const currentDayHours = editingDay !== null ? getHoursForDay(editingDay) : null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Hours of Operation</Text>
        <Text style={styles.sectionSubtitle}>
          Set when your ground is available for booking
        </Text>
      </View>

      {DAYS.map((day, index) => {
        const dayHours = getHoursForDay(index);
        return (
          <TouchableOpacity
            key={index}
            style={styles.dayRow}
            onPress={() => handleEditDay(index)}
            activeOpacity={0.7}
          >
            <Text style={styles.dayName}>{day}</Text>
            {dayHours.isClosed ? (
              <Text style={styles.closedText}>Closed</Text>
            ) : (
              <Text style={styles.hoursText}>
                {formatTimeDisplay(dayHours.startTime)} - {formatTimeDisplay(dayHours.endTime)}
              </Text>
            )}
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
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
                <Text style={styles.closedToggleLabel}>Closed</Text>
                <View style={[
                  styles.toggle,
                  currentDayHours?.isClosed && styles.toggleActive
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    currentDayHours?.isClosed && styles.toggleThumbActive
                  ]} />
                </View>
              </TouchableOpacity>

              {!currentDayHours?.isClosed && (
                <>
                  {/* Start Time */}
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Opens</Text>
                    <TouchableOpacity
                      style={styles.timePicker}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text style={styles.timeValue}>
                        {currentDayHours ? formatTimeDisplay(currentDayHours.startTime) : ''}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* End Time */}
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Closes</Text>
                    <TouchableOpacity
                      style={styles.timePicker}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Text style={styles.timeValue}>
                        {currentDayHours ? formatTimeDisplay(currentDayHours.endTime) : ''}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Apply to All Days */}
                  <TouchableOpacity
                    style={styles.applyAllButton}
                    onPress={handleApplyToAll}
                  >
                    <Ionicons name="copy-outline" size={20} color={colors.pine} />
                    <Text style={styles.applyAllText}>Apply to all days</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingDay(null);
                }}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Start Time Picker Modal */}
      <Modal
        visible={showStartTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStartTimePicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Opening Time</Text>
              <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {TIME_OPTIONS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.pickerOption,
                    currentDayHours?.startTime === time && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    handleTimeChange('startTime', time);
                    setShowStartTimePicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    currentDayHours?.startTime === time && styles.pickerOptionTextSelected
                  ]}>
                    {formatTimeDisplay(time)}
                  </Text>
                  {currentDayHours?.startTime === time && (
                    <Ionicons name="checkmark" size={20} color={colors.pine} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* End Time Picker Modal */}
      <Modal
        visible={showEndTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndTimePicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Closing Time</Text>
              <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {TIME_OPTIONS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.pickerOption,
                    currentDayHours?.endTime === time && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    handleTimeChange('endTime', time);
                    setShowEndTimePicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    currentDayHours?.endTime === time && styles.pickerOptionTextSelected
                  ]}>
                    {formatTimeDisplay(time)}
                  </Text>
                  {currentDayHours?.endTime === time && (
                    <Ionicons name="checkmark" size={20} color={colors.pine} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: 12,
    shadowColor: colors.ink,
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
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    ...TextStyles.caption,
    color: colors.textSecondary,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dayName: {
    ...TextStyles.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  hoursText: {
    ...TextStyles.body,
    color: colors.textSecondary,
    marginRight: Spacing.sm,
  },
  closedText: {
    ...TextStyles.body,
    color: colors.textTertiary,
    marginRight: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    ...TextStyles.h3,
    color: colors.textPrimary,
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
    color: colors.textPrimary,
    fontWeight: '600',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.pine,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  timeLabel: {
    ...TextStyles.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  timeValue: {
    ...TextStyles.body,
    color: colors.textPrimary,
    marginRight: Spacing.sm,
  },
  applyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  applyAllText: {
    ...TextStyles.body,
    color: colors.pine,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  modalActions: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  doneButton: {
    backgroundColor: colors.pine,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    ...TextStyles.body,
    color: colors.textInverse,
    fontWeight: '600',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  pickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerTitle: {
    ...TextStyles.h4,
    color: colors.textPrimary,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerOptionSelected: {
    backgroundColor: '#F7F4EE',
  },
  pickerOptionText: {
    ...TextStyles.body,
    color: colors.textPrimary,
  },
  pickerOptionTextSelected: {
    color: colors.pine,
    fontWeight: '600',
  },
});
