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
import { fonts, typeScale, useTheme } from '../../theme';
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
  const { colors } = useTheme();
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
      style={[styles.flex, { backgroundColor: colors.bgScreen }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {successMsg ? (
          <View style={styles.successCard}>
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={colors.pine}
            />
            <Text style={[styles.successText, { color: colors.ink }]}>{successMsg}</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.cobalt }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={[styles.primaryBtnText, { color: colors.white }]}>Back to Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Code Input */}
            <Text style={[styles.label, { color: colors.inkSecondary }]}>Promo Code</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.white, color: colors.ink, borderColor: `${colors.inkSecondary}30` }, validated && styles.inputDisabled, validated && { backgroundColor: `${colors.cobalt}10`, borderColor: colors.cobalt }]}
                placeholder="Enter your code"
                placeholderTextColor={colors.inkSecondary}
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
                  style={[styles.validateBtn, { backgroundColor: colors.cobalt }]}
                  onPress={handleValidate}
                  disabled={isValidating}
                  activeOpacity={0.7}
                >
                  {isValidating ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={[styles.validateBtnText, { color: colors.white }]}>Apply</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}

            {validated && (
              <>
                <Text style={[styles.label, { color: colors.inkSecondary }]}>Select Your Tier</Text>
                {TIERS.map(tier => {
                  const active = selectedTier === tier.key;
                  return (
                    <TouchableOpacity
                      key={tier.key}
                      style={[styles.tierCard, { backgroundColor: colors.white }, active && styles.tierCardActive, active && { borderColor: colors.cobalt, backgroundColor: `${colors.cobalt}08` }]}
                      onPress={() => setSelectedTier(tier.key)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={tier.icon}
                        size={24}
                        color={active ? colors.cobalt : colors.inkSecondary}
                      />
                      <View style={styles.tierInfo}>
                        <Text
                          style={[
                            styles.tierLabel, { color: colors.ink },
                            active && styles.tierLabelActive, active && { color: colors.cobalt }]}
                        >
                          {tier.label}
                        </Text>
                        <Text style={[styles.tierDesc, { color: colors.inkSecondary }]}>{tier.desc}</Text>
                      </View>
                      {active && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={colors.cobalt}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[
                    styles.primaryBtn, { backgroundColor: colors.cobalt },
                    !selectedTier && styles.primaryBtnDisabled]}
                  onPress={handleRedeem}
                  disabled={!selectedTier || isRedeeming}
                  activeOpacity={0.7}
                >
                  {isRedeeming ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: colors.white }]}>Redeem</Text>
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
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  label: {
    fontFamily: fonts.label,
    fontSize: 13,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    borderWidth: 1,
  },
  inputDisabled: {},
  validateBtn: {
    borderRadius: 9999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  validateBtnText: { fontFamily: fonts.ui, fontSize: 15 },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 6,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tierCardActive: {},
  tierInfo: { flex: 1, marginLeft: 12 },
  tierLabel: { fontFamily: fonts.ui, fontSize: 15 },
  tierLabelActive: {},
  tierDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  primaryBtn: {
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontFamily: fonts.ui, fontSize: 16 },
  successCard: { alignItems: 'center', marginTop: 40, gap: 16 },
  successText: {
    fontFamily: fonts.body,
    ...typeScale.body,
    textAlign: 'center',
  },
});
