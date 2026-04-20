import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, useTheme } from '../../theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  rightIcon?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  leftText?: string;
  rightText?: string;
  backgroundColor?: string;
  textColor?: string;
  showBorder?: boolean;
  style?: any;
  showBack?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  leftText,
  rightText,
  resolvedBg,
  textColor,
  showBorder = true,
  style,
  showBack = false,
  onBackPress,
  rightComponent,
}) => {
  const { colors } = useTheme();
  const resolvedBg = backgroundColor ?? colors.background;
  const resolvedText = textColor ?? colors.ink;
  const insets = useSafeAreaInsets();

  // If showBack is true, use back arrow as left icon
  const effectiveLeftIcon = showBack ? 'arrow-back' : leftIcon;
  const effectiveOnLeftPress = showBack ? onBackPress : onLeftPress;

  return (
    <View
      style={[
        styles.container,
        { borderBottomColor: colors.border, shadowColor: colors.ink },
        {
          resolvedBg,
          paddingTop: insets.top,
          borderBottomWidth: showBorder ? 1 : 0,
        },
        style,
      ]}
    >
      <StatusBar
        barStyle={
          resolvedBg === colors.background ||
          resolvedBg === colors.white
            ? 'dark-content'
            : 'light-content'
        }
        backgroundColor={resolvedBg}
      />

      <View style={styles.header}>
        <View style={styles.leftSection}>
          {(effectiveLeftIcon || leftText) && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={effectiveOnLeftPress}
              disabled={!effectiveOnLeftPress}
            >
              {effectiveLeftIcon && (
                <Ionicons
                  name={effectiveLeftIcon as any}
                  size={24}
                  color={resolvedText}
                />
              )}
              {leftText && (
                <Text style={[styles.actionText, { color: resolvedText }]}>
                  {leftText}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.centerSection}>
          <Text style={[styles.title, { color: resolvedText }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.subtitle, { color: resolvedText }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.rightSection}>
          {rightComponent ? (
            rightComponent
          ) : rightIcon || rightText ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onRightPress}
              disabled={!onRightPress}
            >
              {rightText && (
                <Text style={[styles.actionText, { color: resolvedText }]}>
                  {rightText}
                </Text>
              )}
              {rightIcon && (
                <Ionicons name={rightIcon as any} size={24} color={resolvedText} />
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  actionButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 16,
    fontFamily: fonts.label,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.headingSemi,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.7,
  },
});

