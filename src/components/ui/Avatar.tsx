import React from 'react';
import { View, Text, Image, ViewStyle } from 'react-native';
import { tokenColors, tokenType, getAvatarColor } from '../../theme/tokens';

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
          borderColor: tokenColors.cobalt,
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
        <Text
          style={{
            ...tokenType.buttonSm,
            color: tokenColors.white,
            fontSize: size * 0.35,
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
