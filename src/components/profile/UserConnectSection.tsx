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
import { fonts, typeScale, Spacing, useTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import TokenStorage from '../../services/auth/TokenStorage';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { API_BASE_URL } from '../../services/api/config';

interface ConnectStatus {
  onboarded: boolean;
  accountId?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

interface UserConnectSectionProps {
  userId: string;
}

export function UserConnectSection({ userId }: UserConnectSectionProps) {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const url = `${API_BASE_URL}/stripe/connect/status`;
      const tkn = token || (await TokenStorage.getAccessToken());
      const headers: Record<string, string> = {};
      if (tkn) headers['Authorization'] = `Bearer ${tkn}`;

      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('Failed to load Connect status');
      const data: ConnectStatus = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('UserConnectSection: load error', error);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);
  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus])
  );

  const handleOnboard = async () => {
    try {
      setOnboarding(true);
      const url = `${API_BASE_URL}/stripe/connect/onboard`;
      const tkn = token || (await TokenStorage.getAccessToken());
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tkn) headers['Authorization'] = `Bearer ${tkn}`;

      const currentUrl =
        Platform.OS === 'web' ? window.location.href : 'muster://profile';

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshUrl: currentUrl, returnUrl: currentUrl }),
      });

      if (!response.ok) throw new Error('Failed to start onboarding');
      const data = await response.json();
      if (data.url) {
        await Linking.openURL(data.url);
      }
    } catch (error) {
      console.error('UserConnectSection: onboard error', error);
    } finally {
      setOnboarding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.cobalt} />
      </View>
    );
  }

  const isActive = status?.chargesEnabled && status?.payoutsEnabled;
  const isPending = status?.detailsSubmitted && !isActive;

  return (
    <CollapsibleSection title="Payment Account">
      <View style={styles.body}>
        {isActive ? (
          <View style={styles.statusRow}>
            <View
              style={[styles.badge, { backgroundColor: `${colors.cobalt}20` }]}
            >
              <Text style={[styles.badgeText, { color: colors.cobalt }]}>
                Active
              </Text>
            </View>
            <Text style={[styles.hint, { color: colors.inkFaint }]}>
              You can receive payments from bookings and join fees.
            </Text>
          </View>
        ) : isPending ? (
          <View style={styles.statusRow}>
            <View
              style={[styles.badge, { backgroundColor: `${colors.gold}20` }]}
            >
              <Text style={[styles.badgeText, { color: colors.gold }]}>
                Pending
              </Text>
            </View>
            <Text style={[styles.hint, { color: colors.inkFaint }]}>
              Your account is under review. You can resume onboarding if needed.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.cobalt }]}
              onPress={handleOnboard}
              disabled={onboarding}
              activeOpacity={0.7}
            >
              {onboarding ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.white }]}>
                  Resume
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusRow}>
            <Text style={[styles.hint, { color: colors.inkFaint }]}>
              Set up a payment account to receive funds from bookings and join
              fees.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.cobalt }]}
              onPress={handleOnboard}
              disabled={onboarding}
              activeOpacity={0.7}
            >
              {onboarding ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.white }]}>
                  Set Up Payments
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </CollapsibleSection>
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
  statusRow: {
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
  },
  hint: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    lineHeight: 18,
  },
  button: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
  },
});
