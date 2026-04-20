import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokenSpacing, tokenRadius, tokenType } from '../../theme/tokens';
import { useTheme } from '../../theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmModal({
  visible,
  title,
  message,
  icon = 'alert-circle-outline',
  iconColor,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onCancel,
  onConfirm,
}: ConfirmModalProps): JSX.Element {
  const { colors } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolvedIconColor =
    iconColor || (variant === 'danger' ? colors.error : colors.cobalt);
  const confirmBg = variant === 'danger' ? colors.error : colors.cobalt;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onCancel}
        />
        <View
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          <View style={styles.header}>
            <Ionicons name={icon as any} size={32} color={resolvedIconColor} />
            <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
          </View>

          <Text style={[styles.description, { color: colors.inkSecondary }]}>
            {message}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSecondary,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={onCancel}
              disabled={isSubmitting}
              activeOpacity={0.75}
            >
              <Text style={[styles.buttonSecondaryText, { color: colors.ink }]}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: confirmBg }]}
              onPress={handleConfirm}
              disabled={isSubmitting}
              activeOpacity={0.75}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text
                  style={[styles.buttonConfirmText, { color: colors.white }]}
                >
                  {confirmText}
                </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokenSpacing.xl,
  },
  modalContent: {
    borderRadius: tokenRadius.lg,
    padding: tokenSpacing.xl,
    width: '100%',
    maxWidth: 400,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: tokenSpacing.lg,
  },
  title: {
    ...tokenType.modalTitle,
    marginTop: tokenSpacing.md,
  },
  description: {
    ...tokenType.body,
    textAlign: 'center',
    marginBottom: tokenSpacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: tokenSpacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: tokenSpacing.md,
    borderRadius: tokenRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonSecondary: {
    borderWidth: 1.5,
  },
  buttonSecondaryText: {
    ...tokenType.button,
  },
  buttonConfirmText: {
    ...tokenType.button,
  },
});
