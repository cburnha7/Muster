import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fonts, typeScale, Spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { CollapsibleSection } from '../ui/CollapsibleSection';

interface ConnectAccount {
  entityType: string;
  entityId: string;
  entityName: string;
  accountId: string | null;
  status: {
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  } | null;
}

interface ConnectAccountsSectionProps {
  userId: string;
}

type OnboardingStatus = 'active' | 'pending' | 'not_set_up';

function getOnboardingStatus(account: ConnectAccount): OnboardingStatus {
  if (!account.accountId || !account.status) return 'not_set_up';
  if (account.status.chargesEnabled && account.status.payoutsEnabled) return 'active';
  if (account.status.detailsSubmitted) return 'pending';
  return 'not_set_up';
}

function getEntityLabel(entityType: string): string {
  switch (entityType) {
    case 'roster': return 'Roster';
    case 'facility': return 'Facility';
    case 'league': return 'League';
    default: return entityType;
  }
}

export function ConnectAccountsSection({ userId }: ConnectAccountsSectionProps) {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<ConnectAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboardingEntityId, setOnboardingEntityId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const url = `${process.env.EXPO_PUBLIC_API_URL}/connect/accounts`;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      headers['x-user-id'] = userId;

      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('Failed to load Connect accounts');

      const data = await response.json();
      setAccounts(data.accounts ?? []);
    } catch (error) {
      console.error('ConnectAccountsSection: load error', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts])
  );

  const handleOnboard = async (entityType: string, entityId: string) => {
    try {
      setOnboardingEntityId(entityId);
      const url = `${process.env.EXPO_PUBLIC_API_URL}/connect/onboard`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      headers['x-user-id'] = userId;

      const currentUrl = Platform.OS === 'web'
        ? window.location.href
        : 'muster://profile';

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entityType,
          entityId,
          refreshUrl: currentUrl,
          returnUrl: currentUrl,
        }),
      });

      if (!response.ok) throw new Error('Failed to start onboarding');

      const data = await response.json();
      if (data.url) {
        await Linking.openURL(data.url);
      }
    } catch (error) {
      console.error('ConnectAccountsSection: onboard error', error);
    } finally {
      setOnboardingEntityId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.pine} />
      </View>
    );
  }

  return (
    <CollapsibleSection title="Stripe Connect" count={accounts.length}>
      <View style={styles.body}>
        {accounts.length === 0 ? (
            <Text style={styles.emptyText}>
              You don't manage any rosters, facilities, or leagues yet.
            </Text>
          ) : (
            accounts.map((account) => {
              const status = getOnboardingStatus(account);
              const isOnboarding = onboardingEntityId === account.entityId;

              return (
                <View key={`${account.entityType}-${account.entityId}`} style={styles.entityRow}>
                  <View style={styles.entityInfo}>
                    <Text style={styles.entityName}>{account.entityName}</Text>
                    <Text style={styles.entityType}>{getEntityLabel(account.entityType)}</Text>
                  </View>
                  <View style={styles.entityActions}>
                    <StatusBadge status={status} />
                    {status !== 'active' && (
                      <TouchableOpacity
                        style={styles.onboardButton}
                        onPress={() => handleOnboard(account.entityType, account.entityId)}
                        disabled={isOnboarding}
                        activeOpacity={0.7}
                      >
                        {isOnboarding ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.onboardButtonText}>
                            {status === 'pending' ? 'Resume' : 'Set Up'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
    </CollapsibleSection>
  );
}

function StatusBadge({ status }: { status: OnboardingStatus }) {
  const config = {
    active: { label: 'Active', bg: `${colors.pine}20`, color: colors.pine },
    pending: { label: 'Pending', bg: `${colors.court}20`, color: colors.court },
    not_set_up: { label: 'Not Set Up', bg: `${colors.inkFaint}20`, color: colors.inkFaint },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.inkFaint,
  },
  entityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${colors.inkFaint}30`,
  },
  entityInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  entityName: {
    fontFamily: fonts.body,
    ...typeScale.body,
    color: colors.ink,
  },
  entityType: {
    fontFamily: fonts.label,
    ...typeScale.label,
    color: colors.inkFaint,
    marginTop: 2,
  },
  entityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
  },
  onboardButton: {
    backgroundColor: colors.pine,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  onboardButtonText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
