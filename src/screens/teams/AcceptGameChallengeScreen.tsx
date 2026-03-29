import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { selectUser } from '../../store/slices/authSlice';
import { colors, fonts, Spacing } from '../../theme';
import {
  gameChallengeService,
  GameChallengeResponse,
  BalanceShortfall,
} from '../../services/api/GameChallengeService';
import { TeamsStackParamList } from '../../navigation/types';

type AcceptGameChallengeRouteProp = RouteProp<
  TeamsStackParamList,
  'AcceptGameChallenge'
>;

export const AcceptGameChallengeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<AcceptGameChallengeRouteProp>();
  const user = useSelector(selectUser);
  const { bookingId } = route.params;

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [challenge, setChallenge] = useState<GameChallengeResponse | null>(null);
  const [shortfalls, setShortfalls] = useState<BalanceShortfall[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadChallenge = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gameChallengeService.getChallenge(bookingId);
      setChallenge(data);
    } catch (err) {
      setError('Failed to load challenge details');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  const handleAccept = async () => {
    if (!user?.id) return;

    setAccepting(true);
    setShortfalls(null);
    try {
      await gameChallengeService.acceptChallenge(bookingId, user.id);
      Alert.alert(
        'Challenge Accepted',
        'Both rosters have sufficient funds. The game is being confirmed.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      // Check for 402 balance shortfall response
      const details = err?.details;
      if (details?.shortfalls && Array.isArray(details.shortfalls)) {
        setShortfalls(details.shortfalls);
      } else {
        const message = err?.message || 'Failed to accept challenge';
        Alert.alert('Error', message);
      }
    } finally {
      setAccepting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const parts = time.split(':');
    const h = parseInt(parts[0] ?? '0', 10);
    const minutes = parts[1] ?? '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Game Challenge"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cobalt} />
          <Text style={styles.loadingText}>Loading challenge details...</Text>
        </View>
      </View>
    );
  }

  if (error || !challenge) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Game Challenge"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.heart} />
          <Text style={styles.errorText}>{error || 'Challenge not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadChallenge}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const homeParticipant = challenge.participants.find((p) => p.role === 'home');
  const awayParticipant = challenge.participants.find((p) => p.role === 'away');
  const isPending = challenge.status === 'pending_away_confirm';

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Game Challenge"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Challenge details card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Challenge Details</Text>

          <DetailRow label="FACILITY" value={challenge.facility?.name ?? ''} />
          <DetailRow label="COURT" value={challenge.court?.name ?? ''} />
          {challenge.timeSlot && (
            <>
              <DetailRow
                label="DATE & TIME"
                value={`${formatDate(challenge.timeSlot.date)} · ${formatTime(challenge.timeSlot.startTime)} – ${formatTime(challenge.timeSlot.endTime)}`}
              />
              <DetailRow
                label="TOTAL COURT COST"
                value={`$${challenge.timeSlot.price.toFixed(2)}`}
              />
            </>
          )}
          <DetailRow
            label="CHALLENGER ROSTER"
            value={challenge.challengerRoster?.name ?? ''}
          />
          <DetailRow
            label="YOUR ROSTER"
            value={challenge.opponentRoster?.name ?? ''}
          />
        </View>

        {/* Cost split card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cost Split (50/50)</Text>
          {homeParticipant && (
            <DetailRow
              label={`${challenge.challengerRoster?.name ?? 'HOME'} SHARE`}
              value={formatCurrency(homeParticipant.escrowAmount)}
            />
          )}
          {awayParticipant && (
            <DetailRow
              label={`${challenge.opponentRoster?.name ?? 'AWAY'} SHARE`}
              value={formatCurrency(awayParticipant.escrowAmount)}
              highlight
            />
          )}
        </View>

        {/* Shortfall display */}
        {shortfalls && shortfalls.length > 0 && (
          <View style={styles.shortfallCard}>
            <View style={styles.shortfallHeader}>
              <Ionicons name="warning" size={20} color={colors.heart} />
              <Text style={styles.shortfallTitle}>Insufficient Funds</Text>
            </View>
            <Text style={styles.shortfallDescription}>
              The following rosters do not have enough balance to cover their share:
            </Text>
            {shortfalls.map((s) => (
              <View key={s.rosterId} style={styles.shortfallRow}>
                <Text style={styles.shortfallRosterName}>{s.rosterName}</Text>
                <View style={styles.shortfallAmounts}>
                  <Text style={styles.shortfallLabel}>
                    Required: {formatCurrency(s.required)}
                  </Text>
                  <Text style={styles.shortfallAmount}>
                    Short: {formatCurrency(s.shortfall)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Status info */}
        {!isPending && (
          <View style={styles.statusCard}>
            <Ionicons name="information-circle" size={20} color={colors.ink} />
            <Text style={styles.statusText}>
              This challenge has already been {challenge.status === 'escrow_collecting' ? 'accepted' : challenge.status}.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      {isPending && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptButton, accepting && styles.acceptButtonDisabled]}
            onPress={handleAccept}
            disabled={accepting}
            testID="accept-challenge"
            accessibilityRole="button"
            accessibilityState={{ disabled: accepting }}
          >
            {accepting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.acceptButtonText}>Confirm</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const DetailRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
  },
  errorText: {
    marginTop: Spacing.md,
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.heart,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.cobalt,
  },
  retryButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  detailLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.inkFaint,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },
  detailValueHighlight: {
    color: colors.cobalt,
  },
  shortfallCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: colors.heart,
  },
  shortfallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  shortfallTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.heart,
    marginLeft: Spacing.sm,
  },
  shortfallDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  shortfallRow: {
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  shortfallRosterName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
  },
  shortfallAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  shortfallLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
  },
  shortfallAmount: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.heart,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statusText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  declineButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginRight: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inkFaint,
  },
  declineButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.ink,
  },
  acceptButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 8,
    backgroundColor: colors.cobalt,
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
