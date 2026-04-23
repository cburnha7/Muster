/**
 * EntityHeader — reusable full-bleed header for detail screens.
 *
 * Used on: Event, Roster, League, Ground detail screens.
 * NOT used on: User Profile (left completely alone).
 *
 * Displays:
 *   - Cover photo as full-bleed background (or cobalt fallback)
 *   - Dark scrim for text readability
 *   - Entity name (Fraunces, large, bold)
 *   - Subtitle lines for metadata
 *   - Chips for sport type, skill level, visibility
 *   - Back button (top left, always)
 *   - Edit button (top right, owner/captain/commissioner only)
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, useTheme } from '../../theme';

export interface EntityChip {
  label: string;
  color?: string;
  bgColor?: string;
}

interface EntityHeaderProps {
  /** Cover photo URL. Cobalt fallback when null/undefined. */
  coverUrl?: string | null | undefined;
  /** Entity name — large heading */
  name: string;
  /** First subtitle line (e.g. sport + location) */
  subtitle?: string | undefined;
  /** Second subtitle line (e.g. member count, date) */
  subtitle2?: string | undefined;
  /** Tag chips (sport, skill, visibility) */
  chips?: EntityChip[];
  /** Show edit button */
  showEdit?: boolean;
  /** Edit button handler */
  onEdit?: () => void;
  /** Optional primary action button */
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
}

export function EntityHeader({
  coverUrl,
  name,
  subtitle,
  subtitle2,
  chips = [],
  showEdit = false,
  onEdit,
  actionLabel,
  onAction,
  actionLoading = false,
}: EntityHeaderProps) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const hasCover = !!coverUrl;
  const topPadding = insets.top + (Platform.OS === 'android' ? 8 : 0);

  return (
    <View style={styles.container}>
      {/* Background: cover photo or cobalt fallback */}
      {hasCover ? (
        <Image
          source={{ uri: coverUrl! }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.cobalt },
          ]}
        />
      )}

      {/* Dark scrim for text readability */}
      <View style={[StyleSheet.absoluteFillObject, styles.scrim]} />

      {/* Top bar: back + edit */}
      <View style={[styles.topBar, { paddingTop: topPadding }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.topBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {showEdit && onEdit && (
          <TouchableOpacity
            onPress={onEdit}
            style={styles.topBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Edit"
          >
            <Ionicons name="create-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content: name, subtitle, chips, action */}
      <View style={styles.content}>
        {/* Chips */}
        {chips.length > 0 && (
          <View style={styles.chipRow}>
            {chips.map((chip, i) => (
              <View
                key={i}
                style={[
                  styles.chip,
                  { backgroundColor: chip.bgColor || 'rgba(255,255,255,0.2)' },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: chip.color || '#FFFFFF' }]}
                >
                  {chip.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Name */}
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>

        {/* Subtitles */}
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {subtitle2 && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle2}
          </Text>
        )}

        {/* Action button */}
        {actionLabel && onAction && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.cobalt }]}
            onPress={onAction}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>
              {actionLoading ? 'Loading...' : actionLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 240,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  topBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 60,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipText: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  actionBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    marginTop: 12,
  },
  actionBtnText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
