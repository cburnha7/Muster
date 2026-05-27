# UI Consistency Audit — Muster App

**Date:** 2026-05-27
**Branch:** main (commit 3e4138d)
**Author:** Kiro (automated audit)

## Summary

| Category               | Findings |
| ---------------------- | -------- |
| Headers (H)            | 4        |
| Bubbles (B)            | 5        |
| Pickers (P)            | 4        |
| Property Displays (D)  | 3        |
| Typography (T)         | 3        |
| Width / Web Parity (W) | 3        |
| **Total**              | **22**   |

### Top 5 Highest-Impact Consolidations

1. **Header pattern unification** — Two header systems coexist: React Navigation native `detailHeader` and custom `<ScreenHeader>`. Consolidate to one.
2. **Badge/pill component** — 8+ inline badge implementations across BookingCard, EventCard, LeagueCard. Extract a shared `<StatusBadge>` component.
3. **Picker consolidation** — 3 date/time picker variants (CrossPlatformDateTimePicker, DatePickerInput, raw DateTimePicker). Unify behind DatePickerInput/TimePickerInput.
4. **Width constraint pattern** — `contentMaxWidth = screenWidth > 600 ? 540 : undefined` repeated in 5+ screens. Extract to a shared hook or container.
5. **`detailHeader` duplication** — Identical object defined in 6 stack navigator files. Extract to a shared constant.

### Highest-Leverage Width Fix

The `contentMaxWidth` pattern (cap at 540px on wide viewports) is applied per-screen with identical logic. A shared `useContentWidth()` hook or `<ContentContainer>` wrapper would fix all 5+ screens at once.

### Decisions Needed from Charles

- **T-0:** Typography token file exists (`tokens.ts` has `tokenType` with 16 keys). No blocker.
- The `detailHeader` object is duplicated in 6 files — confirm whether to extract to a shared module or leave as-is.

---

## Phase 0 — Raw Output

### git status

```
On branch main
Your branch is up to date with 'origin/main'.
```

### git log --oneline -10

```
3e4138d feat(theme): dark-mode coverage audit + three-state picker upgrade
a5f0c6f fix(web): work around Hermes TDZ bug
625b427 fix: FULL restore to pre-session working state
9304728 fix(web): break circular dependency in createAuthenticatedApi
5bfd350 fix: FULL rollback to cbf43e2 working state
8e286be fix: restore core files to last known working state
b58988f fix: revert token-stripping transform and boot thunk
c8b3fc2 fix(web): revert lazy navigator loading
2f511d6 fix(arch): remove ALL service singleton imports from HomeScreen
f8d9b1c fix(arch): break circular dependency at the source
```

### Dark-mode coverage audit confirmation

```
3e4138d feat(theme): dark-mode coverage audit + three-state picker upgrade
```

ThemeContext upgraded to three-state, lightColors/darkColors parity (54 keys each) confirmed.

### Screen count

107 .tsx files in src/screens/ (across all subdirectories).

---

## Phase 1 — Layer Enumeration

### Layer 1 (Home Tabs — root screens of each bottom tab)

| Tab      | Root Screen      | Component              |
| -------- | ---------------- | ---------------------- |
| Home     | HomeScreen       | HomeScreen             |
| Rosters  | TeamsList        | TeamsListScreen        |
| Messages | ConversationList | ConversationListScreen |
| Leagues  | LeaguesBrowser   | LeaguesBrowserScreen   |
| Grounds  | FacilitiesList   | FacilitiesListScreen   |

All 5 Layer 1 screens share the `CustomHeader` from TabNavigator (search pill + notification bell + avatar selector). The tab bar header is hidden when navigating deeper into a stack.

### Layer 1.5 (Detail / Read Views)

| Screen                          | Stack               | Notes                               |
| ------------------------------- | ------------------- | ----------------------------------- |
| EventDetailsScreen              | Home, Teams, Events | Uses EntityHeader (full-bleed hero) |
| FacilityDetailsScreen           | Home, Facilities    | Uses EntityHeader                   |
| TeamDetailsScreen               | Teams               | Uses EntityHeader                   |
| LeagueDetailsScreen             | Leagues             | Uses EntityHeader                   |
| ProfileScreen                   | Home (Profile)      | Custom inline header                |
| DependentProfileScreen          | Home (Profile)      | Native stack detailHeader           |
| SearchResultsScreen             | Home                | Native stack detailHeader           |
| EventSearchResultsScreen        | Home                | Native stack detailHeader           |
| DebriefScreen                   | Home, Bookings      | Custom (headerShown: false)         |
| PendingReservationDetailsScreen | Home                | Native stack detailHeader           |
| GroundAvailabilityScreen        | Facilities          | Custom (headerShown: false)         |
| CourtAvailabilityScreen         | Facilities          | Native stack detailHeader           |
| MyRentalsScreen                 | Facilities          | Custom (headerShown: false)         |
| FacilityRentalsScreen           | Facilities          | Custom (headerShown: false)         |
| EscrowTransactionsScreen        | Facilities          | Custom (headerShown: false)         |
| CancellationPolicyScreen        | Facilities          | Custom (headerShown: false)         |
| ChatScreen                      | Messages            | Native stack detailHeader           |
| DocumentViewerScreen            | Leagues             | Native stack detailHeader           |
| ScheduleReviewScreen            | Teams               | Custom (headerShown: false)         |
| UserStatsScreen                 | Profile             | Native stack detailHeader           |
| BookingHistoryScreen            | Profile, Bookings   | Custom (headerShown: false)         |
| SettingsScreen                  | Home (Profile)      | Native stack detailHeader           |

### Layer 2 (Add / Edit Screens)

| Screen                        | Type     | Stack         | Header Pattern                         |
| ----------------------------- | -------- | ------------- | -------------------------------------- |
| CreateEventScreen             | Add      | Home, Events  | headerShown: false (custom)            |
| EditEventScreen               | Edit     | Home, Events  | headerShown: false (custom)            |
| CreateFacilityScreen          | Add      | Facilities    | headerShown: false (custom)            |
| EditFacilityScreen            | Edit     | Facilities    | Native detailHeader                    |
| ManageGroundScreen            | Edit     | Facilities    | headerShown: false (custom)            |
| AddCourtScreen                | Add      | Facilities    | headerShown: false (custom)            |
| FacilityMapEditorScreen       | Edit     | Facilities    | headerShown: false (custom)            |
| CreateTeamScreen              | Add      | Teams         | headerShown: false (custom)            |
| JoinTeamScreen                | Add      | Teams         | headerShown: false (uses ScreenHeader) |
| NewConversationScreen         | Add      | Messages      | Native detailHeader                    |
| CreateLeagueScreen            | Add      | Leagues       | headerShown: false (custom)            |
| ManageLeagueScreen            | Edit     | Leagues       | headerShown: false (uses ScreenHeader) |
| CreateMatchScreen             | Add      | Leagues       | headerShown: false (uses ScreenHeader) |
| RecordMatchResultScreen       | Edit     | Leagues       | headerShown: false (uses ScreenHeader) |
| AssignFacilityScreen          | Edit     | Leagues       | headerShown: false (uses ScreenHeader) |
| SchedulingScreen              | Edit     | Leagues       | headerShown: false (uses ScreenHeader) |
| ScheduleWizardScreen          | Add      | Leagues       | headerShown: false (custom)            |
| LeagueDeletionConfirmScreen   | Action   | Leagues       | headerShown: false (uses ScreenHeader) |
| LeagueTeamManagementScreen    | Edit     | Leagues       | headerShown: false (uses ScreenHeader) |
| EditProfileScreen             | Edit     | Home, Profile | Native detailHeader                    |
| DependentFormScreen           | Add/Edit | Home, Profile | Native detailHeader                    |
| NotificationPreferencesScreen | Edit     | Home, Profile | Native detailHeader                    |
| TransferAccountScreen         | Edit     | Home, Profile | headerShown: false (uses ScreenHeader) |
| RedeemCodeScreen              | Edit     | Home, Profile | Native detailHeader                    |
| AvailabilityCalendarScreen    | Edit     | Home          | headerShown: false (custom)            |
| PayPlayerDuesScreen           | Action   | Teams         | Uses ScreenHeader                      |
| PayLeagueDuesScreen           | Action   | Leagues       | Uses ScreenHeader                      |

---

## Phase 2 — Header Audit

### Layer 1 Header Pattern

All 5 Layer 1 screens use the **same** `CustomHeader` component defined inline in `TabNavigator.tsx`. This header renders:

- NotificationBell (left)
- HeaderSearchPill (center, flex: 1)
- HeaderUserSelector (right)
- Background: `colors.header`, border: `colors.headerBorder`
- Padding: `insets.top + spacing.md` top, `spacing.xl` bottom, `spacing.lg` horizontal

**Result: ✅ Layer 1 is fully consistent.** All 5 tabs share the identical header.

### Layer 1.5 Header Patterns

| Screen                   | Header                             | Status |
| ------------------------ | ---------------------------------- | ------ |
| EventDetailsScreen       | EntityHeader (full-bleed hero)     | ✅     |
| FacilityDetailsScreen    | EntityHeader                       | ✅     |
| TeamDetailsScreen        | EntityHeader                       | ✅     |
| LeagueDetailsScreen      | EntityHeader                       | ✅     |
| ProfileScreen            | Custom inline (headerShown: false) | ⚠      |
| SettingsScreen           | Native stack detailHeader          | ✅     |
| SearchResultsScreen      | Native stack detailHeader          | ✅     |
| ChatScreen               | Native stack detailHeader          | ✅     |
| DebriefScreen            | Custom (headerShown: false)        | ⚠      |
| GroundAvailabilityScreen | Custom (headerShown: false)        | ⚠      |

**Summary:** Of the ~22 Layer 1.5 screens:

- 4 use `EntityHeader` (the full-bleed hero pattern) — consistent ✅
- ~8 use the native stack `detailHeader` — consistent ✅
- ~10 use `headerShown: false` with custom internal headers — mixed patterns ⚠

The canonical Layer 1.5 header for entity detail screens is `EntityHeader`. For non-entity detail screens, the canonical is the native stack `detailHeader` (centered title, `fonts.headingSemi` at 17px).

### Layer 2 Header Patterns

| Pattern                             | Screens Using It                                                                                                                                                                                                                                 | Status              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| `<ScreenHeader>` component          | ManageLeagueScreen, SchedulingScreen, RecordMatchResultScreen, CreateMatchScreen, AssignFacilityScreen, LeagueDeletionConfirmScreen, LeagueTeamManagementScreen, JoinTeamScreen, TransferAccountScreen, PayPlayerDuesScreen, PayLeagueDuesScreen | ✅ Canonical        |
| Native stack `detailHeader`         | EditFacilityScreen, EditProfileScreen, DependentFormScreen, NotificationPreferencesScreen, NewConversationScreen, RedeemCodeScreen                                                                                                               | ⚠ Different pattern |
| Custom inline (no shared component) | CreateEventScreen, CreateFacilityScreen, CreateTeamScreen, CreateLeagueScreen, ScheduleWizardScreen, AvailabilityCalendarScreen                                                                                                                  | 🔴 One-off          |

**Summary:** Layer 2 has THREE different header patterns:

1. `<ScreenHeader>` (11 screens) — the canonical shared component
2. Native stack `detailHeader` (6 screens) — React Navigation's built-in header
3. Custom inline headers (6 screens) — one-off implementations

### Header Findings

**Finding H-1.** The `detailHeader` object is defined identically in 6 stack navigator files (HomeStackNavigator, FacilitiesStackNavigator, TeamsStackNavigator, MessagesStackNavigator, LeaguesStackNavigator, ProfileStackNavigator). Each defines: `headerShown: true, headerBackVisible: false, headerTitleAlign: 'center', headerShadowVisible: false, headerTitleStyle: { fontFamily: fonts.headingSemi, fontSize: 17 }`. **Consolidation:** Extract to `src/navigation/headerOptions.ts` and import in each stack. Risk: none; mechanical.

**Finding H-2.** Layer 2 screens split between `<ScreenHeader>` (custom component with safe-area handling, back button, right actions) and the native stack `detailHeader` (React Navigation's built-in). These produce visually different headers — `ScreenHeader` has a 3-column flex layout (1:2:1) with `fontSize: 18` title, while `detailHeader` uses the native header with `fontSize: 17`. **Consolidation:** Pick one pattern for all Layer 2 screens. Recommendation: use `<ScreenHeader>` everywhere since it supports custom right actions and theme-aware StatusBar. Risk: medium; requires updating 6 screens from native header to ScreenHeader.

**Finding H-3.** ProfileScreen (Layer 1.5) uses a custom inline header with `headerShown: false` rather than EntityHeader or the native detailHeader. It's the only "detail" screen that doesn't use EntityHeader despite being a profile view. **Consolidation:** Intentional — ProfileScreen has a unique layout (avatar + stats + tabs). Note only; not a finding to fix.

**Finding H-4.** Six Layer 2 "Create" screens (CreateEventScreen, CreateFacilityScreen, CreateTeamScreen, CreateLeagueScreen, ScheduleWizardScreen, AvailabilityCalendarScreen) use `headerShown: false` with custom inline headers that are not `<ScreenHeader>`. Each implements its own back button and title. **Consolidation:** These are multi-step flows with custom progress indicators — the inline headers are intentional for the flow UX. However, they should still use `<ScreenHeader>` with a custom `rightComponent` for consistency. Risk: low; each flow's header is self-contained.

---

## Phase 3 — Bubble Audit

### Bubble Types Identified

#### 1. Status Badges (event/booking state)

| Site                    | Component                     | Shape                   | Colors                                  | Font                             | Notes                          |
| ----------------------- | ----------------------------- | ----------------------- | --------------------------------------- | -------------------------------- | ------------------------------ |
| BookingCard "Cancelled" | inline `cancelledBadge`       | radius:10, pad:3/10     | bg: colors.error, text: white           | tokenFontFamily.display, 11px    | ⚠                              |
| BookingCard "Live"      | inline `liveBadgePill`        | radius:4, pad:3/8       | bg: colors.gold, text: white            | tokenFontFamily.display, 11px    | ⚠                              |
| BookingCard "Past"      | inline `pastBadge`            | radius:10, pad:3/10     | bg: colors.ink, text: white             | tokenFontFamily.display, 11px    | ⚠                              |
| BookingCard "Pending"   | inline `pendingApprovalBadge` | pill, pad:3/8           | bg: transparent, text: gold             | tokenFontFamily.uiSemiBold, 10px | 🔴 different font              |
| EventCard "Pending"     | inline `pendingBadge`         | pill, pad:3/8, border:1 | bg: goldLight, border: gold, text: gold | tokenFontFamily.uiSemiBold, 10px | ⚠                              |
| EventCard "Host"        | inline `hostBadge`            | pill, pad:3/8           | bg: colors.success, text: white         | tokenFontFamily.uiSemiBold, 10px | ⚠                              |
| EventCard status        | inline `statusBadge`          | pad:6/md                | bg: successLight/errorLight             | —                                | ⚠                              |
| EntityHeader chips      | inline `chip`                 | radius:20, pad:4/10     | bg: rgba(255,255,255,0.2) or prop       | fonts.label, 11px                | ✅ canonical for hero overlays |

**Finding B-1.** BookingCard defines 4 inline badge styles (cancelled, live, past, pending) with inconsistent shapes: `cancelledBadge` and `pastBadge` use `borderRadius: 10` while `liveBadgePill` uses `borderRadius: 4`. The "Pending" badge uses a completely different font family (`uiSemiBold` vs `display`) and size (10px vs 11px). **Consolidation:** Extract a shared `<StatusBadge variant="cancelled|live|past|pending" />` component with consistent radius (pill), font (uiSemiBold, 10px), and color logic. Risk: low.

#### 2. Sport Type Indicators

| Site                    | Component              | Shape               | Notes                             |
| ----------------------- | ---------------------- | ------------------- | --------------------------------- |
| EntityHeader chips      | Passed as `chips` prop | radius:20, pad:4/10 | White text on semi-transparent bg |
| EventCard sport icon    | Ionicons icon only     | No pill/chip        | Just an icon, not a bubble        |
| LeagueCard sport circle | `iconCircle`           | 32x32 circle        | Sport color bg at 14% opacity     |
| FacilityMapView callout | `calloutSportBadge`    | 24x24 circle        | cobaltLight bg                    |

**Finding B-2.** Sport type is displayed in 4 different visual patterns: as a text chip (EntityHeader), as a bare icon (EventCard), as a colored circle with icon (LeagueCard), and as a small circle badge (FacilityMapView). These serve different contexts (hero overlay vs card vs map callout) so some variation is expected, but the LeagueCard and FacilityMapView patterns could share a component. **Consolidation:** Extract `<SportIcon sport={...} size="sm|md" />` that renders the circle + icon pattern. Risk: low.

#### 3. Count/Notification Badges

| Site                     | Component           | Shape                      | Notes                         |
| ------------------------ | ------------------- | -------------------------- | ----------------------------- |
| TabNavigator unread      | inline `badge`      | radius:10, 20x20, border:2 | bg: colors.heart, text: white |
| CollapsibleSection count | inline `countBadge` | radius: tokenRadius.md     | bg: cobalt+20%, text: cobalt  |

**Finding B-3.** Two different count badge patterns: the tab bar badge (heart red, circular, bordered) and the section count badge (cobalt tint, rounded rect). These serve different purposes (notification vs informational count) so the visual difference is intentional. Note only.

#### 4. Skill/Rating Badges

| Site                  | Component                | Shape                | Notes                               |
| --------------------- | ------------------------ | -------------------- | ----------------------------------- |
| EventCard skill       | inline `skillBadge`      | pad: sm/xs           | Dynamic color based on rating value |
| EventCard invite-only | inline `inviteOnlyBadge` | pad: sm/xs, border:1 | gold tint bg, gold border           |

**Finding B-4.** EventCard has two inline badge variants (skill rating + invite-only) that use similar padding but different border treatments. These are specific to EventCard and unlikely to appear elsewhere. Note only; low priority.

#### 5. Commissioner/Role Badges

| Site                      | Component                  | Shape | Notes           |
| ------------------------- | -------------------------- | ----- | --------------- |
| LeagueCard "Commissioner" | inline `commissionerBadge` | —     | bg: cobaltLight |

**Finding B-5.** The "Commissioner" badge on LeagueCard is a one-off inline implementation. If role badges appear on other cards (e.g. "Captain" on TeamDetailsScreen), they should share a component. **Consolidation:** If role badges exist elsewhere, extract `<RoleBadge role="commissioner|captain" />`. Risk: low. Verify whether TeamDetailsScreen has a similar pattern.

---

## Phase 4 — Picker Audit

### Date Pickers

| Site                         | Component                                           | Variant          | Notes                        |
| ---------------------------- | --------------------------------------------------- | ---------------- | ---------------------------- |
| EditEventScreen              | `<DatePickerInput>`                                 | Shared component | ✅ Canonical                 |
| DependentFormScreen          | `<DatePickerInput>`                                 | Shared component | ✅                           |
| Step4Preview (League create) | `<CrossPlatformDateTimePicker>` mode="date"         | Direct usage     | ⚠ Should use DatePickerInput |
| ScheduleEventEditor          | `<CrossPlatformDateTimePicker>` mode="date"         | Direct usage     | ⚠                            |
| SSOOnboardingFlow            | Raw `<DateTimePicker>` from @react-native-community | Direct native    | 🔴 Bypasses wrapper          |

**Canonical:** `<DatePickerInput>` (wraps CrossPlatformDateTimePicker with label + field styling).

### Time Pickers

| Site                     | Component                                   | Variant          | Notes                        |
| ------------------------ | ------------------------------------------- | ---------------- | ---------------------------- |
| EditEventScreen          | `<TimePickerInput>`                         | Shared component | ✅ Canonical                 |
| MatchForm                | `<TimePickerInput>`                         | Shared component | ✅                           |
| Step3When (Event create) | `<CrossPlatformDateTimePicker>` mode="time" | Direct usage     | ⚠ Should use TimePickerInput |
| ScheduleEventEditor      | `<CrossPlatformDateTimePicker>` mode="time" | Direct usage     | ⚠                            |

**Canonical:** `<TimePickerInput>` (wraps CrossPlatformDateTimePicker with label + field styling).

### Single-Select from List

| Site                      | Component                | Variant                   | Notes                     |
| ------------------------- | ------------------------ | ------------------------- | ------------------------- |
| EditEventScreen           | `<FormSelect>`           | Bottom-sheet/modal picker | ✅ Canonical              |
| CreateEvent steps         | `<FormSelect>`           | Same                      | ✅                        |
| MatchForm                 | `<FormSelect>`           | Same                      | ✅                        |
| SettingsScreen Appearance | Inline segmented control | Three-button row          | Intentional (three-state) |

**Canonical:** `<FormSelect>` for list selection. The SettingsScreen segmented control is a different pattern (three-state toggle, not a list selection).

### Calendar (Inline Grid)

| Site                       | Component                         | Variant     | Notes |
| -------------------------- | --------------------------------- | ----------- | ----- |
| HomeScreen                 | `react-native-calendars` Calendar | Inline grid | ✅    |
| AvailabilityCalendarScreen | `react-native-calendars` Calendar | Inline grid | ✅    |
| GroundAvailabilityScreen   | `react-native-calendars` Calendar | Inline grid | ✅    |
| CourtAvailabilityScreen    | `react-native-calendars` Calendar | Inline grid | ✅    |
| FacilityRentalsScreen      | `react-native-calendars` Calendar | Inline grid | ✅    |
| Step3When (Event create)   | `react-native-calendars` Calendar | Inline grid | ✅    |

All calendar usages use `react-native-calendars` directly — consistent.

### Picker Findings

**Finding P-1.** `Step4Preview.tsx` (League create flow) and `ScheduleEventEditor.tsx` use `<CrossPlatformDateTimePicker>` directly for date selection instead of `<DatePickerInput>`. This bypasses the shared label + field styling that DatePickerInput provides. **Consolidation:** Replace direct CrossPlatformDateTimePicker usage with DatePickerInput. Risk: low.

**Finding P-2.** `Step3When.tsx` (Event create flow) and `ScheduleEventEditor.tsx` use `<CrossPlatformDateTimePicker>` directly for time selection instead of `<TimePickerInput>`. Same issue as P-1. **Consolidation:** Replace with TimePickerInput. Risk: low.

**Finding P-3.** `SSOOnboardingFlow.tsx` imports `DateTimePicker` directly from `@react-native-community/datetimepicker` (line 32) instead of using the app's `CrossPlatformDateTimePicker` wrapper or `DatePickerInput`. This means the onboarding date picker won't work on web. **Consolidation:** Replace with `<DatePickerInput>`. Risk: low; the onboarding flow is a single date-of-birth field.

**Finding P-4.** The `CrossPlatformDateTimePicker` component itself is a thin wrapper that renders a native picker on iOS/Android and a custom web implementation. It's the correct low-level primitive. The issue is that some screens use it directly instead of the higher-level `DatePickerInput`/`TimePickerInput` which add consistent label + field chrome. **Consolidation plan:** Enforce that screens always use `DatePickerInput` or `TimePickerInput`, never `CrossPlatformDateTimePicker` directly (except inside those wrapper components).

### Consolidation Plan (Priority Order)

1. **Unify date/time pickers** — All screens should use `<DatePickerInput>` and `<TimePickerInput>`. Direct usage of `CrossPlatformDateTimePicker` or raw `DateTimePicker` should be eliminated from screen code. (4 sites to fix)
2. **FormSelect is canonical** — No consolidation needed; it's already the single pattern for list selection.
3. **Calendar (react-native-calendars)** — Already consistent. Could be wrapped for theme token application (marker colors, etc.) but not a priority.
4. **Segmented control (SettingsScreen)** — Intentional one-off for the three-state appearance picker. If more segmented controls appear, extract a `<SegmentedControl>` component.

---

## Phase 5 — Property Display Audit

### Form Input Pattern

The canonical form input component is `<FormInput>` from `src/components/forms/FormInput.tsx`. It provides:

- Label (fonts.headingSemi, 14px, colors.ink)
- Input container (radius:16, border:2 transparent, minHeight:52, bg: colors.bgInput)
- Focus state (border: cobalt at 0.2 alpha, bg: colors.bgCard)
- Error state (border: error at 0.2 alpha, bg: colors.errorLight)
- Error message (13px, colors.error)

Additional form components:

- `<FormSelect>` — dropdown/picker with same label + container styling
- `<FormButton>` — action buttons
- `<DatePickerInput>` / `<TimePickerInput>` — date/time with same field chrome
- `<Checkbox>` — toggle with label

### Property Row Patterns

The app does NOT have a shared `<PropertyRow>` component. Detail screens render property information using:

1. **DetailCard pattern** (from `src/components/detail/`) — used on EntityHeader-based detail screens (Event, Team, League, Facility). Renders cards with icon + label + value rows.
2. **Inline View+Text** — many screens render label/value pairs as inline `<View><Text>{label}</Text><Text>{value}</Text></View>`.
3. **ToggleRow** — used in SettingsScreen for switch-based preferences.
4. **MenuRow** — used in SettingsScreen for tappable navigation rows.

### Property Display Findings

**Finding D-1.** There is no shared `<PropertyRow>` component for label+value display on detail screens. Each detail screen implements its own inline pattern. The `DetailCard` component from `src/components/detail/` provides some structure, but individual property rows within cards are still inline. **Consolidation:** Extract a `<PropertyRow label="..." value="..." icon="..." />` component for use inside DetailCard and other detail screens. Risk: low; mechanical extraction.

**Finding D-2.** SettingsScreen's `MenuRow` and `ToggleRow` are well-structured shared sub-components (defined within the file). They use consistent styling: icon in a colored circle, label, optional subtitle, chevron or switch. These are good candidates for extraction to `src/components/ui/` for reuse on other settings-like screens. **Consolidation:** Move MenuRow and ToggleRow to shared component files. Risk: low.

**Finding D-3.** RecordMatchResultScreen (line 159) has `{ backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }` — two conflicting background styles applied to the same View. The second overrides the first, but the dead `colors.white` style is confusing. Same pattern in CreateMatchScreen. **Consolidation:** Remove the dead `{ backgroundColor: colors.white }` from both screens. Risk: none.

---

## Phase 6 — Typography Audit

### Token Roster

The app has a comprehensive typography token system in `src/theme/tokens.ts` (`tokenType`) with 16 keys:

| Token         | Font               | Size | Weight              | Intended Role        |
| ------------- | ------------------ | ---- | ------------------- | -------------------- |
| display       | Fraunces_700Bold   | 36   | bold                | Hero/display text    |
| screenTitle   | Fraunces_700Bold   | 28   | bold                | Screen titles        |
| heading       | Fraunces_900Black  | 26   | black               | Section headings     |
| subheading    | Fraunces_900Black  | 20   | black               | Sub-section headings |
| modalTitle    | Fraunces_700Bold   | 20   | bold                | Modal titles         |
| body          | Nunito_400Regular  | 15   | regular             | Body copy, values    |
| bodySm        | Nunito_400Regular  | 13   | regular             | Small body text      |
| button        | Nunito_700Bold     | 16   | bold                | Button labels        |
| buttonSm      | Nunito_700Bold     | 14   | bold                | Small button labels  |
| fieldLabel    | Nunito_700Bold     | 15   | bold                | Form field labels    |
| sectionHeader | Nunito_700Bold     | 13   | bold, uppercase     | Section headers      |
| label         | Nunito_600SemiBold | 11   | semibold, uppercase | Badges, caps labels  |
| caption       | Nunito_400Regular  | 12   | regular             | Timestamps, metadata |
| error         | Nunito_400Regular  | 13   | regular             | Error messages       |
| input         | Nunito_400Regular  | 15   | regular             | Input text           |
| chip          | Nunito_500Medium   | 14   | medium              | Chip text            |
| chipSelected  | Nunito_700Bold     | 14   | bold                | Selected chip text   |

### Typography Token Usage

The `tokenType` / `typeScale` system is used via `useTheme().type` across the app. The `fonts` export from `src/theme/typography.ts` provides font-family strings for use in StyleSheet objects.

### Light vs. Dark Verification

| Role           | Light Color            | On Light Bg        | Dark Color             | On Dark Bg         | Status            |
| -------------- | ---------------------- | ------------------ | ---------------------- | ------------------ | ----------------- |
| Primary text   | ink (#1C2320)          | bgScreen (#F7F4EF) | ink (#E8ECF0)          | bgScreen (#111816) | ✅                |
| Secondary text | inkSecondary (#6B7C76) | bgCard (#FFFFFF)   | inkSecondary (#9BA8A3) | bgCard (#1A2020)   | ✅                |
| Muted text     | inkMuted (#94A3B8)     | bgCard (#FFFFFF)   | inkMuted (#5C6B66)     | bgCard (#1A2020)   | ⚠ contrast ~3.5:1 |
| Button text    | white (#FFFFFF)        | cobalt (#2040E0)   | white (#FFFFFF)        | cobalt (#4D6FFF)   | ✅                |
| Error text     | error (#D0362A)        | bgCard (#FFFFFF)   | error (#E85A50)        | bgCard (#1A2020)   | ✅                |
| Card title     | ink                    | bgCard             | ink                    | bgCard             | ✅                |

### Typography Findings

**Finding T-1.** `darkColors.inkMuted` (#5C6B66) against `darkColors.bgCard` (#1A2020) produces approximately 3.5:1 contrast ratio, which is below the 4.5:1 WCAG AA threshold for normal text. This affects placeholder text, disabled states, and tertiary labels in dark mode. **Fix candidate:** Lighten `darkColors.inkMuted` to ~#7A8A84 for better contrast. Risk: low; affects only muted/disabled text appearance.

**Finding T-2.** The `TabNavigator` badge text (line 275) uses a hardcoded `color: '#FFFFFF'` in a static StyleSheet instead of using `colors.white` or `colors.textInverse` from the theme. While white-on-colored-badge is theme-constant, it should reference the token for consistency. **Fix:** Replace `'#FFFFFF'` with a theme token reference. Risk: none.

**Finding T-3.** `src/types/eventsCalendar.ts` defines `PERSON_COLORS` with 8 hardcoded hex values. These are calendar marker colors (brand-constant, used on both light and dark backgrounds). They're acceptable as hardcoded values since they're not text/background colors that need to invert. However, they should ideally reference the existing avatar/sport color tokens. **Fix candidate:** Map PERSON_COLORS to existing token values where possible. Risk: low; cosmetic.

---

## Phase 6.5 — Layout Width Audit (Web Full-Width Parity)

### Width Constraint Pattern

The app uses a consistent pattern for responsive width:

```ts
const isWide = screenWidth > 600;
const contentMaxWidth = isWide ? 540 : undefined;
// Applied as: contentMaxWidth && { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }
```

This caps content at 540px on wide viewports (web/tablet) while allowing full-width on phones. This is an **intentional design choice** for readability — not a bug. However, it's applied inconsistently.

### Per-Screen Width Behavior

| Screen                 | Width on Web       | Width on Native | Constraint Source                   | Status            |
| ---------------------- | ------------------ | --------------- | ----------------------------------- | ----------------- |
| HomeScreen             | Capped 540px       | Full-width      | `contentMaxWidth` pattern           | ✅ Intentional    |
| TeamsListScreen        | Capped 540px       | Full-width      | `contentMaxWidth` pattern           | ✅                |
| FacilitiesListScreen   | Capped 540px       | Full-width      | `contentMaxWidth` pattern           | ✅                |
| LeaguesBrowserScreen   | Capped 540px       | Full-width      | `contentMaxWidth` pattern           | ✅                |
| ProfileScreen          | Capped 540px       | Full-width      | `contentMaxWidth` pattern           | ✅                |
| DependentProfileScreen | Capped 540px       | Full-width      | `contentMaxWidth` pattern           | ✅                |
| ConversationListScreen | Unknown            | Full-width      | Not checked                         | ⚠                 |
| RegistrationScreen     | Capped 400px       | Full-width      | Inline `maxWidth: 400`              | ⚠ Different cap   |
| EditFacilityScreen     | Modal capped 500px | Full-width      | Inline `maxWidth: 500` (modal only) | ✅ Modal-specific |
| CreateFacilityScreen   | Modal capped 500px | Full-width      | Inline `maxWidth: 500` (modal only) | ✅ Modal-specific |
| Step4Courts            | Modal capped 500px | Full-width      | Inline `maxWidth: 500` (modal only) | ✅ Modal-specific |

### Width Findings

**Finding W-1.** The `contentMaxWidth = screenWidth > 600 ? 540 : undefined` pattern is repeated in 5+ screens (HomeScreen, TeamsListScreen, FacilitiesListScreen, LeaguesBrowserScreen, ProfileScreen, DependentProfileScreen). Each screen independently calculates and applies this. **Consolidation:** Extract a `useContentWidth()` hook that returns `{ contentMaxWidth, isWide }` and a `<ContentContainer>` wrapper component. Risk: low; mechanical.

**Finding W-2.** RegistrationScreen uses `maxWidth: 400` (not 540) for its form content. This is a different cap than the standard 540px used elsewhere. The narrower width makes sense for a form (shorter line lengths improve readability), but it's inconsistent with the app-wide 540px standard. **Decision needed:** Is 400px intentional for auth forms, or should it match the 540px standard? Note: the `bottomSection` also has `maxWidth: 400`.

**Finding W-3.** The prompt's target state says "every screen stretches to full viewport width on web." However, the current 540px cap appears to be an intentional design decision for readability on wide screens — not a bug. The content is centered with `alignSelf: 'center'` and capped at 540px, which is a common mobile-first responsive pattern. **Decision needed from Charles:** Is the target state truly "full viewport width on web" (which would make list screens very wide and hard to read), or is the current 540px cap the intended behavior? If the cap is intentional, this finding is a note-only.

---

## Phase 7 — Visual Verification

**Note:** This audit is a static code analysis. Screenshots require running the app on hardware/simulator which cannot be performed by Kiro in this context. The following surfaces need visual verification by Charles:

### Surfaces Requiring Screenshot Verification (Light + Dark)

1. All 5 Layer 1 tab screens (CustomHeader consistency)
2. All 4 EntityHeader screens (Event, Facility, Team, League details)
3. SettingsScreen Appearance picker (three-state in both themes)
4. CreateEvent flow (all steps)
5. FormInput focused + errored states (both themes)
6. All bottom-sheet modals
7. ErrorBoundary fallback (both themes)
8. LoginScreen / RegistrationScreen (both themes)

### Web Viewport Triplet (1440 / 1024 / 414)

Needed for width audit verification:

- Confirm 540px cap behavior at 1440px and 1024px
- Confirm full-width at 414px (phone-width parity)

---

## Phase 8 — Deliverable Summary

### Finding Counts

| Category       | Count  | High Priority                                             |
| -------------- | ------ | --------------------------------------------------------- |
| H (Headers)    | 4      | H-1 (detailHeader duplication), H-2 (dual header systems) |
| B (Bubbles)    | 5      | B-1 (BookingCard badge inconsistency)                     |
| P (Pickers)    | 4      | P-3 (SSOOnboarding raw DateTimePicker)                    |
| D (Properties) | 3      | D-1 (no shared PropertyRow)                               |
| T (Typography) | 3      | T-1 (dark mode inkMuted contrast)                         |
| W (Width)      | 3      | W-1 (contentMaxWidth duplication)                         |
| **Total**      | **22** |                                                           |

### Implementation Priority (for follow-up PR)

1. **Quick wins (mechanical, no design decisions):**
   - H-1: Extract `detailHeader` to shared module
   - W-1: Extract `useContentWidth()` hook
   - D-3: Remove dead `backgroundColor: colors.white` overrides
   - T-2: Replace hardcoded `#FFFFFF` in TabNavigator badge
   - P-1/P-2: Replace direct CrossPlatformDateTimePicker with DatePickerInput/TimePickerInput

2. **Medium effort (requires some design thought):**
   - B-1: Extract shared `<StatusBadge>` component
   - D-1: Extract shared `<PropertyRow>` component
   - P-3: Replace raw DateTimePicker in SSOOnboardingFlow
   - T-1: Adjust `darkColors.inkMuted` for better contrast

3. **Larger scope (requires Charles's decision):**
   - H-2: Unify Layer 2 headers (ScreenHeader vs native detailHeader)
   - H-4: Standardize Create flow headers
   - W-2/W-3: Width cap strategy (540px vs full-width on web)

---

## No Code Changes in This PR

This audit produces findings only. No source files under `src/` were modified. The implementation prompt will be written by Charles after reviewing these findings.
