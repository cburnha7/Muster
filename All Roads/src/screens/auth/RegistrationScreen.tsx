import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { Checkbox } from '../../components/forms/Checkbox';
import { SSOButton } from '../../components/auth/SSOButton';
import { colors } from '../../theme';
import ValidationService from '../../services/auth/ValidationService';
import SSOService from '../../services/auth/SSOService';
import { registerUser, registerWithSSO } from '../../store/slices/authSlice';

interface RegistrationState {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
  ssoProvider: 'apple' | 'google' | null;
  ssoToken: string | null;
  ssoUserId: string | null;
  isLoading: boolean;
  ssoLoading: 'apple' | 'google' | null;
  errors: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    agreedToTerms?: string;
    general?: string;
  };
}

export const RegistrationScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [state, setState] = useState<RegistrationState>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false,
    ssoProvider: null,
    ssoToken: null,
    ssoUserId: null,
    isLoading: false,
    ssoLoading: null,
    errors: {},
  });

  const updateField = (field: keyof RegistrationState, value: any) => {
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

    switch (field) {
      case 'firstName':
        error = ValidationService.validateFirstName(value);
        break;
      case 'lastName':
        error = ValidationService.validateLastName(value);
        break;
      case 'email':
        error = ValidationService.validateEmail(value);
        break;
      case 'username':
        error = ValidationService.validateUsername(value);
        break;
      case 'password':
        error = ValidationService.validatePassword(value);
        break;
      case 'confirmPassword':
        error = ValidationService.validateConfirmPassword(state.password, value);
        break;
    }

    updateError(field, error || undefined);
  };

  const validateForm = (): boolean => {
    const errors = ValidationService.validateRegistrationForm({
      firstName: state.firstName,
      lastName: state.lastName,
      email: state.email,
      username: state.username,
      password: state.ssoProvider ? '' : state.password,
      confirmPassword: state.ssoProvider ? '' : state.confirmPassword,
      agreedToTerms: state.agreedToTerms,
    });

    setState((prev) => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  const handleManualRegistration = async () => {
    if (!validateForm()) {
      return;
    }

    updateField('isLoading', true);
    updateError('general', undefined);

    try {
      const result = await dispatch(
        registerUser({
          firstName: state.firstName,
          lastName: state.lastName,
          email: state.email,
          username: state.username,
          password: state.password,
          agreedToTerms: state.agreedToTerms,
        })
      ).unwrap();

      // Navigate to home screen on success
      Alert.alert('Success', 'Welcome to Muster!');
      // navigation.navigate('Home'); // Uncomment when navigation is configured
    } catch (error: any) {
      if (error.status === 409) {
        if (error.message.includes('email')) {
          updateError('email', 'This email is already registered');
        } else if (error.message.includes('username')) {
          updateError('username', 'This username is taken');
        }
      } else if (error.message === 'No internet connection') {
        updateError('general', 'No internet connection. Please check your network and try again');
      } else if (error.message === 'Request timed out') {
        updateError('general', 'Request timed out. Please try again');
      } else {
        updateError('general', error.message || 'Registration failed. Please try again');
      }
    } finally {
      updateField('isLoading', false);
    }
  };

  const handleSSORegistration = async (provider: 'apple' | 'google') => {
    updateField('ssoLoading', provider);
    updateError('general', undefined);

    try {
      const userData = provider === 'apple'
        ? await SSOService.signInWithApple()
        : await SSOService.signInWithGoogle();

      // Pre-populate form with SSO data
      setState((prev) => ({
        ...prev,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        ssoProvider: provider,
        ssoToken: userData.providerToken,
        ssoUserId: userData.providerId,
        ssoLoading: null,
      }));
    } catch (error: any) {
      updateField('ssoLoading', null);
      if (error.message !== 'User cancelled') {
        updateError('general', `Sign in with ${provider === 'apple' ? 'Apple' : 'Google'} failed. Please try again`);
      }
    }
  };

  const handleSSOComplete = async () => {
    if (!state.username.trim()) {
      updateError('username', 'Username is required');
      return;
    }

    if (!state.agreedToTerms) {
      updateError('agreedToTerms', 'You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    updateField('isLoading', true);
    updateError('general', undefined);

    try {
      const result = await dispatch(
        registerWithSSO({
          provider: state.ssoProvider!,
          providerToken: state.ssoToken!,
          providerUserId: state.ssoUserId!,
          email: state.email,
          firstName: state.firstName,
          lastName: state.lastName,
          username: state.username,
        })
      ).unwrap();

      Alert.alert('Success', 'Welcome to Muster!');
      // navigation.navigate('Home'); // Uncomment when navigation is configured
    } catch (error: any) {
      if (error.status === 409) {
        if (error.message.includes('email')) {
          // Show account linking modal
          // TODO: Implement AccountLinkingModal
          updateError('general', 'An account with this email already exists. Account linking coming soon.');
        } else if (error.message.includes('username')) {
          updateError('username', 'This username is taken');
        }
      } else {
        updateError('general', error.message || 'Registration failed. Please try again');
      }
    } finally {
      updateField('isLoading', false);
    }
  };

  const handleNavigateToLogin = () => {
    navigation.navigate('Login' as never);
  };

  const handleOpenTerms = () => {
    // TODO: Open Terms of Service
    Alert.alert('Terms of Service', 'Terms of Service will be displayed here');
  };

  const handleOpenPrivacy = () => {
    // TODO: Open Privacy Policy
    Alert.alert('Privacy Policy', 'Privacy Policy will be displayed here');
  };

  const isFormValid = () => {
    if (state.ssoProvider) {
      return state.username.trim() && state.agreedToTerms;
    }
    
    // First check if all required fields are filled
    if (
      !state.firstName.trim() ||
      !state.lastName.trim() ||
      !state.email.trim() ||
      !state.username.trim() ||
      !state.password.trim() ||
      !state.confirmPassword.trim() ||
      !state.agreedToTerms
    ) {
      return false;
    }
    
    // Then validate each field to check for errors
    const firstNameError = ValidationService.validateFirstName(state.firstName);
    const lastNameError = ValidationService.validateLastName(state.lastName);
    const emailError = ValidationService.validateEmail(state.email);
    const usernameError = ValidationService.validateUsername(state.username);
    const passwordError = ValidationService.validatePassword(state.password);
    const confirmPasswordError = ValidationService.validateConfirmPassword(state.password, state.confirmPassword);
    
    // Return true only if no validation errors exist
    return !firstNameError && !lastNameError && !emailError && !usernameError && !passwordError && !confirmPasswordError;
  };

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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Muster to find games and connect with players</Text>
        </View>

        {!state.ssoProvider && Platform.OS !== 'web' && (
          <>
            <SSOButton
              provider="apple"
              onPress={() => handleSSORegistration('apple')}
              isLoading={state.ssoLoading === 'apple'}
              disabled={state.isLoading || state.ssoLoading !== null}
            />
            <SSOButton
              provider="google"
              onPress={() => handleSSORegistration('google')}
              isLoading={state.ssoLoading === 'google'}
              disabled={state.isLoading || state.ssoLoading !== null}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        )}

        <FormInput
          label="First Name"
          value={state.firstName}
          onChangeText={(text) => updateField('firstName', text)}
          placeholder="Enter your first name"
          error={state.errors.firstName}
          onBlur={() => validateField('firstName', state.firstName)}
          leftIcon="person-outline"
          editable={!state.isLoading && !state.ssoProvider}
          autoCapitalize="words"
        />

        <FormInput
          label="Last Name"
          value={state.lastName}
          onChangeText={(text) => updateField('lastName', text)}
          placeholder="Enter your last name"
          error={state.errors.lastName}
          onBlur={() => validateField('lastName', state.lastName)}
          leftIcon="person-outline"
          editable={!state.isLoading && !state.ssoProvider}
          autoCapitalize="words"
        />

        <FormInput
          label="Email"
          value={state.email}
          onChangeText={(text) => updateField('email', text)}
          placeholder="Enter your email"
          error={state.errors.email}
          onBlur={() => validateField('email', state.email)}
          leftIcon="mail-outline"
          editable={!state.isLoading && !state.ssoProvider}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <FormInput
          label="Username"
          value={state.username}
          onChangeText={(text) => updateField('username', text)}
          placeholder="Choose a username"
          error={state.errors.username}
          onBlur={() => validateField('username', state.username)}
          leftIcon="at"
          editable={!state.isLoading}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {!state.ssoProvider && (
          <>
            <FormInput
              label="Password"
              value={state.password}
              onChangeText={(text) => updateField('password', text)}
              placeholder="Create a password"
              error={state.errors.password}
              onBlur={() => validateField('password', state.password)}
              leftIcon="lock-closed-outline"
              secureTextEntry
              editable={!state.isLoading}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <FormInput
              label="Confirm Password"
              value={state.confirmPassword}
              onChangeText={(text) => updateField('confirmPassword', text)}
              placeholder="Confirm your password"
              error={state.errors.confirmPassword}
              onBlur={() => validateField('confirmPassword', state.confirmPassword)}
              leftIcon="lock-closed-outline"
              secureTextEntry
              editable={!state.isLoading}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        )}

        <Checkbox
          label={
            <Text style={styles.checkboxLabel}>
              I agree to the{' '}
              <Text style={styles.link} onPress={handleOpenTerms}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={styles.link} onPress={handleOpenPrivacy}>
                Privacy Policy
              </Text>
            </Text>
          }
          checked={state.agreedToTerms}
          onToggle={() => updateField('agreedToTerms', !state.agreedToTerms)}
          error={state.errors.agreedToTerms}
        />

        {state.errors.general && (
          <Text style={styles.errorText}>{state.errors.general}</Text>
        )}

        <FormButton
          title={state.ssoProvider ? 'Complete Registration' : 'Create Account'}
          onPress={state.ssoProvider ? handleSSOComplete : handleManualRegistration}
          variant="primary"
          loading={state.isLoading}
          disabled={!isFormValid()}
        />

        <FormButton
          title="Cancel"
          onPress={handleNavigateToLogin}
          variant="secondary"
          disabled={state.isLoading}
          style={{ marginTop: 12 }}
        />

        <TouchableOpacity
          style={styles.loginLink}
          onPress={handleNavigateToLogin}
          disabled={state.isLoading}
        >
          <Text style={styles.loginLinkText}>
            Already have an account?{' '}
            <Text style={styles.link}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.soft,
    lineHeight: 22,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    color: colors.soft,
    marginHorizontal: 12,
  },
  checkboxLabel: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 20,
  },
  link: {
    color: colors.grass,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: colors.track,
    textAlign: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginLinkText: {
    fontSize: 15,
    color: colors.soft,
  },
});
