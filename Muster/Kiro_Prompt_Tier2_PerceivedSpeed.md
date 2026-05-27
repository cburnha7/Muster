# Kiro Prompt — Tier 2 perceived-speed wins (Muster 1.0.73 line)

## Read this first — context, scope, and standard

You are landing four changes that, together, are the single biggest perceived-speed improvement available in the Muster app. The bar is exactly the same as the Tier 1 hardening PR: no shortcuts, no skipped verification, real hardware testing, before/after measurements. If anything below conflicts with what you observe in the code, stop and surface it — do not "fix it your way."

These four fixes are independent in behavior but live on the same critical path (cold-launch → splash → first paint → sign-in → home). They should land as one PR so the before/after measurement is honest.

**Working branch:** `charles-dev`. Confirm with `git rev-parse --abbrev-ref HEAD` in PowerShell before any edits.

**Prerequisite:** The Tier 1 PR (`fix(boot): lazy-init AuthService + global error handler + ErrorBoundary prod polish`) should be merged first. If it has not been merged yet, stop and surface that — do not run this on top of un-hardened boot code.

**The four problems:**

1. **Successful sign-in shows a blocking `Alert.alert("Success", …)` modal** before the user reaches the home tab. `src/screens/auth/LoginScreen.tsx` line 64 (email/password) and line 99 (SSO). Every successful login forces an extra tap. This is the single highest-impact UX-perf change in the app.

2. **`src/screens/home/HomeScreen.tsx` line 620 gates first paint on `bookingsLoading`** with a full-page `<LoadingSpinner />`. Fresh-login users — including App Store reviewers on their throwaway accounts — see a blank spinner the whole round-trip to Railway. There is no skeleton frame.

3. **`src/navigation/RootNavigator.tsx` direct-imports `TabNavigator` and `OnboardingNavigator`** at lines 13–16 with the comment "Direct imports instead of lazy loading for web compatibility." On native, this means TabNavigator (5 tab stacks deep) and OnboardingNavigator have their top-level module code evaluated on the cold launch of an *unauthenticated* user who will never see those screens. Many of our service singletons live behind that module-eval gate (per the Tier 1 audit).

4. **Font loading is duplicated and over-long.** `App.tsx` lines 40–67 race a 5-second timeout against `Font.loadAsync`, *while* `src/hooks/useFonts.ts` already exists as a canonical loader with a 3-second timeout that nobody calls. Splash can stall for the full 5 seconds on a poor network. The hook is dead code; the duplicated logic in `App.tsx` is the live path.

---

## Phase 0 — Diagnostic pass (DO THIS BEFORE ANY EDITS)

Run all of the following in PowerShell from `C:\Projects\AllRoads`. Paste the output into the PR description.

```powershell
git status
git rev-parse --abbrev-ref HEAD
git log --oneline -20

# Confirm Tier 1 boot-hardening commit landed
git log --oneline -- index.js src/services/api/AuthService.ts src/components/error/ErrorBoundary.tsx | Select-Object -First 15

# Confirm nothing else is rendering the "Success" alerts
Select-String -Path "src\**\*.tsx","src\**\*.ts" -Pattern "SuccessMessages\.login" -SimpleMatch
Select-String -Path "src\**\*.tsx" -Pattern "Alert\.alert\(\s*['\""]Success" -SimpleMatch

# Confirm the LoadingSpinner gate
Select-String -Path "src\screens\home\HomeScreen.tsx" -Pattern "bookingsLoading|authLoading|bootLoading|isLoading"

# Confirm useFonts hook is dead (no callers)
Select-String -Path "src\**\*.ts","src\**\*.tsx","App.tsx" -Pattern "from\s+['\""].*hooks/useFonts['\""]" -SimpleMatch
Select-String -Path "src\**\*.ts","src\**\*.tsx","App.tsx" -Pattern "useFonts\(\)" -SimpleMatch

# Confirm direct-import of TabNavigator + OnboardingNavigator
Select-String -Path "src\navigation\RootNavigator.tsx" -Pattern "import.*TabNavigator|import.*OnboardingNavigator"
Select-String -Path "src\navigation\stacks\*.tsx" -Pattern "Suspense|React\.lazy" -SimpleMatch
```

Then read these files end-to-end. Do not skim.

- `App.tsx` (font load, prepare(), splash, provider tree)
- `src/hooks/useFonts.ts` (canonical loader, currently unused)
- `src/navigation/RootNavigator.tsx` (direct imports, auth gating, Stack screens)
- `src/navigation/AuthNavigator.tsx` (so you understand the user path before TabNavigator)
- `src/navigation/TabNavigator.tsx` (full file — confirm what its module-eval surface looks like)
- `src/navigation/OnboardingNavigator.tsx`
- `src/screens/auth/LoginScreen.tsx` (full file — Alert sites + state machine)
- `src/screens/home/HomeScreen.tsx` (around lines 1–250 for hook wiring, 600–700 for the LoadingSpinner gate and the return)
- `src/screens/common/LoadingScreen.tsx` (so you can reuse it as the Suspense fallback)
- `src/constants/errorMessages.ts` (the `SuccessMessages` export — we'll need to delete the unused fields)

If `SuccessMessages.login.success` or `SuccessMessages.login.ssoSuccess` turn up referenced from anywhere else after we delete the LoginScreen call sites, stop and surface it. Otherwise we'll prune them.

---

## Phase 1 — Fix #1: Delete the LoginScreen "Success" alerts

### Goal

After a successful sign-in (email/password or SSO), the user lands on the home tab with no modal in between. The successful state should still feel deliberate — a haptic confirmation is acceptable; nothing else.

### Exact change set

**File:** `src/screens/auth/LoginScreen.tsx`

1. **Delete** line 64:

   ```ts
   Alert.alert('Success', SuccessMessages.login.success);
   ```

2. **Delete** line 99:

   ```ts
   Alert.alert('Success', SuccessMessages.login.ssoSuccess);
   ```

3. **Replace** the now-empty success branches with a single optional haptic. Add at the top of the file:

   ```ts
   import * as Haptics from 'expo-haptics';
   ```

   (`expo-haptics` is already in `package.json` — do not install it again.)

   In `handleLogin`, the success path becomes:

   ```ts
   await dispatch(
     loginUser({ emailOrUsername: username.trim(), password, rememberMe })
   ).unwrap();
   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
     () => {}
   );
   ```

   In `handleSSOLogin`, the success path becomes:

   ```ts
   await dispatch(
     loginWithSSO({
       provider,
       token: userData.providerToken,
       userId: userData.providerId,
       email: userData.email,
       firstName: userData.firstName,
       lastName: userData.lastName,
     })
   ).unwrap();
   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
     () => {}
   );
   ```

4. **Remove the now-unused `Alert` import** if no other code in the file still calls `Alert.alert`. Confirm by re-grepping the file. Currently the file imports `Alert` on line 8 — if no remaining call sites, drop it.

5. The actual navigation happens via `RootNavigator`'s conditional render when `selectUser` resolves to a non-null user. No explicit `navigation.navigate` call is needed. Do not add one.

**File:** `src/constants/errorMessages.ts`

6. **Delete** `SuccessMessages.login.success` and `SuccessMessages.login.ssoSuccess` keys (only after the Phase 0 grep confirmed no other call sites). If `SuccessMessages.login` becomes empty, delete the parent key. If `SuccessMessages` becomes empty, delete the export.

### Edge cases to verify

- Sign-in fails with 401 → existing `catch` block sets `errors.general` → no haptic, no alert. ✅
- Sign-in fails with 429 → existing rate-limit handling unchanged. ✅
- SSO user cancels the Apple/Google sheet → existing "User cancelled" early-return unchanged. ✅
- Haptics fails (older device, simulator) → `.catch(() => {})` swallows; sign-in still proceeds. ✅
- A user double-taps "Sign In" → existing `isLoading` + `setIsLoading(false)` in `finally` already guards this. ✅
- Web build → `expo-haptics` is a no-op on web; the `.catch` swallows any platform error. ✅

### Do not change

- The `errors.general` error display banner — error UX stays as-is.
- The "Forgot Password" or "Sign Up" navigation. Unrelated.
- The form validation rules.

---

## Phase 2 — Fix #2: HomeScreen skeleton instead of full-page spinner

### Goal

Bookings-related sections of the home tab show skeleton placeholders while data loads. The page chrome (header, calendar grid, sport-filter row) renders immediately. The only thing that still gates the full screen is real auth-not-yet-ready states (`authLoading || bootLoading`) — those are fast and finite.

### Exact change set

**File:** `src/screens/home/HomeScreen.tsx`

1. **Change the gate at line 620** from:

   ```tsx
   if (authLoading || bootLoading || isLoading) {
     return (
       <View style={[styles.loadingContainer, { backgroundColor: colors.bgScreen }]}>
         <LoadingSpinner size={40} color={colors.cobalt} />
       </View>
     );
   }
   ```

   to:

   ```tsx
   // Only block the entire screen on real auth-not-ready states.
   // Booking/event loading is handled with skeletons in the sections below
   // so first paint is immediate even on a fresh sign-in.
   if (authLoading || bootLoading) {
     return (
       <View style={[styles.loadingContainer, { backgroundColor: colors.bgScreen }]}>
         <LoadingSpinner size={40} color={colors.cobalt} />
       </View>
     );
   }
   ```

   Note: the local `isLoading = bookingsLoading` constant at line 365 is no longer needed by the gate. Leave it in place if it's used elsewhere in JSX; remove if not (grep first).

2. **Build a `HomeSkeleton` component.** Add a new file `src/components/home/HomeSkeleton.tsx`:

   ```tsx
   import React from 'react';
   import { View, StyleSheet } from 'react-native';
   import { useTheme } from '../../theme';

   /**
    * Inline skeleton placeholders for HomeScreen sections that depend on
    * RTK Query data. Renders immediately on first paint to avoid the
    * blank-spinner gap on cold sign-in.
    */
   export function BookingsRowSkeleton() {
     const { colors, radius, spacing } = useTheme();
     return (
       <View style={[styles.row, { marginVertical: spacing.md }]}>
         {[0, 1, 2].map(i => (
           <View
             key={i}
             style={[
               styles.card,
               {
                 backgroundColor: colors.skeleton ?? colors.border,
                 borderRadius: radius.lg,
               },
             ]}
           />
         ))}
       </View>
     );
   }

   export function InboxSectionSkeleton() {
     const { colors, radius, spacing } = useTheme();
     return (
       <View style={{ marginVertical: spacing.md }}>
         {[0, 1].map(i => (
           <View
             key={i}
             style={[
               styles.inboxRow,
               {
                 backgroundColor: colors.skeleton ?? colors.border,
                 borderRadius: radius.md,
                 marginBottom: spacing.sm,
               },
             ]}
           />
         ))}
       </View>
     );
   }

   const styles = StyleSheet.create({
     row: { flexDirection: 'row', justifyContent: 'space-between' },
     card: { width: '31%', height: 100, opacity: 0.55 },
     inboxRow: { height: 64, opacity: 0.55 },
   });
   ```

   If `colors.skeleton` does not exist in the theme, add it to `src/theme/colors.ts` as a desaturated near-bg tint (e.g. `'#E8E4DE'` on light theme; per memory the app is light-only so dark theme can mirror or be skipped). Do **not** invent a new token style — match the existing token naming convention. Confirm exact convention by reading `src/theme/colors.ts`.

3. **Render skeletons in HomeScreen.tsx** in the spots that previously appeared only after bookings loaded. The exact locations to modify:

   - Around the `LiveGameBanner` block (line 663–669): if `bookingsLoading`, do not render `LiveGameBanner`. (It already short-circuits on `liveGameBooking == null`, which is what it is during loading — verify this is the case. If yes, no change needed here; if no, add an explicit `bookingsLoading` guard.)
   - Around the inbox section that displays `organizedEvents`, `rosterInvitations`, etc. (read the file to find the exact JSX block — it lives below the calendar). While `bookingsLoading || loadHomeDataLoading` is true and the underlying arrays are empty, render `<InboxSectionSkeleton />`. Once data arrives, the real rows take over.
   - The calendar itself renders fine with an empty `markedDates` map — confirm by reading the `Calendar` config. Do not gate the calendar on bookings.

4. **Show a subtle error state if bookings fail** instead of blanking. The existing `if (error)` block at line 630 currently full-page-blocks the screen with `<ErrorDisplay />`. Move that into an inline banner at the top of the bookings section — the rest of the home tab is still usable (calendar, search, leagues) even if bookings fail.

### Edge cases to verify

- First-paint with `bookingsLoading = true` → page chrome renders, skeletons render in place of bookings sections, no spinner. ✅
- Bookings load successfully → skeletons swap out for real data; no layout shift (skeletons should be the same height as the real rows). ✅
- Bookings request errors → inline banner above the bookings section; the rest of the screen still functions. ✅
- Pull-to-refresh while skeletons are showing → existing `RefreshControl` handles. ✅
- User has zero bookings (empty array, not loading) → existing empty-state behavior unchanged. ✅
- Cold launch with cached RTK Query data → bookings populate on first paint, skeletons never appear. ✅

### Do not change

- The `Calendar` widget, `MyCrewRow`, or `LiveGameBanner` internals.
- `useGetUserBookingsQuery` hook usage.
- The `handleRefresh` flow.

---

## Phase 3 — Fix #3: Lazy-load TabNavigator + OnboardingNavigator on native

### Goal

On native, `TabNavigator` and `OnboardingNavigator` are loaded via `React.lazy` so their module-level code (and the singletons their imports transitively pull in) does not evaluate during the cold launch of an unauthenticated user. To avoid a perceptible Suspense flash for *returning* (authenticated) users, the TabNavigator chunk is pre-warmed once after first paint.

Web continues to use direct imports because Metro's web bundler historically chokes on dynamic `import()` in this codebase per the existing comment.

### Exact change set

**File:** `src/navigation/RootNavigator.tsx`

1. **At the top of the file**, replace the existing direct imports of TabNavigator and OnboardingNavigator with platform-conditional dynamic loaders. AuthNavigator stays direct-imported (it is always evaluated on launch and we want zero Suspense risk on the unauth path).

   ```ts
   import React, { useEffect, useRef, Suspense, lazy } from 'react';
   import { Platform } from 'react-native';
   // ... existing imports ...
   import { AuthNavigator } from './AuthNavigator';
   import { LoadingScreen } from '../screens/common/LoadingScreen';

   // ── Native: lazy-load TabNavigator + OnboardingNavigator so their
   //    top-level module code (and singleton imports) does not run on
   //    the cold launch of an unauthenticated user. Web continues using
   //    direct imports because Metro's web bundler is unreliable with
   //    dynamic import() in this codebase.
   const TabNavigator =
     Platform.OS === 'web'
       ? require('./TabNavigator').TabNavigator
       : lazy(() =>
           import('./TabNavigator').then(m => ({ default: m.TabNavigator }))
         );

   const OnboardingNavigator =
     Platform.OS === 'web'
       ? require('./OnboardingNavigator').default
       : lazy(() => import('./OnboardingNavigator'));
   ```

2. **Pre-warm TabNavigator after first paint** so authenticated cold launches do not see a Suspense flash. Add inside the `RootNavigator` function, near the existing effects:

   ```ts
   useEffect(() => {
     if (Platform.OS === 'web') return;
     // Fire-and-forget — warms the TabNavigator chunk while the user is
     // still looking at the LoadingScreen / AuthNavigator. Failures are
     // benign (the lazy() wrapper will retry on actual render).
     const id = setTimeout(() => {
       import('./TabNavigator').catch(() => {});
     }, 0);
     return () => clearTimeout(id);
   }, []);
   ```

   `setTimeout(..., 0)` defers the import to the next event-loop tick so it does not block the current render. Do not raise the delay; we want the chunk warm by the time RootNavigator's gate flips to the Main branch.

3. **Wrap the gated render in a `<Suspense>` boundary**. Replace the existing `<Stack.Navigator>` body so the lazy components have a fallback:

   ```tsx
   return (
     <View style={styles.container}>
       <OfflineIndicator />
       <Suspense fallback={<LoadingScreen />}>
         <Stack.Navigator
           screenOptions={{
             headerShown: false,
             animation: 'fade',
           }}
         >
           {!user ? (
             <Stack.Screen name="Auth">
               {props => (
                 <AuthNavigator
                   {...props}
                   onAuthSuccess={() => {
                     // Navigation happens automatically via auth state.
                   }}
                 />
               )}
             </Stack.Screen>
           ) : !user.onboardingComplete ? (
             <Stack.Screen
               name="Onboarding"
               component={OnboardingNavigator as any}
             />
           ) : (
             <Stack.Screen name="Main" options={{ headerBackTitle: 'Home' }}>
               {props => <TabNavigatorWithInviteRedirect {...props} />}
             </Stack.Screen>
           )}
         </Stack.Navigator>
       </Suspense>
     </View>
   );
   ```

   Note the `as any` cast on `OnboardingNavigator` is because `lazy()` returns a `LazyExoticComponent` and `Stack.Screen`'s `component` prop's generic type does not infer through `lazy`. This is the standard react-navigation + React.lazy interop pattern.

### Edge cases to verify

- Unauthenticated cold launch on native → TabNavigator module is **not** evaluated until pre-warm fires (and even then, only the import; React render still gated on `user`). ✅
- Authenticated cold launch on native → TabNavigator chunk is pre-warmed; Suspense fallback may flash for one frame at most. ✅
- Onboarding flow (rare; new sign-up) → OnboardingNavigator lazy-loads; Suspense shows LoadingScreen briefly. ✅
- Web build → direct imports preserved; no Suspense involvement. ✅
- TabNavigator import fails (chunked-bundle failure on hardware — possible on some EAS configurations) → React.lazy will retry on next render; LoadingScreen stays visible. Document this in the PR description and confirm during manual testing. ⚠
- Deep link arriving during pre-warm → existing `Linking.getInitialURL()` handler is unaffected (it runs in a `useEffect`, not at module-eval time). ✅

### Do not change

- `AuthNavigator` — leave it direct-imported.
- The `useAuthSync` or `useNetworkState` hooks.
- The `linking` config in `App.tsx`.
- The `TabNavigatorWithInviteRedirect` wrapper.

---

## Phase 4 — Fix #4: Consolidate and shorten font loading

### Goal

`App.tsx` stops duplicating the font-load logic. The canonical `useFonts()` hook becomes the single source of truth. The timeout drops from 5 seconds (in App.tsx) and 3 seconds (in the hook) to **1500 ms**, which is fast enough that a user on a slow network sees system-font fallbacks instead of a stalled splash.

### Exact change set

**File:** `src/hooks/useFonts.ts`

1. **Lower the timeout constant**:

   ```ts
   const FONT_TIMEOUT_MS = 1500;
   ```

2. **Update the warn message** to match the new ceiling:

   ```ts
   console.warn(
     'Font loading timed out after 1.5s — proceeding with system fonts'
   );
   ```

3. Leave everything else in this file alone. The hook is already correct: it resolves once, hides splash, exposes `{ fontsLoaded, error }`.

**File:** `App.tsx`

4. **Delete the entire `prepare()` font-load effect** (currently lines 37–67 inside the `App` function), including the duplicate `Font.loadAsync` block and the duplicate `setTimeout` race.

5. **Delete the `ready` state and conditional render**. The previous pattern (`if (!ready) return null;`) is replaced by rendering immediately and letting React re-render text once fonts resolve.

6. **Use the canonical hook**. Replace the body of `App` so it looks like:

   ```tsx
   export default function App() {
     useFonts();

     return (
       <SafeAreaProvider>
         <ThemeProvider>
           <ErrorBoundary>
             <ReduxProvider>
               <NotificationProvider>
                 <GestureHandlerRootView style={styles.root}>
                   <AppNavigation />
                   <StatusBar style="auto" />
                 </GestureHandlerRootView>
               </NotificationProvider>
             </ReduxProvider>
           </ErrorBoundary>
         </ThemeProvider>
       </SafeAreaProvider>
     );
   }
   ```

   Add the import at the top:

   ```ts
   import { useFonts } from './src/hooks/useFonts';
   ```

   Remove now-unused imports: `useEffect`, `useState`, `* as Font from 'expo-font'`, and `* as SplashScreen from 'expo-splash-screen'` (the hook owns SplashScreen.hideAsync now). Keep `SplashScreen.preventAutoHideAsync()` at the top of the file outside the component — it must still run.

7. The seven font weights wired in `useFonts.ts` match the seven referenced by the typography tokens (`src/theme/tokens.ts` line 412 + neighbors). Do **not** drop any weights. They are all used (audit:`Fraunces_700Bold`, `_700Bold_Italic` (used by LoginScreen tagline), `_900Black`, `Nunito_400/500/600/700`).

### Edge cases to verify

- Cold launch with cached font assets → `Font.loadAsync` resolves in < 100 ms; splash hides immediately. ✅
- Cold launch on a fresh install with a slow network → timeout fires at 1500 ms; splash hides; text renders with system fonts; once `Font.loadAsync` eventually resolves, new renders use the loaded fonts. **Caveat:** components already mounted *before* fonts arrived will keep showing system fonts until they re-render. For the LoginScreen this is acceptable — the brand-mark fallback (system serif/sans for "Muster" + "the Troops.") is unflattering for ~1–2s but the screen is interactive. Document this trade-off in the PR description; we accept it as the better-than-5s-stall option.
- Web build → `SplashScreen.hideAsync()` no-ops via the existing Platform guard in the hook. ✅
- Font load throws → `error` is set in the hook; we currently do nothing with it. That is acceptable for this PR — text falls back to system fonts. Do not add UI for this; it is too rare to merit it.

### Do not change

- The font asset list. Do not drop weights. Do not add weights.
- `src/theme/typography.ts` or `src/theme/tokens.ts`.
- The `expo-splash-screen` plugin in `app.json`.

---

## Phase 5 — Tests (required, no shortcuts)

Add tests under `tests/`. Use existing `jest-expo` preset and `@testing-library/react-native` patterns. If any directories don't exist, create them.

### 5a. `tests/screens/auth/LoginScreen.noAlert.test.tsx`

Required cases:

1. Successful email/password login → `Alert.alert` is **never** called. Mock `Alert` and assert `Alert.alert` call count is 0 after a successful dispatch.
2. Successful SSO login (Apple) → `Alert.alert` is never called.
3. Successful SSO login (Google) → `Alert.alert` is never called.
4. `Haptics.notificationAsync` is called with `Haptics.NotificationFeedbackType.Success` exactly once on successful sign-in.
5. Failed login → `errors.general` is set; `Haptics` is not invoked; `Alert` is not invoked.
6. Snapshot test of the rendered LoginScreen — confirms the form structure didn't drift.

### 5b. `tests/screens/home/HomeScreen.skeleton.test.tsx`

Required cases:

1. With `authLoading=false, bootLoading=false, bookingsLoading=true`, the home tab renders the page chrome (Calendar present in the tree) AND `BookingsRowSkeleton` AND/OR `InboxSectionSkeleton` — assert by `testID`.
2. With `bookingsLoading=true` and `bookingsError != null`, an inline error banner renders above the bookings section. The Calendar still renders.
3. With `authLoading=true`, the full-page `<LoadingSpinner />` renders (skeleton not shown). Confirms we preserved the auth-loading gate.
4. With `bookingsLoading=false` and bookings populated, no skeleton renders.

### 5c. `tests/navigation/RootNavigator.lazy.test.tsx`

Required cases:

1. On native (`Platform.OS = 'ios'`), `TabNavigator` is a `LazyExoticComponent` (assert via `(TabNavigator as any).$$typeof === Symbol.for('react.lazy')`).
2. On web (`Platform.OS = 'web'`), `TabNavigator` is a regular component (not lazy).
3. When `user` is null, rendering RootNavigator does **not** trigger an import of `./TabNavigator` (use `jest.spyOn` on a module mock).
4. The pre-warm effect calls `import('./TabNavigator')` exactly once on native. Use a spy on a module proxy.
5. Suspense fallback (`LoadingScreen`) renders briefly during the TabNavigator lazy resolution (use `act()` + flush microtasks).

### 5d. `tests/hooks/useFonts.timeout.test.ts`

Required cases:

1. When `Font.loadAsync` resolves immediately, `fontsLoaded` flips to true and `SplashScreen.hideAsync` is called.
2. When `Font.loadAsync` hangs, after 1500 ms `fontsLoaded` flips to true and `SplashScreen.hideAsync` is called. Confirm by advancing fake timers by 1499 ms (still loading), then by 1 ms (loaded).
3. When `Font.loadAsync` throws, `error` state is set and `SplashScreen.hideAsync` still fires (safety net).
4. The hook calls `Font.loadAsync` exactly once per mount.

### 5e. Manual integration tests (real hardware before submission)

Do all of these. Document each result in the PR description.

1. **Sign in with email/password** → no alert; haptic fires; lands on Home with skeleton (if no cache) or real data (if cache).
2. **Sign in with Apple** → no alert; haptic fires; lands on Home.
3. **Sign in with Google** → no alert; haptic fires; lands on Home.
4. **Sign in over a slow network (use Network Link Conditioner: "Edge" preset)** → splash hides within ~1.5s; LoginScreen renders with system fonts initially; user is able to sign in before fonts finish loading. Confirm no stall.
5. **Cold launch unauthenticated on physical iPhone** → measure time-to-LoginScreen with the React Native Performance Monitor (`Cmd+Ctrl+Z` → Show Perf Monitor). Record before/after.
6. **Cold launch authenticated** → measure time-to-Home (with cached bookings). Suspense fallback should be imperceptible — if it visibly flashes, the pre-warm timer is too late; tune it down.
7. **Onboarding flow** → fresh sign-up; OnboardingNavigator lazy-loads; Suspense LoadingScreen shows briefly. Confirm no broken transitions.
8. **Bookings request times out** (use Charles Proxy or NLC's "100% Loss") → inline error banner in HomeScreen; rest of the screen (Calendar, MyCrew, leagues) still works. Confirm pull-to-refresh recovers when network restored.
9. **App Store reviewer pass on iPad Air (M3) running iPadOS 26.4.x in iPhone compatibility mode** — cold-launch + sign-in + reach Home + sign-out + sign-in. No spinner gap on Home. No alert.
10. **Sentry dashboard** — confirm zero new error events during the manual test pass. The Tier 1 global handler should be quiet.

---

## Phase 6 — Before/after verification

Capture and attach to the PR:

- **Cold-launch time-to-Auth** on a fresh install, slow-network simulation, on real hardware. Before vs. after.
- **Cold-launch time-to-Home** for an authenticated user. Before vs. after.
- **Sign-in tap → home first paint** time. Before vs. after. (This should be the most dramatic delta — the alert was ~1–2 seconds of forced friction.)
- **Bundle eval delta**: in dev mode, take a Hermes profiling capture of cold launch before and after. Look at the time spent in the `TabNavigator` and `OnboardingNavigator` modules — should be effectively zero on the after-trace for unauthenticated launches.
- **Screen recording** of a fresh sign-up → sign-in → Home flow on the new build. The "feels faster" outcome is qualitative — the recording is how we communicate it.
- **EAS production build** of the resulting bundle, run on hardware.

---

## Phase 7 — Commit, push, rollback

Commit message (single commit):

```
perf(boot+auth): skeleton home, lazy navigators, faster font load, no success alert

- LoginScreen no longer interrupts a successful sign-in with Alert.alert.
  Haptic success cue retained; navigation flows via auth state.
- HomeScreen renders page chrome + section skeletons immediately on cold
  sign-in instead of a full-page spinner gate on bookingsLoading.
- RootNavigator lazy-loads TabNavigator and OnboardingNavigator on native
  (web stays direct-import). TabNavigator chunk is pre-warmed after first
  paint to avoid Suspense flash for authenticated users.
- App.tsx stops duplicating font load logic; canonical useFonts() hook is
  used with a 1.5s timeout (down from 5s in App.tsx / 3s in the hook).

Tests: tests/screens/auth/LoginScreen.noAlert.test.tsx,
       tests/screens/home/HomeScreen.skeleton.test.tsx,
       tests/navigation/RootNavigator.lazy.test.tsx,
       tests/hooks/useFonts.timeout.test.ts
```

Then in PowerShell from `C:\Projects\AllRoads`:

```powershell
git add .
git commit -m "perf(boot+auth): skeleton home, lazy navigators, faster font load, no success alert"
git pull origin charles-dev --rebase
git push origin charles-dev
```

### Rollback notes

These four changes share a commit because their before/after measurement only makes sense as a set, but they are independently revertable in code:

- **Alert removal:** safe to keep even if everything else reverts. Lowest-risk change.
- **HomeScreen skeleton:** if reverted alone, the spinner returns; nothing else regresses.
- **Lazy navigators:** if Suspense flash on authenticated cold-launch is unacceptable on customer feedback, revert this one alone and keep the rest.
- **Font timeout:** if 1.5s causes visible system-font flashing that customers complain about, raise the constant in `useFonts.ts` (do not revert to App.tsx duplication).

If a partial revert is needed, do it as a separate PR with its own measurement — do not undo a single piece silently within this PR.

---

## What "done" looks like

- All Phase 0 diagnostic output is in the PR description.
- All four code changes are in place, exactly as specified.
- All four test files added and passing locally (`npm test`).
- All ten manual integration tests documented with pass/fail in the PR description.
- Before/after measurements attached.
- A screen recording of the new sign-in → Home flow attached.
- A successful EAS production build (`eas build --platform ios --profile production`) installed and exercised on physical iPhone hardware.
- No regressions in: cold launch (auth and authed paths), sign-in (email/pw, Apple, Google), sign-out, onboarding flow, deep-link invite capture, pull-to-refresh on Home, error states (auth + bookings).
- Sentry stays quiet during the manual test pass.

If any of those items is incomplete, the PR is not ready to merge. No exceptions.
