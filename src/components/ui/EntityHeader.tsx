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
import {
  tokenColors,
  tokenSpacing,
  tokenRadius,
  tokenFontFamily,
} from '../../theme/tokens';

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
  tintColor?: string;
  onCameraPress?: () => void;
}

export function EntityHeader({
  title,
  coverImageUrl,
  tags = [],
  subtitle,
  tintColor = tokenColors.cobalt,
  onCameraPress,
}: EntityHeaderProps) {
  const fallbackBg = tintColor + '18';

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
                    color: coverImageUrl
                      ? tokenColors.white
                      : (tag.color ?? tintColor),
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
              <Ionicons
                name="camera-outline"
                size={22}
                color={tokenColors.white}
              />
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
    paddingHorizontal: tokenSpacing.xl,
    paddingTop: 40,
    paddingBottom: tokenSpacing.xl,
  },
  title: {
    fontFamily: tokenFontFamily.heading,
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: tokenSpacing.sm,
  },
  titleOnImage: {
    color: tokenColors.white,
  },
  titleOnTint: {
    color: tokenColors.ink,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: tokenSpacing.sm,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: tokenSpacing.xs,
    borderRadius: tokenRadius.pill,
  },
  tagText: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 14,
    marginTop: 2,
  },
  subtitleOnImage: {
    color: 'rgba(255,255,255,0.85)',
  },
  subtitleOnTint: {
    color: tokenColors.inkSecondary,
  },
  cameraBtn: {
    position: 'absolute',
    top: tokenSpacing.md,
    right: tokenSpacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokenColors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
