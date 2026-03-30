import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

const AVATAR_PALETTE = [
  { bg: '#DDE1FF', text: '#001A5C' },
  { bg: '#C8F5E0', text: '#00391B' },
  { bg: '#E0F0FF', text: '#001E31' },
  { bg: '#FFE0CC', text: '#3B0E00' },
  { bg: '#F0DFFF', text: '#24005A' },
  { bg: '#FFF0C0', text: '#3A2500' },
  { bg: '#FFD6D6', text: '#410002' },
];

function avatarColors(name: string) {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx] ?? AVATAR_PALETTE[0]!;
}

interface PersonRowProps {
  name: string;
  role?: string;
  subtitle?: string;
  onPress?: () => void;
  /** Override avatar background color */
  avatarBg?: string;
  /** Override avatar text color */
  avatarTextColor?: string;
  /** Element rendered on the far right (e.g. a badge) */
  rightElement?: React.ReactNode;
}

export function PersonRow({
  name,
  role,
  subtitle,
  onPress,
  avatarBg,
  avatarTextColor,
  rightElement,
}: PersonRowProps) {
  const palette = avatarColors(name);
  const bg = avatarBg ?? palette.bg;
  const textColor = avatarTextColor ?? palette.text;
  const initial = name.trim().charAt(0).toUpperCase();

  const inner = (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: bg }]}>
        <Text style={[styles.avatarText, { color: textColor }]}>{initial}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {role ? (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{role}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      {rightElement ? (
        rightElement
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: fonts.headingSemi,
    fontSize: 16,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.onSurface,
    flexShrink: 1,
  },
  roleBadge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.secondary,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
});
