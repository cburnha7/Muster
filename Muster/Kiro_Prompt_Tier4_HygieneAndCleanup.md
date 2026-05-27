# Kiro Prompt — Tier 4 hygiene + cleanup (Muster 1.0.73 line)

## Read this first — context, scope, and standard

These are the smaller cleanup items that aren't a crash risk and aren't a perceptible speed win, but each removes drift, dead weight, or future confusion. Same bar as the previous three PRs: no shortcuts, real-hardware verification on anything user-facing, no scope drift. Several of the items intentionally avoid the risky-but-tempting move (e.g. renaming route names to match brand vocabulary) — they are flagged out-of-scope below.

If anything below conflicts with what you observe in the code, stop and surface it — do not "fix it your way."

**Working branch:** `charles-dev`. Confirm with `git rev-parse --abbrev-ref HEAD` in PowerShell before any edits.

**Prerequisites:**
- Tier 1, Tier 2, and Tier 3 PRs all merged. If any is unmerged, stop and surface that.

**The five changes in this PR:**

1. **Kill the dark-mode code path.** Memory rule: the app is intentionally light-only. Reality drifted: `app.json` line 8 has `"userInterfaceStyle": "automatic"`, `App.tsx` selects `MusterDarkTheme` vs. `MusterLightTheme`, `ThemeContext.tsx` uses `useColorScheme()` and a persisted `@muster_dark_mode` AsyncStorage flag, and there's a user-facing toggle in `SettingsScreen.tsx` (line 898).
2. **Lazy-require `expo-apple-authentication` in SSOService.** Originally bundled into the deleted Tier 3 Phase 3; it has nothing to do with the Google proxy issue and is still worth doing on its own. Currently `require('expo-apple-authentication')` runs at SSOService module-eval time, which means whenever anything imports SSOService (the LoginScreen alone is enough), the native Apple Auth module is initialized — even for users signing in with email.
3. **Delete dead code.** Three discrete items: the `loadCachedUser` thunk in `authSlice.ts` (uncalled), `src/hooks/useHomeData.ts` (no longer imported by HomeScreen since commit `cbf43e2`), and the duplicate `src/services/auth/AuthService.ts` (414 lines, used only by `useAvailabilityCheck.ts` and `AvailabilityCalendarScreen.tsx` — those two get migrated to the canonical `services/api/AuthService` first).
4. **Brand drift cleanup — colors and HTTPS linking prefix only.** Splash background, web `themeColor`, and adaptive icon all use `#0052FF` instead of the documented cobalt `#2040E0`. `App.tsx`'s linking prefixes include `'https://muster.app'`, which does not match the live domains (`playmuster.com` / `muster-ecru.vercel.app`). **NOT in scope:** renaming the `Teams` route to `Rosters` or the `JoinTeam` screen — those route-name changes invalidate any existing emailed invite link in the wild, and the right way to do that is a separate brand-migration PR with a deprecation alias.
5. **`react-native-worklets` + `react-native-worklets-core` co-installation audit.** Both are in `package.json`. `react-native-worklets-core` is not directly imported anywhere in `src/`. Decision: is it pulled in transitively, or is it leftover from a removed dependency that can be deleted. The audit is required; the deletion is conditional on the audit.

**One additional cosmetic-only item that is up to you to include or skip:**

6. **`app.json` version field cleanup.** Per memory's `eas_version_source.md`: `eas.json` has `appVersionSource: "remote"`, so the `version: "1.2.0"` in `app.json` is dead text — EAS reads the marketing version from remote config, not from this file. Updating it to `"1.0.0"` to match `package.json` (or to whatever the current EAS marketing version is) is purely cosmetic. Include or skip per your call; this prompt assumes "include" but Phase 6 is trivial enough to drop if you'd rather not touch `app.json`.

---

## Phase 0 — Diagnostic pass (DO THIS BEFORE ANY EDITS)

Run all of the following in PowerShell from `C:\Projects\AllRoads`. Paste output into the PR description.

```powershell
git status
git rev-parse --abbrev-ref HEAD
git log --oneline -20

# Confirm Tier 1-3 commits landed
git log --oneline --grep="fix\(boot\)" -i | Select-Object -First 5
git log --oneline --grep="perf\(boot\+auth\)" -i | Select-Object -First 5
git log --oneline --grep="refactor\(boot\+auth\)" -i | Select-Object -First 5

# Dark-mode surface
Select-String -Path "src\**\*.ts","src\**\*.tsx","App.tsx","app.json" -Pattern "useColorScheme|MusterDarkTheme|darkColors|isDark|setDarkMode|userInterfaceStyle|@muster_dark_mode" -SimpleMatch

# Apple lazy-require — confirm it's still loaded at module scope in SSOService
Select-String -Path "src\services\auth\SSOService.ts" -Pattern "require\('expo-apple-authentication'\)|AppleAuthentication"

# Dead-code grep sweep
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "loadCachedUser" -SimpleMatch
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "useHomeData" -SimpleMatch
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "from\s+['\""].*services/auth/AuthService" -SimpleMatch

# Brand drift surface
Select-String -Path "app.json" -Pattern "#0052FF"
Select-String -Path "App.tsx" -Pattern "muster\.app|muster://" -SimpleMatch

# Worklets — find the real source of react-native-worklets-core
npm ls react-native-worklets-core
npm ls react-native-worklets
```

Read these files end-to-end:

- `src/theme/ThemeContext.tsx` (full file — 106 lines)
- `App.tsx` (specifically the linking config block + the AppNavigation function)
- `src/navigation/themes.ts` (so you know whether `MusterDarkTheme` lives there)
- `src/screens/profile/SettingsScreen.tsx` lines 870–910 (the dark-mode toggle UI)
- `src/services/auth/SSOService.ts` (full file)
- `src/services/auth/AuthService.ts` (the duplicate — full file — confirm what its 2 callers actually use)
- `src/hooks/useAvailabilityCheck.ts`
- `src/screens/profile/AvailabilityCalendarScreen.tsx` — focus on the lines that consume `authService`
- `src/services/api/AuthService.ts` — verify the canonical service exposes whatever the 2 above need
- `src/hooks/useHomeData.ts` (the dead file — confirm zero callers)
- `src/store/slices/authSlice.ts` — the `loadCachedUser` thunk lines (267–284) and the three reducer cases (569–585)
- `app.json` (the splash, web themeColor, adaptive icon background fields)

If `npm ls react-native-worklets-core` shows a transitive parent (e.g. `react-native-vision-camera` or similar), it stays — note the parent in the PR description. If it shows it as a top-level dep with no peer-dep parents, it's a candidate for removal in Phase 5.

---

## Phase 1 — Kill the dark-mode code path

### Goal

The app renders in light mode on all devices regardless of system setting. No `useColorScheme()`. No `MusterDarkTheme`. No AsyncStorage read for a user preference. The `setDarkMode` Context value is preserved as a no-op so existing call sites in `SettingsScreen` don't crash — the UI toggle that calls it should be removed in the same PR.

### Exact change set

**File:** `app.json`

1. Change line 8 from `"userInterfaceStyle": "automatic"` to `"userInterfaceStyle": "light"`. iOS will no longer give the app dark traits when the device is in dark mode.

**File:** `src/theme/ThemeContext.tsx`

2. Replace the entire provider body so `isDark` is always `false` and no dark-related work runs at mount. Final file looks like:

   ```tsx
   import React, { createContext, useContext, useMemo, useCallback } from 'react';
   import {
     lightColors,
     SemanticColors,
     tokenStatus,
     tokenSport,
     tokenSpacing,
     tokenRadius,
     tokenFontFamily,
     makeShadows,
     getAvatarColor,
   } from './tokens';
   import { typeScale, TypeKey } from './typography';

   // Light mode only. The dark-mode code path was removed in Tier 4 hygiene.
   // setDarkMode is retained as a no-op so any lingering caller does not crash;
   // remove this field once all callers are gone.

   export interface Theme {
     isDark: false;
     colors: SemanticColors;
     status: typeof tokenStatus;
     sport: typeof tokenSport;
     type: typeof typeScale;
     spacing: typeof tokenSpacing;
     radius: typeof tokenRadius;
     shadow: ReturnType<typeof makeShadows>;
     fonts: typeof tokenFontFamily;
     getAvatarColor: typeof getAvatarColor;
     /** No-op. Retained for backward compatibility — app is light-only. */
     setDarkMode: (dark: boolean) => void;
   }

   const ThemeContext = createContext<Theme | null>(null);

   export function ThemeProvider({ children }: { children: React.ReactNode }) {
     const setDarkMode = useCallback((_dark: boolean) => {
       // No-op. App is light-only.
     }, []);

     const theme = useMemo<Theme>(
       () => ({
         isDark: false as const,
         colors: lightColors,
         status: tokenStatus,
         sport: tokenSport,
         type: typeScale,
         spacing: tokenSpacing,
         radius: tokenRadius,
         shadow: makeShadows(false),
         fonts: tokenFontFamily,
         getAvatarColor,
         setDarkMode,
       }),
       [setDarkMode]
     );

     return (
       <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
     );
   }

   export function useTheme(): Theme {
     const ctx = useContext(ThemeContext);
     if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
     return ctx;
   }

   /** Shorthand: merge a type style with a color */
   export function t(theme: Theme, key: TypeKey, color?: string) {
     return { ...theme.type[key], color: color ?? theme.colors.textPrimary };
   }
   ```

3. The `@muster_dark_mode` AsyncStorage key written by previous builds is now ignored. **Do not clean it up.** Leaving stale keys behind is safer than reading + deleting on cold launch, which would mean an AsyncStorage write on every cold launch for the small subset of users who ever toggled the preference.

**File:** `App.tsx`

4. Replace the `AppNavigation` inner component so it no longer reads `isDark`:

   ```tsx
   /** Inner component that consumes the theme. Light-only by design. */
   function AppNavigation() {
     return (
       <NavigationContainer
         linking={linking as any}
         theme={MusterLightTheme}
       >
         <RootNavigator />
       </NavigationContainer>
     );
   }
   ```

5. Remove the now-unused `MusterDarkTheme` import from the file.

**File:** `src/navigation/themes.ts`

6. Delete the `MusterDarkTheme` export. `MusterLightTheme` stays. Confirm no other file imports `MusterDarkTheme` before deleting — Phase 0 grep covers this.

**File:** `src/theme/tokens.ts`

7. **Do not delete `darkColors`.** It is exported from a tokens file and removing it would be a broader refactor (the export shape would change). It is dead at runtime; deletion is out of scope. Leave it.

**File:** `src/screens/profile/SettingsScreen.tsx`

8. Read lines 870–910 (the dark-mode toggle row). Remove the entire row — its Switch, its label, and any surrounding section header that becomes orphaned. The `useTheme()` destructure on line 879 currently pulls `isDark` and `setDarkMode`; remove both names from the destructure if they're no longer used elsewhere in the file.

### Edge cases to verify

- Device set to dark mode → app renders in light. ✅
- Existing user with `@muster_dark_mode: 'true'` in AsyncStorage → key is ignored; app renders in light. ✅
- Existing UI that called `useTheme().isDark` and conditionally branched → `isDark` is now the literal `false`, so dead branches are dead but not broken. ✅
- Any caller that still calls `setDarkMode(true)` → no-op; no error. ✅

### Do not change

- `lightColors` / `darkColors` shape in `tokens.ts`.
- The `makeShadows` signature (still takes a boolean; we always pass `false`).
- The `Theme` interface beyond what's spelled out above.

---

## Phase 2 — Lazy-require `expo-apple-authentication`

### Goal

`expo-apple-authentication` is required only when Apple sign-in is invoked. Importing `SSOService` no longer pulls the Apple Auth native module into memory at module-eval time.

### Exact change set

**File:** `src/services/auth/SSOService.ts`

1. **Delete** the module-scope require block (current lines 19–26):

   ```ts
   // DELETE THIS:
   let AppleAuthentication: any = null;
   if (Platform.OS === 'ios') {
     try {
       AppleAuthentication = require('expo-apple-authentication');
     } catch {
       console.warn('expo-apple-authentication not available');
     }
   }
   ```

2. **Replace `isAppleSignInAvailable`** with a lazy version:

   ```ts
   async isAppleSignInAvailable(): Promise<boolean> {
     if (Platform.OS !== 'ios') return false;
     try {
       const AppleAuthentication = require('expo-apple-authentication');
       return await AppleAuthentication.isAvailableAsync();
     } catch {
       return false;
     }
   }
   ```

3. **Update `signInWithApple`** so it requires the module just-in-time and short-circuits on non-iOS:

   ```ts
   async signInWithApple(): Promise<SSOUserData> {
     if (Platform.OS !== 'ios') {
       throw new Error('Apple Sign In is iOS-only');
     }
     let AppleAuthentication: any;
     try {
       AppleAuthentication = require('expo-apple-authentication');
     } catch {
       throw new Error('Apple Sign In not available');
     }

     try {
       const credential = await AppleAuthentication.signInAsync({
         requestedScopes: [
           AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
           AppleAuthentication.AppleAuthenticationScope.EMAIL,
         ],
       });

       // ... rest of existing body unchanged (providerId, providerToken,
       // email, firstName, lastName extraction and return) ...
     } catch (error: any) {
       if (error.code === 'ERR_CANCELED') throw new Error('User cancelled');
       throw error;
     }
   }
   ```

   **Do not change** the existing extraction logic (providerId, providerToken, email, firstName, lastName) — only the require placement.

### Edge cases to verify

- Cold launch on iOS, user doesn't tap Apple → `expo-apple-authentication` is never required. ✅
- User taps Apple → `require` resolves on first call; Node module cache holds the reference for subsequent calls. ✅
- `expo-apple-authentication` native module fails to load (corrupted install, very rare) → `require` throws → caught → graceful error to user. ✅
- Non-iOS platform → `signInWithApple` rejects with a clear message before touching the require. ✅
- `isAppleSignInAvailable` on non-iOS → returns `false` without touching the require. ✅

### Do not change

- The `SSOUserData` return shape.
- `LoginScreen.handleSSOLogin` — it consumes `SSOUserData` and doesn't care how we got there.

---

## Phase 3 — Delete dead code

Three discrete deletions. Do them in order; verify each with the diagnostic greps before moving to the next.

### 3a. Migrate the two callers of the duplicate AuthService, then delete it

**Files to read first:** `src/hooks/useAvailabilityCheck.ts`, `src/screens/profile/AvailabilityCalendarScreen.tsx`. Note which methods on the duplicate `authService` they use.

For each used method:

1. Confirm the canonical `services/api/AuthService` exposes an equivalent. If it does not, the migration is not trivial — **stop and surface that finding**; do not improvise an equivalent.
2. If it does, update the import in the consumer file from:
   ```ts
   import { authService } from '../services/auth/AuthService';
   // or
   import { authService } from '../../services/auth/AuthService';
   ```
   to:
   ```ts
   import { authService } from '../services/api/AuthService';
   // or
   import { authService } from '../../services/api/AuthService';
   ```

3. Re-grep to verify zero remaining imports of `services/auth/AuthService`:
   ```powershell
   Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "from\s+['\""].*services/auth/AuthService" -SimpleMatch
   ```
4. Once zero, **delete `src/services/auth/AuthService.ts`**. Also delete it from `src/services/auth/index.ts` if exported there.

### 3b. Delete the `loadCachedUser` thunk

**File:** `src/store/slices/authSlice.ts`

1. Delete the thunk declaration (currently lines 267–284):

   ```ts
   // DELETE:
   export const loadCachedUser = createAsyncThunk(
     'auth/loadCachedUser',
     async (_, { rejectWithValue }) => {
       try {
         const user = await authService.getStoredUser();
         const accessToken = await authService.getStoredToken();
         const refreshToken = await TokenStorage.getRefreshToken();
         if (user && accessToken) {
           return { user, accessToken, refreshToken };
         }
         return null;
       } catch (error: any) {
         return rejectWithValue(error.message || 'Failed to load cached user');
       }
     }
   );
   ```

2. Delete the three reducer cases (currently around lines 569–585):

   ```ts
   // DELETE all three:
   builder
     .addCase(loadCachedUser.pending, ...)
     .addCase(loadCachedUser.fulfilled, ...)
     .addCase(loadCachedUser.rejected, ...);
   ```

3. Re-grep to confirm:
   ```powershell
   Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "loadCachedUser" -SimpleMatch
   ```
   Expected: zero matches. If anything remains, **stop and surface it.**

### 3c. Delete `src/hooks/useHomeData.ts`

**File:** `src/hooks/useHomeData.ts`

1. Re-grep first to confirm zero callers (`useHomeData` should appear only in its own file):
   ```powershell
   Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "useHomeData" -SimpleMatch
   ```
2. If zero external callers, **delete the file**.
3. Check `src/hooks/index.ts` — remove the `useHomeData` re-export if present.

### Edge cases to verify

- After 3a: AvailabilityCalendar screen still functions on hardware (sign in, navigate to it, exercise its features). ✅
- After 3b: auth slice still compiles; cold-launch and login still work end-to-end. ✅
- After 3c: HomeScreen still mounts cleanly. ✅
- TypeScript strict check passes (`npm run type-check`). ✅

### Do not change

- The canonical `services/api/AuthService`.
- Any other slice in the store.

---

## Phase 4 — Brand drift cleanup (colors + linking prefix)

### Goal

Splash background, web themeColor, and adaptive icon background match the documented cobalt (`#2040E0`). App.tsx's linking prefix list is purged of the `muster.app` domain that does not exist; the production HTTPS domain is added in its place.

### Background you'll need

- Per memory: `colors.cobalt` is `#2040E0` (primary CTA / user-facing onboarding).
- Per memory: production domains are `playmuster.com` and `muster-ecru.vercel.app`. The custom scheme `muster://` (registered in `app.json` line 82) is correct and stays.
- The `support@muster.app` mailto and `media.muster.app` image hosts seen in grep output are **not** in scope here. Email/image domains are infrastructure concerns; messing with them risks breakage we can't predict from static analysis. Flag in PR description; do not touch.

### Exact change set

**File:** `app.json`

1. Change splash `backgroundColor` from `"#0052FF"` to `"#2040E0"` (line 13).
2. Change web `themeColor` from `"#0052FF"` to `"#2040E0"` (line 58).
3. Change android adaptiveIcon `backgroundColor` from `"#0052FF"` to `"#2040E0"` (line 41).
4. Leave the expo-notifications plugin's `color: "#0052FF"` (line 68) **unchanged** — that's the notification accent color and changing it could surprise users who recognize the existing notification chrome. Out of scope; flag in PR description.

**File:** `App.tsx`

5. Update the linking prefixes. Current:

   ```ts
   const linking = {
     prefixes: [Linking.createURL('/'), 'https://muster.app', 'muster://'],
     ...
   };
   ```

   Change to:

   ```ts
   const linking = {
     prefixes: [
       Linking.createURL('/'),
       'https://playmuster.com',
       'https://muster-ecru.vercel.app',
       'muster://',
     ],
     ...
   };
   ```

   Both production HTTPS hosts go in so universal links from email work whichever domain the backend used.

### Edge cases to verify

- Cold launch on iOS hardware → splash background is the cobalt color now, not the slightly-bluer `#0052FF`. ✅
- Universal link from a `playmuster.com` URL (e.g. an emailed invite) opens the app and routes to JoinTeam. ✅
- Old `muster.app` link arrives (very unlikely; that domain never resolved) → does nothing; user sees no breakage. ✅
- Web build splash color → matches the new theme. ✅
- Custom scheme `muster://join/CODE` still works. ✅

### Out of scope — flag in PR description but do not change

- Renaming the `Teams` route to `Rosters`. Any deep link `muster://join/CODE` that ends up routing through `Teams.JoinTeam` would break. Right answer is a separate brand-vocab-migration PR with route aliases.
- The `Notifications` plugin color, `support@muster.app` mailto, and `media.muster.app` image-host references. Email/image domain changes are out of static-analysis scope.
- The text `"Join Team"` as a screen title in `AuthNavigator.tsx` line 59 — also a brand-vocab issue. Change it only as part of the dedicated brand-migration PR.

---

## Phase 5 — `react-native-worklets-core` audit

### Goal

Decide whether `react-native-worklets-core` (currently `^1.6.3` in `package.json`) is reachable from any code path. If it isn't, mark it for removal in a follow-up; if it is, document the parent dependency.

This phase **does not change `package.json`** unless the audit conclusively shows the dep is unused. The audit is the deliverable; the deletion is conditional.

### Steps

1. Run:

   ```powershell
   npm ls react-native-worklets-core
   npm ls react-native-worklets
   ```

   `npm ls` shows the full tree of parents. Capture and paste into the PR description.

2. Confirm zero direct imports in `src/`:

   ```powershell
   Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "react-native-worklets-core" -SimpleMatch
   ```

3. Examine the output of `npm ls react-native-worklets-core`. Possible outcomes:

   - **(A)** Listed as a direct dep with no parent peer-dep relationships → unused; safe to remove. Add a Phase 6-style change: `npm uninstall react-native-worklets-core` and verify the build still produces.
   - **(B)** Listed with a parent like `react-native-vision-camera`, `@nozbe/watermelondb`, `react-native-skia`, etc. → kept; document parent in PR description.
   - **(C)** Listed as an extraneous dep (npm complains) → ambiguous; **stop and surface** rather than improvising.

4. If outcome (A) — and only if (A) — uninstall:

   ```powershell
   npm uninstall react-native-worklets-core
   ```

   Then run `npm test` and verify a clean build (`npx expo prebuild --no-install` is fine as a smoke check; full EAS build will catch any native side that complains).

5. If outcome (B) — note the parent. If outcome (C) — stop.

### Why this is gated

`react-native-worklets-core` and `react-native-worklets` historically conflict on some RN versions (both register native worklet runtimes). Memory notes co-installation as a potential TurboModule cold-launch hazard. The cheap signal is "neither is imported in src/" → we can probably drop one. But Reanimated 4 hard-depends on `react-native-worklets`, so we cannot drop *that* one. And `worklets-core` may be required by a transitive dep we don't see at the src/ layer. Hence the audit, not a unilateral delete.

---

## Phase 6 — `app.json` version field cosmetic (optional)

### Goal

Bring the `version` field in `app.json` into alignment with whatever marketing version you'd like the file to display. This has **no effect on the app**: per `eas.json`'s `appVersionSource: "remote"`, EAS reads the production marketing version from remote config, not from `app.json`. This phase is purely a hygiene cleanup so future Claude / Kiro / human readers don't get confused by the drift.

### Change

**File:** `app.json`

1. Change line 5 from `"version": "1.2.0"` to whatever marketing version you'd like displayed. Reasonable choices: `"1.0.73"` (matches the actual TestFlight build), or `"1.0.0"` (matches `package.json`). Do not pick a version higher than what's actually shipped — that creates confusion in the other direction.

If you'd rather skip this phase entirely, delete it from the commit; no behavior depends on it.

---

## Phase 7 — Tests (required where behavior changes)

Some of these changes are deletions (no test needed) or config-only (`app.json` does not have unit tests). For the others:

### 7a. `tests/theme/ThemeContext.lightOnly.test.tsx`

Required cases:

1. `useTheme().isDark` is the literal `false` regardless of mocked `useColorScheme()` return value.
2. Calling `setDarkMode(true)` does NOT change `isDark`; it remains `false`.
3. `useTheme().colors` is `lightColors`; never `darkColors`.
4. Mount → `useColorScheme` is not called (it has been removed from the file).
5. Mount → `AsyncStorage.getItem('@muster_dark_mode')` is not called (the read has been removed).

### 7b. `tests/services/auth/SSOService.appleLazy.test.ts`

Required cases:

1. Importing `SSOService` does not load `expo-apple-authentication`. Use a manual mock that records when `require('expo-apple-authentication')` is invoked; assert it is not called at module init.
2. First call to `isAppleSignInAvailable()` triggers the require.
3. Second call does not re-require (Node module cache handles this naturally).
4. On non-iOS, `isAppleSignInAvailable` returns `false` without calling the require.
5. On non-iOS, `signInWithApple` throws "Apple Sign In is iOS-only" without calling the require.

### 7c. `tests/screens/profile/AvailabilityCalendar.authImport.test.tsx`

Required cases:

1. The screen still mounts and runs its initial effect cleanly after the import migration.
2. Any method called on `authService` from the screen returns a value compatible with what the screen expects (mock the canonical service and assert call shape).

### 7d. Manual integration tests (real hardware before submission)

Do all of these. Document each result in the PR description.

1. **Device set to dark mode** → app still renders in light. No flashes of dark on cold launch.
2. **SettingsScreen** → dark-mode toggle row is gone. Other settings rows unaffected.
3. **Sign in with Apple on iOS hardware** → works; first SSO tap triggers the lazy require.
4. **Sign in with Google / email** → no regression.
5. **AvailabilityCalendar screen** → reachable from profile, loads, exercises its features (open the calendar, mark a day, save). No regressions from the AuthService import migration.
6. **HomeScreen** → mounts cleanly; no errors from the `useHomeData` deletion.
7. **Splash background** on cold launch → matches the new cobalt color, not the old `#0052FF`.
8. **Universal link from a `playmuster.com` URL** → opens the app, lands on the right screen.
9. **Custom scheme link `muster://join/<code>`** → still works.
10. **`react-native-worklets-core` audit result** → documented with `npm ls` output; if (A) and the dep was removed, EAS production build succeeds.
11. **Production build** via `eas build --platform ios --profile production` → installs and runs on hardware. No new crashes; no regressions.
12. **Sentry pass** → silent during the manual test pass.

---

## Phase 8 — Before/after verification

Attach to the PR:

- **`npm ls react-native-worklets-core` output** (this is the Phase 5 deliverable).
- **Screen recording** of cold launch on a device set to dark mode → app appears in light. (Captures the dark-mode kill.)
- **Splash background color comparison** before/after (two screenshots).
- **Universal link test result** for `playmuster.com` (paste a real test link, screenshot the app opening it).

---

## Phase 9 — Commit, push, rollback

Commit message (single commit):

```
chore(hygiene): kill dark mode, lazy Apple Auth, dead-code purge, brand drift, worklets audit

- Theme path is now light-only: app.json userInterfaceStyle: "light",
  ThemeContext returns isDark = false, MusterDarkTheme deleted from
  themes.ts, dark-mode toggle removed from SettingsScreen. setDarkMode
  retained as a no-op for backward compat. Stale @muster_dark_mode
  AsyncStorage keys left in place by design.
- SSOService: expo-apple-authentication is lazy-required (out of module
  scope). Cold-launch no longer initializes the Apple Auth native module
  unless the user actually taps Apple sign-in.
- Dead-code purge: deleted src/hooks/useHomeData.ts (unused since cbf43e2),
  deleted loadCachedUser thunk + 3 reducer cases from authSlice.ts,
  deleted duplicate src/services/auth/AuthService.ts (2 callers migrated
  to the canonical services/api/AuthService).
- Brand: splash, web themeColor, and android adaptive icon background
  updated from #0052FF to cobalt #2040E0. App.tsx linking prefixes:
  removed muster.app (does not resolve), added playmuster.com and
  muster-ecru.vercel.app. Custom scheme muster:// unchanged.
- react-native-worklets-core audit: documented with npm ls output in PR.
  [If removed:] dep removed because no direct or transitive consumer found.
- [If included:] app.json version field updated from 1.2.0 to <version>
  for cosmetic alignment; EAS-managed version on prod builds is unaffected.

Tests: tests/theme/ThemeContext.lightOnly.test.tsx,
       tests/services/auth/SSOService.appleLazy.test.ts,
       tests/screens/profile/AvailabilityCalendar.authImport.test.tsx
```

Then in PowerShell from `C:\Projects\AllRoads`:

```powershell
git add .
git commit -m "chore(hygiene): kill dark mode, lazy Apple Auth, dead-code purge, brand drift, worklets audit"
git pull origin charles-dev --rebase
git push origin charles-dev
```

### Rollback notes

These six changes are entirely independent. If any single one needs to be rolled back, do so as a separate revert PR. Specific notes:

- **Dark-mode kill:** if customer reports come in for users who actively wanted dark mode, the right answer is not to revert — it's to deprecate that feature properly with comms. The current intent (per memory) is light-only.
- **Apple lazy-require:** trivial to revert. If for any reason Apple sign-in starts failing on hardware, this is the first place to look.
- **Dead-code deletions:** the deleted files are recoverable from git history. The AvailabilityCalendar migration is the only one with runtime risk; if that screen breaks, revert by restoring the duplicate `services/auth/AuthService.ts` and the consumer's import path.
- **Brand colors:** trivially revertable.
- **Linking prefixes:** if `playmuster.com` universal links don't work after deploy, the cause is likely Apple App Site Association file missing on that domain — not this change. Revert is one-line if needed; the real fix is server-side.
- **Worklets removal (if performed):** revert via `npm install react-native-worklets-core@^1.6.3`. If anything in a native build broke after removal, restore immediately and document the transitive parent.
- **Version field:** revertable to any prior value; has zero behavior impact.

---

## What "done" looks like

- All Phase 0 diagnostic output is in the PR description.
- All change sets from Phases 1–4 are in place exactly as specified. Phase 5 audit output is documented (with deletion only if outcome A). Phase 6 is included or explicitly skipped.
- All three test files are added and passing locally (`npm test`).
- All twelve manual integration tests documented with pass/fail in the PR description.
- Before/after artifacts attached: `npm ls` output, dark-mode device screen recording, splash color screenshots, universal link test result.
- The out-of-scope flags (route name changes, email/image domain references, expo-notifications plugin color, `darkColors` token retention) are explicitly surfaced in the PR description.
- A successful EAS production build (`eas build --platform ios --profile production`) installed and exercised on physical iPhone hardware.
- No regressions in: cold launch (auth + authed paths), sign-in (email/pw, Apple, Google), sign-out, onboarding, deep-link invite capture, profile screens (AvailabilityCalendar especially), HomeScreen.
- Sentry stays quiet during the manual test pass.

If any of those items is incomplete, the PR is not ready to merge. No exceptions.
