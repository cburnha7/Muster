# Dark Mode Implementation

## Overview
Added dark mode support to Muster with automatic system preference detection and removed the intrusive offline connection banner.

## Changes Made

### 1. ✅ Removed Offline Banner

**File:** `src/components/navigation/OfflineIndicator.tsx`

The big red "No connection" banner has been completely removed. The component now returns `null`, making it invisible while still maintaining offline functionality in the background.

**Why:** The banner was intrusive and unnecessary. The app handles offline mode gracefully with:
- Cached data for viewing
- Queued actions that sync when back online
- Automatic retry logic
- No need for a visual indicator

### 2. ✅ Added Dark Mode Colors

**File:** `src/theme/colors.ts`

Added complete dark mode color palette:

```typescript
// Light Mode (default)
export const lightColors = {
  background: '#FFFFFF',
  surface: '#F2F2F7',
  textPrimary: '#000000',
  // ... all colors
};

// Dark Mode
export const darkColors = {
  background: '#000000',
  surface: '#1C1C1E',
  textPrimary: '#FFFFFF',
  // ... all colors adjusted for dark backgrounds
};
```

**Dark Mode Adjustments:**
- Background: Pure black (#000000) for OLED displays
- Surface: Dark gray (#1C1C1E) for cards and elevated elements
- Text: White primary text with adjusted secondary/tertiary
- Brand colors: Slightly lighter grass and court for better contrast
- Borders: Lighter borders (#38383A) for visibility

### 3. ✅ Created Dark Mode Hook

**File:** `src/hooks/useColorScheme.ts`

```typescript
import { useColorScheme } from '../hooks/useColorScheme';

function MyComponent() {
  const { isDark, colors } = useColorScheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.textPrimary }}>
        Hello {isDark ? 'Dark' : 'Light'} Mode!
      </Text>
    </View>
  );
}
```

### 4. ✅ Updated Theme Exports

**File:** `src/theme/index.ts`

Added exports for dark mode utilities:
```typescript
export { lightColors, darkColors, getThemeColors } from './colors';
```

## Usage

### Automatic System Preference

The app automatically detects the system color scheme:

```typescript
import { useColorScheme } from './hooks/useColorScheme';

function App() {
  const { isDark, colors } = useColorScheme();
  // colors automatically switches between light and dark
}
```

### Manual Theme Selection

To use a specific theme:

```typescript
import { lightColors, darkColors } from './theme';

const colors = userPrefersDark ? darkColors : lightColors;
```

### Get Theme Colors Function

```typescript
import { getThemeColors } from './theme';

const colors = getThemeColors(isDark);
```

## Color Comparison

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Background | #FFFFFF (White) | #000000 (Black) |
| Surface | #F2F2F7 (Light Gray) | #1C1C1E (Dark Gray) |
| Text Primary | #000000 (Black) | #FFFFFF (White) |
| Text Secondary | #8E8E93 (Gray) | #98989D (Light Gray) |
| Border | #E5E5EA (Light) | #38383A (Dark) |
| Grass (Primary) | #4CAF50 | #5DBF61 (Lighter) |
| Court (Accent) | #FF6B35 | #FF7F4F (Lighter) |

## Updating Components for Dark Mode

### Option 1: Use the Hook (Recommended)

```typescript
import { useColorScheme } from '../hooks/useColorScheme';

function MyScreen() {
  const { colors } = useColorScheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textPrimary }}>Content</Text>
    </View>
  );
}
```

### Option 2: Use StyleSheet with Dynamic Colors

```typescript
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../theme';

function MyScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  
  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    text: {
      color: colors.textPrimary,
    },
  });
  
  return <View style={styles.container}>...</View>;
}
```

### Option 3: Static Styles (No Dark Mode)

If a component doesn't need dark mode support, continue using static colors:

```typescript
import { colors } from '../theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background, // Uses light mode
  },
});
```

## Testing Dark Mode

### On iOS Simulator
1. Settings → Developer → Dark Appearance
2. Or use Control Center to toggle

### On Android Emulator
1. Settings → Display → Dark theme
2. Or quick settings toggle

### On Web
1. Browser DevTools → Rendering → Emulate CSS media feature prefers-color-scheme
2. Or change system dark mode settings

### Programmatically
```typescript
import { Appearance } from 'react-native';

// Force dark mode
Appearance.setColorScheme('dark');

// Force light mode
Appearance.setColorScheme('light');

// Use system preference
Appearance.setColorScheme(null);
```

## Migration Guide

### Updating Existing Screens

1. **Import the hook:**
   ```typescript
   import { useColorScheme } from '../hooks/useColorScheme';
   ```

2. **Use in component:**
   ```typescript
   const { colors } = useColorScheme();
   ```

3. **Replace hardcoded colors:**
   ```typescript
   // Before
   backgroundColor: '#FFFFFF'
   
   // After
   backgroundColor: colors.background
   ```

4. **Update StyleSheet:**
   ```typescript
   // Before
   const styles = StyleSheet.create({
     container: { backgroundColor: '#FFFFFF' }
   });
   
   // After
   function MyScreen() {
     const { colors } = useColorScheme();
     
     const styles = StyleSheet.create({
       container: { backgroundColor: colors.background }
     });
   }
   ```

## Best Practices

1. **Always use theme colors** - Never hardcode colors
2. **Test both modes** - Ensure readability in light and dark
3. **Consider contrast** - Dark mode needs higher contrast
4. **Use semantic names** - `colors.background` not `colors.white`
5. **Respect system preference** - Don't force a theme unless user chooses

## Components Already Updated

- ✅ OfflineIndicator (removed)
- ✅ Theme system (colors, exports)
- ⏳ All screens (need to be updated individually)
- ⏳ All components (need to be updated individually)

## Next Steps

To fully implement dark mode across the app:

1. Update each screen to use `useColorScheme()` hook
2. Replace hardcoded colors with theme colors
3. Test all screens in both light and dark mode
4. Add user preference toggle in settings (optional)
5. Persist user preference (optional)

## Example: Full Screen Update

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { Spacing, BorderRadius } from '../theme';

export function ExampleScreen() {
  const { colors } = useColorScheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { 
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Title
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Subtitle
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
});
```

## Summary

✅ Offline banner removed - cleaner UI
✅ Dark mode colors added - complete palette
✅ Dark mode hook created - easy to use
✅ Theme exports updated - accessible everywhere
⏳ Screen updates - gradual migration
⏳ User preference toggle - optional feature

The app now supports dark mode and has a much cleaner interface without the intrusive connection banner!
