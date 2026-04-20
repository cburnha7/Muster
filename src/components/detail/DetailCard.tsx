import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { fonts, useTheme } from '../../theme';

interface DetailCardProps {
  title?: string;
  children: React.ReactNode;
  /** Optional right-side action in the title row */
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
  /** Stagger delay in ms for entrance animation */
  delay?: number;
}

export function DetailCard({ title, children, action, style, delay = 0 }: DetailCardProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        style,
      ]}
    >
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {action ? (
            <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
              <Text style={styles.action}>{action.label}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    shadowColor: colors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.headingSemi,
    fontSize: 16,
    color: colors.onSurface,
    letterSpacing: -0.1,
  },
  action: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.primary,
  },
});