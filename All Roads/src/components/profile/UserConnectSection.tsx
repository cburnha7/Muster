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
  const { token } = useAuth();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/stripe/connect/status`;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      headers['x-user-id'] = userId;

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

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useFocusEffect(useCallback(() => { loadStatus(); }, [loadStatus]));

  const handleOnboard = async () => {
    try {
      setOnboarding(true);
      const url = `${process.env.EXPO_PUBLIC_API_URL}/stripe/connect/onboard`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      headers['x-user-id'] = userId;

      const currentUrl = Platform.OS === 'web' ? window.location.href : 'muster://profile';

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
      <View style={styles.card}>
        <Text style={styles.title}>Payment Account</Text>
        <ActivityIndicator size="small" color={colors.grass} style={{ marginTop: Spacing.sm }} />
      </View>
    );
  }

  const isActive = status?.chargesEnabled && status?.payoutsEnabled;
  const isPending = status?.detailsSubmitted && !isActive;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="card-outline" size={20} color={colors.grass} />
        <Text style={styles.title}>Payment Account</Text>
      </View>

      {isActive ? (
        <View style={styles.statusRow}>
          <View style={[styles.badge, { backgroundColor: `${colors.grass}20` }]}>
            <Text style={[styles.badgeText, { color: colors.grass }]}>Active</Text>
          </View>
          <Text style={styles.hint}>You can receive payments from bookings and join fees.</Text>
        </View>
      ) : isPending ? (
        <View style={styles.statusRow}>
          <View style={[styles.badge, { backgroundColor: `${colors.court}20` }]}>
            <Text style={[styles.badgeText, { color: colors.court }]}>Pending</Text>
          </View>
          <Text style={styles.hint}>Your account is under review. You can resume onboarding if needed.</Text>
          <TouchableOpacity style={styles.button} onPress={handleOnboard} disabled={onboarding} activeOpacity={0.7}>
            {onboarding ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Resume</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.statusRow}>
          <Text style={styles.hint}>
            Set up a payment account to receive funds from bookings and join fees.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleOnboard} disabled={onboarding} activeOpacity={0.7}>
            {onboarding ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Set Up Payments</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: fonts.heading,
    ...typeScale.h3,
    color: colors.ink,
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
    color: colors.inkFaint,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.grass,
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
    color: '#FFFFFF',
  },
});
