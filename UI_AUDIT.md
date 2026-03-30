# UI Visual Audit

**Date:** 2026-03-29
**Benchmark:** HomeScreen, NextUpCard, UpcomingRow, CreationWizard, TeamDetailsScreen
**Total issues found:** 75

---

## Design Benchmark

### Spacing
- Page horizontal padding: **20px**
- Section gap (marginTop): **24-28px**
- Section header to content gap: **12px**
- Card internal padding: **14-20px**
- Card gap in lists: **8-10px**

### Typography
- Section headers: `fonts.heading`, **18-20px**, `colors.onSurface`, `letterSpacing: -0.3`
- Card titles: `fonts.headingSemi`, **14-15px**, `colors.onSurface`
- Body/meta text: `fonts.body`, **13px**, `colors.onSurfaceVariant`
- Labels/badges: `fonts.label`, **11px**, uppercase, `letterSpacing: 1.2`
- Buttons: `fonts.ui`, **16px**, white on primary

### Cards
- Background: `#FFFFFF` (`colors.surfaceContainerLowest`)
- Border radius: **16**
- Shadow: `shadowColor: '#191C1E'`, offset `{0, 2}`, opacity `0.04-0.06`, radius `8`
- NO pure black (`#000`) shadows

### Buttons
- Primary: `#0052FF`, `borderRadius: 9999` (pill), `fonts.ui` 16px white
- Secondary: `colors.surfaceContainer`, same pill shape
- Destructive: `colors.error` text, no fill

### Background
- Screen background: `#F7F9FB` (`colors.background`)
- Card background: `#FFFFFF` on top of grey background for contrast

---

## Screens That Need Full Retheme (Zero theme tokens)

### 1. NotificationPreferencesScreen
- **0 fontFamily tokens** — all text uses raw `fontWeight`
- **0 color tokens** — all hardcoded: `#1F2937`, `#6B7280`, `#3B82F6`, `#D1D5DB`, `#E5E7EB`
- Switch colors hardcoded instead of using `colors.primary`
- Background white instead of `colors.background`
- Card borderRadius 12 instead of 16
- Shadow uses `#000` instead of `#191C1E`

### 2. UserStatsScreen
- **0 fontFamily tokens** — all raw `fontWeight`
- **20+ hardcoded hex colors**: `#1F2937`, `#3B82F6`, `#F59E0B`, `#10B981`, `#8B5CF6`, `#EF4444`, `#9CA3AF`, `#D1D5DB`
- Background white instead of `colors.background`
- Card borderRadius 12 instead of 16
- Shadow uses `#000`

### 3. BookingDetailsScreen
- **0 fontFamily tokens**
- **iOS system color palette**: `#007AFF`, `#34C759`, `#FF3B30`, `#FF9500` — conflicts with M3 design system
- Card uses semi-transparent `rgba(255,255,255,0.5)` instead of solid white
- Section title 24px (too large)
- borderRadius 12 instead of 16

### 4. BookingCard component
- **0 fontFamily tokens** — all raw `fontWeight`
- borderRadius 12 instead of 16
- Shadow uses `#000`
- Still uses `TouchableOpacity` instead of `PressableCard`

### 5. FormSelect component
- **0 theme tokens** — colors: `#333`, `#999`, `#007AFF`, `#FF3B30`, `#E8E8E8`, `#F0F0F0`
- **0 fontFamily tokens**
- Shadow uses `#000`

### 6. ScreenHeader component
- All color defaults hardcoded: `#FFFFFF`, `#333333`, `#E5E5EA`, `#000`
- No fontFamily tokens

---

## Screens With Significant Issues

### 7. EventsListScreen
- Background: `colors.white` instead of `colors.background`
- Card borderRadius 12 instead of 16
- Section title 24px (too large)
- Buttons borderRadius 8 instead of pill (9999)
- Shadow uses `#000`
- Some raw `fontWeight` instead of tokens

### 8. BookingsListScreen
- Background: `colors.white` instead of `colors.background`
- Buttons borderRadius 8 instead of pill
- Tab borderRadius 20 instead of 9999
- Uses legacy `colors.cobalt` instead of `colors.primary`
- Raw `fontWeight` throughout

### 9. ManageLeagueScreen
- Background: `colors.white` instead of `colors.background`
- Section cards have NO borderRadius, NO padding, NO shadow
- Border colors hardcoded `#E5E7EB`
- Background colors hardcoded `#F8F9FA`, `#FAFAFA`
- Buttons borderRadius 8 instead of pill
- Raw `fontWeight` throughout

---

## Screens With Minor Issues

### 10. SettingsScreen
- Card borderRadius **14** (should be 16)
- Card marginHorizontal **16** (should be 20)
- Cards have **no shadow** (should have subtle tinted shadow)

### 11. FacilitiesListScreen
- Section title **24px** (should be 18-20)
- FAB shadow uses `colors.primary` instead of tinted dark
- Some raw `fontWeight` values

### 12. RedeemCodeScreen
- Buttons borderRadius **12** and **10** (should be 9999 pill)
- Tier cards borderRadius **12** (should be 16)

### 13. TransferAccountScreen
- Background `colors.surfaceContainerLowest` (white, should be `colors.background`)
- Card borderRadius 12 (should be 16)
- Padding 16 (should be 20)

### 14. TeamsListScreen, LeaguesBrowserScreen, ConversationListScreen
- Horizontal padding **16** instead of **20**
- Minor: FAB shadow opacity 0.3 vs 0.15

---

## Summary

### Screens that match the benchmark
- HomeScreen (the benchmark itself)
- NextUpCard, UpcomingRow, LiveGameBanner
- TeamDetailsScreen
- CreationWizard (Team, League, Facility)
- ProfileScreen (recently rewritten)
- ChatScreen, MessageBubble, ConversationRow
- SportIconGrid

### Screens that need the most work
1. **NotificationPreferencesScreen** — zero theme tokens, feels like a different app
2. **UserStatsScreen** — zero theme tokens, 20+ hardcoded colors
3. **BookingDetailsScreen** — iOS system palette, no font tokens
4. **BookingCard** — no font tokens, wrong radius, still on TouchableOpacity
5. **ManageLeagueScreen** — no card styling, no shadows, hardcoded everything

### Most common issues (patterns that repeat)
1. **Raw `fontWeight` instead of `fontFamily: fonts.*`** — 8+ screens
2. **Pure black `#000` shadows instead of tinted `#191C1E`** — 7+ components
3. **`borderRadius: 12` instead of `16`** — 6+ screens/components
4. **Background `#FFFFFF` instead of `#F7F9FB`** — 6+ screens
5. **Buttons with `borderRadius: 8` or `12` instead of pill `9999`** — 5+ screens
6. **Hardcoded hex colors instead of theme tokens** — 5 screens with 0 tokens

### Shared components to fix
1. **FormSelect** — complete retheme needed (zero tokens)
2. **BookingCard** — migrate to PressableCard + design system
3. **ScreenHeader** — update defaults to use theme tokens
4. **LoadingSpinner** — update default color from legacy `cobalt` to `primary`

### Quick wins (fix in <5 minutes each)
- Change background from `colors.white`/`surfaceContainerLowest` to `colors.background` on 6 screens
- Change `shadowColor: '#000'` to `'#191C1E'` on 7 components
- Change `borderRadius: 12` to `16` on 6 components
- Change `borderRadius: 8` to `9999` on button styles

### Bigger lifts (need full retheme)
- NotificationPreferencesScreen — every style needs font + color tokens
- UserStatsScreen — every style needs font + color tokens
- BookingDetailsScreen — every style needs font + color tokens
- FormSelect — complete component retheme
- ManageLeagueScreen — needs card pattern + font + color tokens
