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
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { fonts, typeScale, useTheme } from '../../theme';
import {
  useValidatePromoCodeMutation,
  useRedeemPromoCodeMutation,
  useCreateCheckoutSessionMutation,
} from '../../store/api';
import { setUser } from '../../store/slices/authSlice';
import { selectPlan } from '../../store/slices/subscriptionSlice';
import {
  PLAN_INFO,
  SubscriptionPlan,
  PLAN_HIERARCHY,
} from '../../types/subscription';

const PLANS: { key: SubscriptionPlan; icon: string }[] = [
  { key: 'roster', icon: 'people-outline' },
  { key: 'league', icon: 'trophy-outline' },
  { key: 'facility_pro', icon: 'business-outline' },
];

export function RedeemCodeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentPlan = useSelector(selectPlan);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  );
  const [showPromo, setShowPromo] = useState(Platform.OS !== 'web');
  const [code, setCode] = useState('');
  const [validated, setValidated] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [validatePromoCode, { isLoading: isValidating }] =
    useValidatePromoCodeMutation();
  const [redeemPromoCode, { isLoading: isRedeeming }] =
    useRedeemPromoCodeMutation();
  const [createCheckoutSession, { isLoading: isCheckingOut }] =
    useCreateCheckoutSessionMutation();

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    setError(null);
    try {
      const result = await createCheckoutSession({ plan }).unwrap();
      if (result.url) {
        await Linking.openURL(result.url);
      } else {
        setError('Could not open checkout. Please try again.');
      }
    } catch (e: any) {
      setError(e?.data?.error || 'Failed to start checkout. Please try again.');
    }
  };

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

  const currentPlanIndex = PLAN_HIERARCHY.indexOf(currentPlan);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bgScreen }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {successMsg ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={48} color={colors.pine} />
            <Text style={[styles.successText, { color: colors.ink }]}>
              {successMsg}
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.cobalt }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={[styles.primaryBtnText, { color: colors.white }]}>
                Back to Profile
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Header */}
            <Text style={[styles.heading, { color: colors.ink }]}>
              {Platform.OS === 'web' ? 'Membership Plans' : 'Redeem Code'}
            </Text>
            <Text style={[styles.subheading, { color: colors.inkSoft }]}>
              {Platform.OS === 'web'
                ? 'Unlock more features with a Muster membership.'
                : 'Enter a promo code to unlock features.'}
            </Text>

            {/* Current plan badge */}
            {currentPlan !== 'free' && (
              <View
                style={[
                  styles.currentPlanBadge,
                  {
                    backgroundColor: colors.pineTint,
                    borderColor: colors.pine,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.pine}
                />
                <Text style={[styles.currentPlanText, { color: colors.pine }]}>
                  Current plan: {PLAN_INFO[currentPlan].label}
                </Text>
              </View>
            )}

            {/* Plan cards — web only (iOS uses App Store subscriptions) */}
            {Platform.OS === 'web' && (
              <>
                {PLANS.map(({ key, icon }) => {
                  const info = PLAN_INFO[key];
                  const planIndex = PLAN_HIERARCHY.indexOf(key);
                  const isCurrent = key === currentPlan;
                  const isDowngrade =
                    planIndex <= currentPlanIndex && currentPlan !== 'free';
                  const isSelected = selectedPlan === key;

                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.planCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                        isSelected && {
                          borderColor: colors.cobalt,
                          backgroundColor: `${colors.cobalt}08`,
                        },
                        isCurrent && { borderColor: colors.pine },
                      ]}
                      onPress={() =>
                        !isCurrent && !isDowngrade && setSelectedPlan(key)
                      }
                      activeOpacity={isCurrent || isDowngrade ? 1 : 0.7}
                      disabled={isCurrent || isDowngrade}
                    >
                      <View style={styles.planHeader}>
                        <Ionicons
                          name={icon as any}
                          size={24}
                          color={
                            isCurrent
                              ? colors.pine
                              : isSelected
                                ? colors.cobalt
                                : colors.inkSoft
                          }
                        />
                        <View style={styles.planTitleRow}>
                          <Text
                            style={[styles.planLabel, { color: colors.ink }]}
                          >
                            {info.label}
                          </Text>
                          <Text
                            style={[styles.planPrice, { color: colors.cobalt }]}
                          >
                            {info.price}
                          </Text>
                        </View>
                        {isCurrent && (
                          <View
                            style={[
                              styles.activeBadge,
                              { backgroundColor: colors.pine },
                            ]}
                          >
                            <Text
                              style={[
                                styles.activeBadgeText,
                                { color: colors.white },
                              ]}
                            >
                              Active
                            </Text>
                          </View>
                        )}
                        {isSelected && !isCurrent && (
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={colors.cobalt}
                          />
                        )}
                      </View>
                      <View style={styles.featureList}>
                        {info.features.map((f, i) => (
                          <View key={i} style={styles.featureRow}>
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color={colors.pine}
                            />
                            <Text
                              style={[
                                styles.featureText,
                                { color: colors.inkSoft },
                              ]}
                            >
                              {f}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Subscribe button */}
                {selectedPlan && (
                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      { backgroundColor: colors.cobalt },
                    ]}
                    onPress={() => handleSubscribe(selectedPlan)}
                    disabled={isCheckingOut}
                    activeOpacity={0.7}
                  >
                    {isCheckingOut ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text
                        style={[styles.primaryBtnText, { color: colors.white }]}
                      >
                        Subscribe to {PLAN_INFO[selectedPlan].label}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}

            {error && (
              <Text style={[styles.error, { color: colors.error }]}>
                {error}
              </Text>
            )}

            {/* Promo code section */}
            {Platform.OS === 'web' && (
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
            )}

            {Platform.OS === 'web' && (
              <TouchableOpacity
                style={styles.promoToggle}
                onPress={() => setShowPromo(!showPromo)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="pricetag-outline"
                  size={18}
                  color={colors.inkSoft}
                />
                <Text
                  style={[styles.promoToggleText, { color: colors.inkSoft }]}
                >
                  Have a promo code?
                </Text>
                <Ionicons
                  name={showPromo ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.inkSoft}
                />
              </TouchableOpacity>
            )}

            {showPromo && (
              <View style={styles.promoSection}>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.bgInput,
                        color: colors.ink,
                        borderColor: colors.border,
                      },
                      validated && {
                        backgroundColor: `${colors.cobalt}10`,
                        borderColor: colors.cobalt,
                      },
                    ]}
                    placeholder="Enter promo code"
                    placeholderTextColor={colors.inkSoft}
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
                      style={[
                        styles.validateBtn,
                        { backgroundColor: colors.cobalt },
                      ]}
                      onPress={handleValidate}
                      disabled={isValidating}
                      activeOpacity={0.7}
                    >
                      {isValidating ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text
                          style={[
                            styles.validateBtnText,
                            { color: colors.white },
                          ]}
                        >
                          Apply
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {validated && (
                  <>
                    <Text
                      style={[styles.promoLabel, { color: colors.inkSoft }]}
                    >
                      Select trial tier:
                    </Text>
                    {[
                      { key: 'player', label: 'Player' },
                      { key: 'host', label: 'Host' },
                      { key: 'facility', label: 'Facility' },
                    ].map(tier => {
                      const active = selectedTier === tier.key;
                      return (
                        <TouchableOpacity
                          key={tier.key}
                          style={[
                            styles.tierChip,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                            active && {
                              borderColor: colors.cobalt,
                              backgroundColor: `${colors.cobalt}10`,
                            },
                          ]}
                          onPress={() => setSelectedTier(tier.key)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.tierChipText,
                              { color: colors.ink },
                              active && { color: colors.cobalt },
                            ]}
                          >
                            {tier.label}
                          </Text>
                          {active && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color={colors.cobalt}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      style={[
                        styles.redeemBtn,
                        { backgroundColor: colors.pine },
                        !selectedTier && { opacity: 0.5 },
                      ]}
                      onPress={handleRedeem}
                      disabled={!selectedTier || isRedeeming}
                      activeOpacity={0.7}
                    >
                      {isRedeeming ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text
                          style={[
                            styles.redeemBtnText,
                            { color: colors.white },
                          ]}
                        >
                          Redeem
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    marginBottom: 6,
  },
  subheading: {
    fontFamily: fonts.body,
    fontSize: 15,
    marginBottom: 20,
  },
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  currentPlanText: {
    fontFamily: fonts.label,
    fontSize: 13,
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  planTitleRow: { flex: 1 },
  planLabel: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
  planPrice: {
    fontFamily: fonts.label,
    fontSize: 13,
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  activeBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
  },
  featureList: { gap: 4, marginLeft: 36 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  primaryBtn: {
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { fontFamily: fonts.ui, fontSize: 16 },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  promoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  promoToggleText: {
    fontFamily: fonts.body,
    fontSize: 14,
    flex: 1,
  },
  promoSection: { marginTop: 12 },
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
  validateBtn: {
    borderRadius: 9999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  validateBtnText: { fontFamily: fonts.ui, fontSize: 15 },
  promoLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    marginTop: 14,
    marginBottom: 8,
  },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  tierChipText: {
    fontFamily: fonts.ui,
    fontSize: 14,
  },
  redeemBtn: {
    borderRadius: 9999,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  redeemBtnText: { fontFamily: fonts.ui, fontSize: 15 },
  successCard: { alignItems: 'center', marginTop: 40, gap: 16 },
  successText: {
    fontFamily: fonts.body,
    ...typeScale.body,
    textAlign: 'center',
  },
});
