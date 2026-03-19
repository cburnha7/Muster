import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from '../forms/TextInput';
import { Button } from '../forms/Button';
import { colors, Spacing, TextStyles } from '../../theme';
import { ErrorMessages } from '../../constants/errorMessages';

interface AccountLinkingModalProps {
  visible: boolean;
  provider: 'apple' | 'google';
  email: string;
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error?: string;
}

export const AccountLinkingModal: React.FC<AccountLinkingModalProps> = ({
  visible,
  provider,
  email,
  onConfirm,
  onCancel,
  isLoading,
  error,
}) => {
  const [password, setPassword] = useState('');

  const handleConfirm = async () => {
    if (!password.trim()) {
      return;
    }
    await onConfirm(password);
  };

  const handleCancel = () => {
    setPassword('');
    onCancel();
  };

  const getProviderIcon = () => {
    return provider === 'apple' ? 'logo-apple' : 'logo-google';
  };

  const getProviderName = () => {
    return provider === 'apple' ? 'Apple' : 'Google';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Provider Icon */}
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: provider === 'apple' ? '#000000' : '#FFFFFF' },
              ]}
            >
              <Ionicons
                name={getProviderIcon()}
                size={40}
                color={provider === 'apple' ? '#FFFFFF' : '#000000'}
              />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Link Your Account</Text>

          {/* Explanation */}
          <Text style={styles.explanation}>
            An account with <Text style={styles.email}>{email}</Text> already exists.
            Would you like to link your {getProviderName()} account?
          </Text>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Enter your password to confirm:
            </Text>
            <TextInput
              label=""
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              editable={!isLoading}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.heart} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Cancel"
              onPress={handleCancel}
              variant="secondary"
              disabled={isLoading}
            />
            <Button
              title="Link Account"
              onPress={handleConfirm}
              variant="primary"
              isLoading={isLoading}
              disabled={!password.trim() || isLoading}
            />
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.navy} />
            <Text style={styles.securityText}>
              Your password is required to verify your identity and link your accounts securely.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modal: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  title: {
    ...TextStyles.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  explanation: {
    ...TextStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  email: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...TextStyles.body,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.heart,
  },
  errorText: {
    ...TextStyles.caption,
    color: colors.heart,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.navy,
  },
  securityText: {
    ...TextStyles.caption,
    color: colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
});
