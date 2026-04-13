import React from 'react';
import { View, Text, Image, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface Props {
  userId: string;
  initials: string;
  imageUri?: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({
  userId,
  initials,
  imageUri,
  size = 40,
  style,
}: Props) {
  const { getAvatarColor, colors, type } = useTheme();
  const bg = getAvatarColor(userId);
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: 2,
          borderColor: colors.cobalt,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          overflow: 'hidden' as const,
        },
        style,
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: size, height: size }}
        />
      ) : (
        <Text style={{ ...type.uiSm, color: '#FFFFFF', fontSize: size * 0.35 }}>
          {initials}
        </Text>
      )}
    </View>
  );
}
