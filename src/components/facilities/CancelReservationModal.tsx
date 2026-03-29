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
import { colors, Spacing, TextStyles } from '../../theme';
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
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (reason.trim().length < 10) {
      Alert.alert('Invalid Reason', 'Please provide a reason (minimum 10 characters)');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel reservation';
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
        
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={24} color={colors.heart} />
            </View>
            <Text style={styles.title}>Cancel Reservation</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={isSubmitting}
            >
              <Ionicons name="close" size={24} color={colors.inkFaint} />
            </TouchableOpacity>
          </View>

          {reservationDetails && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>Reservation Details:</Text>
              <Text style={styles.detailsText}>
                {reservationDetails.facilityName} - {reservationDetails.courtName}
              </Text>
              <Text style={styles.detailsText}>
                {reservationDetails.date} at {reservationDetails.time}
              </Text>
            </View>
          )}

          <View style={styles.content}>
            <Text style={styles.warningText}>
              Your cancellation request will be sent to the facility owner for approval. 
              Once approved, you will receive a refund according to the cancellation policy.
            </Text>

            <Text style={styles.label}>
              Cancellation Reason <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
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
            <Text style={styles.charCount}>
              {reason.length}/500 characters (minimum 10)
            </Text>
          </View>

          <View style={styles.actions}>
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
              style={[styles.button, styles.cancelButton]}
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  title: {
    ...TextStyles.h4,
    color: colors.ink,
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  detailsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailsTitle: {
    ...TextStyles.caption,
    fontWeight: '600',
    color: colors.mid,
    marginBottom: Spacing.xs,
  },
  detailsText: {
    ...TextStyles.body,
    color: colors.ink,
    marginBottom: 2,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  warningText: {
    ...TextStyles.body,
    color: colors.inkFaint,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  label: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: Spacing.sm,
  },
  required: {
    color: colors.heart,
  },
  input: {
    ...TextStyles.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 100,
    backgroundColor: colors.background,
    color: colors.ink,
  },
  charCount: {
    ...TextStyles.caption,
    color: colors.inkFaint,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: colors.heart,
  },
});
