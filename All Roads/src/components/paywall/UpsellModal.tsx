/**
 * UpsellModal — shown when a user hits a feature gate.
 * Displays the required plan, what it unlocks, and a single CTA.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, typeScale, Spacing } from '../../theme';
import { SubscriptionPlan, PLAN_INFO } from '../../types/subscription';

interface UpsellModalProps {
  visible: boolean;
  requiredPlan: SubscriptionPlan;
  onClose: () => void;
  onUpgrade: (plan: SubscriptionPlan) => void;
}

export function UpsellModal({
  visible,
  requiredPlan,
  onClose,
  onUpgrade,
}: UpsellModalProps): JSX.Element {
  const planInfo = PLAN_INFO[requiredPlan];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-open-outline" size={28} color={colors.court} />
            </View>
            <Text style={styles.title}>Upgrade to {planInfo.label}</Text>
            <Text style={styles.price}>{planInfo.price}</Text>
          </View>

          {/* Features list */}
          <ScrollView style={styles.featuresList} bounces={false}>
            {planInfo.features.map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.grass} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Actions */}
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => onUpgrade(requiredPlan)}
            activeOpacity={0.8}
          >
            <Text style={styles.upgradeButtonText}>
              Upgrade to {planInfo.label} — {planInfo.price}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
            <Text style={styles.dismissText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.chalk,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.court}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.heading,
    ...typeScale.h2,
    color: colors.ink,
    textAlign: 'center',
  },
  price: {
    fontFamily: fonts.display,
    ...typeScale.h3,
    color: colors.grass,
    marginTop: 4,
  },
  featuresList: {
    maxHeight: 180,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  featureText: {
    fontFamily: fonts.body,
    ...typeScale.body,
    color: colors.ink,
    flex: 1,
  },
  upgradeButton: {
    backgroundColor: colors.grass,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#FFFFFF',
  },
  dismissButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
});
