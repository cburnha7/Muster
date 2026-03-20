import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormButton } from '../../components/forms/FormButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

import { leagueService, DeletionImpactSummary } from '../../services/api/LeagueService';
import { selectUser } from '../../store/slices/authSlice';
import { colors, fonts } from '../../theme';

export const LeagueDeletionConfirmScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { leagueId } = (route.params as any) || {};
  const user = useSelector(selectUser);

  const [preview, setPreview] = useState<DeletionImpactSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadPreview();
  }, [leagueId]);

  const loadPreview = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await leagueService.getDeletionPreview(leagueId);
      setPreview(data);
    } catch (err: any) {
      if (err?.status === 403) {
        setError('This league cannot be deleted because matches have been played.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load deletion preview');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amountInCents: number) => {
    return `$${(amountInCents / 100).toFixed(2)}`;
  };

  const handleConfirmDelete = () => {
    if (!user?.id || !preview) return;

    Alert.alert(
      'Delete League',
      `Are you sure you want to permanently delete "${preview.leagueName}"? This action cannot be undone.`,
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: executeDelete,
        },
      ]
    );
  };

  const executeDelete = async () => {
    if (!user?.id) return;

    try {
      setIsDeleting(true);
      await leagueService.deleteLeague(leagueId, user.id);
      Alert.alert('League Deleted', 'The league and all associated data have been removed.', [
        { text: 'OK', onPress: () => (navigation as any).navigate('LeaguesBrowser') },
      ]);
    } catch (err) {
      setIsDeleting(false);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete league');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Delete League"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <LoadingSpinner message="Loading deletion preview..." />
      </View>
    );
  }

  if (error || !preview) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Delete League"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <ErrorDisplay message={error || 'Unable to load preview'} onRetry={loadPreview} />
      </View>
    );
  }

  const hasStripeRefunds = preview.stripeRefunds.count > 0;
  const hasRosterRefunds = preview.rosterBalanceRefunds.count > 0;
  const hasEvents = preview.eventCount > 0;
  const hasRentals = preview.rentalCount > 0;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Delete League"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.leagueName}>{preview.leagueName}</Text>
        <Text style={styles.warningText}>
          Deleting this league is permanent. Review the impact below before confirming.
        </Text>

        {/* Events */}
        <View style={styles.impactCard}>
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Events to delete</Text>
            <Text style={styles.impactValue}>{preview.eventCount}</Text>
          </View>
          {hasEvents && (
            <Text style={styles.impactNote}>
              All league events will be permanently removed.
            </Text>
          )}
        </View>

        {/* Rentals */}
        <View style={styles.impactCard}>
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Court reservations to release</Text>
            <Text style={styles.impactValue}>{preview.rentalCount}</Text>
          </View>
          {hasRentals && (
            <Text style={styles.impactNote}>
              Reservations will be unlinked from the league but not cancelled.
            </Text>
          )}
        </View>

        {/* Stripe Refunds */}
        <View style={styles.impactCard}>
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Player dues refunds</Text>
            <Text style={styles.impactValue}>{preview.stripeRefunds.count}</Text>
          </View>
          {hasStripeRefunds && (
            <View style={styles.impactRow}>
              <Text style={styles.impactLabel}>Total refund amount</Text>
              <Text style={styles.impactValueMoney}>
                {formatCurrency(preview.stripeRefunds.totalAmount)}
              </Text>
            </View>
          )}
          {hasStripeRefunds && (
            <Text style={styles.impactNote}>
              Refunds will be issued to each player via Stripe.
            </Text>
          )}
        </View>

        {/* Roster Balance Refunds */}
        <View style={styles.impactCard}>
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Roster balance credits</Text>
            <Text style={styles.impactValue}>{preview.rosterBalanceRefunds.count}</Text>
          </View>
          {hasRosterRefunds && (
            <View style={styles.impactRow}>
              <Text style={styles.impactLabel}>Total credit amount</Text>
              <Text style={styles.impactValueMoney}>
                ${preview.rosterBalanceRefunds.totalAmount.toFixed(2)}
              </Text>
            </View>
          )}
          {hasRosterRefunds && (
            <Text style={styles.impactNote}>
              Membership fees will be credited back to each roster's balance.
            </Text>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <FormButton
            title="Delete League Permanently"
            onPress={handleConfirmDelete}
            variant="danger"
            size="large"
            loading={isDeleting}
            leftIcon="trash-outline"
          />
          <FormButton
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="outline"
            size="large"
            style={styles.cancelButton}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  leagueName: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 8,
  },
  warningText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.heart,
    lineHeight: 22,
    marginBottom: 20,
  },
  impactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  impactLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  impactValue: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.ink,
  },
  impactValueMoney: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.heart,
  },
  impactNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 8,
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: 24,
  },
  cancelButton: {
    marginTop: 12,
  },
});
