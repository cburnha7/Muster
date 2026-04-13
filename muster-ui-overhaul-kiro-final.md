# Muster UI Overhaul — Design System + Dark Mode
## Paste this entire prompt into Kiro

---

## Overview

This prompt does three things:
1. Replaces the colour, typography, and spacing token files with the new design system
2. Wires up a `ThemeContext` that provides light/dark tokens to every component via `useTheme()`
3. Updates every screen and shared component to consume tokens from `useTheme()` — no hardcoded values anywhere

Work through the sections in order. Complete each file fully before moving to the next.

---

## Part 1 — Token Files

### 1a. `src/theme/colors.ts` — Replace entire file

```typescript
// ─────────────────────────────────────────────────────────────
// Muster colour palette — v3 (Bright & Sharp)
// Never import this directly in components.
// Use useTheme() from src/theme/ThemeContext.tsx instead.
// ─────────────────────────────────────────────────────────────

// Brand accent colours — identical in both modes
export const brand = {
  cobalt:      '#2563EB',   // primary CTA, active nav
  cobaltLight: '#3B82F6',   // pressed / hover
  cobaltMid:   '#60A5FA',   // ghost borders, icon accents
  cobaltSoft:  '#DBEAFE',   // tint bg — light mode only

  pine:        '#059669',   // open / success
  pineSoft:    '#D1FAE5',   // success tint — light mode only

  gold:        '#D97706',   // salute only
  goldSoft:    '#FEF3C7',   // salute tint — light mode only

  heart:       '#DC2626',   // step out / error / destructive
  heartSoft:   '#FEE2E2',   // error tint — light mode only
} as const;

// Status badge token pairs — full-colour solid badges
export const statusTokens = {
  open:   { bg: '#059669', text: '#FFFFFF' },
  few:    { bg: '#D97706', text: '#FFFFFF' },
  full:   { bg: '#DC2626', text: '#FFFFFF' },
  closed: { bg: '#475569', text: '#FFFFFF' },
  league: { bg: '#2563EB', text: '#FFFFFF' },
} as const;

// Sport colour pairs — solid (card headers) + soft (inline on white/dark cards)
export const sportTokens = {
  soccer:     { solid: '#16A34A', solidText: '#FFFFFF', soft: '#DCFCE7', softText: '#14532D' },
  basketball: { solid: '#EA580C', solidText: '#FFFFFF', soft: '#FFEDD5', softText: '#7C2D12' },
  hockey:     { solid: '#0284C7', solidText: '#FFFFFF', soft: '#E0F2FE', softText: '#0C4A6E' },
  tennis:     { solid: '#CA8A04', solidText: '#FFFFFF', soft: '#FEF9C3', softText: '#713F12' },
  volleyball: { solid: '#7C3AED', solidText: '#FFFFFF', soft: '#EDE9FE', softText: '#4C1D95' },
  rugby:      { solid: '#BE123C', solidText: '#FFFFFF', soft: '#FFE4E6', softText: '#881337' },
  other:      { solid: '#475569', solidText: '#FFFFFF', soft: '#F1F5F9', softText: '#1E293B' },
} as const;

export type SportKey = keyof typeof sportTokens;

// Avatar colour pool — assigned deterministically from userId
const AVATAR_POOL = [
  '#2563EB', '#059669', '#7C3AED', '#0284C7',
  '#EA580C', '#BE123C', '#D97706', '#0F766E',
] as const;

export const getAvatarColor = (userId: string): string => {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = userId.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_POOL[Math.abs(h) % AVATAR_POOL.length];
};

// ─────────────────────────────────────────────────────────────
// Semantic token maps — consumed by ThemeContext
// ─────────────────────────────────────────────────────────────
export const lightTokens = {
  // Backgrounds
  bgScreen:    '#F8FAFF',   // screen / page background
  bgCard:      '#FFFFFF',   // card, panel, bottom sheet
  bgInput:     '#FFFFFF',   // text input background
  bgInputFocus:'#EFF6FF',   // focused input background
  bgInputError:'#FFF5F5',   // error input background
  bgSubtle:    '#F1F5F9',   // subtle section background

  // Borders
  border:      '#E2E8F0',   // dividers, card outlines
  borderStrong:'#CBD5E1',   // input borders, separators
  borderFocus: '#2563EB',   // focused input border
  borderError: '#DC2626',   // error input border

  // Text
  textPrimary: '#0F172A',   // headings, primary content
  textSecondary:'#475569',  // supporting text
  textMuted:   '#94A3B8',   // placeholders, captions, disabled
  textInverse: '#FFFFFF',   // text on cobalt / dark backgrounds

  // Tint backgrounds (for ghost buttons, soft badges)
  cobaltTint:  '#DBEAFE',
  pineTint:    '#D1FAE5',
  goldTint:    '#FEF3C7',
  heartTint:   '#FEE2E2',

  // Nav / chrome
  tabBar:      '#FFFFFF',
  tabBarBorder:'#E2E8F0',
  header:      '#FFFFFF',
  headerBorder:'#E2E8F0',
} as const;

export const darkTokens = {
  // Backgrounds
  bgScreen:    '#0A0F1E',   // deep navy-black
  bgCard:      '#131929',   // card background
  bgInput:     '#1A2238',   // input background
  bgInputFocus:'#1A2B4A',   // focused — cobalt-tinted
  bgInputError:'#2A1215',   // error — red-tinted
  bgSubtle:    '#1A2238',   // subtle section

  // Borders
  border:      '#1E2D45',   // dividers — visible but not harsh
  borderStrong:'#2A3D5C',   // input borders
  borderFocus: '#3B82F6',   // focused — cobaltLight (slightly lighter than light mode)
  borderError: '#EF4444',   // error — slightly lighter red for contrast

  // Text
  textPrimary: '#F0F4FF',   // near-white with slight blue warmth
  textSecondary:'#8BA3C7',  // muted blue-grey
  textMuted:   '#4A6080',   // very muted
  textInverse: '#FFFFFF',

  // Tint backgrounds — much darker, just a hint of colour
  cobaltTint:  '#1A2B4A',
  pineTint:    '#0F2E1F',
  goldTint:    '#2A1F08',
  heartTint:   '#2A1215',

  // Nav / chrome
  tabBar:      '#0F1623',
  tabBarBorder:'#1E2D45',
  header:      '#0F1623',
  headerBorder:'#1E2D45',
} as const;

export type ThemeTokens = typeof lightTokens;
```

---

### 1b. `src/theme/typography.ts` — Replace entire file

```typescript
import { TextStyle } from 'react-native';

// Font families loaded via expo-google-fonts:
//   @expo-google-fonts/fraunces   — display & headings
//   @expo-google-fonts/dm-sans    — all UI, labels, body
//
// Install: npx expo install @expo-google-fonts/fraunces @expo-google-fonts/dm-sans
// Load in App.tsx with useFonts() before rendering.

export const fontFamilies = {
  // Fraunces
  display:       'Fraunces_700Bold',
  displayItalic: 'Fraunces_700Bold_Italic',
  heading:       'Fraunces_900Black',
  // DM Sans
  uiBold:        'DMSans_700Bold',
  uiSemiBold:    'DMSans_600SemiBold',
  uiMedium:      'DMSans_500Medium',
  uiRegular:     'DMSans_400Regular',
} as const;

// Base type styles — colour is injected by useTheme() at usage time
// so these intentionally omit `color`
export const typeScale = {
  displayLg:  { fontFamily: fontFamilies.display,       fontSize: 44, lineHeight: 52, letterSpacing: -0.5 } as TextStyle,
  display:    { fontFamily: fontFamilies.display,       fontSize: 36, lineHeight: 44, letterSpacing: -0.3 } as TextStyle,
  displayItalic:{ fontFamily: fontFamilies.displayItalic,fontSize: 36, lineHeight: 44, letterSpacing: -0.3 } as TextStyle,
  heading:    { fontFamily: fontFamilies.heading,       fontSize: 26, lineHeight: 32, letterSpacing: -0.2 } as TextStyle,
  headingSm:  { fontFamily: fontFamilies.heading,       fontSize: 20, lineHeight: 26, letterSpacing: -0.1 } as TextStyle,
  ui:         { fontFamily: fontFamilies.uiBold,        fontSize: 16, lineHeight: 22 } as TextStyle,
  uiSm:       { fontFamily: fontFamilies.uiBold,        fontSize: 14, lineHeight: 18 } as TextStyle,
  label:      { fontFamily: fontFamilies.uiSemiBold,    fontSize: 11, lineHeight: 15, letterSpacing: 0.8, textTransform: 'uppercase' } as TextStyle,
  labelSm:    { fontFamily: fontFamilies.uiSemiBold,    fontSize: 10, lineHeight: 14, letterSpacing: 1.0, textTransform: 'uppercase' } as TextStyle,
  body:       { fontFamily: fontFamilies.uiRegular,     fontSize: 15, lineHeight: 22 } as TextStyle,
  bodySm:     { fontFamily: fontFamilies.uiRegular,     fontSize: 13, lineHeight: 19 } as TextStyle,
  caption:    { fontFamily: fontFamilies.uiRegular,     fontSize: 12, lineHeight: 16 } as TextStyle,
} as const;

export type TypeKey = keyof typeof typeScale;
```

---

### 1c. `src/theme/spacing.ts` — Create file

```typescript
export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
} as const;

export const radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   18,
  xxl:  24,
  full: 999,
} as const;

// Shadow helpers — use these instead of hardcoding shadow props
// Call with the theme's isDark flag to switch appropriately
export const makeShadow = (isDark: boolean) => ({
  card: {
    shadowColor: isDark ? '#000000' : '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.40 : 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cta: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.50 : 0.38,
    shadowRadius: 12,
    elevation: 6,
  },
  modal: {
    shadowColor: isDark ? '#000000' : '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.60 : 0.14,
    shadowRadius: 24,
    elevation: 12,
  },
});
```

---

## Part 2 — Theme Context

### 2a. `src/theme/ThemeContext.tsx` — Create file

```typescript
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  brand,
  statusTokens,
  sportTokens,
  lightTokens,
  darkTokens,
  ThemeTokens,
  getAvatarColor,
  SportKey,
} from './colors';
import { typeScale, TypeKey } from './typography';
import { spacing, radius, makeShadow } from './spacing';

export interface Theme {
  isDark: boolean;
  colors: ThemeTokens & typeof brand;
  status: typeof statusTokens;
  sport: typeof sportTokens;
  type: typeof typeScale;
  spacing: typeof spacing;
  radius: typeof radius;
  shadow: ReturnType<typeof makeShadow>;
  getAvatarColor: typeof getAvatarColor;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const theme = useMemo<Theme>(() => {
    const semantic = isDark ? darkTokens : lightTokens;
    return {
      isDark,
      colors: { ...brand, ...semantic },
      status: statusTokens,
      sport: sportTokens,
      type: typeScale,
      spacing,
      radius,
      shadow: makeShadow(isDark),
      getAvatarColor,
    };
  }, [isDark]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

// Convenience: build a text style with the right colour in one call
// Usage: t(theme, 'heading', theme.colors.textPrimary)
export function t(theme: Theme, key: TypeKey, color?: string) {
  return { ...theme.type[key], color: color ?? theme.colors.textPrimary };
}
```

---

### 2b. `src/theme/index.ts` — Replace entire file

```typescript
export * from './colors';
export * from './typography';
export * from './spacing';
export { ThemeProvider, useTheme, t } from './ThemeContext';
export type { Theme } from './ThemeContext';
```

---

### 2c. `src/theme/brand.ts` — Add dark mode awareness note

Keep existing brand constants (salute rules, vocabulary, error codes). Add at the top:

```typescript
// brand.ts
// Vocabulary and rules are mode-agnostic.
// For colours, use useTheme() from ThemeContext — never import from colors.ts directly in components.
```

---

## Part 3 — Wire ThemeProvider into the app

### 3a. `App.tsx` (or your root entry) — Add font loading + ThemeProvider

```typescript
import { useFonts } from 'expo-font';
import {
  Fraunces_700Bold,
  Fraunces_700Bold_Italic,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { ThemeProvider } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces_700Bold,
    Fraunces_700Bold_Italic,
    Fraunces_900Black,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!fontsLoaded) return null; // or a splash/skeleton

  return (
    <ThemeProvider>
      {/* existing providers: Redux, NavigationContainer, etc. */}
    </ThemeProvider>
  );
}
```

Install fonts:
```bash
npx expo install @expo-google-fonts/fraunces @expo-google-fonts/dm-sans expo-font
```

---

### 3b. `app.json` — Enable automatic dark mode

Change `"userInterfaceStyle": "light"` to:
```json
"userInterfaceStyle": "automatic"
```

---

## Part 4 — React Navigation Dark Mode

### 4a. `src/navigation/themes.ts` — Create file

```typescript
import { DefaultTheme, DarkTheme, Theme as NavTheme } from '@react-navigation/native';
import { brand, lightTokens, darkTokens } from '../theme/colors';

export const MusterLightTheme: NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary:    brand.cobalt,
    background: lightTokens.bgScreen,
    card:       lightTokens.header,
    text:       lightTokens.textPrimary,
    border:     lightTokens.headerBorder,
    notification: brand.heart,
  },
};

export const MusterDarkTheme: NavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary:    brand.cobaltLight,
    background: darkTokens.bgScreen,
    card:       darkTokens.header,
    text:       darkTokens.textPrimary,
    border:     darkTokens.headerBorder,
    notification: brand.heart,
  },
};
```

### 4b. Root `NavigationContainer` — Pass the theme

```typescript
import { useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { MusterLightTheme, MusterDarkTheme } from './src/navigation/themes';

const scheme = useColorScheme();

<NavigationContainer theme={scheme === 'dark' ? MusterDarkTheme : MusterLightTheme}>
  ...
</NavigationContainer>
```

---

## Part 5 — Shared Component Standards

Update every shared component to use `useTheme()`. Below are the canonical implementations.

### 5a. `src/components/ui/Button.tsx`

```typescript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

type Variant = 'primary' | 'secondary' | 'destructive' | 'salute' | 'neutral';
type Size    = 'md' | 'sm';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', size = 'md', disabled, style }: Props) {
  const { colors, shadow, radius, type } = useTheme();

  const height  = size === 'md' ? 52 : 36;
  const px      = size === 'md' ? 24 : 14;
  const txtStyle = size === 'md' ? type.ui : type.uiSm;

  const variants = {
    primary:     { bg: colors.cobalt,    border: 'transparent', text: colors.textInverse,   shadow: shadow.cta },
    secondary:   { bg: 'transparent',    border: colors.cobalt,  text: colors.cobalt,        shadow: undefined },
    destructive: { bg: colors.heartTint, border: colors.heart,   text: colors.heart,         shadow: undefined },
    salute:      { bg: colors.goldTint,  border: colors.gold,    text: colors.gold,          shadow: undefined },
    neutral:     { bg: colors.bgSubtle,  border: colors.border,  text: colors.textSecondary, shadow: undefined },
  };
  const v = variants[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        {
          height,
          borderRadius: radius.lg,
          borderWidth: 2,
          borderColor: v.border,
          backgroundColor: v.bg,
          paddingHorizontal: px,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        v.shadow,
        style,
      ]}
    >
      <Text style={{ ...txtStyle, color: v.text }}>{label}</Text>
    </TouchableOpacity>
  );
}
```

---

### 5b. `src/components/ui/Card.tsx`

```typescript
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, style, padded = true }: Props) {
  const { colors, shadow, radius, spacing } = useTheme();
  return (
    <View style={[{
      backgroundColor: colors.bgCard,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...(padded ? { padding: spacing.base } : {}),
      ...shadow.card,
    }, style]}>
      {children}
    </View>
  );
}
```

---

### 5c. `src/components/ui/Badge.tsx`

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme';

type StatusKey = 'open' | 'few' | 'full' | 'closed' | 'league';

interface StatusBadgeProps { status: StatusKey }
interface SportBadgeProps  { sport: string; variant?: 'solid' | 'soft' }

export function StatusBadge({ status }: StatusBadgeProps) {
  const { status: st, type, radius, spacing } = useTheme();
  const token = st[status];
  const labels: Record<StatusKey, string> = { open: 'Open', few: 'Few Spots', full: 'Full', closed: 'Closed', league: 'League' };
  return (
    <View style={{ backgroundColor: token.bg, borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ ...type.labelSm, color: token.text }}>{labels[status]}</Text>
    </View>
  );
}

export function SportBadge({ sport, variant = 'solid' }: SportBadgeProps) {
  const { sport: sp, type, radius, spacing } = useTheme();
  const key = sport.toLowerCase() as keyof typeof sp;
  const token = sp[key] ?? sp.other;
  const bg   = variant === 'solid' ? token.solid    : token.soft;
  const text = variant === 'solid' ? token.solidText : token.softText;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.full, paddingHorizontal: spacing.sm + 4, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={{ ...type.label, color: text }}>{sport}</Text>
    </View>
  );
}
```

---

### 5d. `src/components/ui/TextInput.tsx`

```typescript
import React, { useState } from 'react';
import { View, TextInput as RNInput, Text, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function TextInput({ label, error, containerStyle, ...rest }: Props) {
  const { colors, type, spacing, radius } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.borderError : focused ? colors.borderFocus : colors.borderStrong;
  const bg          = error ? colors.bgInputError : focused ? colors.bgInputFocus : colors.bgInput;
  const borderWidth = focused || error ? 2 : 1.5;

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={{ ...type.label, color: error ? colors.heart : colors.textSecondary, marginBottom: spacing.xs }}>
          {label}
        </Text>
      )}
      <RNInput
        {...rest}
        onFocus={e => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={e  => { setFocused(false); rest.onBlur?.(e); }}
        placeholderTextColor={colors.textMuted}
        style={[{
          height: 50,
          borderRadius: radius.md,
          borderWidth,
          borderColor,
          backgroundColor: bg,
          paddingHorizontal: spacing.md,
          ...type.body,
          color: colors.textPrimary,
        }, rest.style]}
      />
      {error && (
        <Text style={{ ...type.bodySm, color: colors.heart, marginTop: spacing.xs }}>{error}</Text>
      )}
    </View>
  );
}
```

---

### 5e. `src/components/ui/ScreenHeader.tsx`

```typescript
import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
}

export function ScreenHeader({ title, subtitle, right, style }: Props) {
  const { colors, type, spacing } = useTheme();
  return (
    <View style={[{
      backgroundColor: colors.header,
      paddingHorizontal: spacing.base,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.headerBorder,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }, style]}>
      <View>
        <Text style={{ ...type.heading, color: colors.textPrimary }}>{title}</Text>
        {subtitle && <Text style={{ ...type.bodySm, color: colors.textSecondary, marginTop: spacing.xs }}>{subtitle}</Text>}
      </View>
      {right && <View>{right}</View>}
    </View>
  );
}
```

---

### 5f. `src/components/ui/Avatar.tsx`

```typescript
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

export function Avatar({ userId, initials, imageUri, size = 40, style }: Props) {
  const { getAvatarColor, colors, type } = useTheme();
  const bg = getAvatarColor(userId);
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg,
      borderWidth: 2, borderColor: colors.cobalt,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }, style]}>
      {imageUri
        ? <Image source={{ uri: imageUri }} style={{ width: size, height: size }} />
        : <Text style={{ ...type.uiSm, color: '#FFFFFF', fontSize: size * 0.35 }}>{initials}</Text>
      }
    </View>
  );
}
```

---

### 5g. `src/components/ui/BottomActionBar.tsx`

```typescript
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function BottomActionBar({ children, style }: Props) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{
      backgroundColor: colors.bgCard,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: spacing.base,
      paddingTop: spacing.md,
      paddingBottom: Math.max(insets.bottom, spacing.lg),
    }, style]}>
      {children}
    </View>
  );
}
```

---

## Part 6 — Tab Bar Dark Mode

In your tab navigator config (wherever `tabBarStyle` is defined):

```typescript
import { useTheme } from '../theme';

function TabNavigator() {
  const { colors, spacing } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor:   colors.cobalt,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 10,
          letterSpacing: 0.4,
        },
        headerShown: false,
      }}
    >
      {/* tabs */}
    </Tab.Navigator>
  );
}
```

---

## Part 7 — Screen Migration Pattern

Apply this pattern to **every screen**. The pattern is always:

```typescript
import { useTheme } from '../theme';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { BottomActionBar } from '../components/ui/BottomActionBar';

export function ExampleScreen() {
  const { colors, type, spacing, radius, shadow } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      <ScreenHeader title="Events" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <Text style={{ ...type.headingSm, color: colors.textPrimary }}>
            Saturday Pickup
          </Text>
          <Text style={{ ...type.bodySm, color: colors.textSecondary, marginTop: spacing.xs }}>
            Sat, Jun 7 · 6:00 PM · Eastside Park
          </Text>
        </Card>
      </ScrollView>
      <BottomActionBar>
        <Button label="Join Up" onPress={handleJoin} variant="primary" />
      </BottomActionBar>
    </SafeAreaView>
  );
}
```

---

## Part 8 — Screen-by-Screen Rules

### Home / Feed
- `bgScreen` background
- Section labels: `type.label` + `textMuted`
- Section titles: `type.headingSm` + `textPrimary`
- Event cards: `Card` component, cobalt gradient header strip (use `colors.cobalt` → `#1D4ED8`)
- Status badges: `StatusBadge` component, always solid

### Event Detail
- Hero: cobalt gradient header, white text
- Status badge in hero: `StatusBadge`
- Sport tag in hero: `SportBadge` variant="solid"
- Meta rows (date, location, organiser): `type.bodySm` + `textSecondary`, inside a `Card`
- Roster avatars: `Avatar` component
- Primary CTA: `Button variant="primary"` inside `BottomActionBar`
- If joined: `Button variant="destructive" label="Step Out"` in same `BottomActionBar`

### Profile
- Avatar: `Avatar` size={64} with cobalt ring
- Stats grid: `type.headingSm` numbers, `type.labelSm` labels
  - Salute count: `colors.gold`
  - Other stats: `colors.cobalt`
- Edit button: `Button variant="secondary" size="sm"` in header right
- Game history: list of `Card` items

### Roster / League
- All "Team" → "Roster", "Members" → "Players" — audit every string
- League badge: `StatusBadge status="league"`
- Player rows: `Avatar` + name + sport

### Auth (Login / Register)
- Background: `bgScreen`
- Logo centred: `MusterIcon` 80px with `shadow.cta`
- "Muster": `type.displayLg` + `textPrimary`
- "the Troops.": `type.displayItalic` + `textSecondary`
- Inputs: `TextInput` component
- Primary: `Button variant="primary" label="Sign In"` inside `BottomActionBar`
- Links: `type.bodySm` + `colors.cobalt`

### Booking / Time Slots
- Available slot: `cobaltTint` bg, `cobalt` text
- Selected slot: `cobalt` bg, `textInverse` text, `shadow.cta`
- Taken slot: `bgSubtle` bg, `textMuted` text, opacity 0.6
- 30-min increments (#41)

### Settings (Accounts tab)
- Cobalt entities: `cobalt` left border or badge
- Stripe connected: `StatusBadge status="open"` (green solid)
- Stripe not connected: `Button variant="secondary" label="Connect"` size="sm"

---

## Part 9 — Global Text Audit

Search entire `src/` for these and replace:

| ❌ | ✅ |
|---|---|
| "Cancel" (button labels) | "Step Out" |
| "Book" / "Register" | "Join Up" |
| "Like" / "Kudos" / "Props" | "Salute" |
| "Team" | "Roster" |
| "Members" (roster context) | "Players" |
| "Tournament" / "Competition" / "Division" | "League" |
| Any `#XXXXXX` hex in component files | `colors.X` via `useTheme()` |
| Any hardcoded `fontFamily:` in components | `type.X` via `useTheme()` |
| `colors.grass` | `colors.pine` |
| `colors.sky` | `colors.cobalt` |
| `colors.court` | `colors.gold` |
| `colors.chalk` | `colors.bgScreen` |

---

## Part 10 — Dark Mode Dark-Mode-Specific Rules

These are things that look fine in light mode but break in dark mode if not handled:

1. **Gradients** — cobalt gradient (`cobalt` → `#1D4ED8`) works in both modes as-is. Do not invert it.
2. **Shadows** — `makeShadow(isDark)` handles this. Never hardcode `shadowColor: '#000'` directly.
3. **Images** — wrap any logo/icon shown on a dark background in the cobalt container (already the case for MusterIcon).
4. **Dividers** — always use `colors.border` token, never `#E2E8F0` hardcoded.
5. **Skeleton loading** — use `colors.bgSubtle` animated with opacity pulse.
6. **Bottom sheets / modals** — use `colors.bgCard` as background, `colors.border` for drag handle.
7. **Sport badge soft variants** — in dark mode the `soft` values are still light-mode pastels. When rendering soft sport badges on dark card backgrounds, use `SportBadge variant="solid"` instead.
8. **Status bar** — set `barStyle` dynamically:
   ```typescript
   import { StatusBar } from 'expo-status-bar';
   const { isDark } = useTheme();
   <StatusBar style={isDark ? 'light' : 'dark'} />
   ```

---

## Part 11 — Implementation Order

Complete in this exact order to avoid broken imports:

1. `src/theme/colors.ts` — replace
2. `src/theme/typography.ts` — replace
3. `src/theme/spacing.ts` — create
4. `src/theme/ThemeContext.tsx` — create
5. `src/theme/index.ts` — replace
6. Install fonts: `npx expo install @expo-google-fonts/fraunces @expo-google-fonts/dm-sans expo-font`
7. `App.tsx` — add `useFonts` + `ThemeProvider`
8. `app.json` — set `userInterfaceStyle: "automatic"`
9. `src/navigation/themes.ts` — create
10. Root navigator — pass Nav theme
11. `src/components/ui/Button.tsx` — update
12. `src/components/ui/Card.tsx` — update
13. `src/components/ui/Badge.tsx` — update
14. `src/components/ui/TextInput.tsx` — update
15. `src/components/ui/ScreenHeader.tsx` — update
16. `src/components/ui/Avatar.tsx` — update
17. `src/components/ui/BottomActionBar.tsx` — create
18. Tab navigator — update styles
19. Screens: Home → Event Detail → Profile → Roster → Auth → Booking → Settings
20. Global text audit (Part 9)
21. Dark mode edge case audit (Part 10)

---

## Part 12 — Micro-Polish Checklist

- [ ] All `TouchableOpacity` → `activeOpacity={0.75}`
- [ ] All `ScrollView` → `showsVerticalScrollIndicator={false}`
- [ ] All `TextInput` → `keyboardAppearance={isDark ? 'dark' : 'light'}`
- [ ] All root screens → `<SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen }}>`
- [ ] All forms → `<KeyboardAvoidingView>`
- [ ] All dates → `"Sat, Jun 7 · 6:00 PM"`
- [ ] All prices → `$XX.XX`
- [ ] Every empty state → icon (40–48px emoji) + `type.headingSm` heading + `type.body` message + `Button variant="primary"`
- [ ] Every loading state → `bgSubtle` skeleton shimmer, not a spinner in the middle of the screen
- [ ] Every error state → `heartTint` banner, `heart` text, dismissible
- [ ] `StatusBar style` set per-screen using `isDark`
