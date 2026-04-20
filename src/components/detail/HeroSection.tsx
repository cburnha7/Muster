import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { fonts, useTheme } from '../../theme';

export interface HeroBadge {
  label: string;
  textColor?: string;
  bgColor?: string;
}

interface HeroSectionProps {
  title: string;
  sportColor?: string; // hex color for the tint wash
  emoji?: string;
  badges?: HeroBadge[];
  headline?: string; // date/time or primary stat line
  subline?: string; // location or secondary info
  onSublinePress?: () => void;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function HeroSection({
  title,
  sportColor = colors.cobalt,
  emoji,
  badges = [],
  headline,
  subline,
  onSublinePress,
  style,
  children,
}: HeroSectionProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const tintColor = sportColor + '18'; // ~9% opacity

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: tintColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}

      <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={3}>
        {title}
      </Text>

      {badges.length > 0 && (
        <View style={styles.badgeRow}>
          {badges.map((b, i) => (
            <View
              key={i}
              style={[
                styles.badge,
                { backgroundColor: b.bgColor ?? sportColor + '28' },
              ]}
            >
              <Text
                style={[styles.badgeText, { color: b.textColor ?? sportColor }]}
              >
                {b.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {headline ? <Text style={[styles.headline, { color: colors.onSurface }]}>{headline}</Text> : null}

      {subline ? (
        onSublinePress ? (
          <TouchableOpacity onPress={onSublinePress} activeOpacity={0.7}>
            <Text style={[styles.subline, { color: colors.onSurfaceVariant }, styles.sublineTappable, { color: colors.primary }]}>
              {subline}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.subline, { color: colors.onSurfaceVariant }]}>{subline}</Text>
        )
      ) : null}

      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  headline: {
    fontFamily: fonts.headingSemi,
    fontSize: 17,
    marginTop: 4,
    marginBottom: 2,
  },
  subline: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 4,
  },
  sublineTappable: {
    textDecorationLine: 'underline',
  },
});
