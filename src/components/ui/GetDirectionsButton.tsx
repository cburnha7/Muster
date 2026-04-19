import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Linking,
  Platform,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

interface GetDirectionsButtonProps {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  label?: string;
  variant?: 'button' | 'link';
}

function buildUrls(
  lat?: number | null,
  lng?: number | null,
  address?: string | null
) {
  const dest = lat && lng ? `${lat},${lng}` : encodeURIComponent(address || '');
  return {
    apple: `maps:?daddr=${dest}`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
    googleApp: `comgooglemaps://?daddr=${dest}&directionsmode=driving`,
  };
}

function openDirections(
  lat?: number | null,
  lng?: number | null,
  address?: string | null
) {
  if (!lat && !lng && !address) return;

  const urls = buildUrls(lat, lng, address);

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Apple Maps', 'Google Maps', 'Cancel'],
        cancelButtonIndex: 2,
        title: 'Get Directions',
      },
      buttonIndex => {
        if (buttonIndex === 0) {
          Linking.openURL(urls.apple).catch(() => Linking.openURL(urls.google));
        } else if (buttonIndex === 1) {
          Linking.openURL(urls.googleApp).catch(() =>
            Linking.openURL(urls.google)
          );
        }
      }
    );
  } else if (Platform.OS === 'android') {
    Alert.alert('Get Directions', 'Open with:', [
      {
        text: 'Google Maps',
        onPress: () =>
          Linking.openURL(
            `google.navigation:q=${lat && lng ? `${lat},${lng}` : encodeURIComponent(address || '')}`
          ).catch(() => Linking.openURL(urls.google)),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  } else {
    // Web — open Google Maps directly
    Linking.openURL(urls.google);
  }
}

export function GetDirectionsButton({
  latitude,
  longitude,
  address,
  label = 'Get Directions',
  variant = 'button',
}: GetDirectionsButtonProps) {
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
        color={colors.inkSoft}
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
    backgroundColor: colors.cobalt + '10',
    gap: 8,
  },
  buttonText: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 14,
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
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.cobalt,
  },
});
