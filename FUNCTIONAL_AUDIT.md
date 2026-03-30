# Muster — Functional Testing Audit

**Date:** 2026-03-30
**Branch:** shoe-polish
**Auditor:** Claude Code (code-level audit + preview verification)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **P0 — Blocks user / crash** | 1 (FIXED) |
| **P1 — Bad experience** | 2 |
| **P2 — Annoying** | 12 |
| **P3 — Nitpick** | 8 |
| **Total** | **23** |

**TypeScript errors:** 1,709 (405 client, 600 server, rest shared types)
**Console.logs in client:** 21 across 5 files
**TODO/FIXME/HACK comments:** 11 across 10 files

---

## P0 — Critical / Blocks User

### BUG: App crashes on startup — "fonts is not defined" (FIXED)
- **Screen:** Entire app
- **Element:** App startup / module loading
- **Steps to reproduce:** Open app on web
- **What happens:** White screen with "Startup Error: RootNavigator: fonts is not defined". App completely unusable.
- **What should happen:** App loads to Sign In screen
- **Severity:** P0
- **File:** `src/screens/facilities/FacilityDetailsScreen.tsx:27`
- **Root cause:** `FacilityDetailsScreen.tsx` used `fonts.ui` in its StyleSheet but never imported `fonts` from the theme. Because Metro eagerly evaluates all transitive dependencies when loading RootNavigator -> TabNavigator -> FacilitiesStackNavigator -> FacilityDetailsScreen, this ReferenceError crashed the entire app.
- **Fix applied:** Added `fonts` to the import: `import { colors, fonts, Spacing } from '../../theme';`
- **Additional fix:** Separated font asset loading (ttf files) from font name constants in `typography.ts` to prevent `@expo-google-fonts` ESM/CJS interop issues from crashing the theme module on web.

---

## P1 — Bad Experience

### BUG: RedeemCodeScreen "Apply" button not disabled during validation
- **Screen:** RedeemCodeScreen
- **Element:** "Apply" button
- **Steps to reproduce:** Type a promo code and rapidly tap "Apply" multiple times
- **What happens:** Multiple validation requests fire simultaneously
- **What should happen:** Button should be `disabled={isValidating}` while request is in flight
- **Severity:** P1
- **File:** `src/screens/profile/RedeemCodeScreen.tsx:102`

### BUG: Salute save/remove API calls are stubbed with TODOs
- **Screen:** EventDetailsScreen
- **Element:** Salute button on participant cards
- **Steps to reproduce:** Salute a player after an event
- **What happens:** UI shows success alert and updates local state, but no API call is made — salutes are never persisted to the backend
- **What should happen:** Should call actual API to save/remove salutes
- **Severity:** P1
- **File:** `src/screens/events/EventDetailsScreen.tsx:481` (save), `:501` (remove)

---

## P2 — Annoying

### BUG: Privacy Policy link does nothing
- **Screen:** SettingsScreen
- **Element:** "Privacy Policy" menu row
- **Steps to reproduce:** Tap "Privacy Policy"
- **What happens:** Nothing — no navigation, no web view, no response
- **What should happen:** Open privacy policy in browser or web view
- **Severity:** P2
- **File:** `src/screens/profile/SettingsScreen.tsx:223`

### BUG: Terms of Service link does nothing
- **Screen:** SettingsScreen
- **Element:** "Terms of Service" menu row
- **Steps to reproduce:** Tap "Terms of Service"
- **What happens:** Nothing
- **What should happen:** Open terms in browser or web view
- **Severity:** P2
- **File:** `src/screens/profile/SettingsScreen.tsx:224`

### BUG: Help & Support link does nothing
- **Screen:** SettingsScreen
- **Element:** "Help & Support" menu row
- **Steps to reproduce:** Tap "Help & Support"
- **What happens:** Nothing
- **What should happen:** Open help page, email, or support flow
- **Severity:** P2
- **File:** `src/screens/profile/SettingsScreen.tsx:243`

### BUG: Rate the App link does nothing
- **Screen:** SettingsScreen
- **Element:** "Rate the App" menu row
- **Steps to reproduce:** Tap "Rate the App"
- **What happens:** Nothing
- **What should happen:** Open App Store / Play Store rating prompt
- **Severity:** P2
- **File:** `src/screens/profile/SettingsScreen.tsx:244`

### BUG: Upgrade button in avatar sheet does nothing
- **Screen:** AvatarBottomSheet (global)
- **Element:** "Upgrade" button in plan section
- **Steps to reproduce:** Open avatar bottom sheet, tap Upgrade
- **What happens:** Nothing — no onPress handler
- **What should happen:** Navigate to subscription/upgrade screen
- **Severity:** P2
- **File:** `src/components/navigation/AvatarBottomSheet.tsx:245`

### BUG: Standings table team rows don't navigate
- **Screen:** LeagueDetailsScreen (Standings tab)
- **Element:** Team rows in standings table
- **Steps to reproduce:** Tap a team in the standings
- **What happens:** Console.log only — TODO comment in handler
- **What should happen:** Navigate to TeamDetailsScreen
- **Severity:** P2
- **File:** `src/screens/leagues/tabs/StandingsTab.tsx:80-82`

### BUG: Matches tab match rows don't navigate
- **Screen:** LeagueDetailsScreen (Matches tab)
- **Element:** Match card rows
- **Steps to reproduce:** Tap a match
- **What happens:** Console.log only — TODO comment in handler
- **What should happen:** Navigate to match details or RecordMatchResultScreen
- **Severity:** P2
- **File:** `src/screens/leagues/tabs/MatchesTab.tsx:126-128`

### BUG: Silent error handling in invite search across creation screens
- **Screen:** CreateEventScreen, CreateTeamScreen, CreateLeagueScreen
- **Element:** User/team search in invite step
- **Steps to reproduce:** Search for users when API is down
- **What happens:** Empty catch blocks swallow errors silently — no feedback
- **What should happen:** Show error message or toast
- **Severity:** P2
- **Files:** `src/screens/events/CreateEventScreen.tsx:187`, `src/screens/teams/CreateTeamScreen.tsx:107`, `src/screens/leagues/CreateLeagueScreen.tsx:167`

### BUG: Message polling silently fails
- **Screen:** ChatScreen
- **Element:** Auto-polling interval (every 5 seconds)
- **Steps to reproduce:** Be in a chat when network drops
- **What happens:** Polling errors caught silently with comment `// silently fail polling`
- **What should happen:** After N failures, show subtle "reconnecting" indicator
- **Severity:** P2
- **File:** `src/screens/messages/ChatScreen.tsx:126-128`

### BUG: EditProfileScreen fields lack focus chaining
- **Screen:** EditProfileScreen
- **Element:** firstName, lastName, phoneNumber, email, address inputs
- **Steps to reproduce:** Tap "Next" on keyboard after filling a field
- **What happens:** Keyboard doesn't advance to next field
- **What should happen:** returnKeyType="next" with onSubmitEditing ref chaining
- **Severity:** P2
- **File:** `src/screens/profile/EditProfileScreen.tsx`

### BUG: TransferAccountScreen submit button lacks disabled state
- **Screen:** TransferAccountScreen
- **Element:** Submit button
- **Steps to reproduce:** Tap submit rapidly
- **What happens:** May fire multiple requests
- **What should happen:** `disabled={isSubmitting || !isFormValid}`
- **Severity:** P2
- **File:** `src/screens/profile/TransferAccountScreen.tsx`

### BUG: DependentFormScreen date validation doesn't disable submit button
- **Screen:** DependentFormScreen
- **Element:** Submit button + DatePickerInput
- **Steps to reproduce:** Clear date field, tap submit
- **What happens:** Validation runs but button isn't pre-disabled for invalid state
- **What should happen:** Button should be disabled when required fields are empty
- **Severity:** P2
- **File:** `src/screens/profile/DependentFormScreen.tsx:158-170`

---

## P3 — Nitpick

### BUG: No keyboard submission on age/price inputs in team creation
- **Screen:** CreateTeamScreen
- **Element:** minAge, maxAge, price TextInputs
- **What happens:** No onSubmitEditing or returnKeyType handling
- **What should happen:** "Next" advances between fields, "Done" dismisses keyboard
- **Severity:** P3
- **File:** `src/screens/teams/CreateTeamScreen.tsx:231-232, 247`

### BUG: Age inputs lack focus chaining in event creation
- **Screen:** CreateEventScreen
- **Element:** minAge, maxAge TextInputs
- **What happens:** No focus flow between age fields
- **What should happen:** returnKeyType="next" with ref focus management
- **Severity:** P3
- **File:** `src/screens/events/CreateEventScreen.tsx`

### BUG: League creation numeric fields unlinked
- **Screen:** CreateLeagueScreen
- **Element:** Games per season, other numeric fields
- **What happens:** No focus flow between numeric fields
- **What should happen:** Chain via returnKeyType="next"
- **Severity:** P3
- **File:** `src/screens/leagues/CreateLeagueScreen.tsx`

### BUG: Message input returnKeyType should be "send"
- **Screen:** ChatScreen (MessageInput)
- **Element:** Message text input
- **What happens:** returnKeyType="default" — generic return key
- **What should happen:** returnKeyType="send" to label the key clearly
- **Severity:** P3
- **File:** `src/components/messages/MessageInput.tsx:36`

### BUG: FormInput missing web focus outline suppression
- **Screen:** All forms (global)
- **Element:** TextInput within FormInput component
- **What happens:** Browser default blue focus outline may appear on web
- **What should happen:** Add `outlineStyle: 'none'` for `Platform.OS === 'web'`
- **Severity:** P3
- **File:** `src/components/forms/FormInput.tsx:74-89`

### BUG: TextInput component also missing web outline handling
- **Screen:** All forms using TextInput (global)
- **Element:** RNTextInput
- **What happens:** Web browsers show default outline on focus
- **What should happen:** Apply `outlineStyle: 'none'` for web
- **Severity:** P3
- **File:** `src/components/forms/TextInput.tsx:99-113`

### BUG: Missing dynamic header titles for detail screens
- **Screen:** FacilityDetailsScreen, EventDetailsScreen
- **Element:** Navigation header
- **What happens:** Header shows empty title (set to `headerTitle: ''` in navigator)
- **What should happen:** Dynamically set header title to facility/event name via `navigation.setOptions`
- **Severity:** P3
- **Files:** `src/screens/facilities/FacilityDetailsScreen.tsx`, `src/screens/events/EventDetailsScreen.tsx`

### BUG: Silent error handling in edit/availability screens
- **Screen:** EditEventScreen, CourtAvailabilityScreen
- **Element:** Various API calls
- **What happens:** Empty catch blocks swallow errors
- **What should happen:** Log or display errors
- **Severity:** P3
- **Files:** `src/screens/events/EditEventScreen.tsx:233, 237, 260`, `src/screens/facilities/CourtAvailabilityScreen.tsx:359, 430`

---

## Static Analysis

### TypeScript Errors: 1,709
- **Client (src/):** 405 errors
- **Server (server/):** 600 errors
- **Common patterns:** `TS7030: Not all code paths return a value`, `TS2345: Argument type mismatch (null vs string)`, `TS6133: Declared but never read`

### Console.logs in Client: 21
| File | Count |
|------|-------|
| `src/store/api/eventsApi.ts` | 11 |
| `src/store/api.ts` | 5 |
| `src/context/AuthContext.tsx` | 3 |
| `src/screens/leagues/RecordMatchResultScreen.tsx` | 1 |
| `src/screens/leagues/tabs/MatchesTab.tsx` | 1 |

### TODO/FIXME/HACK Comments: 11
Found across: NotificationProvider, TeamService, UserService, GroundsMapView, NotificationPreferencesScreen, RecordMatchResultScreen, CreateFacilityScreen, MatchesTab, CreateMatchScreen, StandingsTab

---

## What's Working Well

- **Loading states:** All major screens show spinners/skeletons during data fetch
- **Error states:** ErrorDisplay component used consistently with retry callbacks
- **Empty states:** Context-aware empty messages on all list screens
- **Pull-to-refresh:** Implemented on all list screens
- **Double-submit protection:** All creation wizards and major actions properly disable buttons during submission
- **Pluralization:** Handled correctly where it matters (salutes, ratings, player counts)
- **Auth flow:** Sign in, sign up, forgot password all have proper validation and keyboard handling

---

## Recommended Fix Order

1. **P0** — Already fixed (FacilityDetailsScreen fonts import)
2. **P1** — RedeemCode double-submit + Salute API stubs (2 fixes)
3. **P2** — Settings dead links + navigation TODOs + form focus chains (12 fixes)
4. **P3** — Web focus outlines + keyboard polish + dynamic titles (8 fixes)
