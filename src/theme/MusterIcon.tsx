import React from 'react';
import Svg, { Circle, Rect, G, ClipPath, Defs } from 'react-native-svg';

type Variant = 'light' | 'dark';
type Size = number;

interface MusterIconProps {
  size?: Size;
  variant?: Variant;
}

export function MusterIcon({ size = 52, variant = 'light' }: MusterIconProps) {
  const id = `circleClip_${size}`;

  // On dark backgrounds use lighter figure colors
  const pine   = variant === 'dark' ? '#3D8C5E' : '#2D5F3F';
  const red    = variant === 'dark' ? '#E05A20' : '#C0392B';
  const navy   = variant === 'dark' ? '#4A6A9A' : '#1B2A4A';
  const gold   = '#D4A017';
  const bg     = variant === 'dark' ? '#1B2A4A' : '#FFFFFF';

  // Scale all coordinates from 1024 viewBox
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <ClipPath id={id}>
          <Circle cx="512" cy="512" r="512"/>
        </ClipPath>
      </Defs>

      <G clipPath={`url(#${id})`}>
        {/* Background */}
        <Rect x="0" y="0" width="1024" height="1024" fill={bg}/>

        {/* Gold field — bottom eighth */}
        <Rect x="0" y="896" width="1024" height="128" fill={gold}/>

        {/* Left figure — pine green */}
        <Rect x="196" y="556" width="100" height="340" rx="50" fill={pine}/>
        <Circle cx="246" cy="508" r="118" fill={pine}/>

        {/* Centre figure — red, tallest */}
        <Rect x="440" y="446" width="124" height="450" rx="62" fill={red}/>
        <Circle cx="502" cy="388" r="152" fill={red}/>

        {/* Right figure — navy */}
        <Rect x="728" y="556" width="100" height="340" rx="50" fill={navy}/>
        <Circle cx="778" cy="508" r="118" fill={navy}/>
      </G>
    </Svg>
  );
}

export default MusterIcon;
