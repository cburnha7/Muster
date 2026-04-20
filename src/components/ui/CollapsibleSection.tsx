import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokenSpacing, tokenRadius, tokenFontFamily } from '../../theme/tokens';
import { useTheme } from '../../theme';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  rightElement?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  count,
  rightElement,
  defaultExpanded = true,
  children,
}) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotation = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotation, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setExpanded(prev => !prev);
  }, [expanded, rotation]);

  const rotateZ = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View>
      <TouchableOpacity
        style={styles.header}
        onPress={toggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title} section, ${expanded ? 'expanded' : 'collapsed'}`}
      >
        <Animated.View style={{ transform: [{ rotateZ }] }}>
          <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
        </Animated.View>
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
        {count !== undefined && (
          <View
            style={[
              styles.countBadge,
              { backgroundColor: colors.cobalt + '20' },
            ]}
          >
            <Text style={[styles.countBadgeText, { color: colors.cobalt }]}>
              {count}
            </Text>
          </View>
        )}
        {rightElement}
      </TouchableOpacity>
      {expanded && children}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokenSpacing.lg,
    paddingTop: tokenSpacing.lg,
    paddingBottom: tokenSpacing.sm,
    gap: 6,
  },
  title: {
    fontFamily: tokenFontFamily.heading,
    fontSize: 24,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: tokenSpacing.sm,
    paddingVertical: 2,
    borderRadius: tokenRadius.md,
  },
  countBadgeText: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 11,
  },
});
