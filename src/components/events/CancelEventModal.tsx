import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

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

  const MIN_CHARS = 5;

  const handleConfirm = async () => {
  const { colors } = useTheme();
    Keyboard.dismiss();

    if (reason.trim().length < MIN_CHARS) {
      setError(`Reason must be at least ${MIN_CHARS} characters`);
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
    Keyboard.dismiss();
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
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Tapping the backdrop dismisses keyboard only â€” does NOT close modal */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => Keyboard.dismiss()}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Ionicons name="warning" size={32} color={colors.heart} />
              <Text style={styles.title}>Step Out of Event</Text>
            </View>

            <Text style={styles.eventTitle}>{eventTitle}</Text>

            <Text style={styles.description}>
              This will cancel the event and notify all participants. Please
              provide a reason for the cancellation.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Cancellation Reason *</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder="e.g., Bad weather, facility unavailable, etc."
                value={reason}
                onChangeText={text => {
                  setReason(text);
                  setError('');
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
                editable={!isSubmitting}
              />
              <Text style={styles.charCount}>
                {reason.length}/500
                {reason.trim().length < MIN_CHARS ? ` (min ${MIN_CHARS})` : ''}
              </Text>
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
                style={[
                  styles.button,
                  styles.buttonDanger,
                  (isSubmitting || reason.trim().length < MIN_CHARS) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={isSubmitting || reason.trim().length < MIN_CHARS}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonDangerText}>Cancel Event</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
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
    color: colors.inkFaint,
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
    borderColor: colors.border,
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
    color: colors.inkFaint,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  buttonDanger: {
    backgroundColor: colors.heart,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonDangerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
