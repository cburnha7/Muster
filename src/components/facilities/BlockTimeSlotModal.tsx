import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '../../components/ui/CrossPlatformDateTimePicker';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, useTheme } from '../../theme';
import { formatTime24, formatTime12 } from '../../utils/calendarUtils';
import { API_BASE_URL } from '../../services/api/config';

interface BlockTimeSlotModalProps {
  visible: boolean;
  facilityId: string;
  courtId: string;
  courtName: string;
  selectedDate: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BlockTimeSlotModal({
  visible,
  facilityId,
  courtId,
  courtName,
  selectedDate,
  onClose,
  onSuccess,
}: BlockTimeSlotModalProps) {
  const { colors } = useTheme();
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [blockReason, setBlockReason] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartTime(selectedDate);
      
      // Auto-adjust end time to be 1 hour after start time
      const newEndTime = new Date(selectedDate);
      newEndTime.setHours(selectedDate.getHours() + 1);
      setEndTime(newEndTime);
    }
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndTime(selectedDate);
    }
  };

  const validateTimes = (): boolean => {
    if (endTime <= startTime) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return false;
    }
    return true;
  };

  const handleBlockSlot = async () => {
    if (!validateTimes()) {
      return;
    }

    if (!blockReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for blocking this time slot');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/facilities/${facilityId}/courts/${courtId}/slots/block`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: selectedDate,
            startTime: formatTime24(startTime),
            endTime: formatTime24(endTime),
            blockReason: blockReason.trim(),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to block time slot');
      }

      Alert.alert('Success', 'Time slot blocked successfully');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Block time slot error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to block time slot');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStartTime(new Date());
    setEndTime(new Date());
    setBlockReason('');
    setShowStartPicker(false);
    setShowEndPicker(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>Block Time Slot</Text>
              <Text style={[styles.modalSubtitle, { color: colors.inkFaint }]}>{courtName}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Date Display */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.ink }]}>Date</Text>
              <View style={[styles.dateDisplay, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.cobalt} />
                <Text style={[styles.dateText, { color: colors.ink }]}>
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            {/* Start Time */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.ink }]}>Start Time</Text>
              <TouchableOpacity
                style={[styles.timeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={colors.cobalt} />
                <Text style={[styles.timeButtonText, { color: colors.ink }]}>{formatTime12(formatTime24(startTime))}</Text>
                <Ionicons name="chevron-down" size={20} color={colors.inkFaint} />
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartTimeChange}
                  minuteInterval={15}
                />
              )}
            </View>

            {/* End Time */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.ink }]}>End Time</Text>
              <TouchableOpacity
                style={[styles.timeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={colors.cobalt} />
                <Text style={[styles.timeButtonText, { color: colors.ink }]}>{formatTime12(formatTime24(endTime))}</Text>
                <Ionicons name="chevron-down" size={20} color={colors.inkFaint} />
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndTimeChange}
                  minuteInterval={15}
                />
              )}
            </View>

            {/* Block Reason */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.ink }]}>
                Reason for Blocking <Text style={[styles.required, { color: colors.heart }]}>*</Text>
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.ink }]}
                value={blockReason}
                onChangeText={setBlockReason}
                placeholder="e.g., Maintenance, Private event, Weather conditions"
                placeholderTextColor={colors.inkFaint}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={[styles.hint, { color: colors.inkFaint }]}>
                This reason will be visible to users viewing availability
              </Text>
            </View>

            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: colors.inkSoft + '20', borderColor: colors.ink + '40' }]}>
              <Ionicons name="information-circle" size={20} color={colors.ink} />
              <Text style={[styles.infoText, { color: colors.ink }]}>
                Blocked time slots cannot be booked by users. You can unblock them later if needed.
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.ink }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.blockButton, { backgroundColor: colors.heart }, loading && styles.buttonDisabled]}
              onPress={handleBlockSlot}
              disabled={loading}
            >
              <Ionicons name="close-circle" size={20} color={colors.surface} />
              <Text style={[styles.blockButtonText, { color: colors.surface }]}>
                {loading ? 'Blocking...' : 'Block Slot'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  required: {},
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 15,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeButtonText: {
    flex: 1,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 100,
  },
  hint: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: 8,
    minHeight: 48,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  blockButton: {},
  blockButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
