import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, TextStyles, useTheme } from '../../theme';
import { FormButton } from '../forms/FormButton';

interface CancelReservationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  reservationDetails?: {
    facilityName: string;
    courtName: string;
    date: string;
    time: string;
  };
}

export function CancelReservationModal({
  visible,
  onClose,
  onConfirm,
  reservationDetails,
}: CancelReservationModalProps) {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (reason.trim().length < 10) {
      Alert.alert(
        'Invalid Reason',
        'Please provide a reason (minimum 10 characters)'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to cancel reservation';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={[styles.modal, { backgroundColor: colors.surface, shadowColor: colors.black }]}>
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={24} color={colors.heart} />
            </View>
            <Text style={[styles.title, { color: colors.ink }]}>Cancel Reservation</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={isSubmitting}
            >
              <Ionicons name="close" size={24} color={colors.inkFaint} />
            </TouchableOpacity>
          </View>

          {reservationDetails && (
            <View style={[styles.detailsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <Text style={[styles.detailsTitle, { color: colors.mid }]}>Reservation Details:</Text>
              <Text style={[styles.detailsText, { color: colors.ink }]}>
                {reservationDetails.facilityName} -{' '}
                {reservationDetails.courtName}
              </Text>
              <Text style={[styles.detailsText, { color: colors.ink }]}>
                {reservationDetails.date} at {reservationDetails.time}
              </Text>
            </View>
          )}

          <View style={styles.content}>
            <Text style={[styles.warningText, { color: colors.inkFaint }]}>
              Your cancellation request will be sent to the facility owner for
              approval. Once approved, you will receive a refund according to
              the cancellation policy.
            </Text>

            <Text style={[styles.label, { color: colors.ink }]}>
              Cancellation Reason <Text style={[styles.required, { color: colors.heart }]}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.ink }]}
              placeholder="Please provide a reason for cancellation (minimum 10 characters)"
              placeholderTextColor={colors.inkFaint}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: colors.inkFaint }]}>
              {reason.length}/500 characters (minimum 10)
            </Text>
          </View>

          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <FormButton
              title="Keep Reservation"
              variant="outline"
              onPress={handleClose}
              style={styles.button}
              disabled={isSubmitting}
            />
            <FormButton
              title={isSubmitting ? 'Submitting...' : 'Request Cancellation'}
              variant="primary"
              onPress={handleConfirm}
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.heart }]}
              disabled={isSubmitting || reason.trim().length < 10}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  title: {
    ...TextStyles.h4,
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  detailsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  detailsTitle: {
    ...TextStyles.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  detailsText: {
    ...TextStyles.body,
    marginBottom: 2,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  warningText: {
    ...TextStyles.body,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  label: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  required: {},
  input: {
    ...TextStyles.body,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 100,
  },
  charCount: {
    ...TextStyles.caption,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
  },
  cancelButton: {},
});
