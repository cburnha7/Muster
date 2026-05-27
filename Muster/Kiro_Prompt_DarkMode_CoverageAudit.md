# Kiro Prompt — Dark mode coverage audit + fixes

## Read this first — context, scope, and standard

The Muster app now supports a three-state appearance preference (System / Light / Dark), restored and upgraded in the previous PR. The token layer (`lightColors` vs. `darkColors` in `src/theme/tokens.ts`) is structurally complete — 54 semantic keys on each side. **What's not yet verified is whether dark mode actually looks good in production** — i.e., whether every screen, component, and modal renders with readable contrast, correct brand color, and no leaked light-mode hex values.

This PR is a two-phase job: a **programmatic audit** (which you can do entirely from static analysis) and a **visual audit** (which requires running the app in dark mode on hardware or a simulator and walking every critical surface). Both must complete. Document everything in the PR description.

Same standard as the prior PRs: no shortcuts, real-hardware verification, no scope drift, surface anything ambiguous instead of guessing.

**Working branch:** `charles-dev`. Confirm with `git rev-parse --abbrev-ref HEAD` in PowerShell before any edits.

**Prerequisites:**
- The "revert dark mode + three-state picker" commit is merged. Verify by checking that `app.json` has `"userInterfaceStyle": "automatic"` and `src/theme/ThemeContext.tsx` exports `ThemeMode`.

**The known-or-likely problems heading into this audit:**

1. **`src/components/forms/FormInput.tsx`** uses two hardcoded rgba colors (lines ~185, ~188): `rgba(0, 82, 255, 0.2)` and `rgba(186, 26, 26, 0.2)`. The first is `#0052FF` — the older brand blue, not the documented cobalt `#2040E0`. The second is a hardcoded error red, not the theme's `colors.heart` (`#C0392B`). Both render the same in light and dark; in dark mode they may not provide enough contrast against the dark `bgCard`/`bgScreen`.
2. **`src/components/error/ErrorBoundary.tsx`** intentionally hardcodes a light-mode palette (current lines ~39–48) so the fallback works even when `ThemeProvider` hasn't mounted. The comment on line 28 explains this. **Decision point** in Phase 2 below: should this be made theme-aware (best-effort), or kept hardcoded for safety? Default recommendation: best-effort theme-aware *with* a hardcoded light-mode fallback if `useTheme()` throws. Do not silently force light here — dark-mode users hitting an error screen and seeing a sudden flash of white is jarring.
3. **The `darkColors` semantic palette has not been visually validated.** Structurally it has the same 54 keys as `lightColors`, but the actual color values might produce poor contrast in places (e.g., `inkSoft` might be too dark against `bgCard`, or `cobalt` might be unreadable against `bgScreen` in dark). This is the largest unknown and is what most of the visual-audit phase is for.
4. **Auxiliary surfaces** — splash background (`#0052FF` → now cobalt `#2040E0` after Tier 4), StatusBar (`<StatusBar style="auto" />` should adapt automatically — verify), modal scrims (`rgba(0,0,0,0.5)` overlays — fine in both modes by design), and any image asset that's white-on-transparent and now needs a dark variant.

Out of scope: redesigning `darkColors` from scratch. Adjust individual values only when the visual audit shows a concrete contrast failure on a real screen, and document each change with the screen it was driven by.

---

## Phase 0 — Diagnostic pass (DO THIS BEFORE ANY EDITS)

Run all of the following in PowerShell from `C:\Projects\AllRoads`. Paste output into the PR description.

```powershell
git status
git rev-parse --abbrev-ref HEAD
git log --oneline -10

# Confirm the dark-mode restore commit landed
git log --oneline --grep="revert\(theme\)" -i | Select-Object -First 5

# Token shape parity check — must come back identical key counts
$light = (Select-String -Path "src\theme\tokens.ts" -Pattern "^\s+\w+:" -Context 0,0 | `
  Where-Object { (Select-String -Path $_.Path -LiteralPattern "lightColors" | `
    Where-Object LineNumber -le $_.LineNumber).Count -gt 0 -and `
    (Select-String -Path $_.Path -LiteralPattern "darkColors" | `
    Where-Object LineNumber -le $_.LineNumber).Count -eq 0 }).Count

# Simpler: just dump the keys of each and diff them.
# Use a temporary script if needed; the result is the deliverable in the PR.

# Every hardcoded hex in src/
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "'#[0-9A-Fa-f]{3,8}'|""#[0-9A-Fa-f]{3,8}""" | `
  Select-Object Path, LineNumber, Line | `
  Out-File -FilePath audit-hex.txt

# Every rgba/rgb in src/
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "'rgba?\(" | `
  Select-Object Path, LineNumber, Line | `
  Out-File -FilePath audit-rgba.txt

# Any direct import of lightColors or darkColors (should be near-zero outside theme/)
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "from\s+['\""].*theme/tokens['\""]" | `
  Where-Object { $_.Path -notlike "*\theme\*" -and $_.Path -notlike "*\screens\common\LoadingScreen*" } | `
  Select-Object Path, LineNumber, Line

# StatusBar usage — confirm "auto" or theme-aware
Select-String -Path "src\**\*.ts","src\**\*.tsx","App.tsx" -Pattern "StatusBar.*style" -SimpleMatch

# Any explicit "white" / "black" string literals as style values
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "color:\s*['\""]?white['\""]|color:\s*['\""]?black['\""]|backgroundColor:\s*['\""]?white['\""]|backgroundColor:\s*['\""]?black['\""]"
```

Then read these files end-to-end:

- `src/theme/tokens.ts` — both `lightColors` and `darkColors` definitions. Paste both into the PR description side-by-side so the palette parity is visually inspectable.
- `src/components/error/ErrorBoundary.tsx` — the DefaultErrorFallback function (lines ~29–98).
- `src/components/forms/FormInput.tsx` — the entire styles object (the two rgba hardcodes are around line 185).
- `src/theme/ThemeContext.tsx` — confirm the previous PR's three-state implementation is in place.
- `src/components/detail/EntityHeader.tsx` — the hero-banner pattern that uses white on image overlays. Confirm whether the hardcoded `#FFFFFF` values are intentional (white-on-image, theme-independent) or accidental.

If the hex/rgba audit files come back larger than 100 lines combined, **stop and surface that** — the prompt below assumes the violation surface is small enough to fix in one PR. If it's larger, we'll need to triage.

---

## Phase 1 — `darkColors` palette review (semantic correctness)

### Goal

Confirm that each of the 54 semantic keys in `darkColors` produces a sensible value for dark mode. Look for keys where the value was clearly copied from `lightColors` without thought, or where the contrast against another key is wrong.

### Steps

1. Read `src/theme/tokens.ts` from `export const lightColors` through the end of `darkColors`.
2. For each semantic key, build a table in the PR description:

   | Key | lightColors | darkColors | Notes |
   |---|---|---|---|
   | `bgScreen` | (value) | (value) | (does darkColors value make sense as a dark app background?) |
   | `bgCard` | (value) | (value) | (does it have enough contrast against `bgScreen` in dark?) |
   | `ink` | (value) | (value) | (is this readable on `bgScreen` in dark? should be near-white in dark) |
   | `inkSoft` | (value) | (value) | (secondary text — readable on `bgCard`?) |
   | ... | ... | ... | ... |

   You don't have to flag every row — only the ones that look wrong. Flag at minimum:
   - Any key whose `darkColors` value is identical to `lightColors` (almost always a mistake — even brand-constant colors like `cobalt` are usually identical, but text/background tokens should not be).
   - Any key whose `darkColors` value is darker than its `lightColors` value when it should be lighter (text colors should invert; background colors should invert; accents usually stay).
   - Any pair where the contrast ratio between paired keys (text + background) drops below ~4.5:1 in dark mode.

3. **Do not change values yet.** This phase produces a table; fixes go in Phase 4 driven by what the visual audit (Phase 5) confirms is actually wrong on screen.

### What "right" looks like for each category

- **Backgrounds** (`bgScreen`, `bgCard`, `surface`, `header`): in dark mode these should be near-black with subtle differentiation. Recommended starting points: `bgScreen` `#0B0F1A`, `bgCard` `#16213E`, `surface` `#1A2540`. Adjust if the current values are radically different.
- **Inks** (`ink`, `inkSoft`, `inkMuted`, `inkSecondary`, `textPrimary`, `textSecondary`, `textMuted`): in dark mode these should be near-white descending in lightness. `ink` near `#F5F5F5`, `inkSoft` near `#A8B0BC`, `inkMuted` near `#6B7280`. Maintain the same hierarchy as light.
- **Brand** (`cobalt`, `pine`, `gold`, `heart`): these are brand-constant. The values in `darkColors` should match `lightColors` exactly. Cobalt is `#2040E0`, pine is `#2D5F3F`, gold is `#D4A017`, heart is `#C0392B` per the brand memory.
- **Sport badges**: also brand-constant. Same values in light and dark.
- **Status colors** (success, warning, error tints): the *colors* are brand-constant; the *tints* (errorLight, successLight) may need lighter or darker values to maintain background contrast.

If any of the recommended values above look wildly different from what's currently in `darkColors`, that's not a license to change them — flag in the table and decide based on the visual audit.

---

## Phase 2 — ErrorBoundary fallback: theme-aware with safety fallback

### Goal

The error fallback screen looks correct in both themes. If `useTheme()` throws (because `ThemeProvider` is above ErrorBoundary in the tree but the error happened before the provider mounted), the fallback degrades to a hardcoded light-mode palette and still renders. This is the same intent as the current code, just with a theme-aware happy path.

### Background

The previous Tier 1 PR established the order: `SafeAreaProvider > ThemeProvider > ErrorBoundary > ReduxProvider`. So `ThemeProvider` IS above `ErrorBoundary` in the tree — `useTheme()` should always work inside the boundary. But: the ErrorBoundary is a class component, and the DefaultErrorFallback below it is a function component called *during* the error render. If the error originated inside ThemeProvider itself, `useTheme()` would still throw. So we keep a fallback path.

### Exact change set

**File:** `src/components/error/ErrorBoundary.tsx`

1. **Refactor `DefaultErrorFallback`** to try the theme first, then fall back to the hardcoded palette:

   ```tsx
   function DefaultErrorFallback({
     error,
     errorInfo,
     onReset,
     eventId,
   }: {
     error: Error;
     errorInfo: ErrorInfo | null;
     onReset: () => void;
     eventId: string | null;
   }) {
     // Try the theme; degrade gracefully if ThemeProvider is unreachable
     // (e.g. the error originated inside the provider itself).
     let themeColors: {
       background: string;
       ink: string;
       inkSecondary: string;
       inkMuted: string;
       error: string;
       errorLight: string;
       cobalt: string;
       white: string;
     };
     try {
       const theme = useTheme();
       themeColors = {
         background: theme.colors.bgScreen,
         ink: theme.colors.ink,
         inkSecondary: theme.colors.inkSoft,
         inkMuted: theme.colors.inkMuted,
         error: theme.colors.heart,
         errorLight: theme.colors.heartTint,
         cobalt: theme.colors.cobalt,
         white: '#FFFFFF',
       };
     } catch {
       themeColors = {
         background: '#F7F4EF',
         ink: '#1C2320',
         inkSecondary: '#6B7C76',
         inkMuted: '#94A3B8',
         error: '#C0392B',
         errorLight: '#FDECEA',
         cobalt: '#2040E0',
         white: '#FFFFFF',
       };
     }

     // ... rest of the existing fallback JSX, but use `themeColors` instead
     //     of the previously-local `colors` constant ...
   }
   ```

   Note: the hardcoded fallback values use the documented brand colors per memory — cobalt is `#2040E0` (not `#0052FF`), heart is `#C0392B`. Update from the existing values where they drifted.

2. **Verify `heartTint` exists in `SemanticColors`.** If it doesn't, fall back to `colors.errorBg` or similar. Read `src/theme/colors.ts` / `src/theme/tokens.ts` to confirm the correct semantic key name; do not invent one.

3. **Do not change** the structural behavior of `ErrorBoundary` itself (the class component). Only the fallback rendering.

### Edge cases to verify

- Error inside HomeScreen (typical case) → `useTheme()` returns the active theme → fallback uses dark or light colors as appropriate. ✅
- Error inside `ThemeProvider` → `useTheme()` throws "must be used inside ThemeProvider" → catch block uses hardcoded light palette. ✅
- Tap "Try Again" → state resets, normal render resumes. ✅
- Dev mode shows stack; prod mode hides it (preserved from Tier 1). ✅
- Sentry event ID still appears in prod (preserved from Tier 1). ✅

---

## Phase 3 — Fix `FormInput` brand-color leak

### Goal

`src/components/forms/FormInput.tsx` uses the canonical theme tokens for its accent borders instead of hardcoded rgba colors.

### Exact change set

**File:** `src/components/forms/FormInput.tsx`

1. Read the full file. Identify the styles object (lines ~180–200 in the audit).
2. The two hardcoded values to replace:
   - `rgba(0, 82, 255, 0.2)` — old brand blue, derived from `#0052FF`. Replace with a token-derived value. Pattern:

     ```ts
     // Inside the component, after useTheme():
     const focusBorder = `${colors.cobalt}33`; // 0.2 alpha as hex
     ```

   - `rgba(186, 26, 26, 0.2)` — hardcoded error red. Replace with:

     ```ts
     const errorBorder = `${colors.heart}33`; // 0.2 alpha as hex
     ```

3. Move these from the static `StyleSheet.create` block into the component body, then apply them in the JSX as inline styles where the focused/errored states are rendered. If the existing styles object uses these values from `StyleSheet.create`, you'll need to convert those style entries to inline styles (or pass the color as a prop to a child View). Read the file carefully — do not break the focused/errored visual states. The exact refactor depends on how `FormInput` is currently structured.

4. **If the file is non-trivial to refactor**, fall back to using the theme tokens directly without alpha — e.g. `colors.cobalt` and `colors.heart` at full opacity for the border. Light alpha on a colored border is a polish detail, not a contrast-critical change.

### Edge cases to verify

- Focused FormInput in light mode → border color is cobalt-based (same visual as before, modulo the `#2040E0` vs `#0052FF` hue shift). ✅
- Focused FormInput in dark mode → border color is cobalt against a dark `bgCard`. Verify contrast is good in the visual audit. ✅
- Errored FormInput → border is heart-color in both themes. ✅

### Do not change

- The `FormInput` public API.
- The error message rendering or layout.

---

## Phase 4 — Targeted token-value fixes (driven by Phase 5)

This phase is empty at prompt-write time. Phase 5 (visual audit) is going to produce a list of "screen X has a contrast failure on element Y in dark mode." Each finding either gets a token-value adjustment in `darkColors` or a per-component override.

**Do not blanket-edit `darkColors`.** Each change should be tied to a specific screen finding from Phase 5 with a screenshot. Document each change in the PR description as:

> **Finding 1.** On `LoginScreen`, the "Sign In" button's loading spinner used `colors.surface` against `colors.cobalt`, which in dark mode rendered low-contrast (surface is dark gray, cobalt is dark blue). Fix: changed the spinner's color from `colors.surface` to `'#FFFFFF'` directly, since this button has a brand-color background in both themes.

The number of findings drives the number of fixes. Reasonable target: 5–15. If the visual audit produces 30+ findings, surface the scope and stop — the audit is uncovering a larger design problem and needs a real design pass, not a Kiro PR.

---

## Phase 5 — Visual audit (real hardware or simulator)

This is the bulk of the work. Set the device to **dark mode** (Settings → Display & Brightness → Dark on iOS) and walk every critical surface. The app should also be set to **System** in its own theme picker so it follows the device. After each surface, switch to **Light** mode and confirm nothing regresses.

For each surface below, capture a screenshot in both themes and attach to the PR. Note any contrast failure, illegibility, or color drift.

### Critical surfaces (must check all)

1. **Splash → cold launch.** Capture the splash itself. The splash background is `#2040E0` (cobalt) per Tier 4; verify it transitions cleanly to either AuthNavigator (dark or light) or Home.
2. **LoginScreen** — including the brand mark, both font weights, the error banner state (tap Sign In with empty fields), and both SSO buttons.
3. **RegistrationScreen / ForgotPasswordScreen / ResetPasswordScreen / InviteRegistrationScreen.**
4. **HomeScreen** — including the skeleton state (sign in with no cached bookings), the Calendar widget, the inbox section, and the live game banner state if reachable.
5. **EventDetailsScreen / EventCreate flow** — every step of the create flow has its own color story.
6. **FacilitiesListScreen / FacilityDetailsScreen.** The `EntityHeader` component uses `#FFFFFF` text over a hero image — confirm it's legible in both themes.
7. **LeaguesListScreen / LeagueDetailsScreen.**
8. **TeamsListScreen / TeamDetailsScreen / JoinTeamScreen.**
9. **MessagesListScreen / ChatScreen.**
10. **ProfileScreen (own profile).**
11. **SettingsScreen** — especially the new three-state Appearance picker. Confirm the picker visually communicates the selected state in both themes; the selected button is cobalt with white text.
12. **AvailabilityCalendarScreen.**
13. **SearchModal / FormInput focused + errored states.**
14. **All bottom-sheet modals** — Step Out, Cancel Event, Block Time Slot, Booking Conflict, etc. The scrim is `rgba(0,0,0,0.5)` (works in both); the sheet content itself must look correct.
15. **ErrorBoundary fallback** — trigger an error in a debug build (throw inside any screen on mount); confirm the fallback renders correctly in both themes.
16. **OnboardingNavigator screens** — the SSO onboarding flow specifically (privaterelay handling lives here).

### What to look for on each surface

- Text contrast against background — readable, not muddy.
- Icon colors — visible against their backgrounds.
- Card borders — present and visible (or intentionally invisible).
- Focused / pressed / disabled states on every interactive control.
- Loading skeletons (Tier 2's `HomeSkeleton`) — visible but understated; not so dark they vanish.
- Pull-to-refresh indicator color (`colors.cobalt` per existing pattern) — visible.
- Modal scrim — appropriate dimness.
- StatusBar content — light icons in dark mode, dark icons in light mode (the `StatusBar style="auto"` in `App.tsx` should handle this; verify).
- Splash → app transition — no flash of the wrong color.

### Output

A markdown table or bulleted list in the PR description:

> **LoginScreen / Dark / 🔴 contrast fail:** The "Forgot Password?" link uses `colors.cobalt` against `colors.bgCard`, which in dark mode is `#16213E`. Cobalt at full opacity is barely distinguishable. Fix candidate: brighten cobalt for dark, or use a lighter accent for dark.
>
> **HomeScreen / Dark / ⚠ minor:** Calendar markedDate dots use the sport-badge colors which are full-saturation. Against the dark calendar grid they look correct.
>
> **SettingsScreen Appearance picker / Light + Dark / ✅ pass.**

Each 🔴 (failure) drives a Phase 4 entry. Each ⚠ (concern) is noted but not necessarily fixed unless it accumulates into a pattern.

---

## Phase 6 — StatusBar, splash, sheets

### StatusBar

`App.tsx` has `<StatusBar style="auto" />` which should adapt to the navigation theme. Verify on hardware. If it doesn't, the fix is to drive it from `useTheme().isDark`:

```tsx
<StatusBar style={isDark ? 'light' : 'dark'} />
```

But: do that **only** if the auto behavior visibly fails. Don't pre-emptively change it.

### Splash

`app.json` `splash.backgroundColor` is `#2040E0` (cobalt). In dark mode the device-level splash will be the same color — that's correct; brand color is theme-constant. The splash image itself is a transparent-background PNG of the Muster icon. Confirm on hardware that the splash → app transition doesn't flash white or black before the React tree mounts.

### Bottom sheets

The `@gorhom/bottom-sheet` library's default styling may not respect the app theme. Audit each `BottomSheet` usage and confirm:
- The handle indicator is visible in both themes.
- The sheet background uses `colors.bgCard`, not a hardcoded light value.
- The backdrop scrim uses the existing `rgba(0,0,0,0.5)` (correct).

Spot-check: `src/components/navigation/AvatarBottomSheet.tsx` and any other `BottomSheet` consumers.

---

## Phase 7 — Tests (required)

### 7a. `tests/theme/darkMode.snapshot.test.tsx`

Required cases:

1. Snapshot of `LoginScreen` in light mode (mock `useTheme` to return light).
2. Snapshot of `LoginScreen` in dark mode (mock `useTheme` to return dark).
3. Same pairs for `HomeScreen`, `SettingsScreen`, `ErrorBoundary` (fallback only — render with a thrown child).
4. Assert that the two snapshots in each pair differ (proves the components actually respond to theme).

### 7b. `tests/theme/tokens.parity.test.ts`

Required cases:

1. `Object.keys(lightColors).sort()` deepEqual `Object.keys(darkColors).sort()` — structural parity.
2. For each "brand-constant" key (`cobalt`, `pine`, `gold`, `heart`, all sport-badge keys), `lightColors[key] === darkColors[key]`.
3. For each text-color key (`ink`, `inkSoft`, `inkMuted`, `textPrimary`, `textSecondary`, `textMuted`): assert the dark value is *lighter* than the light value (use a luminance helper).
4. For each background key (`bgScreen`, `bgCard`, `surface`, `header`): assert the dark value is *darker* than the light value.

If any of those invariants fail, the failing tests document the next set of `darkColors` adjustments needed. Iterate until green.

### 7c. `tests/theme/ThemeContext.threeState.test.tsx`

Required cases:

1. With `themeMode = 'system'` and `useColorScheme = 'dark'` → `isDark = true`.
2. With `themeMode = 'system'` and `useColorScheme = 'light'` → `isDark = false`.
3. With `themeMode = 'dark'` and `useColorScheme = 'light'` → `isDark = true` (override wins).
4. With `themeMode = 'light'` and `useColorScheme = 'dark'` → `isDark = false` (override wins).
5. Legacy `@muster_dark_mode = 'true'` in AsyncStorage on first mount → migrated to `@muster_theme_mode = 'dark'`; `themeMode === 'dark'`.
6. Calling `setDarkMode(true)` (backward-compat API) sets `themeMode === 'dark'`.
7. Calling `setThemeMode('system')` clears any explicit override.

### 7d. Manual integration tests (real hardware)

Do all of these. Document each result in the PR description with screenshots.

1. Set device to dark mode + app set to System → app appears dark.
2. Set device to dark + app set to Light → app appears light.
3. Set device to light + app set to Dark → app appears dark.
4. Set device to light + app set to System → app appears light.
5. Toggle between picker options three times → no crashes, transition is instant or smooth.
6. Sign out → sign in → preference persists across the auth boundary.
7. Force-quit + cold launch → preference persists across launches.
8. Walk all 16 surfaces from Phase 5 in both themes → contrast acceptable everywhere; no leaked light values; no leaked dark values; no white flashes.
9. Trigger ErrorBoundary in both themes → fallback renders correctly.
10. EAS production build → installs and exercises on iPhone hardware. No regressions.
11. Sentry pass — quiet during all of the above.

---

## Phase 8 — Before/after verification

Attach to the PR:

- **Side-by-side screenshots** of all 16 surfaces (light + dark = 32 images, or a grid).
- **Token parity table** from Phase 1.
- **The list of Phase 5 findings** with which Phase 4 fix each one resolved.
- A **screen recording** of the appearance picker exercising all three states with the app foregrounded.

---

## Phase 9 — Commit, push, rollback

Commit message (single commit):

```
feat(theme): dark-mode coverage audit + targeted fixes

- ErrorBoundary fallback is now theme-aware with a light-mode hardcoded
  fallback if useTheme() throws. Documented brand colors used (cobalt
  #2040E0, heart #C0392B).
- FormInput accent borders use colors.cobalt and colors.heart from the
  theme instead of hardcoded rgba values derived from the old #0052FF
  brand blue.
- darkColors adjustments driven by visual audit:
  [list each value change with the screen that drove it]
- Per-component overrides driven by visual audit:
  [list each component-level color change with the screen that drove it]

Tests: tests/theme/darkMode.snapshot.test.tsx,
       tests/theme/tokens.parity.test.ts,
       tests/theme/ThemeContext.threeState.test.tsx
```

Then in PowerShell from `C:\Projects\AllRoads`:

```powershell
git add .
git commit -m "feat(theme): dark-mode coverage audit + targeted fixes"
git pull origin charles-dev --rebase
git push origin charles-dev
```

### Rollback notes

- **ErrorBoundary theme-aware refactor:** trivial revert if it ever masks an error. The hardcoded-light fallback path is preserved as a safety net.
- **FormInput tokens:** trivial revert; the previous rgba values are not lost.
- **`darkColors` value adjustments:** each one is independently revertable. If a specific change causes a problem, revert that line only.
- **Per-component overrides:** each is local; revert individually.

If the visual audit reveals more than ~30 individual contrast failures, **do not try to fix them all in this PR.** Surface the scope, ship the top-10 most-visible fixes, and open a follow-up PR for the rest with design input.

---

## Out of scope — surface but do not fix

- **Designer-level redesign of `darkColors`.** This audit fixes contrast failures and removes hardcoded light-mode leaks. Reworking the dark palette as a deliberate design language (e.g. "dark+warm" vs. "dark+cool", elevated-surface treatment, etc.) is a design exercise, not a Kiro PR. If the audit suggests the dark palette needs a coherent redesign, flag it in the PR description.
- **Asset variants.** If any image asset is white-on-transparent and disappears in dark mode (e.g. a logo lockup, a divider PNG), surface the asset path but do not try to generate or commit dark variants — that's a design deliverable.
- **Marketing screenshots.** The App Store screenshots are still light-mode. Capturing dark-mode marketing screenshots is a separate effort.
- **Web build dark mode.** Web inherits the theme automatically; do not separately audit the web build in this PR unless explicitly asked.

---

## What "done" looks like

- All Phase 0 diagnostic output is in the PR description.
- Phase 1 token parity table is in the PR description.
- Phase 2 (ErrorBoundary) and Phase 3 (FormInput) code changes are in place exactly as specified.
- Phase 4 fixes are each documented with the Phase 5 finding that drove them. Zero "drive-by" token changes.
- Phase 5 visual audit covers all 16 surfaces in both themes with attached screenshots.
- All three test files are added and passing locally (`npm test`).
- All eleven manual integration tests documented with pass/fail.
- Side-by-side screenshots attached.
- Screen recording of the picker attached.
- A successful EAS production build installed and exercised on physical iPhone hardware.
- No regressions in: cold launch (auth + authed paths), sign-in (email/pw, Apple, Google), sign-out, onboarding, deep-link invite capture, profile screens, HomeScreen, ErrorBoundary recovery.
- Sentry stays quiet during the manual test pass.

If any of those items is incomplete, the PR is not ready to merge. No exceptions.
