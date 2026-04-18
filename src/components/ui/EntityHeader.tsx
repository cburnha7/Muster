import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

export interface EntityTag {
  label: string;
  color?: string;
  bgColor?: string;
}

interface EntityHeaderProps {
  title: string;
  coverImageUrl?: string | null;
  tags?: EntityTag[];
  subtitle?: string;
  /** Tint color for the fallback background (no cover image). Defaults to cobalt. */
  tintColor?: string;
  /** Show camera icon for cover photo management. Only visible when defined. */
  onCameraPress?: () => void;
}

export function EntityHeader({
  title,
  coverImageUrl,
  tags = [],
  subtitle,
  tintColor = colors.cobalt,
  onCameraPress,
}: EntityHeaderProps) {
  const fallbackBg = tintColor + '18'; // 9% opacity tint

  const content = (
    <View style={styles.content}>
      <Text
        style={[
          styles.title,
          coverImageUrl ? styles.titleOnImage : styles.titleOnTint,
        ]}
        numberOfLines={3}
      >
        {title}
      </Text>

      {tags.length > 0 && (
        <View style={styles.tagRow}>
          {tags.map((tag, i) => (
            <View
              key={i}
              style={[
                styles.tag,
                {
                  backgroundColor: coverImageUrl
                    ? 'rgba(255,255,255,0.2)'
                    : (tag.bgColor ?? tintColor + '28'),
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  {
                    color: coverImageUrl ? '#FFFFFF' : (tag.color ?? tintColor),
                  },
                ]}
              >
                {tag.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            coverImageUrl ? styles.subtitleOnImage : styles.subtitleOnTint,
          ]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  if (coverImageUrl) {
    return (
      <ImageBackground
        source={{ uri: coverImageUrl }}
        style={styles.container}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.65)']}
          style={styles.gradient}
        >
          {content}
          {onCameraPress && (
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={onCameraPress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </LinearGradient>
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: fallbackBg }]}>
      {content}
      {onCameraPress && (
        <TouchableOpacity
          style={[styles.cameraBtn, { backgroundColor: tintColor + '20' }]}
          onPress={onCameraPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="camera-outline" size={22} color={tintColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 180,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  titleOnImage: {
    color: '#FFFFFF',
  },
  titleOnTint: {
    color: colors.ink,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 2,
  },
  subtitleOnImage: {
    color: 'rgba(255,255,255,0.85)',
  },
  subtitleOnTint: {
    color: colors.inkSoft,
  },
  cameraBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
