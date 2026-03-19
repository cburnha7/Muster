# Muster Brand & Theme Update Summary

## Overview
Updated the Muster brand identity and theme system to use the correct brand colors: `colors.grass` (primary) and `colors.court` (accent/salute).

## Changes Made

### 1. Created Brand Constants (`src/theme/brand.ts`)
New file defining core brand identity:
- **Brand Name**: "Muster"
- **Tagline**: "Organize. Play. Connect."
- **Primary Color**: `grass` (#4CAF50) - Represents sports fields, growth, activity
- **Accent Color**: `court` (#FF6B35) - Represents energy, competition, achievement
- App icon and splash screen configurations

### 2. Updated Color System (`src/theme/colors.ts`)
Refactored to use semantic brand colors:
- **Primary**: `colors.grass` (#4CAF50) - Main brand color
- **Accent**: `colors.court` (#FF6B35) - Salute/achievement color
- Maintained backward compatibility with `colors.primary` alias
- Updated sport type colors to align with brand
- Added proper TypeScript types

### 3. Created MusterIcon Component (`src/theme/MusterIcon.tsx`)
Reusable app icon component:
- Configurable size
- Three variants: default (circle), rounded, square
- Uses brand colors from theme
- Includes proper shadows and elevation
- Icon: Ionicons "people" representing community

Usage:
```typescript
import { MusterIcon } from 'src/theme';

<MusterIcon size={64} />
<MusterIcon size={48} variant="square" />
```

### 4. Updated Theme Index (`src/theme/index.ts`)
Enhanced central theme export:
- Added Brand export
- Added MusterIcon export
- Updated ComponentStyles to use `colors.grass` and `colors.court`
- Added accent button style for salute actions
- Improved documentation

### 5. Updated Brand Steering File (`.kiro/steering/brand.md`)
Comprehensive brand guidelines:
- Critical rules for theme usage
- Import examples
- Color system documentation
- Usage examples for colors, Brand constants, and MusterIcon
- Updated all color references to use new semantic names
- Added accent button guidelines

## Color Migration

### Old Colors → New Colors
- `#007AFF` (blue) → `#4CAF50` (grass) - Primary
- No accent color → `#FF6B35` (court) - Accent/Salute
- `Colors.primary` → `colors.grass` (recommended) or `colors.primary` (alias)

### Semantic Naming
- **grass**: Primary brand color - sports fields, growth, activity
- **court**: Accent color - energy, competition, achievement (salute)

## Component Style Updates

### Button Styles
```typescript
// Primary button (grass green)
ComponentStyles.button.primary

// Accent button (court orange) - NEW
ComponentStyles.button.accent

// Secondary button
ComponentStyles.button.secondary

// Destructive button
ComponentStyles.button.destructive
```

### Usage Examples

#### Using Colors
```typescript
import { colors } from 'src/theme';

// Primary action
<TouchableOpacity style={{ backgroundColor: colors.grass }}>
  <Text style={{ color: colors.textInverse }}>Join Event</Text>
</TouchableOpacity>

// Salute/achievement
<View style={{ backgroundColor: colors.court }}>
  <Text>🙌 Salute!</Text>
</View>
```

#### Using Brand Constants
```typescript
import { Brand } from 'src/theme';

<Text>{Brand.name}</Text>        // "Muster"
<Text>{Brand.tagline}</Text>     // "Organize. Play. Connect."
```

#### Using MusterIcon
```typescript
import { MusterIcon } from 'src/theme';

<MusterIcon size={64} />
<MusterIcon size={48} variant="square" />
```

## Migration Guide for Existing Code

### Step 1: Update Imports
```typescript
// Old
import { Colors } from '../theme';

// New (recommended)
import { colors } from 'src/theme';

// Or keep using Colors (backward compatible)
import { Colors } from 'src/theme';
```

### Step 2: Update Color References
```typescript
// Old
backgroundColor: Colors.primary  // #007AFF blue

// New
backgroundColor: colors.grass    // #4CAF50 green
// or
backgroundColor: colors.primary  // Also #4CAF50 (alias)
```

### Step 3: Add Accent Colors Where Appropriate
```typescript
// For salute/achievement features
backgroundColor: colors.court    // #FF6B35 orange
```

### Step 4: Use MusterIcon for App Branding
```typescript
// Replace custom icon implementations
import { MusterIcon } from 'src/theme';

<MusterIcon size={64} />
```

## Files Created
- `src/theme/brand.ts` - Brand constants
- `src/theme/MusterIcon.tsx` - App icon component
- `docs/brand-theme-update-summary.md` - This file

## Files Modified
- `src/theme/colors.ts` - Updated to use grass/court colors
- `src/theme/index.ts` - Added Brand and MusterIcon exports
- `.kiro/steering/brand.md` - Updated with new brand guidelines

## Backward Compatibility

The update maintains backward compatibility:
- `Colors` export still available (alias for `colors`)
- `colors.primary` still works (alias for `colors.grass`)
- Existing code will continue to work
- Gradual migration recommended

## Next Steps

### Immediate
1. ✅ Brand constants defined
2. ✅ Color system updated
3. ✅ MusterIcon component created
4. ✅ Theme system updated
5. ✅ Documentation updated

### Recommended
1. Update app.json splash screen color to `#4CAF50`
2. Update app icon to use grass green background
3. Migrate existing components to use `colors.grass` and `colors.court`
4. Add salute/achievement features using `colors.court`
5. Replace hardcoded colors with theme tokens

### Future
1. Create actual app icon assets with grass green
2. Update splash screen with new branding
3. Add dark mode support
4. Create brand asset library
5. Design salute/achievement UI components

## Testing Checklist

- [x] TypeScript compilation successful
- [x] No diagnostic errors
- [x] Theme exports working correctly
- [ ] Visual testing on all platforms
- [ ] Update app.json with new colors
- [ ] Test MusterIcon component
- [ ] Verify color contrast (WCAG AA)
- [ ] Test on iOS, Android, and web

## Brand Identity

### Colors Meaning
- **Grass (#4CAF50)**: Represents the sports field where people gather, growth of the community, and active lifestyle
- **Court (#FF6B35)**: Represents the energy of competition, achievement through salutes, and the warmth of community recognition

### Visual Hierarchy
1. **Primary actions**: Use grass green
2. **Salute/achievements**: Use court orange
3. **Secondary actions**: Use neutral colors
4. **Destructive actions**: Use error red

## Conclusion

The Muster brand now has a clear, sports-focused identity with grass green as the primary color and court orange as the accent/salute color. The theme system is fully updated and ready to use throughout the application.

All future UI development should use the theme tokens from `src/theme/` to maintain brand consistency.

Date: March 9, 2026
