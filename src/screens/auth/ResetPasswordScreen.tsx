import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from '../../components/forms/TextInput';
import { Button } from '../../components/forms/Button';
import { colors, Spacing, TextStyles } from '../../theme';
import { loggingService } from '../../services/LoggingService';
import ValidationService from '../../services/auth/ValidationService';
import { resetPassword } from '../../store/slices/authSlice';

interface ResetPasswordState {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
  isLoading: boolean;
  isSuccess: boolean;
  errors: {
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  };
}

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  // Extract token from route params or URL
  const resetToken = (route.params as any)?.token || '';

  const [state, setState] = useState<ResetPasswordState>({
    resetToken,
    newPassword: '',
    confirmPassword: '',
    isLoading: false,
    isSuccess: false,
    errors: {},
  });

  useEffect(() => {
    if (!resetToken) {
      setState((prev) => ({
        ...prev,
        errors: {
          general: 'Invalid reset link. Please request a new password reset.',
        },
      }));
    }
  }, [resetToken]);

  const updateField = (field: keyof ResetPasswordState, value: any) => {
    setState((prev) => ({ ...prev, [field]: value }));
  };

  const updateError = (field: string, error: string | undefined) => {
    setState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
    }));
  };

  const validateField = (field: string, value: string) => {
    let error: string | null = null;

    if (field === 'newPassword') {
      error = ValidationService.validatePassword(value);
    } else if (field === 'confirmPassword') {
      error = ValidationService.validateConfirmPassword(state.newPassword, value);
    }

    updateError(field, error || undefined);
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (!password) return { strength: '', color: colors.textTertiary };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { strength: 'Weak', color: colors.heart };
    if (score <= 3) return { strength: 'Fair', color: colors.gold };
    if (score <= 4) return { strength: 'Good', color: colors.navy };
    return { strength: 'Strong', color: colors.pine };
  };

  const handleSubmit = async () => {
    updateError('general', undefined);

    // Validate passwords
    const passwordError = ValidationService.validatePassword(state.newPassword);
    const confirmError = ValidationService.validateConfirmPassword(
      state.newPassword,
      state.confirmPassword
    );

    if (passwordError) {
      updateError('newPassword', passwordError);
      loggingService.logValidation('ResetPasswordScreen', 'newPassword', 'invalid', passwordError);
      return;
    }

    if (confirmError) {
      updateError('confirmPassword', confirmError);
      loggingService.logValidation('ResetPasswordScreen', 'confirmPassword', 'mismatch', confirmError);
      return;
    }

    loggingService.logButton('Reset Password', 'ResetPasswordScreen');

    if (!state.resetToken) {
      updateError('general', 'Invalid reset link. Please request a new password reset.');
      return;
    }

    updateField('isLoading', true);

    try {
      await dispatch(
        resetPassword({
          token: state.resetToken,
          newPassword: state.newPassword,
        })
      ).unwrap();

      updateField('isSuccess', true);
    } catch (error: any) {
      if (error.status === 401) {
        updateError(
          'general',
          'Password reset link is invalid or expired. Please request a new one.'
        );
      } else if (error.message === 'No internet connection') {
        updateError('general', 'No internet connection. Please check your network and try again');
      } else if (error.message === 'Request timed out') {
        updateError('general', 'Request timed out. Please try again');
      } else {
        updateError('general', error.message || 'Failed to reset password. Please try again');
      }
    } finally {
      updateField('isLoading', false);
    }
  };

  const handleNavigateToLogin = () => {
    // navigation.navigate('Login'); // Uncomment when navigation is configured
  };

  const handleRequestNewReset = () => {
    // navigation.navigate('ForgotPassword'); // Uncomment when navigation is configured
  };

  const passwordStrength = getPasswordStrength(state.newPassword);

  if (state.isSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.pine} />
          </View>
          <Text style={styles.successTitle}>Password Reset Successful</Text>
          <Text style={styles.successMessage}>
            Your password has been reset successfully. You can now log in with your new password.
          </Text>
          <Button
            title="Go to Login"
            onPress={handleNavigateToLogin}
            variant="primary"
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your new password below. Make sure it's strong and secure.
          </Text>
        </View>

        <TextInput
          label="New Password"
          value={state.newPassword}
          onChangeText={(text) => {
            updateField('newPassword', text);
            updateError('newPassword', undefined);
          }}
          placeholder="Enter new password"
          error={state.errors.newPassword}
          onBlur={() => validateField('newPassword', state.newPassword)}
          icon="lock-closed-outline"
          secureTextEntry
          editable={!state.isLoading}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {state.newPassword && !state.errors.newPassword && (
          <View style={styles.strengthContainer}>
            <Text style={styles.strengthLabel}>Password Strength:</Text>
            <Text style={[styles.strengthValue, { color: passwordStrength.color }]}>
              {passwordStrength.strength}
            </Text>
          </View>
        )}

        <TextInput
          label="Confirm Password"
          value={state.confirmPassword}
          onChangeText={(text) => {
            updateField('confirmPassword', text);
            updateError('confirmPassword', undefined);
          }}
          placeholder="Confirm new password"
          error={state.errors.confirmPassword}
          onBlur={() => validateField('confirmPassword', state.confirmPassword)}
          icon="lock-closed-outline"
          secureTextEntry
          editable={!state.isLoading}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {state.errors.general && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{state.errors.general}</Text>
            {state.errors.general.includes('invalid or expired') && (
              <TouchableOpacity
                style={styles.requestNewLink}
                onPress={handleRequestNewReset}
              >
                <Text style={styles.requestNewLinkText}>Request new reset link</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Button
          title="Reset Password"
          onPress={handleSubmit}
          variant="primary"
          isLoading={state.isLoading}
          disabled={
            !state.newPassword.trim() ||
            !state.confirmPassword.trim() ||
            state.isLoading ||
            !state.resetToken
          }
        />

        <View style={styles.requirementsBox}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          <View style={styles.requirement}>
            <Ionicons
              name={state.newPassword.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={state.newPassword.length >= 8 ? colors.pine : colors.textTertiary}
            />
            <Text style={styles.requirementText}>At least 8 characters</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons
              name={/[A-Z]/.test(state.newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={/[A-Z]/.test(state.newPassword) ? colors.pine : colors.textTertiary}
            />
            <Text style={styles.requirementText}>One uppercase letter</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons
              name={/[a-z]/.test(state.newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={/[a-z]/.test(state.newPassword) ? colors.pine : colors.textTertiary}
            />
            <Text style={styles.requirementText}>One lowercase letter</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons
              name={/[0-9]/.test(state.newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={/[0-9]/.test(state.newPassword) ? colors.pine : colors.textTertiary}
            />
            <Text style={styles.requirementText}>One number</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons
              name={/[^A-Za-z0-9]/.test(state.newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={/[^A-Za-z0-9]/.test(state.newPassword) ? colors.pine : colors.textTertiary}
            />
            <Text style={styles.requirementText}>One special character</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...TextStyles.h1,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...TextStyles.body,
    color: colors.textSecondary,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  strengthLabel: {
    ...TextStyles.caption,
    color: colors.textSecondary,
    marginRight: Spacing.xs,
  },
  strengthValue: {
    ...TextStyles.caption,
    fontWeight: '600',
  },
  errorContainer: {
    marginVertical: Spacing.md,
  },
  errorText: {
    ...TextStyles.body,
    color: colors.heart,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  requestNewLink: {
    alignItems: 'center',
  },
  requestNewLinkText: {
    ...TextStyles.body,
    color: colors.pine,
    fontWeight: '600',
  },
  requirementsBox: {
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.lg,
  },
  requirementsTitle: {
    ...TextStyles.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  requirementText: {
    ...TextStyles.caption,
    color: colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successIcon: {
    marginBottom: Spacing.xl,
  },
  successTitle: {
    ...TextStyles.h1,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  successMessage: {
    ...TextStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
});
