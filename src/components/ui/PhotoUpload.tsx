/**
 * PhotoUpload — unified image upload component for the entire app.
 *
 * Shapes:
 *   avatar — circular crop (1:1). User profile only.
 *   cover  — full-width rectangle (16:9). Roster, League, Ground profile photos.
 *   map    — landscape rectangle (16:9). Ground field map only.
 *
 * Handles permissions, picker, upload via ImageService, loading, error,
 * and delete-before-replace internally. Parent provides value + onChange.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ImageService, ImageContext } from '../../services/ImageService';
import { fonts, useTheme } from '../../theme';

export type PhotoShape = 'avatar' | 'cover' | 'map';

interface PhotoUploadProps {
  /** Current image URL (null = no image) */
  value: string | null | undefined;
  /** Called with the new public URL after upload, or null after delete */
  onChange: (url: string | null) => void;
  /** Upload context for R2 path organization */
  context: ImageContext;
  /** Visual shape */
  shape?: PhotoShape;
  /** Label shown above the upload area */
  label?: string;
  /** Disable interaction */
  disabled?: boolean;
}

const SHAPE_CONFIG = {
  avatar: {
    aspect: [1, 1] as [number, number],
    quality: 0.85,
    borderRadius: 999,
  },
  cover: {
    aspect: [16, 9] as [number, number],
    quality: 0.85,
    borderRadius: 16,
  },
  map: { aspect: [16, 9] as [number, number], quality: 0.9, borderRadius: 12 },
};

export function PhotoUpload({
  value,
  onChange,
  context,
  shape = 'cover',
  label,
  disabled = false,
}: PhotoUploadProps) {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);
  const config = SHAPE_CONFIG[shape];

  const isAvatar = shape === 'avatar';
  const hasImage = !!value;

  const handlePick = async () => {
    if (disabled || uploading) return;

    try {
      setUploading(true);

      // Delete old image from R2 if replacing
      if (value && value.includes('r2.dev')) {
        await ImageService.deleteImage(value);
      }

      const result = await ImageService.pickAndUpload(context, {
        aspect: config.aspect,
        quality: config.quality,
      });

      if (!result) {
        setUploading(false);
        return; // user cancelled
      }

      onChange(result.publicUrl);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Remove Photo', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (value && value.includes('r2.dev')) {
            await ImageService.deleteImage(value);
          }
          onChange(null);
        },
      },
    ]);
  };

  // ── Avatar shape ──
  if (isAvatar) {
    return (
      <View style={styles.avatarContainer}>
        {label && (
          <Text style={[styles.label, { color: colors.inkSecondary }]}>
            {label}
          </Text>
        )}
        <TouchableOpacity
          onPress={handlePick}
          disabled={disabled || uploading}
          activeOpacity={0.7}
          style={[
            styles.avatarCircle,
            { backgroundColor: colors.border, borderColor: colors.border },
          ]}
        >
          {uploading ? (
            <ActivityIndicator color={colors.cobalt} size="large" />
          ) : hasImage ? (
            <Image source={{ uri: value! }} style={styles.avatarImage} />
          ) : (
            <Ionicons
              name="camera-outline"
              size={32}
              color={colors.inkSecondary}
            />
          )}
        </TouchableOpacity>
        {hasImage && !disabled && (
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.avatarDeleteBtn}
          >
            <Ionicons name="close-circle" size={24} color={colors.heart} />
          </TouchableOpacity>
        )}
        <Text style={[styles.avatarHint, { color: colors.inkMuted }]}>
          {hasImage ? 'Tap to change' : 'Tap to add photo'}
        </Text>
      </View>
    );
  }

  // ── Cover / Map shape ──
  return (
    <View style={styles.rectContainer}>
      {label && (
        <Text style={[styles.label, { color: colors.inkSecondary }]}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={handlePick}
        disabled={disabled || uploading}
        activeOpacity={0.7}
        style={[
          styles.rectArea,
          {
            backgroundColor: colors.bgSubtle,
            borderColor: colors.border,
            borderRadius: config.borderRadius,
            aspectRatio: shape === 'map' ? 16 / 9 : 16 / 9,
          },
        ]}
      >
        {uploading ? (
          <ActivityIndicator color={colors.cobalt} size="large" />
        ) : hasImage ? (
          <Image
            source={{ uri: value! }}
            style={[styles.rectImage, { borderRadius: config.borderRadius }]}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.rectPlaceholder}>
            <Ionicons
              name={shape === 'map' ? 'map-outline' : 'image-outline'}
              size={36}
              color={colors.inkMuted}
            />
            <Text
              style={[styles.rectPlaceholderText, { color: colors.inkMuted }]}
            >
              {shape === 'map' ? 'Upload field map' : 'Add cover photo'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {hasImage && !disabled && (
        <TouchableOpacity
          onPress={handleDelete}
          style={[styles.rectDeleteBtn, { backgroundColor: colors.heart }]}
        >
          <Ionicons name="trash-outline" size={14} color={colors.white} />
          <Text style={[styles.rectDeleteText, { color: colors.white }]}>
            Remove
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Label ──
  label: {
    fontFamily: fonts.label,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  // ── Avatar ──
  avatarContainer: { alignItems: 'center', marginBottom: 16 },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 120, height: 120, borderRadius: 60 },
  avatarDeleteBtn: { position: 'absolute', top: 20, right: '30%' },
  avatarHint: { fontFamily: fonts.body, fontSize: 12, marginTop: 6 },

  // ── Cover / Map ──
  rectContainer: { marginBottom: 16 },
  rectArea: {
    width: '100%',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rectImage: { width: '100%', height: '100%' },
  rectPlaceholder: { alignItems: 'center', gap: 8, padding: 24 },
  rectPlaceholderText: { fontFamily: fonts.body, fontSize: 14 },
  rectDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  rectDeleteText: { fontFamily: fonts.label, fontSize: 11 },
});
