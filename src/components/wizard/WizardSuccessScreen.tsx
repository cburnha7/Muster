import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';

interface SuccessCTA {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

interface WizardSuccessScreenProps {
  emoji: string;
  title: string;
  subtitle?: string;
  summaryRows?: { label: string; value: string }[];
  actions: SuccessCTA[];
}

export function WizardSuccessScreen({
  emoji,
  title,
  subtitle,
  summaryRows,
  actions,
}: WizardSuccessScreenProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Checkmark circle bounces in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Then card fades up
      Animated.spring(cardAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Celebration icon */}
      <Animated.View
        style={[
          styles.emojiCircle, { backgroundColor: colors.secondaryContainer },
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          }]}
      >
        <Text style={styles.emoji}>{emoji}</Text>
      </Animated.View>

      <Animated.View style={{ opacity: opacityAnim }}>
        <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>{subtitle}</Text>}
      </Animated.View>

      {/* Summary card */}
      {summaryRows && summaryRows.length > 0 && (
        <Animated.View
          style={[
            styles.summaryCard, { backgroundColor: colors.surfaceContainerLowest, shadowColor: colors.onSurface },
            {
              opacity: cardAnim,
              transform: [
                {
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            }]}
        >
          {summaryRows.map((row, i) => (
            <View
              key={i}
              style={[
                styles.summaryRow,
                i < summaryRows.length - 1 && styles.summaryRowBorder, i < summaryRows.length - 1 && { borderBottomColor: colors.outlineVariant }]}
            >
              <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }]}>{row.label}</Text>
              <Text style={[styles.summaryValue, { color: colors.onSurface }]}>{row.value}</Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* CTAs */}
      <Animated.View style={[styles.actionsContainer, { opacity: cardAnim }]}>
        {actions.map((action, i) => {
          const isPrimary = action.variant !== 'secondary';
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.actionBtn,
                isPrimary ? styles.actionPrimary : styles.actionSecondary, isPrimary ? { backgroundColor: colors.primary } : {}]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              {action.icon && (
                <Ionicons
                  name={action.icon}
                  size={18}
                  color={isPrimary ? colors.white : colors.primary}
                />
              )}
              <Text
                style={[
                  styles.actionText,
                  isPrimary
                    ? styles.actionTextPrimary
                    : styles.actionTextSecondary, isPrimary ? { color: colors.white } : {}]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emojiCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  summaryCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryRowBorder: {
    borderBottomWidth: 1,
  },
  summaryLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  summaryValue: {
    fontFamily: fonts.label,
    fontSize: 14,
  },
  actionsContainer: {
    width: '100%',
    marginTop: 28,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 9999,
    gap: 8,
  },
  actionPrimary: {},
  actionSecondary: {},
  actionText: {
    fontFamily: fonts.ui,
    fontSize: 15,
  },
  actionTextPrimary: {},
  actionTextSecondary: {},
});
