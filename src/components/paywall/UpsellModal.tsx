/**
 * UpsellModal â€” shown when a user hits a feature gate.
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
import { fonts, typeScale, Spacing, useTheme } from '../../theme';
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
  const { colors } = useTheme();
  const planInfo = PLAN_INFO[requiredPlan];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.gold}20` }]}>
              <Ionicons
                name="lock-open-outline"
                size={28}
                color={colors.gold}
              />
            </View>
            <Text style={[styles.title, { color: colors.ink }]}>Upgrade to {planInfo.label}</Text>
            <Text style={[styles.price, { color: colors.cobalt }]}>{planInfo.price}</Text>
          </View>

          {/* Features list */}
          <ScrollView style={styles.featuresList} bounces={false}>
            {planInfo.features.map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.cobalt}
                />
                <Text style={[styles.featureText, { color: colors.ink }]}>{feature}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Actions */}
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: colors.cobalt }]}
            onPress={() => onUpgrade(requiredPlan)}
            activeOpacity={0.8}
          >
            <Text style={[styles.upgradeButtonText, { color: colors.white }]}>
              Upgrade to {planInfo.label} â€” {planInfo.price}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
            <Text style={[styles.dismissText, { color: colors.inkFaint }]}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.heading,
    ...typeScale.h2,
    textAlign: 'center',
  },
  price: {
    fontFamily: fonts.display,
    ...typeScale.h3,
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
    flex: 1,
  },
  upgradeButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
  },
  dismissButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissText: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
});
