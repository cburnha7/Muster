import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, typeScale, useTheme } from '../../theme';
import {
  useValidatePromoCodeMutation,
  useRedeemPromoCodeMutation,
} from '../../store/api';
import { setUser } from '../../store/slices/authSlice';

const TIERS = [
  {
    key: 'player',
    label: 'Player',
    icon: 'person-outline' as const,
    desc: 'Access player features and stats tracking',
  },
  {
    key: 'host',
    label: 'Host',
    icon: 'megaphone-outline' as const,
    desc: 'Create and manage events, plus all Player features',
  },
  {
    key: 'facility',
    label: 'Facility',
    icon: 'business-outline' as const,
    desc: 'Manage facilities and courts, plus all Host features',
  },
];

export function RedeemCodeScreen() {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [code, setCode] = useState('');
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [validatePromoCode, { isLoading: isValidating }] =
    useValidatePromoCodeMutation();
  const [redeemPromoCode, { isLoading: isRedeeming }] =
    useRedeemPromoCodeMutation();

  const handleValidate = async () => {
    if (!code.trim()) {
      setError('Please enter a promo code');
      return;
    }
    setError(null);
    try {
      const result = await validatePromoCode({ code: code.trim() }).unwrap();
      if (result.valid) {
        setValidated(true);
        setError(null);
      } else {
        setError(result.error || 'Invalid promo code');
      }
    } catch (e: any) {
      setError(e?.data?.error || 'Something went wrong. Try again.');
    }
  };

  const handleRedeem = async () => {
    if (!selectedTier) {
      setError('Select a tier to continue');
      return;
    }
    setError(null);
    try {
      const result = await redeemPromoCode({
        code: code.trim(),
        selectedTier,
      }).unwrap();
      // Update auth state so feature gates pick up the new trial tier immediately
      if (result) {
        dispatch(setUser(result));
      }
      setSuccessMsg(
        `You now have ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} access for 30 days.`
      );
    } catch (e: any) {
      setError(e?.data?.error || 'Redemption failed. Try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: themeColors.bgScreen }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {successMsg ? (
          <View style={styles.successCard}>
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={colors.secondary}
            />
            <Text style={styles.successText}>{successMsg}</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryBtnText}>Back to Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Code Input */}
            <Text style={styles.label}>Promo Code</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, validated && styles.inputDisabled]}
                placeholder="Enter your code"
                placeholderTextColor={colors.outline}
                value={code}
                onChangeText={t => {
                  setCode(t);
                  setError(null);
                  setValidated(false);
                  setSelectedTier(null);
                }}
                autoCapitalize="characters"
                editable={!validated}
              />
              {!validated && (
                <TouchableOpacity
                  style={styles.validateBtn}
                  onPress={handleValidate}
                  disabled={isValidating}
                  activeOpacity={0.7}
                >
                  {isValidating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.validateBtnText}>Apply</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            {validated && (
              <>
                <Text style={styles.label}>Select Your Tier</Text>
                {TIERS.map(tier => {
                  const active = selectedTier === tier.key;
                  return (
                    <TouchableOpacity
                      key={tier.key}
                      style={[styles.tierCard, active && styles.tierCardActive]}
                      onPress={() => setSelectedTier(tier.key)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={tier.icon}
                        size={24}
                        color={active ? colors.primary : colors.outline}
                      />
                      <View style={styles.tierInfo}>
                        <Text
                          style={[
                            styles.tierLabel,
                            active && styles.tierLabelActive,
                          ]}
                        >
                          {tier.label}
                        </Text>
                        <Text style={styles.tierDesc}>{tier.desc}</Text>
                      </View>
                      {active && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    !selectedTier && styles.primaryBtnDisabled,
                  ]}
                  onPress={handleRedeem}
                  disabled={!selectedTier || isRedeeming}
                  activeOpacity={0.7}
                >
                  {isRedeeming ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Redeem</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  label: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.outline,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: `${colors.outline}30`,
  },
  inputDisabled: {
    backgroundColor: `${colors.primary}10`,
    borderColor: colors.primary,
  },
  validateBtn: {
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  validateBtnText: { fontFamily: fonts.ui, fontSize: 15, color: '#fff' },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.error,
    marginTop: 6,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tierCardActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  tierInfo: { flex: 1, marginLeft: 12 },
  tierLabel: { fontFamily: fonts.ui, fontSize: 15, color: colors.onSurface },
  tierLabelActive: { color: colors.primary },
  tierDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.outline,
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontFamily: fonts.ui, fontSize: 16, color: '#fff' },
  successCard: { alignItems: 'center', marginTop: 40, gap: 16 },
  successText: {
    fontFamily: fonts.body,
    ...typeScale.body,
    color: colors.onSurface,
    textAlign: 'center',
  },
});
