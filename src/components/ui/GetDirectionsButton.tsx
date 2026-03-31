import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface GetDirectionsButtonProps {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  label?: string;
  variant?: 'button' | 'link';
}

function openDirections(
  lat?: number | null,
  lng?: number | null,
  address?: string | null
) {
  if (!lat && !lng && !address) return;

  const destination =
    lat && lng ? `${lat},${lng}` : encodeURIComponent(address || '');

  const url = Platform.select({
    ios: `maps:?daddr=${destination}`,
    android: `google.navigation:q=${destination}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
  });

  if (url) {
    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web if native maps app fails
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${destination}`
      );
    });
  }
}

export function GetDirectionsButton({
  latitude,
  longitude,
  address,
  label = 'Get directions',
  variant = 'button',
}: GetDirectionsButtonProps) {
  // Don't render if there's nothing to navigate to
  if (!latitude && !longitude && !address) return null;

  const handlePress = () => openDirections(latitude, longitude, address);

  if (variant === 'link') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={styles.linkContainer}
        activeOpacity={0.7}
      >
        <Ionicons name="navigate-outline" size={14} color={colors.cobalt} />
        <Text style={styles.linkText}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.buttonContainer}
      activeOpacity={0.7}
    >
      <Ionicons name="navigate-outline" size={18} color={colors.cobalt} />
      <Text style={styles.buttonText}>{label}</Text>
      <Ionicons
        name="open-outline"
        size={14}
        color={colors.onSurfaceVariant}
        style={styles.externalIcon}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: (colors.cobalt || '#2D5F3F') + '10',
    gap: 8,
  },
  buttonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.cobalt,
  },
  externalIcon: {
    opacity: 0.6,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 13,
    color: colors.cobalt,
    fontWeight: '500',
  },
});
