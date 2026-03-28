import React from 'react';
import Svg, { Rect, Circle, Line } from 'react-native-svg';
import { colors } from './colors';

type Variant = 'dark' | 'light' | 'grass';
type Size = number;

interface MusterIconProps {
  size?: Size;
  variant?: Variant;
}

const variantConfig = {
  dark: {
    bg:          colors.inkMid,
    groundLine:  colors.pineLight,
    leftFig:     colors.pine,
    centreFig:   colors.heart,
    rightFig:    colors.navy,
  },
  light: {
    bg:          colors.gold,
    groundLine:  colors.navy,
    leftFig:     colors.pine,
    centreFig:   colors.heart,
    rightFig:    colors.navy,
  },
  grass: {
    bg:          'rgba(0,0,0,0.15)',
    groundLine:  'rgba(255,255,255,0.3)',
    leftFig:     'rgba(255,255,255,0.55)',
    centreFig:   '#ffffff',
    rightFig:    colors.goldLight,
  },
} as const;

export function MusterIcon({ size = 52, variant = 'dark' }: MusterIconProps) {
  const c = variantConfig[variant];
  const r = 14 * (size / 56); // border radius scales with size

  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      {/* Background */}
      <Rect width="56" height="56" rx={r} fill={c.bg} />

      {/* Ground line */}
      <Line
        x1="8" y1="46" x2="48" y2="46"
        stroke={c.groundLine}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity={0.3}
      />

      {/* Left figure */}
      <Circle cx="13" cy="23" r="5" fill={c.leftFig} />
      <Rect x="10.5" y="28" width="5" height="16" rx="2.5" fill={c.leftFig} />

      {/* Centre figure — slightly taller */}
      <Circle cx="28" cy="18" r="6.5" fill={c.centreFig} />
      <Rect x="24.5" y="24" width="7" height="20" rx="3.5" fill={c.centreFig} />

      {/* Right figure */}
      <Circle cx="43" cy="23" r="5" fill={c.rightFig} />
      <Rect x="40.5" y="28" width="5" height="16" rx="2.5" fill={c.rightFig} />
    </Svg>
  );
}

export default MusterIcon;
