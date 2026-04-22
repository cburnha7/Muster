/**
 * InviteRegistrationScreen
 *
 * Streamlined 2-step registration for users who arrive via team invite link.
 * Step 1: Create account (name, email, password — all on one screen)
 * Step 2: "Add your child" or "This is for me" toggle
 *
 * On completion:
 * - Registers user
 * - Optionally creates a dependent
 * - Marks onboarding complete (skipping the full 5-step flow)
 * - Auto-joins the team with the invite code
 * - Navigates to team details
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { SSOButton } from '../../components/auth/SSOButton';
import { useTheme } from '../../theme';
import ValidationService from '../../services/auth/ValidationService';
import SSOService from '../../services/auth/SSOService';
import {
  registerUser,
  registerWithSSO,
  completeOnboarding,
} from '../../store/slices/authSlice';
import { setDependents } from '../../store/slices/contextSlice';
import { API_BASE_URL } from '../../services/api/config';
import { UserIntent } from '../../types/auth';

const PENDING_INVITE_KEY = '@muster_pending_invite';

interface InviteRegistrationScreenProps {
  route: {
    params: {
      inviteCode: string;
      teamId: string;
      teamName: string;
      teamSport: string;
    };
  };
}

export function InviteRegistrationScreen({
  route,
}: InviteRegistrationScreenProps) {
  const { inviteCode, teamName, teamSport } = route.params ?? {};
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { colors } = useTheme();

  // Step tracking
  const [step, setStep] = useState(0); // 0 = account, 1 = child/self

  // Step 1: Account fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2: Child fields
  const [isForChild, setIsForChild] = useState(true); // Default to child (youth team likely)
  const [childFirstName, setChildFirstName] = useState('');
  const [childDob, setChildDob] = useState('');

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<'apple' | 'google' | null>(null);

  // Registered user data (set after step 1 completes)
  const [registeredUser, setRegisteredUser] = useState<any>(null);

  const updateError = (field: string, msg: string) => {
    setErrors(prev => ({ ...prev, [field]: msg }));
  };

  const clearError = (field: string) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // ── Step 1 validation ──
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (ValidationService.validateEmail(email) !== null) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Step 1 submit: Register account ──
  const handleRegister = async () => {
    if (!validateStep1()) return;

    setIsLoading(true);
    try {
      // Generate a username from email (before the @)
      const username =
        (email.split('@')[0] ?? 'user').replace(/[^a-zA-Z0-9_]/g, '') +
        Math.floor(Math.random() * 100);

      const result = await (dispatch as any)(
        registerUser({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          username,
          password,
          confirmPassword: password,
          agreedToTerms: true,
        })
      ).unwrap();

      setRegisteredUser(result);
      setStep(1);
    } catch (err: any) {
      const msg =
        typeof err === 'string' ? err : err?.message || 'Registration failed';
      if (msg.toLowerCase().includes('email')) {
        updateError('email', msg);
      } else {
        Alert.alert('Registration Error', msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── SSO Registration ──
  const handleSSO = async (provider: 'apple' | 'google') => {
    setSsoLoading(provider);
    try {
      const ssoResult =
        provider === 'apple'
          ? await SSOService.signInWithApple()
          : await SSOService.signInWithGoogle();

      if (!ssoResult) {
        setSsoLoading(null);
        return;
      }

      const result = await (dispatch as any)(
        registerWithSSO({
          provider,
          providerToken: ssoResult.providerToken,
          providerUserId: ssoResult.providerId,
          email: ssoResult.email || email,
          firstName: ssoResult.firstName || firstName,
          lastName: ssoResult.lastName || lastName,
          username:
            ((ssoResult.email || email).split('@')[0] ?? 'user').replace(
              /[^a-zA-Z0-9_]/g,
              ''
            ) + Math.floor(Math.random() * 100),
        })
      ).unwrap();

      setRegisteredUser(result);
      if (ssoResult.firstName) setFirstName(ssoResult.firstName);
      if (ssoResult.lastName) setLastName(ssoResult.lastName);
      setStep(1);
    } catch (err: any) {
      Alert.alert('SSO Error', err?.message || 'SSO registration failed');
    } finally {
      setSsoLoading(null);
    }
  };

  // ── Step 2 submit: Create dependent (if child) + complete onboarding + join team ──
  const handleFinish = async () => {
    if (isForChild) {
      if (!childFirstName.trim()) {
        updateError('childFirstName', "Child's first name is required");
        return;
      }
      if (!childDob.trim()) {
        updateError('childDob', 'Date of birth is required');
        return;
      }
      // Basic date validation
      if (!/^\d{4}-\d{2}-\d{2}$/.test(childDob)) {
        updateError('childDob', 'Format: YYYY-MM-DD');
        return;
      }
    }

    setIsLoading(true);
    try {
      const userId = registeredUser?.id || registeredUser?.user?.id;
      const token = registeredUser?.token || registeredUser?.accessToken;

      // 1. Complete onboarding with pre-filled data
      const intents: UserIntent[] = isForChild ? ['GUARDIAN'] : ['PLAYER'];
      await (dispatch as any)(
        completeOnboarding({
          intents,
          sportPreferences: [teamSport],
        })
      ).unwrap();

      // 2. Create dependent if needed
      if (isForChild && userId && token) {
        try {
          const depRes = await fetch(`${API_BASE_URL}/dependents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              firstName: childFirstName.trim(),
              lastName: lastName.trim(), // Use parent's last name as default
              dateOfBirth: childDob,
              sportPreferences: [teamSport],
            }),
          });

          if (depRes.ok) {
            const dependent = await depRes.json();
            // Update context with the new dependent
            dispatch(
              setDependents([
                {
                  id: dependent.id,
                  firstName: dependent.firstName,
                  lastName: dependent.lastName,
                  profileImage: null,
                  dateOfBirth: dependent.dateOfBirth,
                },
              ])
            );
          }
        } catch (depErr) {
          console.error('Failed to create dependent:', depErr);
          // Continue anyway — parent can add child later
        }
      }

      // 3. Join the team with the invite code
      // Store invite code for the redirect after navigation settles
      await AsyncStorage.setItem(PENDING_INVITE_KEY, inviteCode);

      // The RootNavigator will pick up the pending invite code and redirect to JoinTeam
      // after the Main navigator mounts.
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render Step 1: Account Creation ──
  const renderAccountStep = () => (
    <>
      <View
        style={[styles.teamBanner, { backgroundColor: colors.gold + '18' }]}
      >
        <Ionicons name="people" size={20} color={colors.gold} />
        <Text style={[styles.teamBannerText, { color: colors.inkSecondary }]}>
          You've been invited to join{' '}
          <Text style={[styles.teamBannerName, { color: colors.ink }]}>
            {teamName}
          </Text>
        </Text>
      </View>

      <Text style={[styles.stepTitle, { color: colors.ink }]}>
        Create your account
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.inkSecondary }]}>
        Sign up to join the team. It only takes a minute.
      </Text>

      <View style={styles.nameRow}>
        <View style={styles.nameField}>
          <FormInput
            label="First Name"
            value={firstName}
            onChangeText={t => {
              setFirstName(t);
              clearError('firstName');
            }}
            error={errors.firstName}
            autoCapitalize="words"
          />
        </View>
        <View style={styles.nameField}>
          <FormInput
            label="Last Name"
            value={lastName}
            onChangeText={t => {
              setLastName(t);
              clearError('lastName');
            }}
            error={errors.lastName}
            autoCapitalize="words"
          />
        </View>
      </View>

      <FormInput
        label="Email"
        value={email}
        onChangeText={t => {
          setEmail(t);
          clearError('email');
        }}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <FormInput
        label="Password"
        value={password}
        onChangeText={t => {
          setPassword(t);
          clearError('password');
        }}
        error={errors.password}
        secureTextEntry
      />

      <FormButton
        title={isLoading ? 'Creating account...' : 'Continue'}
        onPress={handleRegister}
        disabled={isLoading}
      />

      <View style={styles.ssoSection}>
        <Text style={[styles.ssoText, { color: colors.inkMuted }]}>
          Or sign up with
        </Text>
        <View style={styles.ssoRow}>
          {Platform.OS === 'ios' && (
            <SSOButton
              provider="apple"
              onPress={() => handleSSO('apple')}
              loading={ssoLoading === 'apple'}
              disabled={!!ssoLoading}
            />
          )}
          <SSOButton
            provider="google"
            onPress={() => handleSSO('google')}
            loading={ssoLoading === 'google'}
            disabled={!!ssoLoading}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.loginLink}
        onPress={() => (navigation as any).navigate('Login')}
      >
        <Text style={[styles.loginLinkText, { color: colors.inkSecondary }]}>
          Already have an account?{' '}
          <Text style={[styles.loginLinkBold, { color: colors.cobalt }]}>
            Sign in
          </Text>
        </Text>
      </TouchableOpacity>
    </>
  );

  // ── Render Step 2: Child or Self ──
  const renderChildStep = () => (
    <>
      <Text style={[styles.stepTitle, { color: colors.ink }]}>
        Who's joining?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.inkSecondary }]}>
        Is this for your child or are you joining as a player?
      </Text>

      <View style={[styles.toggleRow, { backgroundColor: colors.bgCard }]}>
        <Text
          style={[
            styles.toggleLabel,
            { color: colors.inkMuted },
            !isForChild && { color: colors.ink, fontWeight: '700' },
          ]}
        >
          This is for me
        </Text>
        <Switch
          value={isForChild}
          onValueChange={setIsForChild}
          trackColor={{ false: colors.cobalt + '40', true: colors.gold + '40' }}
          thumbColor={isForChild ? colors.gold : colors.cobalt}
        />
        <Text
          style={[
            styles.toggleLabel,
            { color: colors.inkMuted },
            isForChild && { color: colors.ink, fontWeight: '700' },
          ]}
        >
          For my child
        </Text>
      </View>

      {isForChild && (
        <View style={styles.childFields}>
          <FormInput
            label="Child's First Name"
            value={childFirstName}
            onChangeText={t => {
              setChildFirstName(t);
              clearError('childFirstName');
            }}
            error={errors.childFirstName}
            autoCapitalize="words"
          />
          <FormInput
            label="Date of Birth"
            value={childDob}
            onChangeText={t => {
              setChildDob(t);
              clearError('childDob');
            }}
            error={errors.childDob}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      )}

      {!isForChild && (
        <View
          style={[styles.selfNote, { backgroundColor: colors.cobalt + '10' }]}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.cobalt}
          />
          <Text style={[styles.selfNoteText, { color: colors.inkSecondary }]}>
            You'll be added as a player on {teamName}.
          </Text>
        </View>
      )}

      <FormButton
        title={isLoading ? 'Setting up...' : `Join ${teamName}`}
        onPress={handleFinish}
        disabled={isLoading}
      />

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => setStep(0)}
        disabled={isLoading}
      >
        <Ionicons name="arrow-back" size={18} color={colors.inkSecondary} />
        <Text style={[styles.backBtnText, { color: colors.inkSecondary }]}>
          Back
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress indicator */}
        <View style={styles.progressRow}>
          <View
            style={[
              styles.progressDot,
              { backgroundColor: colors.border },
              step === 0 && { width: 24, backgroundColor: colors.cobalt },
            ]}
          />
          <View
            style={[
              styles.progressDot,
              { backgroundColor: colors.border },
              step === 1 && { width: 24, backgroundColor: colors.cobalt },
            ]}
          />
        </View>

        {step === 0 ? renderAccountStep() : renderChildStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 60,
    gap: 16,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Team banner
  teamBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  teamBannerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  teamBannerName: {
    fontWeight: '700',
  },

  // Step content
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  stepSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },

  // Name row
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },

  // SSO
  ssoSection: {
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  ssoText: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ssoRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // Login link
  loginLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginLinkText: {
    fontSize: 14,
  },
  loginLinkBold: {
    fontWeight: '700',
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Child fields
  childFields: {
    gap: 12,
  },

  // Self note
  selfNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
  },
  selfNoteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  // Back button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
