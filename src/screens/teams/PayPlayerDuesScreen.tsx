import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { selectUser } from '../../store/slices/authSlice';
import { useDependentContext } from '../../hooks/useDependentContext';
import { fonts, Spacing, useTheme } from '../../theme';
import {
  playerDuesService,
  DuesStatusResponse } from '../../services/api/PlayerDuesService';
import { TeamsStackParamList } from '../../navigation/types';

type PayPlayerDuesRouteProp = RouteProp<TeamsStackParamList, 'PayPlayerDues'>;

export const PayPlayerDuesScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<PayPlayerDuesRouteProp>();
  const user = useSelector(selectUser);
  const { isDependent, activeName } = useDependentContext();
  const { rosterId, seasonId } = route.params ?? {};

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [duesStatus, setDuesStatus] = useState<DuesStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const status = await playerDuesService.getStatus(user.id, rosterId, seasonId);
      setDuesStatus(status);
    } catch (err) {
      setError('Failed to load dues information');
    } finally {
      setLoading(false);
    }
  }, [user?.id, rosterId, seasonId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handlePayDues = async () => {
    if (!user?.id || !duesStatus?.duesAmount) return;

    setPaying(true);
    try {
      const result = await playerDuesService.createPayment({
        playerId: user.id,
        rosterId,
        seasonId });

      // In a full implementation, the clientSecret would be passed to
      // Stripe's confirmPayment SDK. For now, we confirm immediately
      // to demonstrate the flow end-to-end.
      await playerDuesService.confirmPayment(result.paymentId, result.clientSecret);

      Alert.alert(
        'Dues Paid',
        'Your season dues have been paid successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      const message = err?.message || 'Failed to process dues payment';
      Alert.alert('Payment Failed', message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}>
        <ScreenHeader
          title="Season Dues"
          leftIcon="""
          
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cobalt} />
          <Text style={[styles.loadingText, { color: colors.inkFaint }]}>Loading dues information...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}>
        <ScreenHeader
          title="Season Dues"
          leftIcon="""
          
        />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.heart} />
          <Text style={[styles.errorText, { color: colors.heart }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.cobalt }]} onPress={loadStatus} activeOpacity={0.75}>
            <Text style={[styles.retryButtonText, { color: colors.white }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isPaid = duesStatus?.paid === true;
  const duesAmountCents = duesStatus?.duesAmount
    ? Math.round(duesStatus.duesAmount * 100)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}>
      <ScreenHeader
        title="Season Dues"
        leftIcon="""
        
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>Season Dues</Text>

          <View style={[styles.detailRow, { borderBottomColor: colors.surface }]}>
            <Text style={[styles.detailLabel, { color: colors.inkFaint }]}>AMOUNT</Text>
            <Text style={[styles.detailValue, { color: colors.ink }]}>
              {duesAmountCents > 0 ? formatCurrency(duesAmountCents) : 'Not set'}
            </Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: colors.surface }]}>
            <Text style={[styles.detailLabel, { color: colors.inkFaint }]}>STATUS</Text>
            <View style={[styles.statusBadge, isPaid ? styles.statusPaid : styles.statusUnpaid, isPaid ? { backgroundColor: colors.pineTint } : {}]}>
              <Text style={[styles.statusText, isPaid ? styles.statusTextPaid : styles.statusTextUnpaid, isPaid ? { color: colors.pine } : {}]}>
                {isPaid ? 'Paid' : 'Unpaid'}
              </Text>
            </View>
          </View>
        </View>

        {isPaid && (
          <View style={[styles.successCard, { backgroundColor: colors.white }]}>
            <Ionicons name="checkmark-circle" size={24} color={colors.pine} />
            <Text style={[styles.successText, { color: colors.ink }]}>
              Your season dues have been paid. You're all set.
            </Text>
          </View>
        )}
      </ScrollView>

      {!isPaid && duesAmountCents > 0 && !isDependent && (
        <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.white }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.inkFaint }]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            activeOpacity={0.75}
          >
            <Text style={[styles.cancelButtonText, { color: colors.ink }]}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: colors.cobalt }, paying && styles.payButtonDisabled]}
            onPress={handlePayDues}
            disabled={paying}
            testID="pay-dues-button"
            accessibilityRole="button"
            accessibilityLabel={`Pay season dues ${formatCurrency(duesAmountCents)}`}
            accessibilityState={{ disabled: paying }}
            activeOpacity={0.75}
          >
            {paying ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[styles.payButtonText, { color: colors.white }]}>
                Pay {formatCurrency(duesAmountCents)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!isPaid && isDependent && (
        <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.white }]}>
          <View style={styles.dependentNotice}>
            <Ionicons name="information-circle-outline" size={20} color={colors.ink} />
            <Text style={[styles.dependentNoticeText, { color: colors.ink }]}>
              Payments for {activeName} must be made from the parent account.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl },
  loadingText: {
    marginTop: Spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  errorText: {
    marginTop: Spacing.md,
    fontFamily: fonts.body,
    fontSize: 17,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
  },
  scrollView: {
    flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120 },
  card: {
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontFamily: fonts.ui,
    fontSize: 17,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6 },
  statusPaid: {},
  statusUnpaid: {},
  statusText: {
    fontFamily: fonts.label,
    fontSize: 12 },
  statusTextPaid: {},
  statusTextUnpaid: {},
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  successText: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginRight: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
  },
  payButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  payButtonDisabled: {
    opacity: 0.5 },
  payButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
  },
  dependentNotice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm },
  dependentNoticeText: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: 20,
  } });
