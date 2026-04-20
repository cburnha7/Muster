import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, useTheme } from '../../theme';

interface StepOutModalProps {
  visible: boolean;
  eventTitle: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function StepOutModal({
  visible,
  eventTitle,
  onCancel,
  onConfirm,
}: StepOutModalProps): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { colors: themeColors } = useTheme();

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onCancel}
        />
        <View
          style={[styles.modalContent, { backgroundColor: themeColors.bgCard }]}
        >
          <View style={styles.header}>
            <Ionicons
              name="exit-outline"
              size={32}
              color={themeColors.textSecondary}
            />
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>
              Leave
            </Text>
          </View>

          <Text style={[styles.eventTitle, { color: themeColors.textPrimary }]}>
            {eventTitle}
          </Text>

          <Text
            style={[styles.description, { color: themeColors.textSecondary }]}
          >
            Are you sure you want to leave this event? You will be removed as a
            participant.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSecondary,
                { borderColor: themeColors.border },
              ]}
              onPress={onCancel}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.buttonSecondaryText,
                  { color: themeColors.textPrimary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonMuted]}
              onPress={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Text style={styles.buttonMutedText}>Leave</Text>
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
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
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
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
  buttonMuted: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.inkFaint,
  },
  buttonMutedText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
});
