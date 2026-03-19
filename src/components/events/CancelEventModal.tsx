import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface CancelEventModalProps {
  visible: boolean;
  eventTitle: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function CancelEventModal({
  visible,
  eventTitle,
  onCancel,
  onConfirm,
}: CancelEventModalProps): JSX.Element {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm(reason.trim());
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReason('');
    setError('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleCancel}
        />
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Ionicons name="warning" size={32} color={colors.heart} />
            <Text style={styles.title}>Cancel Event</Text>
          </View>

          <Text style={styles.eventTitle}>{eventTitle}</Text>

          <Text style={styles.description}>
            This will cancel the event and notify all participants. Please provide a reason for the cancellation.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Cancellation Reason *</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="e.g., Bad weather, facility unavailable, etc."
              value={reason}
              onChangeText={(text) => {
                setReason(text);
                setError('');
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
              editable={!isSubmitting}
            />
            <Text style={styles.charCount}>{reason.length}/500</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleCancel}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonSecondaryText}>Keep Event</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonDanger]}
              onPress={handleConfirm}
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonDangerText}>Cancel Event</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.chalk,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: colors.soft,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border || '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.ink,
    minHeight: 100,
  },
  inputError: {
    borderColor: colors.heart,
  },
  charCount: {
    fontSize: 12,
    color: colors.soft,
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: colors.heart,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonSecondary: {
    backgroundColor: colors.surface || '#F2F2F7',
    borderWidth: 1,
    borderColor: colors.border || '#E5E5EA',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  buttonDanger: {
    backgroundColor: colors.heart,
  },
  buttonDangerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
