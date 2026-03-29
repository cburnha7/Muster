import React from 'react';
import Svg, { Circle, Rect, G, ClipPath, Defs } from 'react-native-svg';

type Variant = 'light' | 'dark';

interface MusterIconProps {
  size?: number;
  variant?: Variant;
}

export function MusterIcon({ size = 52, variant = 'light' }: MusterIconProps) {
  const id = `cc_${size}`;

  const pine  = variant === 'dark' ? '#3D8C5E' : '#2D5F3F';
  const red   = '#C0392B';
  const navy  = variant === 'dark' ? '#4A6A9A' : '#1B2A4A';
  const gold  = '#D4A017';
  const bg    = variant === 'dark' ? '#1B2A4A' : '#FFFFFF';

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

        {/* Gold field */}
        <Rect x="0" y="680" width="1024" height="344" fill={gold}/>

        {/* Left — pine green */}
        <Circle cx="237" cy="320" r="155" fill={pine}/>
        <Rect x="172" y="460" width="130" height="400" rx="65" fill={pine}/>

        {/* Right — navy */}
        <Circle cx="787" cy="320" r="155" fill={navy}/>
        <Rect x="722" y="460" width="130" height="400" rx="65" fill={navy}/>

        {/* Centre — red, head overlaps sides */}
        <Circle cx="512" cy="374" r="155" fill={red}/>
        <Rect x="447" y="514" width="130" height="400" rx="65" fill={red}/>
      </G>
    </Svg>
  );
}

export default MusterIcon;
