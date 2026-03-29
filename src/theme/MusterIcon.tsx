import React from 'react';
import Svg, { Circle, Rect } from 'react-native-svg';

interface MusterIconProps {
  size?: number;
}

export function MusterIcon({ size = 52 }: MusterIconProps) {
  // Scale factor from 1024 viewBox
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      {/* Cobalt blue background */}
      <Rect width="1024" height="1024" rx="220" fill="#2040E0"/>

      {/* Left figure */}
      <Circle cx="248" cy="305" r="95" fill="#FFFFFF"/>
      <Rect x="163" y="420" width="170" height="480" rx="85" fill="#FFFFFF"/>

      {/* Centre figure */}
      <Circle cx="512" cy="405" r="95" fill="#FFFFFF"/>
      <Rect x="427" y="520" width="170" height="380" rx="85" fill="#FFFFFF"/>

      {/* Right figure */}
      <Circle cx="776" cy="305" r="95" fill="#FFFFFF"/>
      <Rect x="691" y="420" width="170" height="480" rx="85" fill="#FFFFFF"/>
    </Svg>
  );
}

export default MusterIcon;
