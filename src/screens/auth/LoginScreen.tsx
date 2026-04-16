import React, { useState } from 'react';
import {
  View,
  Text,
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
import SSOService from '../../services/auth/SSOService';
import { loginUser, loginWithSSO } from '../../store/slices/authSlice';
import { ErrorMessages, SuccessMessages } from '../../constants/errorMessages';
import { useTheme } from '../../theme';
import { loggingService } from '../../services/LoggingService';

export function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { colors, type, spacing, radius, shadow, isDark } = useTheme();

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

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!username.trim())
      newErrors.username = ErrorMessages.validation.credentials.required;
    if (!password)
      newErrors.password =
        ErrorMessages.validation.credentials.passwordRequired;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setErrors({});
    if (!validateForm()) return;
    loggingService.logButton('Sign In', 'LoginScreen');
    setIsLoading(true);
    try {
      await dispatch(
        loginUser({ emailOrUsername: username.trim(), password, rememberMe })
      ).unwrap();
      Alert.alert('Success', SuccessMessages.login.success);
    } catch (error: any) {
      if (error.status === 401) {
        setErrors({ general: ErrorMessages.auth.invalidCredentials });
        setPassword('');
      } else if (error.status === 429)
        setErrors({ general: ErrorMessages.rateLimit.login });
      else
        setErrors({
          general: error.message || ErrorMessages.network.unknownError,
        });
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
        const providerName = provider === 'apple' ? 'Apple' : 'Google';
        setErrors({
          general: `${providerName} sign in failed. Please try again.`,
        });
      }
    } finally {
      setSsoLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bgScreen }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: spacing.xxl,
          paddingBottom: spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand mark */}
        <View style={{ alignItems: 'center', marginBottom: spacing.xxxl }}>
          <View style={{ ...shadow.cta, borderRadius: 20 }}>
            <MusterIcon size={100} variant="light" />
          </View>
          <Text
            style={{
              ...type.displayLg,
              color: colors.textPrimary,
              marginTop: spacing.base,
              textAlign: 'center',
            }}
          >
            Muster
          </Text>
          <Text
            style={{
              ...type.displayItalic,
              color: colors.textSecondary,
              fontSize: 18,
              marginTop: spacing.xs,
            }}
          >
            the Troops.
          </Text>
        </View>

        {/* Form card */}
        <View
          style={{
            backgroundColor: colors.bgCard,
            borderRadius: radius.xxl,
            padding: spacing.xl,
            borderWidth: 1,
            borderColor: colors.border,
            ...shadow.card,
          }}
        >
          {/* SSO Buttons */}
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
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginVertical: spacing.lg,
                }}
              >
                <View
                  style={{ flex: 1, height: 1, backgroundColor: colors.border }}
                />
                <Text
                  style={{
                    ...type.bodySm,
                    color: colors.textMuted,
                    marginHorizontal: spacing.base,
                  }}
                >
                  or
                </Text>
                <View
                  style={{ flex: 1, height: 1, backgroundColor: colors.border }}
                />
              </View>
            </>
          )}

          {/* Error banner */}
          {errors.general && (
            <View
              style={{
                backgroundColor: colors.heartTint,
                borderRadius: radius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.base,
                marginBottom: spacing.base,
              }}
            >
              <Text
                style={{
                  ...type.bodySm,
                  color: colors.heart,
                  textAlign: 'center',
                }}
              >
                {errors.general}
              </Text>
            </View>
          )}

          <FormInput
            label="Username or Email"
            value={username}
            onChangeText={t => {
              setUsername(t);
              updateError('username', undefined);
            }}
            placeholder="Enter username or email"
            error={errors.username}
            leftIcon="person-outline"
            editable={!isLoading}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <FormInput
            label="Password"
            value={password}
            onChangeText={t => {
              setPassword(t);
              updateError('password', undefined);
            }}
            placeholder="Enter password"
            error={errors.password}
            leftIcon="lock-closed-outline"
            secureTextEntry
            editable={!isLoading}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.xl,
              marginTop: -spacing.xs,
            }}
          >
            <Checkbox
              label="Remember Me"
              checked={rememberMe}
              onToggle={() => setRememberMe(!rememberMe)}
            />
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword' as never)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.75}
            >
              <Text style={{ ...type.uiSm, color: colors.cobalt }}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          <FormButton
            title="Sign In"
            onPress={handleLogin}
            variant="primary"
            size="large"
            loading={isLoading}
            disabled={isLoading || ssoLoading !== null}
          />
        </View>

        {/* Sign Up link */}
        <TouchableOpacity
          style={{
            marginTop: spacing.xxl,
            alignItems: 'center',
            paddingVertical: spacing.md,
          }}
          onPress={() => navigation.navigate('Registration' as never)}
          activeOpacity={0.75}
        >
          <Text style={{ ...type.body, color: colors.textSecondary }}>
            Don't have an account?{' '}
            <Text style={{ ...type.ui, color: colors.cobalt }}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
