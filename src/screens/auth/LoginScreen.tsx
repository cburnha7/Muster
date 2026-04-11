import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { MusterIcon } from '../../theme/MusterIcon';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { Checkbox } from '../../components/forms/Checkbox';
import { SSOButton } from '../../components/auth/SSOButton';
import ValidationService from '../../services/auth/ValidationService';
import SSOService from '../../services/auth/SSOService';
import { loginUser, loginWithSSO } from '../../store/slices/authSlice';
import { ErrorMessages, SuccessMessages } from '../../constants/errorMessages';
import { colors, fonts } from '../../theme';
import { loggingService } from '../../services/LoggingService';

export function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<'apple' | 'google' | null>(null);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    general?: string;
  }>({});

  const updateError = (field: string, error: string | undefined) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateField = (field: string, value: string) => {
    if (field === 'username' && !value.trim()) {
      updateError('username', ErrorMessages.validation.credentials.required);
    } else if (field === 'password' && !value) {
      updateError(
        'password',
        ErrorMessages.validation.credentials.passwordRequired
      );
    } else {
      updateError(field, undefined);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!username.trim()) {
      newErrors.username = ErrorMessages.validation.credentials.required;
      loggingService.logValidation(
        'LoginScreen',
        'username',
        'required',
        ErrorMessages.validation.credentials.required
      );
    }

    if (!password) {
      newErrors.password =
        ErrorMessages.validation.credentials.passwordRequired;
      loggingService.logValidation(
        'LoginScreen',
        'password',
        'required',
        ErrorMessages.validation.credentials.passwordRequired
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setErrors({});

    if (!validateForm()) {
      return;
    }

    loggingService.logButton('Sign In', 'LoginScreen');

    setIsLoading(true);

    try {
      await dispatch(
        loginUser({
          emailOrUsername: username.trim(),
          password,
          rememberMe,
        })
      ).unwrap();

      Alert.alert('Success', SuccessMessages.login.success);
    } catch (error: any) {
      if (error.status === 401) {
        setErrors({ general: ErrorMessages.auth.invalidCredentials });
        setPassword('');
      } else if (error.status === 429) {
        setErrors({ general: ErrorMessages.rateLimit.login });
      } else if (error.message === 'No internet connection') {
        setErrors({ general: ErrorMessages.network.noConnection });
      } else if (error.message === 'Request timed out') {
        setErrors({ general: ErrorMessages.network.timeout });
      } else if (error.message === 'Service temporarily unavailable') {
        setErrors({ general: ErrorMessages.network.serverUnavailable });
      } else {
        setErrors({
          general: error.message || ErrorMessages.network.unknownError,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOLogin = async (provider: 'apple' | 'google') => {
    loggingService.logButton(`SSO Sign In (${provider})`, 'LoginScreen');
    setSsoLoading(provider);
    setErrors({});

    try {
      const userData =
        provider === 'apple'
          ? await SSOService.signInWithApple()
          : await SSOService.signInWithGoogle();

      await dispatch(
        loginWithSSO({
          provider,
          token: userData.providerToken,
          userId: userData.providerId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
        })
      ).unwrap();

      Alert.alert('Success', SuccessMessages.login.ssoSuccess);
    } catch (error: any) {
      if (error.message !== 'User cancelled' && error !== 'User cancelled') {
        const detail =
          typeof error === 'string'
            ? error
            : error.message || JSON.stringify(error);
        const errorMsg =
          provider === 'apple'
            ? `Apple Sign In failed: ${detail}`
            : `Google Sign In failed: ${detail}`;
        setErrors({ general: errorMsg });
      }
    } finally {
      setSsoLoading(null);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword' as never);
  };

  const handleNavigateToSignUp = () => {
    navigation.navigate('Registration' as never);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand mark */}
        <View style={styles.logoContainer}>
          <MusterIcon size={140} variant="light" />
          <Text style={styles.appName}>Muster</Text>
          <Text style={styles.tagline}>Find a game. Find your people.</Text>
        </View>

        {/* Form card — sits on a subtly different surface */}
        <View style={styles.formCard}>
          {/* SSO Buttons - Only show on native platforms */}
          {Platform.OS !== 'web' && (
            <>
              <SSOButton
                provider="apple"
                onPress={() => handleSSOLogin('apple')}
                isLoading={ssoLoading === 'apple'}
                disabled={isLoading || ssoLoading !== null}
              />
              <SSOButton
                provider="google"
                onPress={() => handleSSOLogin('google')}
                isLoading={ssoLoading === 'google'}
                disabled={isLoading || ssoLoading !== null}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          )}

          {/* General Error */}
          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          {/* Username/Email Input */}
          <FormInput
            label="Username or Email"
            value={username}
            onChangeText={text => {
              setUsername(text);
              updateError('username', undefined);
            }}
            placeholder="Enter username or email"
            error={errors.username}
            onBlur={() => validateField('username', username)}
            leftIcon="person-outline"
            editable={!isLoading}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Password Input */}
          <FormInput
            label="Password"
            value={password}
            onChangeText={text => {
              setPassword(text);
              updateError('password', undefined);
            }}
            placeholder="Enter password"
            error={errors.password}
            onBlur={() => validateField('password', password)}
            leftIcon="lock-closed-outline"
            secureTextEntry
            editable={!isLoading}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Remember Me & Forgot Password */}
          <View style={styles.optionsRow}>
            <Checkbox
              label="Remember Me"
              checked={rememberMe}
              onToggle={() => setRememberMe(!rememberMe)}
            />
            <TouchableOpacity
              onPress={handleForgotPassword}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <FormButton
            title="Sign In"
            onPress={handleLogin}
            variant="primary"
            size="large"
            loading={isLoading}
            disabled={isLoading || ssoLoading !== null}
          />
        </View>

        {/* Sign Up Link */}
        <TouchableOpacity
          style={styles.signUpContainer}
          onPress={handleNavigateToSignUp}
        >
          <Text style={styles.signUpText}>
            Don't have an account?{' '}
            <Text style={styles.signUpLink}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 32,
  },

  // ── Brand mark ──────────────────────────
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 30,
    fontFamily: fonts.heading,
    color: colors.primary,
    marginTop: 12,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },

  // ── Form card ───────────────────────────
  formCard: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    // Ambient shadow
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },

  // ── Divider ─────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.outlineVariant,
    opacity: 0.5,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.outline,
    marginHorizontal: 16,
  },

  // ── Error banner ────────────────────────
  errorBanner: {
    backgroundColor: colors.errorContainer,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.onErrorContainer,
    textAlign: 'center',
  },

  // ── Options row ─────────────────────────
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: -4,
  },
  forgotPassword: {
    fontSize: 14,
    fontFamily: fonts.headingSemi,
    color: colors.primary,
  },

  // ── Sign Up ─────────────────────────────
  signUpContainer: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: 12,
  },
  signUpText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.onSurfaceVariant,
  },
  signUpLink: {
    color: colors.primary,
    fontFamily: fonts.headingSemi,
  },
});
