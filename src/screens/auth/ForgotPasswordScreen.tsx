import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from '../../components/forms/TextInput';
import { Button } from '../../components/forms/Button';
import { Spacing, TextStyles, useTheme } from '../../theme';
import ValidationService from '../../services/auth/ValidationService';
import { requestPasswordReset } from '../../store/slices/authSlice';

interface ForgotPasswordState {
  email: string;
  isLoading: boolean;
  isSuccess: boolean;
  errors: {
    email?: string;
    general?: string;
  };
}

export const ForgotPasswordScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [state, setState] = useState<ForgotPasswordState>({
    email: '',
    isLoading: false,
    isSuccess: false,
    errors: {},
  });

  const updateField = (field: keyof ForgotPasswordState, value: any) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const updateError = (field: string, error: string | undefined) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
    }));
  };

  const validateEmail = (email: string) => {
    const error = ValidationService.validateEmail(email);
    updateError('email', error || undefined);
  };

  const handleSubmit = async () => {
    updateError('general', undefined);

    // Validate email
    const emailError = ValidationService.validateEmail(state.email);
    if (emailError) {
      updateError('email', emailError);
      return;
    }

    updateField('isLoading', true);

    try {
      await dispatch(requestPasswordReset(state.email)).unwrap();
      updateField('isSuccess', true);
    } catch (error: any) {
      if (error.status === 429) {
        updateError(
          'general',
          'Too many password reset requests. Please try again in 15 minutes'
        );
      } else if (error.message === 'No internet connection') {
        updateError(
          'general',
          'No internet connection. Please check your network and try again'
        );
      } else if (error.message === 'Request timed out') {
        updateError('general', 'Request timed out. Please try again');
      } else {
        updateError(
          'general',
          error.message || 'Failed to send reset email. Please try again'
        );
      }
    } finally {
      updateField('isLoading', false);
    }
  };

  const handleBackToLogin = () => {
    // navigation.goBack(); // Uncomment when navigation is configured
  };

  const handleRetry = () => {
    setState({
      email: '',
      isLoading: false,
      isSuccess: false,
      errors: {},
    });
  };

  if (state.isSuccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.cobalt} />
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successMessage}>
            Password reset email sent. Please check your inbox and follow the
            instructions to reset your password.
          </Text>
          <Text style={styles.successNote}>
            If you don't see the email, check your spam folder.
          </Text>
          <Button
            title="Back to Login"
            onPress={handleBackToLogin}
            variant="primary"
          />
          <TouchableOpacity style={styles.retryLink} onPress={handleRetry}>
            <Text style={styles.retryLinkText}>
              Didn't receive the email?{' '}
              <Text style={styles.link}>Try again</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToLogin}
          disabled={state.isLoading}
        >
          <Ionicons name="arrow-back" size={24} color={colors.cobalt} />
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset
            your password.
          </Text>
        </View>

        <TextInput
          label="Email"
          value={state.email}
          onChangeText={text => {
            updateField('email', text);
            updateError('email', undefined);
          }}
          placeholder="Enter your email"
          error={state.errors.email}
          onBlur={() => validateEmail(state.email)}
          icon="mail-outline"
          editable={!state.isLoading}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {state.errors.general && (
          <Text style={styles.errorText}>{state.errors.general}</Text>
        )}

        <Button
          title="Send Reset Link"
          onPress={handleSubmit}
          variant="primary"
          isLoading={state.isLoading}
          disabled={!state.email.trim() || state.isLoading}
        />

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.ink}
          />
          <Text style={styles.infoText}>
            The reset link will expire in 1 hour for security reasons.
          </Text>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backButtonText: {
    ...TextStyles.body,
    color: colors.cobalt,
    marginLeft: Spacing.sm,
    fontWeight: '600',
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
  errorText: {
    ...TextStyles.body,
    color: colors.heart,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.ink,
  },
  infoText: {
    ...TextStyles.caption,
    color: colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
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
    marginBottom: Spacing.md,
  },
  successNote: {
    ...TextStyles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  retryLink: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  retryLinkText: {
    ...TextStyles.body,
    color: colors.textSecondary,
  },
  link: {
    color: colors.cobalt,
    fontWeight: '600',
  },
});
