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
import {
  tokenColors,
  tokenSpacing,
  tokenRadius,
  tokenType,
  tokenFontFamily,
} from '../../theme/tokens';

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
    iconColor ||
    (variant === 'danger' ? tokenColors.error : tokenColors.cobalt);
  const confirmBg =
    variant === 'danger' ? tokenColors.error : tokenColors.cobalt;

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
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Ionicons name={icon as any} size={32} color={resolvedIconColor} />
            <Text style={styles.title}>{title}</Text>
          </View>

          <Text style={styles.description}>{message}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onCancel}
              disabled={isSubmitting}
              activeOpacity={0.75}
            >
              <Text style={styles.buttonSecondaryText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: confirmBg }]}
              onPress={handleConfirm}
              disabled={isSubmitting}
              activeOpacity={0.75}
            >
              {isSubmitting ? (
                <ActivityIndicator color={tokenColors.white} />
              ) : (
                <Text style={styles.buttonConfirmText}>{confirmText}</Text>
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
    backgroundColor: tokenColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokenSpacing.xl,
  },
  modalContent: {
    backgroundColor: tokenColors.surface,
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
    color: tokenColors.ink,
    marginTop: tokenSpacing.md,
  },
  description: {
    ...tokenType.body,
    color: tokenColors.inkSecondary,
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
    backgroundColor: tokenColors.background,
    borderWidth: 1.5,
    borderColor: tokenColors.border,
  },
  buttonSecondaryText: {
    ...tokenType.button,
    color: tokenColors.ink,
  },
  buttonConfirmText: {
    ...tokenType.button,
    color: tokenColors.white,
  },
});
