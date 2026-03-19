# Muster Design System
## Based on Leagues Screen (Source of Truth)

This document defines the complete design system extracted from the Leagues browser screen, which serves as the canonical reference for all UI implementation across the Muster app.

---

## 1. Color System

### Background Colors
- **Primary Background**: `colors.chalk` (#F7F4EE)
  - Used for: Screen backgrounds, modal backgrounds, card backgrounds
  - Never use: `colors.background` or hardcoded colors

### Text Colors
- **Primary Text**: `colors.ink` (#1C2320)
  - Used for: Titles, body text, primary labels
  - Font weight: 600 for titles, 500 for emphasis, 400 for body
  
- **Secondary Text**: `colors.soft` (from colors palette)
  - Used for: Subtitles, descriptions, placeholder text
  - Font weight: 400

- **Inverse Text**: `colors.chalk` (#F7F4EE)
  - Used for: Text on dark/colored backgrounds (buttons, badges)
  - Font weight: 600 for buttons, 500 for labels

### Interactive Colors
- **Primary Action**: `colors.grass` (#3D8C5E)
  - Used for: Primary buttons, active states, selected items
  - Text color: `colors.chalk`
  
- **Secondary Action**: `colors.sky` (#5B9FD4)
  - Used for: Links, info actions, secondary interactive elements
  
- **Destructive Action**: `colors.track` (#D45B5B)
  - Used for: Delete, cancel, destructive actions

- **Accent**: `colors.court` (#E8A030)
  - Used for: Badges, highlights, special indicators

### Border Colors
- **Default Border**: `colors.soft`
  - Used for: Input borders, card borders, dividers (1px)
  
- **Active Border**: `colors.grass`
  - Used for: Active/selected state borders

---

## 2. Typography Scale

### Titles
```typescript
{
  fontSize: 20,
  fontWeight: '600',
  color: colors.ink,
  marginTop: Spacing.lg,      // 16px
  marginBottom: Spacing.sm,   // 8px
}
```
**Usage**: Empty state titles, section headers, modal titles

### Subtitles / Section Headers
```typescript
{
  fontSize: 18,
  fontWeight: '600',
  color: colors.ink,
}
```
**Usage**: Modal headers, filter section titles

### Body Text
```typescript
{
  fontSize: 16,
  color: colors.soft,
  textAlign: 'center',
  lineHeight: 24,
}
```
**Usage**: Descriptions, empty state text, error messages

### Button Text
```typescript
{
  fontSize: 16,
  fontWeight: '600',
  color: colors.chalk, // or colors.ink for secondary
}
```
**Usage**: All button labels

### Small Text / Labels
```typescript
{
  fontSize: 14,
  color: colors.ink,
  fontWeight: '500', // or '400' for body
}
```
**Usage**: Filter buttons, option buttons, small labels

### Badge Text
```typescript
{
  fontSize: 12,
  fontWeight: '600',
  color: colors.chalk,
}
```
**Usage**: Count badges, status indicators

---

## 3. Spacing System

### Padding/Margin Values
- `Spacing.xs` (4px): Minimal spacing, icon gaps
- `Spacing.sm` (8px): Small gaps, tight spacing
- `Spacing.md` (12px): Medium gaps, button padding
- `Spacing.lg` (16px): Standard padding, section spacing
- `Spacing.xl` (20px): Large padding, container padding
- `Spacing.xxl` (24px): Extra large spacing, major sections

### Common Patterns
```typescript
// Screen container
paddingHorizontal: Spacing.lg,  // 16px
paddingVertical: Spacing.lg,    // 16px

// Button padding
paddingHorizontal: Spacing.lg,  // 16px
paddingVertical: Spacing.md,    // 12px

// Card/Section spacing
marginBottom: Spacing.lg,       // 16px
padding: Spacing.lg,            // 16px

// Empty state
paddingHorizontal: Spacing.xl,  // 20px
paddingVertical: Spacing.xxl,   // 24px
```

---

## 4. Border Radius

### Standard Radii
- **Buttons**: `8px`
- **Pills/Chips**: `20px`
- **Cards**: `12px`
- **Badges**: `10px`
- **Modals**: `0px` (full screen) or `12px` (centered)

```typescript
// Button
borderRadius: 8,

// Filter chip / Option button
borderRadius: 20,

// Badge
borderRadius: 10,
```

---

## 5. Component Patterns

### Primary Button
```typescript
{
  backgroundColor: colors.grass,
  borderRadius: 8,
  paddingVertical: Spacing.md,      // 12px
  paddingHorizontal: Spacing.lg,    // 16px
  alignItems: 'center',
}
// Text
{
  fontSize: 16,
  fontWeight: '600',
  color: colors.chalk,
}
```

### Secondary Button (Outlined)
```typescript
{
  backgroundColor: colors.chalk,
  borderWidth: 1,
  borderColor: colors.soft,
  borderRadius: 8,
  paddingVertical: Spacing.sm,      // 8px
  paddingHorizontal: Spacing.md,    // 12px
  alignItems: 'center',
}
// Text
{
  fontSize: 14,
  fontWeight: '500',
  color: colors.ink,
}
```

### Filter Button (Inactive)
```typescript
{
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.chalk,
  borderWidth: 1,
  borderColor: colors.soft,
  borderRadius: 8,
  paddingHorizontal: Spacing.md,    // 12px
  paddingVertical: Spacing.sm,      // 8px
  alignSelf: 'flex-start',
}
```

### Filter Button (Active)
```typescript
{
  backgroundColor: colors.grass,
  borderColor: colors.grass,
}
// Text changes to colors.chalk
```

### Option Chip (Inactive)
```typescript
{
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.chalk,
  paddingHorizontal: Spacing.lg,    // 16px
  paddingVertical: Spacing.sm,      // 8px
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.soft,
}
// Text
{
  fontSize: 14,
  color: colors.ink,
}
```

### Option Chip (Active)
```typescript
{
  backgroundColor: colors.grass,
  borderColor: colors.grass,
}
// Text
{
  fontSize: 14,
  color: colors.chalk,
  fontWeight: '500',
}
```

### Badge
```typescript
{
  backgroundColor: colors.court,
  borderRadius: 10,
  minWidth: 20,
  height: 20,
  justifyContent: 'center',
  alignItems: 'center',
  marginLeft: Spacing.sm,
}
// Text
{
  color: colors.chalk,
  fontSize: 12,
  fontWeight: '600',
}
```

---

## 6. Layout Patterns

### Screen Container
```typescript
{
  flex: 1,
  backgroundColor: colors.chalk,
}
```

### Filter Container
```typescript
{
  paddingHorizontal: Spacing.lg,
  paddingBottom: Spacing.sm,
}
```

### List Content
```typescript
{
  flexGrow: 1,
  paddingBottom: Spacing.lg,
}
```

### Empty State Container
```typescript
{
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: Spacing.xl,
  paddingVertical: Spacing.xxl,
}
```

### Error Container
```typescript
{
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: Spacing.xl,
  backgroundColor: colors.chalk,
}
```

---

## 7. Modal Patterns

### Modal Container
```typescript
{
  flex: 1,
  backgroundColor: colors.chalk,  // SOLID, no transparency
}
```

### Modal Header
```typescript
{
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: Spacing.lg,
  paddingVertical: Spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.soft,
}
```

### Modal Header Actions
```typescript
// Cancel (left)
{
  fontSize: 16,
  color: colors.sky,
}

// Title (center)
{
  fontSize: 18,
  fontWeight: '600',
  color: colors.ink,
}

// Reset/Action (right)
{
  fontSize: 16,
  color: colors.track,  // or colors.sky for non-destructive
}
```

### Modal Content
```typescript
{
  flex: 1,
  paddingHorizontal: Spacing.lg,
}
```

### Modal Footer
```typescript
{
  paddingHorizontal: Spacing.lg,
  paddingVertical: Spacing.lg,
  borderTopWidth: 1,
  borderTopColor: colors.soft,
}
```

### Modal Apply Button
```typescript
{
  backgroundColor: colors.grass,
  borderRadius: 8,
  paddingVertical: Spacing.lg,
  alignItems: 'center',
}
```

---

## 8. Empty States

### Structure
1. **Icon**: 64px, `colors.soft`
2. **Title**: 20px, 600 weight, `colors.ink`, `marginTop: Spacing.lg`
3. **Description**: 16px, `colors.soft`, centered, `lineHeight: 24`
4. **Action Button** (optional): Primary button style

### Example
```typescript
<View style={styles.emptyContainer}>
  <Ionicons name="icon-name" size={64} color={colors.soft} />
  <Text style={styles.emptyTitle}>No Items Found</Text>
  <Text style={styles.emptyText}>
    Description text here
  </Text>
  <TouchableOpacity style={styles.clearButton}>
    <Text style={styles.clearButtonText}>Action Text</Text>
  </TouchableOpacity>
</View>
```

---

## 9. Error States

### Structure
1. **Icon**: 64px, `colors.track`
2. **Title**: 20px, 600 weight, `colors.ink`, "Oops!"
3. **Error Message**: 16px, `colors.soft`, centered
4. **Retry Button**: Primary button with "Try Again"

### Example
```typescript
<View style={styles.errorContainer}>
  <Ionicons name="alert-circle-outline" size={64} color={colors.track} />
  <Text style={styles.errorTitle}>Oops!</Text>
  <Text style={styles.errorText}>{error}</Text>
  <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
    <Text style={styles.retryButtonText}>Try Again</Text>
  </TouchableOpacity>
</View>
```

---

## 10. Loading States

### Pull-to-Refresh
```typescript
<RefreshControl
  refreshing={isLoading}
  onRefresh={handleRefresh}
  tintColor={colors.grass}
  colors={[colors.grass]}
/>
```

### Footer Loader (Pagination)
```typescript
<View style={styles.footerLoader}>
  <ActivityIndicator size="small" color={colors.grass} />
</View>

// Style
{
  paddingVertical: Spacing.lg,
  alignItems: 'center',
}
```

---

## 11. Filter Section Pattern

### Section Container
```typescript
{
  marginVertical: Spacing.lg,
}
```

### Section Title
```typescript
{
  fontSize: 16,
  fontWeight: '600',
  color: colors.ink,
  marginBottom: Spacing.md,
}
```

### Options Container
```typescript
{
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: Spacing.sm,
}
```

---

## 12. Icon Usage

### Sizes
- **Large Icons** (Empty/Error states): 64px
- **Medium Icons** (Headers, features): 32px
- **Standard Icons** (Buttons, lists): 20px
- **Small Icons** (Badges, inline): 16px

### Colors
- **Neutral**: `colors.soft`
- **Active**: `colors.grass`
- **Error**: `colors.track`
- **Info**: `colors.sky`
- **Accent**: `colors.court`
- **On colored backgrounds**: `colors.chalk`

---

## 13. Border Patterns

### Standard Border
```typescript
{
  borderWidth: 1,
  borderColor: colors.soft,
}
```

### Active Border
```typescript
{
  borderWidth: 1,
  borderColor: colors.grass,
}
```

### Divider
```typescript
{
  borderBottomWidth: 1,
  borderBottomColor: colors.soft,
}
```

---

## 14. DO NOT USE

### ❌ Avoid These Patterns
- `colors.background` - Use `colors.chalk` instead
- `colors.textPrimary` - Use `colors.ink` instead
- `colors.textSecondary` - Use `colors.soft` instead
- `colors.border` - Use `colors.soft` instead
- Hardcoded colors like `'#FFFFFF'` or `'rgba(0,0,0,0.5)'`
- Inconsistent spacing values - always use `Spacing.*`
- Custom border radius values - use 8, 10, 12, or 20
- Transparent modal backgrounds - always use solid `colors.chalk`

---

## 15. Implementation Checklist

When updating a screen to match this design system:

- [ ] Background is `colors.chalk`
- [ ] All text uses `colors.ink` or `colors.soft`
- [ ] Buttons use primary button pattern (grass background, chalk text)
- [ ] Spacing uses `Spacing.*` constants
- [ ] Border radius is 8px (buttons) or 20px (pills)
- [ ] Borders use `colors.soft`
- [ ] Active states use `colors.grass` background
- [ ] Empty states follow the icon/title/text/button pattern
- [ ] Error states follow the icon/title/text/retry pattern
- [ ] Modals have solid `colors.chalk` background
- [ ] Modal headers have cancel/title/action layout
- [ ] Typography matches the scale (20/18/16/14/12)
- [ ] Icons use correct sizes (64/32/20/16)
- [ ] Loading indicators use `colors.grass`

---

## 16. Screen-Specific Patterns

### List Screens (Browse/Index)
1. SearchBar at top
2. Filter button below search
3. FlatList with pull-to-refresh
4. Empty state when no results
5. Error state when API fails
6. Footer loader for pagination

### Detail Screens
1. ScrollView container
2. Header section with key info
3. Sections with consistent padding
4. Action buttons at bottom
5. Solid backgrounds throughout

### Form Screens
1. ScrollView with KeyboardAvoidingView
2. Section grouping with titles
3. Consistent input styling
4. Submit button at bottom
5. Validation error display

---

## 17. Accessibility Notes

- Minimum touch target: 44x44 points
- Text contrast: Ensure `colors.ink` on `colors.chalk` meets WCAG AA
- Button labels: Clear, descriptive text
- Icon-only buttons: Include accessibility labels
- Form inputs: Proper labels and error messages

---

## Version
**v1.0** - Extracted from LeaguesBrowserScreen.tsx (December 2024)

**Source of Truth**: `src/screens/leagues/LeaguesBrowserScreen.tsx`

---

## Usage

Import this document when updating any screen. All UI components should match these patterns exactly. When in doubt, reference the Leagues screen implementation.
