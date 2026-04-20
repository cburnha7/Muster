import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { useAuth } from '../../context/AuthContext';
import TokenStorage from '../../services/auth/TokenStorage';
import { resetContext } from '../../store/slices/contextSlice';
import { API_BASE_URL } from '../../services/api/config';
import { fonts, Spacing, useTheme } from '../../theme';

/**
 * TransferAccountScreen
 *
 * Collects email and password to convert a dependent account into an
 * independent user account. This action is permanent — the dependent
 * is detached from the guardian and gains their own login credentials
 * while all history is preserved.
 *
 * Requirements: 8.1, 8.2, 8.4
 */

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function TransferAccountScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { user: authUser } = useAuth();
  const dispatch = useDispatch();

  const params = (route.params as { dependentId: string }) || {};
  const { dependentId } = params;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordRef = useRef<any>(null);
  const confirmPasswordRef = useRef<any>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm the password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password, confirmPassword]);

  const handleSubmit = async () => {
    if (!validate() || !authUser?.id || !dependentId) return;

    setIsSubmitting(true);
    try {
      const token = await TokenStorage.getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/dependents/${dependentId}/transfer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.error ??
          errorData?.message ??
          'Something went wrong. Please try again.';
        Alert.alert('Error', message);
        return;
      }

      // Clear the dependent from active context
      dispatch(resetContext());

      Alert.alert(
        'Account Transferred',
        'The account has been successfully transferred to an independent account. The dependent can now log in with their new credentials.',
        [
          {
            text: 'OK',
            onPress: () => (navigation as any).navigate('ProfileScreen'),
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.background },
        { backgroundColor: colors.bgScreen },
      ]}
    >
      <ScreenHeader title="Transfer Account" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Permanent action warning */}
          <View
            style={[
              styles.warningCard,
              {
                backgroundColor: colors.gold + '15',
                borderColor: colors.gold + '30',
              },
            ]}
          >
            <Ionicons name="warning-outline" size={24} color={colors.gold} />
            <View style={styles.warningTextContainer}>
              <Text style={[styles.warningTitle, { color: colors.ink }]}>
                This action is permanent
              </Text>
              <Text
                style={[styles.warningBody, { color: colors.onSurfaceFaint }]}
              >
                Transferring this account will create an independent Muster
                account for the dependent. They will be removed from your
                dependents list and will manage their own account going forward.
                All existing history, Salutes, Roster memberships, and League
                memberships will be preserved.
              </Text>
            </View>
          </View>

          {/* Credential fields */}
          <Text style={[styles.sectionLabel, { color: colors.ink }]}>
            New Account Credentials
          </Text>

          <FormInput
            label="Email Address"
            placeholder="Enter email address"
            value={email}
            onChangeText={setEmail}
            {...(errors.email ? { error: errors.email } : {})}
            required
            leftIcon="mail-outline"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <FormInput
            ref={passwordRef}
            label="Password"
            placeholder="Enter password (min 8 characters)"
            value={password}
            onChangeText={setPassword}
            {...(errors.password ? { error: errors.password } : {})}
            required
            leftIcon="lock-closed-outline"
            secureTextEntry
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          />

          <FormInput
            ref={confirmPasswordRef}
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            {...(errors.confirmPassword
              ? { error: errors.confirmPassword }
              : {})}
            required
            leftIcon="lock-closed-outline"
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />

          {/* Submit */}
          <View style={styles.submitContainer}>
            <FormButton
              title={isSubmitting ? 'Transferring…' : 'Transfer Account'}
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              leftIcon="arrow-forward-circle-outline"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  warningCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontFamily: fonts.label,
    fontSize: 15,
    marginBottom: 4,
  },
  warningBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionLabel: {
    fontFamily: fonts.heading,
    fontSize: 18,
    marginBottom: Spacing.sm,
  },
  submitContainer: {
    marginTop: Spacing.md,
  },
});
