import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { Checkbox } from '../../components/forms/Checkbox';
import { SSOButton } from '../../components/auth/SSOButton';
import { fonts, useTheme } from '../../theme';
import ValidationService from '../../services/auth/ValidationService';
import SSOService from '../../services/auth/SSOService';
import { registerUser, registerWithSSO } from '../../store/slices/authSlice';
import { loggingService } from '../../services/LoggingService';

const TOTAL_STEPS = 3;

export const RegistrationScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<'apple' | 'google' | null>(null);
  const [ssoProvider, setSsoProvider] = useState<'apple' | 'google' | null>(
    null
  );
  const [ssoToken, setSsoToken] = useState<string | null>(null);
  const [ssoUserId, setSsoUserId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const updateError = (field: string, error: string | undefined) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const clearErrors = () => setErrors({});

  // ── Step transition ─────────────────────
  const transitionTo = (nextStep: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      clearErrors();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  // ── Validation per step ─────────────────
  const validateStep = (): boolean => {
    const newErrors: Record<string, string | undefined> = {};

    if (step === 0) {
      const fnErr = ValidationService.validateFirstName(firstName);
      const lnErr = ValidationService.validateLastName(lastName);
      if (fnErr) newErrors.firstName = fnErr;
      if (lnErr) newErrors.lastName = lnErr;
    } else if (step === 1) {
      const emErr = ValidationService.validateEmail(email);
      const unErr = ValidationService.validateUsername(username);
      if (emErr) newErrors.email = emErr;
      if (unErr) newErrors.username = unErr;
    } else if (step === 2) {
      if (!ssoProvider) {
        const pwErr = ValidationService.validatePassword(password);
        if (pwErr) newErrors.password = pwErr;
      }
      if (!agreedToTerms) {
        newErrors.agreedToTerms = 'You must agree to continue';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Continue ────────────────────────────
  const handleContinue = () => {
    if (!validateStep()) return;

    if (step < TOTAL_STEPS - 1) {
      transitionTo(step + 1);
    } else {
      handleSubmit();
    }
  };

  // ── Back ────────────────────────────────
  const handleBack = () => {
    if (step > 0) {
      transitionTo(step - 1);
    } else {
      navigation.navigate('Login' as never);
    }
  };

  // ── Submit ──────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep()) return;

    loggingService.logButton('Create Account', 'RegistrationScreen');
    setIsLoading(true);
    clearErrors();

    try {
      if (ssoProvider) {
        await dispatch(
          registerWithSSO({
            provider: ssoProvider,
            providerToken: ssoToken!,
            providerUserId: ssoUserId!,
            email,
            firstName,
            lastName,
            username,
          })
        ).unwrap();
      } else {
        await dispatch(
          registerUser({
            firstName,
            lastName,
            email,
            username,
            password,
            agreedToTerms,
          })
        ).unwrap();
      }

      Alert.alert('Welcome to Muster!', "You're all set.");
    } catch (error: any) {
      if (error.status === 409) {
        if (error.message?.includes('email')) {
          updateError('general', 'This email is already registered');
          transitionTo(1);
        } else if (error.message?.includes('username')) {
          updateError('general', 'This username is taken');
          transitionTo(1);
        }
      } else if (error.message === 'No internet connection') {
        updateError(
          'general',
          'No internet connection. Check your network and try again.'
        );
      } else {
        updateError(
          'general',
          error.message || 'Something went wrong. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── SSO ─────────────────────────────────
  const handleSSO = async (provider: 'apple' | 'google') => {
    setSsoLoading(provider);
    clearErrors();

    try {
      const userData =
        provider === 'apple'
          ? await SSOService.signInWithApple()
          : await SSOService.signInWithGoogle();

      setFirstName(userData.firstName);
      setLastName(userData.lastName);
      setEmail(userData.email);
      setSsoProvider(provider);
      setSsoToken(userData.providerToken);
      setSsoUserId(userData.providerId);
      setSsoLoading(null);
      // Skip to username step (name & email filled by SSO)
      transitionTo(1);
    } catch (error: any) {
      setSsoLoading(null);
      if (error.message !== 'User cancelled') {
        updateError(
          'general',
          `Sign in with ${provider === 'apple' ? 'Apple' : 'Google'} failed`
        );
      }
    }
  };

  const handleOpenTerms = () => {
    Alert.alert('Terms of Service', 'Terms of Service will be displayed here');
  };

  const handleOpenPrivacy = () => {
    Alert.alert('Privacy Policy', 'Privacy Policy will be displayed here');
  };

  // ── Step content ────────────────────────
  const stepConfig = [
    {
      title: "What's your name?",
      subtitle: 'So other players know who you are.',
    },
    {
      title: 'Set up your account',
      subtitle: "We'll use this to identify you on Muster.",
    },
    {
      title: ssoProvider ? 'Almost there' : 'Secure your account',
      subtitle: ssoProvider
        ? 'Agree to our terms to get started.'
        : 'Choose a strong password to protect your account.',
    },
  ];

  const { title, subtitle } = stepConfig[step];

  const isLastStep = step === TOTAL_STEPS - 1;
  const ctaLabel = isLastStep ? 'Create Account' : 'Continue';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Top bar: back + progress */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}
          >
            <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>

          <View style={styles.progressBar}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i <= step && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          {/* Spacer to balance back button */}
          <View style={styles.backButton} />
        </View>

        {/* Animated step content */}
        <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
          {/* Header */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* General error */}
          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          {/* Step 0: Name */}
          {step === 0 && (
            <View style={styles.fields}>
              {/* SSO option */}
              {!ssoProvider && Platform.OS !== 'web' && (
                <>
                  <SSOButton
                    provider="apple"
                    onPress={() => handleSSO('apple')}
                    isLoading={ssoLoading === 'apple'}
                    disabled={isLoading || ssoLoading !== null}
                  />
                  <SSOButton
                    provider="google"
                    onPress={() => handleSSO('google')}
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

              <FormInput
                value={firstName}
                onChangeText={text => {
                  setFirstName(text);
                  updateError('firstName', undefined);
                }}
                placeholder="First name"
                error={errors.firstName}
                autoCapitalize="words"
                autoFocus
              />
              <FormInput
                value={lastName}
                onChangeText={text => {
                  setLastName(text);
                  updateError('lastName', undefined);
                }}
                placeholder="Last name"
                error={errors.lastName}
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Step 1: Account */}
          {step === 1 && (
            <View style={styles.fields}>
              <FormInput
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  updateError('email', undefined);
                }}
                placeholder="Email address"
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!ssoProvider}
                autoFocus={!ssoProvider}
              />
              <FormInput
                value={username}
                onChangeText={text => {
                  setUsername(text);
                  updateError('username', undefined);
                }}
                placeholder="Choose a username"
                error={errors.username}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={!!ssoProvider}
              />
            </View>
          )}

          {/* Step 2: Security + Terms */}
          {step === 2 && (
            <View style={styles.fields}>
              {!ssoProvider && (
                <FormInput
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    updateError('password', undefined);
                  }}
                  placeholder="Create a password"
                  error={errors.password}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              )}

              <View style={styles.termsSection}>
                <Checkbox
                  label={
                    <Text style={styles.checkboxLabel}>
                      I agree to the{' '}
                      <Text style={styles.link} onPress={handleOpenTerms}>
                        Terms of Service
                      </Text>{' '}
                      and{' '}
                      <Text style={styles.link} onPress={handleOpenPrivacy}>
                        Privacy Policy
                      </Text>
                    </Text>
                  }
                  checked={agreedToTerms}
                  onToggle={() => {
                    setAgreedToTerms(!agreedToTerms);
                    updateError('agreedToTerms', undefined);
                  }}
                  error={errors.agreedToTerms}
                />
              </View>
            </View>
          )}
        </Animated.View>

        {/* Fixed bottom CTA */}
        <View style={styles.bottomSection}>
          <FormButton
            title={ctaLabel}
            onPress={handleContinue}
            variant="primary"
            size="large"
            loading={isLoading}
          />

          {step === 0 && (
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login' as never)}
              activeOpacity={0.75}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={styles.link}>Log In</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
  },

  // ── Top bar ─────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.outlineVariant,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
    width: 24,
    borderRadius: 4,
  },

  // ── Inner (animated) ────────────────────
  inner: {
    flex: 1,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 24,
  },

  // ── Header ──────────────────────────────
  title: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.onSurface,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.onSurfaceVariant,
    lineHeight: 24,
    marginBottom: 32,
  },

  // ── Fields ──────────────────────────────
  fields: {
    // Container for step fields
  },

  // ── SSO / Divider ──────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.outlineVariant,
    opacity: 0.4,
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
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.onErrorContainer,
    textAlign: 'center',
  },

  // ── Terms ───────────────────────────────
  termsSection: {
    marginTop: 4,
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  link: {
    color: colors.primary,
    fontFamily: fonts.headingSemi,
  },

  // ── Bottom section ──────────────────────
  bottomSection: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
  },

  // ── Login link ──────────────────────────
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.onSurfaceVariant,
  },
});
