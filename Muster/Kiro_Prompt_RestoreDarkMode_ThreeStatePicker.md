# Kiro Prompt — Restore dark mode + upgrade to three-state appearance picker

## Read this first — context, scope, and standard

The Tier 4 PR (`chore(hygiene): kill dark mode, lazy Apple Auth, dead-code purge, brand drift fix` — commit `e1ae50e`) included a Phase 1 that removed the dark-mode code path. That was a mistake — dark mode is a supported feature of Muster and should stay. This PR puts it back and, while we're in the file, upgrades the user preference from a binary "Dark Mode on/off" toggle to a three-state **System / Light / Dark** picker (the iOS-native pattern).

Same standard as the previous PRs: no shortcuts, real-hardware verification on both light and dark, no scope drift, surface anything ambiguous instead of guessing.

**Working branch:** `charles-dev`. Confirm with `git rev-parse --abbrev-ref HEAD` in PowerShell before any edits.

**Prerequisites:**
- The Tier 4 hygiene commit (`e1ae50e`) is in history. This PR explicitly reverses Phase 1 of that commit while preserving Phases 2–5 (Apple lazy-require, dead-code purge, brand drift fix, worklets audit).

**Why dark mode is being restored:**
Charles confirmed dark mode is fully supported and intended. The "light-only" rule that was cited in Tier 4 was stale. Going forward, treat dark mode as load-bearing — do not propose removing `useColorScheme()`, `MusterDarkTheme`, `darkColors`, or the appearance preference UI under any future cleanup pass.

**Why the picker upgrade (not just a straight revert):**
The previous implementation had a binary `setDarkMode(boolean)` API and a single `Switch` in Settings. Two problems with that:
1. There was no UI affordance for "follow the system" — once the user toggled the switch the first time, the app was stuck overriding the device's appearance forever.
2. The provider rendered immediately with the default theme, then re-rendered when the AsyncStorage preference resolved, so dark-mode users saw a brief flash of light on cold launch.

The three-state picker (`system` / `light` / `dark`) fixes (1), and gating the first render on the AsyncStorage read fixes (2). The legacy binary `setDarkMode` is preserved as a thin backward-compat shim so existing call sites don't break.

---

## Phase 0 — Diagnostic pass (DO THIS BEFORE ANY EDITS)

Run all of the following in PowerShell from `C:\Projects\AllRoads`. Paste output into the PR description.

```powershell
git status
git rev-parse --abbrev-ref HEAD
git log --oneline -10

# Confirm the Tier 4 commit landed and is in history
git log --oneline --grep="chore\(hygiene\)" -i | Select-Object -First 5

# Current state — these are the Phase-1 victims to restore
Select-String -Path "app.json" -Pattern "userInterfaceStyle"
Select-String -Path "src\navigation\themes.ts" -Pattern "MusterDarkTheme|MusterLightTheme"
Select-String -Path "App.tsx" -Pattern "MusterDarkTheme|MusterLightTheme|isDark|useTheme" -SimpleMatch
Select-String -Path "src\theme\ThemeContext.tsx" -Pattern "useColorScheme|setDarkMode|isDark|themeMode" -SimpleMatch
Select-String -Path "src\theme\index.ts" -Pattern "ThemeMode|ThemeProvider|useTheme"
Select-String -Path "src\screens\profile\SettingsScreen.tsx" -Pattern "Dark Mode|setDarkMode|isDark|themeMode|setThemeMode|ToggleRow" -SimpleMatch | Select-Object -First 20

# Inventory consumers of setDarkMode / isDark across the codebase so we know
# what the backward-compat shim has to cover
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "setDarkMode|isDark" -SimpleMatch
```

Read these files end-to-end:
- `src/theme/ThemeContext.tsx`
- `src/theme/index.ts`
- `src/theme/tokens.ts` — confirm `lightColors` and `darkColors` are both present with matching key shape.
- `src/navigation/themes.ts`
- `App.tsx`
- `src/screens/profile/SettingsScreen.tsx` — specifically the `PreferencesTab` function and surrounding `ToggleRow` usage.

**Stop-and-surface conditions:**
- If `darkColors` is missing from `tokens.ts`, stop. The Tier 4 prompt said not to delete it; if it was deleted anyway, that needs to be restored first as a separate concern.
- If any consumer of `isDark` or `setDarkMode` looks load-bearing in a way this prompt doesn't anticipate (e.g. complex theme branching in a layout that uses dark theme as a state signal, not a color signal), stop.

---

## Phase 1 — Restore `app.json` `userInterfaceStyle`

**File:** `app.json`

Change line 8 from `"userInterfaceStyle": "light"` to `"userInterfaceStyle": "automatic"`. This re-enables iOS giving the app dark traits when the device is in dark mode, so `useColorScheme()` once again returns the correct value.

No other change in this file.

---

## Phase 2 — Restore `MusterDarkTheme` in the navigation themes

**File:** `src/navigation/themes.ts`

Replace the current file content with:

```ts
import {
  DefaultTheme,
  DarkTheme,
  Theme as NavTheme,
} from '@react-navigation/native';
import { lightColors, darkColors, SemanticColors } from '../theme/tokens';

function buildNavTheme(
  base: typeof DefaultTheme,
  colors: SemanticColors
): NavTheme {
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.cobalt,
      background: colors.bgScreen,
      card: colors.header,
      text: colors.ink,
      border: colors.headerBorder,
      notification: colors.error,
    },
  };
}

export const MusterLightTheme = buildNavTheme(DefaultTheme, lightColors);
export const MusterDarkTheme = buildNavTheme(DarkTheme, darkColors);
```

Two additions vs. the current state: `DarkTheme` is imported from `@react-navigation/native`, `darkColors` is imported from `../theme/tokens`, and a `MusterDarkTheme` export is added.

---

## Phase 3 — Restore the dark-theme conditional in `App.tsx`

**File:** `App.tsx`

1. Import update — change the theme/navigation import lines so both themes and `useTheme` are available:

   ```tsx
   import { ThemeProvider, useTheme } from './src/theme';
   import { MusterLightTheme, MusterDarkTheme } from './src/navigation/themes';
   ```

2. Replace the current `AppNavigation` function with the theme-aware version:

   ```tsx
   /** Inner component — picks light vs dark navigation theme from ThemeContext */
   function AppNavigation() {
     const { isDark } = useTheme();
     return (
       <NavigationContainer
         linking={linking as any}
         theme={isDark ? MusterDarkTheme : MusterLightTheme}
       >
         <RootNavigator />
       </NavigationContainer>
     );
   }
   ```

Do not change anything else in this file (linking config, the `<App>` provider tree, `useFonts()` usage, `SplashScreen.preventAutoHideAsync()`, etc.).

---

## Phase 4 — Upgrade `ThemeContext` to three-state mode

This is the substantive change. New API: `themeMode: 'system' | 'light' | 'dark'` + `setThemeMode(mode)`. Backward-compat: `isDark: boolean` and `setDarkMode(boolean)` are preserved so every existing consumer keeps working without modification.

### Exact change set

**File:** `src/theme/ThemeContext.tsx`

Replace the entire file with:

```tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  lightColors,
  darkColors,
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

// Storage keys.
// THEME_MODE_KEY holds the new three-state preference: 'system' | 'light' | 'dark'.
// LEGACY_DARK_KEY is the old binary boolean — read once on first mount of this
// build, migrated to the new key, then ignored.
const THEME_MODE_KEY = '@muster_theme_mode';
const LEGACY_DARK_KEY = '@muster_dark_mode';

export type ThemeMode = 'system' | 'light' | 'dark';

// ─── Theme shape ─────────────────────────────────────────────

export interface Theme {
  /** True if the app is currently rendering in dark mode. */
  isDark: boolean;
  /** Raw user preference. 'system' follows OS; 'light'/'dark' override. */
  themeMode: ThemeMode;
  colors: SemanticColors;
  status: typeof tokenStatus;
  sport: typeof tokenSport;
  type: typeof typeScale;
  spacing: typeof tokenSpacing;
  radius: typeof tokenRadius;
  shadow: ReturnType<typeof makeShadows>;
  fonts: typeof tokenFontFamily;
  getAvatarColor: typeof getAvatarColor;
  /** Set the three-state preference. Persists to AsyncStorage. */
  setThemeMode: (mode: ThemeMode) => void;
  /**
   * Backward-compatible binary setter. true → 'dark', false → 'light'.
   * Prefer setThemeMode for new code.
   */
  setDarkMode: (dark: boolean) => void;
}

// ─── Context ─────────────────────────────────────────────────

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference on mount. Migrates the legacy binary key if
  // present so users who set a dark-mode preference on prior builds keep it.
  useEffect(() => {
    let cancelled = false;

    async function loadPref() {
      try {
        const stored = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (cancelled) return;
        if (stored === 'system' || stored === 'light' || stored === 'dark') {
          setThemeModeState(stored);
          setLoaded(true);
          return;
        }

        // No new-key value — check legacy boolean.
        const legacy = await AsyncStorage.getItem(LEGACY_DARK_KEY);
        if (cancelled) return;
        if (legacy === 'true') {
          setThemeModeState('dark');
          AsyncStorage.setItem(THEME_MODE_KEY, 'dark').catch(() => {});
        } else if (legacy === 'false') {
          setThemeModeState('light');
          AsyncStorage.setItem(THEME_MODE_KEY, 'light').catch(() => {});
        } else {
          setThemeModeState('system');
        }
      } catch {
        if (!cancelled) setThemeModeState('system');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    loadPref();
    return () => {
      cancelled = true;
    };
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_MODE_KEY, mode).catch(() => {});
  }, []);

  // Backward-compatible binary API. Prefer setThemeMode for new code.
  const setDarkMode = useCallback(
    (dark: boolean) => {
      setThemeMode(dark ? 'dark' : 'light');
    },
    [setThemeMode]
  );

  // Resolve: explicit user preference wins, else follow system, else light.
  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return systemScheme === 'dark';
  }, [themeMode, systemScheme]);

  const theme = useMemo<Theme>(() => {
    const colors = isDark ? darkColors : lightColors;
    return {
      isDark,
      themeMode,
      colors,
      status: tokenStatus,
      sport: tokenSport,
      type: typeScale,
      spacing: tokenSpacing,
      radius: tokenRadius,
      shadow: makeShadows(isDark),
      fonts: tokenFontFamily,
      getAvatarColor,
      setThemeMode,
      setDarkMode,
    };
  }, [isDark, themeMode, setThemeMode, setDarkMode]);

  // Avoid rendering with the wrong theme on first paint by waiting for the
  // persisted preference to load. The window is short (one async read) and
  // prevents a flash of light when a dark-mode user reopens the app.
  if (!loaded) return null;

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

**Notes on this rewrite:**

- The `loaded` gate (returning `null` until the AsyncStorage read finishes) is intentional. It introduces a one-tick delay before the first render of the React tree but eliminates a flash of light for dark-mode users on cold launch. If `useFonts()` in `App.tsx` is already holding the splash up for fonts, this read should complete well before the splash hides — no perceptible delay.
- The legacy-key migration is one-shot per user. After the first cold launch on this build, all subsequent loads read the new key directly.
- `setDarkMode(true)` → `setThemeMode('dark')`. `setDarkMode(false)` → `setThemeMode('light')`. The legacy API can never produce `'system'` — that's a feature, not a bug; the only way to opt back into system is through the new picker.

### Export the `ThemeMode` type

**File:** `src/theme/index.ts`

Add `ThemeMode` to the export line for ThemeContext types. Change:

```ts
export type { Theme } from './ThemeContext';
```

to:

```ts
export type { Theme, ThemeMode } from './ThemeContext';
```

---

## Phase 5 — Upgrade the Settings UI from binary toggle to segmented picker

### Goal

The "Dark Mode" `Switch` row in the Preferences tab of `SettingsScreen` is replaced with an "Appearance" section containing a three-button segmented picker (`System` / `Light` / `Dark`), plus a one-line description of the currently selected mode. The Switch row goes away entirely.

### Exact change set

**File:** `src/screens/profile/SettingsScreen.tsx`

1. **Update the imports**. Currently the file imports:

   ```ts
   import { fonts, Spacing, useTheme } from '../../theme';
   ```

   Change to:

   ```ts
   import { fonts, Spacing, useTheme, ThemeMode } from '../../theme';
   ```

2. **Find the `PreferencesTab` function** (around line 878 in the pre-Tier-4 file; line numbers may differ in current state). It currently destructures `isDark` and `setDarkMode` from `useTheme()` and renders a `ToggleRow` labeled "Dark Mode" with `value={isDark}` and `onValueChange={setDarkMode}`.

3. **Replace the destructure** so it uses the new three-state API:

   ```tsx
   const { colors, themeMode, setThemeMode } = useTheme();
   ```

4. **Replace the existing "Preferences" section header + card body** so it now renders an Appearance card *first*, followed by the existing Preferences card with the Dark Mode row removed (Location Services row stays, becomes the only row, and gets `isLast`).

   Replace the JSX block that runs from `<Text style={[s.sectionLabel, …]}>Preferences</Text>` through the closing `</View>` of the card that contains the Dark Mode `ToggleRow`, with:

   ```tsx
   {/* ── Appearance picker (new) ────────────────────── */}
   <Text style={[s.sectionLabel, { color: colors.inkSoft }]}>Appearance</Text>
   <View
     style={[
       s.card,
       { backgroundColor: colors.bgCard, shadowColor: colors.ink },
     ]}
   >
     <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
       <View
         style={{
           flexDirection: 'row',
           alignItems: 'center',
           marginBottom: 10,
         }}
       >
         <Ionicons
           name="moon-outline"
           size={20}
           color={colors.ink}
           style={{ marginRight: 10 }}
         />
         <Text
           style={{
             fontFamily: fonts.body,
             fontSize: 15,
             color: colors.ink,
           }}
         >
           Theme
         </Text>
       </View>
       <View
         style={{
           flexDirection: 'row',
           backgroundColor: colors.surface,
           borderRadius: 10,
           padding: 3,
         }}
       >
         {([
           { value: 'system', label: 'System' },
           { value: 'light', label: 'Light' },
           { value: 'dark', label: 'Dark' },
         ] as { value: ThemeMode; label: string }[]).map(opt => {
           const selected = themeMode === opt.value;
           return (
             <TouchableOpacity
               key={opt.value}
               onPress={() => setThemeMode(opt.value)}
               style={{
                 flex: 1,
                 paddingVertical: 8,
                 borderRadius: 7,
                 backgroundColor: selected ? colors.cobalt : 'transparent',
                 alignItems: 'center',
               }}
               accessibilityRole="button"
               accessibilityState={{ selected }}
               accessibilityLabel={`Appearance: ${opt.label}`}
             >
               <Text
                 style={{
                   fontFamily: selected ? fonts.semibold : fonts.body,
                   fontSize: 14,
                   color: selected ? '#FFFFFF' : colors.ink,
                 }}
               >
                 {opt.label}
               </Text>
             </TouchableOpacity>
           );
         })}
       </View>
       <Text
         style={{
           fontFamily: fonts.body,
           color: colors.inkSoft,
           marginTop: 8,
           fontSize: 12,
           lineHeight: 16,
         }}
       >
         {themeMode === 'system'
           ? "Muster will follow your device's appearance setting."
           : themeMode === 'dark'
             ? 'Always use dark mode in Muster.'
             : 'Always use light mode in Muster.'}
       </Text>
     </View>
   </View>

   {/* ── Preferences (existing, with Dark Mode row removed) ──── */}
   <Text style={[s.sectionLabel, { color: colors.inkSoft }]}>
     Preferences
   </Text>
   <View
     style={[
       s.card,
       { backgroundColor: colors.bgCard, shadowColor: colors.ink },
     ]}
   >
     <ToggleRow
       icon="location-outline"
       iconBg={colors.surface}
       label="Location Services"
       value={locationServices}
       onValueChange={setLocationServices}
       isLast
     />
   </View>
   ```

5. **Notes:**
   - `TouchableOpacity` and `Ionicons` are already imported at the top of the file — confirm before assuming.
   - `fonts.body` and `fonts.semibold` are both valid keys in `src/theme/typography.ts` — the `fonts` map exposes font-family strings, not full TextStyle objects, so use `fontFamily: fonts.body`, **not** `...fonts.body` (spreading a string would silently produce broken style props).
   - White text (`#FFFFFF`) on the selected `colors.cobalt` background is intentional and theme-constant — cobalt is the same color in light and dark, so white-on-cobalt reads correctly in both modes. Do not parameterize this color.

### Edge cases to verify

- Picker renders correctly in light mode: the selected option has a cobalt background with white text; unselected options have transparent backgrounds with `colors.ink` text on the `colors.surface` track. ✅
- Picker renders correctly in dark mode: same logic with dark-theme values of `surface` and `ink`. ✅
- Tapping each of the three options changes `themeMode`, persists to AsyncStorage, and re-renders the rest of the app with the correct theme. ✅
- Description text under the picker updates per the selected mode. ✅
- VoiceOver reads "Appearance: System / Light / Dark, button, selected" appropriately for each option. ✅
- No layout shift when switching between options. ✅

### Do not change

- Any other row in the Preferences tab (Location Services stays; the Intents section below stays).
- Any other tab in SettingsScreen.
- The `ToggleRow` component itself.

---

## Phase 6 — Tests (required)

Add tests under `tests/`. Use existing `jest-expo` + `@testing-library/react-native` patterns.

### 6a. `tests/theme/ThemeContext.threeState.test.tsx`

Required cases:

1. With `themeMode = 'system'` and `useColorScheme` mocked to `'dark'` → `useTheme().isDark === true`.
2. With `themeMode = 'system'` and `useColorScheme` mocked to `'light'` → `useTheme().isDark === false`.
3. With `themeMode = 'dark'` and `useColorScheme` mocked to `'light'` → `useTheme().isDark === true` (override wins).
4. With `themeMode = 'light'` and `useColorScheme` mocked to `'dark'` → `useTheme().isDark === false` (override wins).
5. Legacy `@muster_dark_mode = 'true'` in AsyncStorage on first mount → after the load effect resolves, `themeMode === 'dark'` and `AsyncStorage.setItem` was called with `('@muster_theme_mode', 'dark')`.
6. Legacy `@muster_dark_mode = 'false'` in AsyncStorage → migrated to `themeMode === 'light'`.
7. `setDarkMode(true)` → `themeMode === 'dark'` (backward-compat shim).
8. `setDarkMode(false)` → `themeMode === 'light'`.
9. `setThemeMode('system')` → preference clears; subsequent `isDark` follows `useColorScheme`.
10. While the AsyncStorage read is pending, `ThemeProvider` renders `null` (verified by querying the rendered tree).

### 6b. `tests/screens/profile/SettingsScreen.appearancePicker.test.tsx`

Required cases:

1. Renders three buttons labeled `System`, `Light`, `Dark` with `accessibilityRole === 'button'`.
2. The button matching the current `themeMode` has `accessibilityState.selected === true`; the other two have `selected: false`.
3. Tapping each button calls `setThemeMode` from the theme context with the matching mode string.
4. The description text matches the selected mode (snapshot the three strings).
5. There is no longer a `ToggleRow` whose `label === 'Dark Mode'` in the rendered tree.

### 6c. Manual integration tests (real hardware)

Do all of these. Document each result in the PR description.

1. **Device set to dark mode + app set to `System`** → app appears dark immediately on cold launch. No flash of light.
2. **Device set to dark + app set to `Light`** → app appears light, even though device is dark.
3. **Device set to light + app set to `Dark`** → app appears dark, even though device is light.
4. **Device set to light + app set to `System`** → app appears light.
5. **Toggle between picker options three times** → no crashes; theme changes apply immediately to every visible screen; persists after navigation away and back to Settings.
6. **Sign out → sign in** → preference persists across the auth boundary.
7. **Force-quit + cold launch** → preference persists across launches.
8. **Legacy upgrade path:** on a dev build, manually set `@muster_dark_mode` to `'true'` in AsyncStorage, clear `@muster_theme_mode`, cold-launch → app appears dark; AsyncStorage now has `@muster_theme_mode = 'dark'`.
9. **VoiceOver pass** on the picker → reads "Appearance: System / Light / Dark" and the selected state for each button.
10. **EAS production build** (`eas build --platform ios --profile production`) installs and runs on iPhone hardware. No regressions in sign-in, home, settings.
11. **Sentry pass** — silent during the manual test pass.

---

## Phase 7 — Before/after verification

Attach to the PR:

- Side-by-side screenshots of **Settings → Preferences tab** in light mode and dark mode showing the new picker.
- Side-by-side screenshots of **HomeScreen** and **LoginScreen** in light and dark, to confirm the rest of the app still respects theme.
- A **screen recording** of: open app set to System → switch to Light → switch to Dark → switch back to System. The transitions should be immediate.

---

## Phase 8 — Commit, push, rollback

Commit message (single commit):

```
revert(theme): restore dark mode + upgrade to three-state System/Light/Dark picker

Reverses the dark-mode kill from commit e1ae50e Phase 1 (Tier 4). The other
phases of that commit (lazy Apple Auth, dead-code purge, brand drift fix,
worklets audit) are preserved.

- app.json userInterfaceStyle back to "automatic".
- MusterDarkTheme restored in src/navigation/themes.ts.
- App.tsx AppNavigation reads isDark from theme context and selects the
  dark navigation theme when appropriate.
- src/theme/ThemeContext.tsx upgraded: new three-state themeMode
  ('system' | 'light' | 'dark') + setThemeMode(). Legacy isDark and
  setDarkMode(boolean) preserved as backward-compat shims so every existing
  consumer keeps working. Provider waits one tick for the AsyncStorage read
  to resolve, eliminating the flash-of-light on cold launch for dark-mode
  users. Migrates existing @muster_dark_mode keys to the new
  @muster_theme_mode key on first launch.
- src/theme/index.ts exports the ThemeMode type.
- SettingsScreen Preferences tab: removed the binary "Dark Mode" Switch,
  added an "Appearance" segmented picker (System / Light / Dark) with an
  inline description of the current mode. Location Services row remains.

Tests: tests/theme/ThemeContext.threeState.test.tsx,
       tests/screens/profile/SettingsScreen.appearancePicker.test.tsx
```

Then in PowerShell from `C:\Projects\AllRoads`:

```powershell
git add .
git commit -m "revert(theme): restore dark mode + upgrade to three-state System/Light/Dark picker"
git pull origin charles-dev --rebase
git push origin charles-dev
```

### Rollback notes

- This PR is intentionally a single coherent change set. If a rollback is ever needed (highly unlikely), `git revert` of this commit restores the dark-mode-killed state from `e1ae50e`. No partial revert is supported because the three-state picker would be left referencing API that no longer exists.
- The legacy `@muster_dark_mode` AsyncStorage key is read on first cold launch of this build and translated to the new `@muster_theme_mode` key. On subsequent launches the legacy key is ignored. If this code ever ships then rolls back, the legacy key is still intact (we don't delete it during migration), so the binary toggle would resume working from the user's last value.

---

## What "done" looks like

- All Phase 0 diagnostic output is in the PR description.
- All five code change sets (`app.json`, `themes.ts`, `App.tsx`, `ThemeContext.tsx`, `theme/index.ts`, `SettingsScreen.tsx`) are in place exactly as specified.
- Both test files are added and passing locally (`npm test`).
- All eleven manual integration tests documented with pass/fail in the PR description, including the legacy upgrade path.
- Side-by-side screenshots and the screen recording attached.
- A successful EAS production build installed and exercised on physical iPhone hardware.
- No regressions in: cold launch (auth + authed paths), sign-in (email/pw, Apple, Google), sign-out, onboarding, profile screens, HomeScreen, deep-link invite capture.
- Sentry stays quiet during the manual test pass.

If any of those items is incomplete, the PR is not ready to merge. No exceptions.
