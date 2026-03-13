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
import { colors } from '../../theme';

export function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<'apple' | 'google' | null>(null);
  const [errors, setErrors] = useState<{ username?: string; password?: string; general?: string }>(
    {}
  );

  const updateError = (field: string, error: string | undefined) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const validateField = (field: string, value: string) => {
    if (field === 'username' && !value.trim()) {
      updateError('username', ErrorMessages.validation.credentials.required);
    } else if (field === 'password' && !value) {
      updateError('password', ErrorMessages.validation.credentials.passwordRequired);
    } else {
      updateError(field, undefined);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!username.trim()) {
      newErrors.username = ErrorMessages.validation.credentials.required;
    }

    if (!password) {
      newErrors.password = ErrorMessages.validation.credentials.passwordRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Use the new auth slice action
      await dispatch(
        loginUser({
          emailOrUsername: username.trim(),
          password,
          rememberMe,
        })
      ).unwrap();

      Alert.alert('Success', SuccessMessages.login.success);
      // navigation.navigate('Home'); // Uncomment when navigation is configured
    } catch (error: any) {
      if (error.status === 401) {
        setErrors({ general: ErrorMessages.auth.invalidCredentials });
        setPassword(''); // Clear password on invalid credentials
      } else if (error.status === 429) {
        setErrors({ general: ErrorMessages.rateLimit.login });
      } else if (error.message === 'No internet connection') {
        setErrors({ general: ErrorMessages.network.noConnection });
      } else if (error.message === 'Request timed out') {
        setErrors({ general: ErrorMessages.network.timeout });
      } else if (error.message === 'Service temporarily unavailable') {
        setErrors({ general: ErrorMessages.network.serverUnavailable });
      } else {
        setErrors({ general: error.message || ErrorMessages.network.unknownError });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOLogin = async (provider: 'apple' | 'google') => {
    setSsoLoading(provider);
    setErrors({});

    try {
      const userData = provider === 'apple'
        ? await SSOService.signInWithApple()
        : await SSOService.signInWithGoogle();

      await dispatch(
        loginWithSSO({
          provider,
          token: userData.providerToken,
          userId: userData.providerId,
        })
      ).unwrap();

      Alert.alert('Success', SuccessMessages.login.ssoSuccess);
      // navigation.navigate('Home'); // Uncomment when navigation is configured
    } catch (error: any) {
      if (error.message !== 'User cancelled') {
        if (error.status === 404) {
          // No account found, navigate to registration
          Alert.alert(
            'Account Not Found',
            ErrorMessages.auth.ssoAccountNotFound,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Up', onPress: () => {} }, // navigation.navigate('Registration')
            ]
          );
        } else {
          const errorMsg = provider === 'apple' 
            ? ErrorMessages.sso.appleFailed 
            : ErrorMessages.sso.googleFailed;
          setErrors({ general: errorMsg });
        }
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
      >
        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          <MusterIcon size={120} />
          <Text style={styles.appName}>Muster</Text>
          <Text style={styles.tagline}>Find a game. Find your people.</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

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
            <Text style={styles.errorText}>{errors.general}</Text>
          )}

          {/* Username/Email Input */}
          <FormInput
            label="Username or Email"
            value={username}
            onChangeText={(text) => {
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
            onChangeText={(text) => {
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
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <FormButton
            title="Sign In"
            onPress={handleLogin}
            variant="primary"
            loading={isLoading}
            disabled={isLoading || ssoLoading !== null}
          />

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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.grass,
    marginTop: 16,
  },
  tagline: {
    fontSize: 16,
    color: colors.soft,
    marginTop: 4,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
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
    marginBottom: 24,
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
  errorText: {
    fontSize: 14,
    color: colors.track,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotPassword: {
    fontSize: 15,
    color: colors.grass,
    fontWeight: '600',
  },
  signUpContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
  },
  signUpText: {
    fontSize: 15,
    color: colors.soft,
  },
  signUpLink: {
    color: colors.grass,
    fontWeight: '600',
  },
});
