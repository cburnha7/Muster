---
inclusion: always
---

# Muster Brand & Theme Guidelines

This steering file defines the brand identity and theme system for Muster. All UI components MUST use tokens from `src/theme/`.

## Critical Rules

1. **Always import from theme system** - Never hardcode colors, spacing, or typography
2. **Use semantic color names** - `colors.grass` (primary), `colors.court` (accent/salute)
3. **Import brand constants** - Use `Brand` from `src/theme/brand.ts`
4. **Use MusterIcon component** - Import `<MusterIcon />` from `src/theme/MusterIcon.tsx`

## Theme Imports

```typescript
// Colors
import { colors } from 'src/theme';
// or
import { colors } from 'src/theme/colors';

// Typography
import { Typography, TextStyles } from 'src/theme';

// Brand constants
import { Brand } from 'src/theme';

// App icon component
import { MusterIcon } from 'src/theme';

// Spacing, shadows, etc.
import { Spacing, Shadows, BorderRadius } from 'src/theme';
```

## Brand Identity v1.0

### App Name
**Muster** - A platform for organizing and joining sports events, booking facilities, and building teams.

### Tagline
"Find a game. Find your people."

### Brand Mechanic
**Salute** - In-app player recognition system

### Brand Personality
- **Community-driven**: Connecting players to games and people
- **Active**: Sports and fitness focused, energetic
- **Welcoming**: Friendly, inclusive, accessible to all skill levels
- **Recognition-focused**: Celebrating participation and sportsmanship
- **Modern**: Contemporary design and user experience

## Color System

### Primary Brand Colors

#### Grass (Primary)
- **Token**: `colors.grass`
- **Value**: `#3D8C5E`
- **Usage**: Primary actions, main brand color, represents sports fields, growth, activity
- **Variants**:
  - `colors.grassLight` - `#5BAB79` - Hover/active states
  - `colors.grassDark` - `#2A6644` - Pressed states
- **Examples**: Primary buttons, active states, key highlights

#### Court (Accent/Salute)
- **Token**: `colors.court`
- **Value**: `#E8A030`
- **Usage**: Accent color, salute/achievement indicators, energy, competition
- **Variants**:
  - `colors.courtLight` - `#F4BC60` - Salute glow effect
- **Examples**: Achievement badges, salute counts, special highlights

### Supporting Colors

#### Sky (Info/Links)
- **Token**: `colors.sky`
- **Value**: `#5B9FD4`
- **Usage**: Information, links, secondary actions
- **Variant**: `colors.skyLight` - `#85BEE8`

#### Track (Errors)
- **Token**: `colors.track`
- **Value**: `#D45B5B`
- **Usage**: Errors, alerts, destructive actions

### Neutral Colors

#### Chalk (Light Background)
- **Token**: `colors.chalk`
- **Value**: `#F7F4EE`
- **Usage**: Light mode backgrounds, surfaces

#### Ink (Dark Background/Text)
- **Token**: `colors.ink`
- **Value**: `#1C2320`
- **Usage**: Dark mode backgrounds, primary text
- **Variants**:
  - `colors.inkMid` - `#2A3430` - Card backgrounds (dark mode)
  - `colors.inkSoft` - `#3A4440` - Soft dark variant

#### Soft (Secondary Text)
- **Token**: `colors.soft`
- **Value**: `#6B7C76`
- **Usage**: Secondary text, disabled states

#### Mid (Mid-tone Text)
- **Token**: `colors.mid`
- **Value**: `#4A6058`
- **Usage**: Mid-tone text, subtle elements

### Color Palette

```typescript
// Brand Colors
colors.grass      // #3D8C5E - Primary brand color
colors.grassLight // #5BAB79 - Hover/active
colors.grassDark  // #2A6644 - Pressed
colors.court      // #E8A030 - Accent/salute color
colors.courtLight // #F4BC60 - Salute glow
colors.sky        // #5B9FD4 - Info/links
colors.skyLight   // #85BEE8 - Light variant
colors.track      // #D45B5B - Errors/alerts

// Neutrals
colors.chalk      // #F7F4EE - Light background
colors.ink        // #1C2320 - Dark background/text
colors.inkMid     // #2A3430 - Card backgrounds (dark)
colors.inkSoft    // #3A4440 - Soft dark
colors.soft       // #6B7C76 - Secondary text
colors.mid        // #4A6058 - Mid-tone text

// Aliases
colors.primary    // Alias for grass
colors.accent     // Alias for court

// Sport Type Colors
colors.basketball // #E8A030 - Court orange
colors.soccer     // #3D8C5E - Grass green
colors.tennis     // #FFD700 - Gold
colors.volleyball // #9C27B0 - Purple
colors.badminton  // #5B9FD4 - Sky blue
colors.other      // #6B7C76 - Soft gray
```

## Usage Examples

### Using Colors
```typescript
import { colors } from 'src/theme';

// Primary button
<TouchableOpacity style={{ backgroundColor: colors.grass }}>
  <Text style={{ color: colors.textInverse }}>Join Event</Text>
</TouchableOpacity>

// Salute/achievement indicator
<View style={{ backgroundColor: colors.court }}>
  <Text>🙌 Salute!</Text>
</View>

// Sport-specific color
<View style={{ backgroundColor: colors.soccer }}>
  <Text>Soccer Match</Text>
</View>
```

### Using Brand Constants
```typescript
import { Brand } from 'src/theme';

// App name
<Text>{Brand.name}</Text> // "Muster"

// Tagline
<Text>{Brand.tagline}</Text> // "Find a game. Find your people."

// Brand colors
<View style={{ backgroundColor: Brand.colors.grass }} />
```

### Using MusterIcon
```typescript
import { MusterIcon } from 'src/theme';

// Default rounded icon
<MusterIcon size={64} />

// Square variant
<MusterIcon size={48} variant="square" />

// Circle variant
<MusterIcon size={80} variant="default" />
```

## Typography

### Font Family
- **Display/Heading**: Fraunces (serif) - elegant, distinctive
- **UI/Body**: Nunito (sans-serif) - friendly, readable
- **Fallback**: System fonts (currently in use)

**Note**: Custom fonts require installation:
```bash
npm install @expo-google-fonts/fraunces @expo-google-fonts/nunito expo-font
```

### Font Scale
- **Display**: 52px, Bold (Fraunces 700) - Hero text, major displays
- **H1**: 34px, Bold - Page titles, major headings
- **H2**: 28px, Black (Fraunces 900) - Section headings
- **H3**: 22px, Semibold - Subsection headings
- **H4**: 20px, Semibold - Card titles, list headers
- **UI**: 14px, Black (Nunito 900) - Buttons, UI elements
- **Body Large**: 17px, Regular - Emphasized body text
- **Body**: 15px, Regular (Nunito 400) - Standard body text
- **Caption**: 13px, Regular - Captions, metadata
- **Label**: 10px, ExtraBold (Nunito 800) - Labels, tags (uppercase)
- **Small**: 11px, Regular - Fine print, timestamps

### Font Weights
- **Regular**: 400 - Body text
- **Medium**: 500 - Emphasized text
- **Semibold**: 600 - Headings, labels
- **Bold**: 700 - Major headings, important text
- **ExtraBold**: 800 - Labels, tags
- **Black**: 900 - UI elements, strong headings

## Design Principles

### 1. Simplicity
- Clean, uncluttered interfaces
- Focus on essential information
- Minimize cognitive load
- Clear visual hierarchy

### 2. Consistency
- Uniform design language across all screens
- Predictable interaction patterns
- Consistent spacing and alignment
- Reusable component patterns

### 3. Accessibility
- WCAG AA compliant color contrast (minimum 4.5:1)
- Minimum touch target size: 44x44px (iOS), 48x48px (Android)
- Support for dynamic type/font scaling
- Screen reader compatible
- Clear focus indicators

### 4. Performance
- Optimized images and assets
- Smooth animations (60fps)
- Fast load times
- Responsive interactions

### 5. Responsiveness
- Mobile-first design
- Tablet optimization
- Web browser support
- Adaptive layouts for all screen sizes

## Component Guidelines

### Buttons

#### Primary Button
- **Background**: `colors.grass` (#4CAF50)
- **Text**: `colors.textInverse` (#FFFFFF), 17px, Semibold
- **Height**: 48px
- **Border Radius**: 8px
- **Use**: Main actions, confirmations, join events

#### Accent Button (Salute)
- **Background**: `colors.court` (#FF6B35)
- **Text**: `colors.textInverse` (#FFFFFF), 17px, Semibold
- **Height**: 48px
- **Border Radius**: 8px
- **Use**: Salute actions, achievements, special highlights

#### Secondary Button
- **Background**: `colors.surface` (#F2F2F7)
- **Text**: `colors.grass` (#4CAF50), 17px, Semibold
- **Height**: 48px
- **Border Radius**: 8px
- **Use**: Alternative actions, cancel

#### Destructive Button
- **Background**: `colors.error` (#FF3B30)
- **Text**: `colors.textInverse` (#FFFFFF), 17px, Semibold
- **Height**: 48px
- **Border Radius**: 8px
- **Use**: Delete, cancel bookings, remove

### Cards
- **Background**: `colors.background` (#FFFFFF)
- **Border**: 1px solid `colors.border` (#E5E5EA)
- **Border Radius**: 12px
- **Shadow**: Medium elevation
- **Padding**: 16px
- **Use**: Event cards, facility cards, team cards

### Input Fields
- **Background**: `colors.surface` (#F2F2F7)
- **Border**: 1px solid `colors.border` (#E5E5EA)
- **Border Radius**: 8px
- **Height**: 48px
- **Padding**: 12px 16px
- **Font**: 17px, Regular
- **Placeholder**: `colors.textTertiary` (#C7C7CC)

### Navigation

#### Tab Bar
- **Background**: `colors.background` (#FFFFFF)
- **Border Top**: 1px solid `colors.border` (#E5E5EA)
- **Active Color**: `colors.grass` (#4CAF50)
- **Inactive Color**: `colors.textSecondary` (#8E8E93)
- **Height**: 60px
- **Icon Size**: 24x24px

#### Screen Header
- **Background**: `colors.background` (#FFFFFF)
- **Border Bottom**: 1px solid `colors.border` (#E5E5EA)
- **Title**: 20px, Semibold
- **Height**: 44px + safe area

## Spacing System

Use consistent spacing throughout the app:
- **XS**: 4px - Tight spacing, icon padding
- **SM**: 8px - Small gaps, compact layouts
- **MD**: 12px - Standard spacing
- **LG**: 16px - Card padding, section spacing
- **XL**: 24px - Large gaps, screen padding
- **XXL**: 32px - Major sections
- **Huge**: 40px - Hero sections
- **Massive**: 48px - Maximum spacing

## Iconography

### Icon Library
- **Primary**: Ionicons (included with Expo)
- **Style**: Outline style for most icons
- **Size**: 24x24px standard, 20px small, 32px large
- **Color**: Match text color or use primary blue for emphasis

### Common Icons
- **Home**: `home-outline`
- **Events**: `calendar-outline`
- **Facilities**: `location-outline`
- **Teams**: `people-outline`
- **Profile**: `person-outline`
- **Search**: `search-outline`
- **Add**: `add-circle-outline`
- **Settings**: `settings-outline`
- **Notifications**: `notifications-outline`

## Image Guidelines

### Event Images
- **Aspect Ratio**: 16:9
- **Minimum Size**: 800x450px
- **Format**: JPEG (photos), PNG (graphics)
- **Placeholder**: Use sport-specific color as background

### Facility Images
- **Aspect Ratio**: 4:3
- **Minimum Size**: 800x600px
- **Format**: JPEG
- **Placeholder**: Gray background with location icon

### User Avatars
- **Aspect Ratio**: 1:1 (square)
- **Size**: 200x200px
- **Format**: JPEG or PNG
- **Placeholder**: Colored background with initials

### Team Logos
- **Aspect Ratio**: 1:1 (square)
- **Size**: 200x200px
- **Format**: PNG with transparency preferred
- **Placeholder**: Colored background with team initials

## Animation Guidelines

### Timing
- **Fast**: 150ms - Micro-interactions, hover states
- **Normal**: 250ms - Standard transitions
- **Slow**: 350ms - Complex animations, page transitions

### Easing
- **Ease Out**: Default for most animations
- **Ease In Out**: For reversible animations
- **Spring**: For natural, bouncy effects

### Use Cases
- Button press feedback
- Screen transitions
- Modal appearances
- Loading states
- Success/error feedback

## Content Guidelines

### Tone of Voice
- **Friendly**: Approachable and welcoming
- **Clear**: Simple, direct language
- **Encouraging**: Motivate users to participate
- **Helpful**: Provide guidance when needed
- **Concise**: Respect users' time

### Writing Style
- Use active voice
- Keep sentences short
- Avoid jargon
- Use sports terminology appropriately
- Be inclusive and welcoming

### Error Messages
- Explain what went wrong
- Suggest how to fix it
- Be empathetic, not blaming
- Provide actionable next steps

### Success Messages
- Celebrate user actions
- Confirm what happened
- Suggest next steps
- Keep it brief

## Platform-Specific Considerations

### iOS
- Follow iOS Human Interface Guidelines
- Use native navigation patterns
- Support iOS gestures (swipe back, pull to refresh)
- Respect safe areas (notch, home indicator)

### Android
- Follow Material Design principles
- Use Android navigation patterns
- Support Android back button
- Use appropriate elevation/shadows

### Web
- Responsive design for all screen sizes
- Keyboard navigation support
- Hover states for interactive elements
- Browser-specific optimizations

## Accessibility Requirements

### Color Contrast
- Text on background: Minimum 4.5:1 ratio
- Large text (18px+): Minimum 3:1 ratio
- Interactive elements: Clear visual distinction
- Don't rely on color alone to convey information

### Touch Targets
- Minimum size: 44x44px (iOS), 48x48px (Android)
- Adequate spacing between targets
- Clear tap feedback
- Support for larger touch targets (accessibility settings)

### Screen Readers
- Meaningful labels for all interactive elements
- Proper heading hierarchy
- Alternative text for images
- Announce state changes

### Keyboard Navigation
- Logical tab order
- Visible focus indicators
- Keyboard shortcuts for common actions
- Skip navigation links

## Implementation Notes

### Theme System
All brand colors, typography, and spacing are defined in the theme system:
- `src/theme/colors.ts` - Color palette
- `src/theme/typography.ts` - Typography scale
- `src/theme/spacing.ts` - Spacing system
- `src/theme/shadows.ts` - Elevation system
- `src/theme/borderRadius.ts` - Border radius scale
- `src/theme/index.ts` - Complete theme export

### Usage in Code
```typescript
import { colors, Spacing, TextStyles } from 'src/theme';

// Use theme colors
<View style={{ backgroundColor: colors.grass }} />

// Use theme spacing
<View style={{ padding: Spacing.lg, margin: Spacing.md }} />

// Use text styles
<Text style={TextStyles.h1}>Heading</Text>
```

### Component Styles
Pre-built component styles are available:
```typescript
import { ComponentStyles } from 'src/theme';

<View style={ComponentStyles.card}>
  <Text>Card content</Text>
</View>

// Primary button (grass)
<TouchableOpacity style={ComponentStyles.button.primary}>
  <Text>Join Event</Text>
</TouchableOpacity>

// Accent button (court)
<TouchableOpacity style={ComponentStyles.button.accent}>
  <Text>🙌 Salute</Text>
</TouchableOpacity>
```

## Testing Checklist

When implementing new features or components:
- [ ] Use brand colors from theme system
- [ ] Follow typography scale
- [ ] Use consistent spacing
- [ ] Test color contrast (WCAG AA)
- [ ] Test on multiple screen sizes
- [ ] Test with screen reader
- [ ] Test keyboard navigation (web)
- [ ] Verify touch target sizes
- [ ] Test animations (60fps)
- [ ] Check loading states
- [ ] Verify error states

## Resources

### Design Files
- Brand documentation: `docs/branding-and-assets.md`
- Asset generation guide: `docs/asset-generation-guide.md`
- Implementation summary: `docs/branding-implementation-summary.md`

### Theme System
- Colors: `src/theme/colors.ts`
- Typography: `src/theme/typography.ts`
- Spacing: `src/theme/spacing.ts`
- Complete theme: `src/theme/index.ts`

### External Guidelines
- iOS Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Material Design: https://material.io/design
- WCAG Accessibility: https://www.w3.org/WAI/WCAG21/quickref/

## Summary

When working on Muster:
1. **Always use the theme system** - Import from `src/theme/`, never hardcode
2. **Use semantic color names** - `colors.grass` (primary), `colors.court` (accent/salute)
3. **Import brand constants** - Use `Brand` from `src/theme/brand.ts`
4. **Use MusterIcon** - Import `<MusterIcon />` for consistent app icon
5. **Follow the design principles** - Simplicity, consistency, accessibility
6. **Test accessibility** - Color contrast, touch targets, screen readers
7. **Maintain brand consistency** - Use established patterns and components
8. **Consider all platforms** - iOS, Android, and web have different conventions

The brand identity should feel professional, active, and welcoming - making it easy for anyone to organize or join sports activities. The grass green represents the sports field and growth, while the court orange represents energy and achievement.
