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
import { tokenSpacing, tokenRadius, tokenFontFamily } from '../../theme/tokens';
import { useTheme } from '../../theme';

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
  tintColor,
  onCameraPress,
}: EntityHeaderProps) {
  const { colors } = useTheme();
  const resolvedTintColor = tintColor ?? colors.cobalt;
  const fallbackBg = resolvedTintColor + '18';

  const content = (
    <View style={styles.content}>
      <Text
        style={[
          styles.title,
          coverImageUrl ? { color: colors.white } : { color: colors.ink },
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
                    : (tag.bgColor ?? resolvedTintColor + '28'),
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  {
                    color: coverImageUrl
                      ? colors.white
                      : (tag.color ?? resolvedTintColor),
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
            coverImageUrl
              ? { color: 'rgba(255,255,255,0.85)' }
              : { color: colors.inkSecondary },
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
              style={[styles.cameraBtn, { backgroundColor: colors.overlay }]}
              onPress={onCameraPress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="camera-outline" size={22} color={colors.white} />
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
          style={[
            styles.cameraBtn,
            { backgroundColor: resolvedTintColor + '20' },
          ]}
          onPress={onCameraPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="camera-outline" size={22} color={resolvedTintColor} />
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
  cameraBtn: {
    position: 'absolute',
    top: tokenSpacing.md,
    right: tokenSpacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
