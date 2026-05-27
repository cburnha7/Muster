# Muster — Cold-Launch + Login Audit (toward 1.0.59 / "perfect" sign-in)

**Scope:** Cold-launch path overall, all four sign-in flows (email/password, Sign in with Apple, Google OAuth, session restore), and post-auth nav into the home tab.
**Working tree read:** `C:\Projects\AllRoads` (Expo SDK 55, RN 0.83.4, React 19.2).
**Method:** Static read of every file on the boot/login critical path. Nothing has been changed yet — this is the audit you asked for before we make any cut/keep decisions.

---

## TL;DR

The cold-launch path has **two structural problems** that explain the 2.7s TurboModule crash from incident 2B176A02 and would slow even a healthy build:

1. **~30 service singletons instantiate at module-eval time**, several with constructor-level side effects that touch native modules (SecureStore, NetInfo-shaped listeners, timers). One of them — `services/api/AuthService.ts` — kicks off an async `SecureStore.getItemAsync` from the constructor, before the React tree (and therefore the ErrorBoundary) has mounted. This is a textbook unhandled-rejection-at-startup pattern and the strongest candidate for the documented 2.7s crash.
2. **The "global error handler" called for in the incident 2B176A02 fix is not in place.** The `ErrorBoundary` exists and is wired in, but it only catches React render errors — it does not catch errors thrown from constructors, async effects, native modules, or `setTimeout`/`setInterval` callbacks. `ErrorUtils.setGlobalHandler` is not registered anywhere in the codebase.

Beyond that, sign-in itself has a small set of concrete UX/perf issues — most notably **a blocking `Alert.alert("Success", …)` modal between sign-in and the home screen** that turns every successful login into a forced extra tap.

Login flows themselves work, are well-structured (good auth slice, sane validation, proper SecureStore use), and contain the `privaterelay.appleid.com` guard memory called for (server + onboarding/avatar; not in `SSOService`, but the downstream guards hold the line). The thing that makes login feel slow is everything around it: bundle eval, font load, redux-persist rehydrate ceiling, blocking alert, and the home-screen's hard-block on a network fetch.

---

## P0 — Fix-or-pin before resubmission

### 1. Marketing version drift in `app.json` (RESUBMISSION BLOCKER)

`app.json` line 5: `"version": "1.2.0"`.
`package.json` line 3: `"version": "1.0.0"`.
App Store target: build **1.0.59** under the **1.0** train.

Whatever EAS builds and submits will carry `1.2.0` as the CFBundleShortVersionString, which Apple sees as a *minor-version jump* from the rejected 1.0.58. That mismatch alone will confuse the review thread and may auto-reject. Set both to `1.0.0` (or whatever the marketing version actually is) before the next build.

### 2. `services/api/AuthService.ts` runs SecureStore from its constructor at cold launch

```ts
// line 41–44, 46–57
constructor() {
  this.initPromise = this.initializeTokenCache();
}
private async initializeTokenCache(): Promise<void> {
  try {
    const token = await TokenStorage.getAccessToken();  // SecureStore on iOS
    ...
```

The singleton is exported on line 492 (`export const authService = new AuthService();`). Because the auth slice imports this module at the top of the import graph, the constructor runs during JS bundle eval — *before* the React tree mounts, *before* the `ErrorBoundary` is in scope, and *before* any global error handler exists. SecureStore is a TurboModule. This matches the "TurboModule called unconditionally during initial mount" diagnosis exactly.

The try/catch inside `initializeTokenCache` only catches awaited errors; an unhandled rejection from the synchronous part of a TurboModule call, or a native registration failure, will fall through. Combined with no `ErrorUtils.setGlobalHandler`, the process dies. Pin/fix candidates: (a) move the cache init into a lazy `ensureInitialized()` that runs the first time `getToken()` is awaited, or (b) defer it into an `idleCallback` after splash hides, or (c) wrap the whole singleton init in a top-level try/catch that swallows and logs.

### 3. No global JS error handler

The memory note on the incident-2B176A02 fix says it should "register global error handler." Grep confirms `ErrorUtils.setGlobalHandler` is not called anywhere. Without it, **any** uncaught async error during boot — including unhandled promise rejections from the singleton initializers above — kills the JS thread and the app dies after the JS engine surfaces it. The ErrorBoundary cannot help with these.

### 4. NetworkService constructor adds listeners + a `setInterval` at module load

```ts
// src/services/network/NetworkService.ts
constructor() {
  if (typeof window !== 'undefined') {
    window.addEventListener('online',  ...);   // line 23
    window.addEventListener('offline', ...);   // line 30
  }
  setInterval(() => { ... }, ...);            // line 42
}
```

`window` is a polyfill on native; touching `addEventListener` here is fine on web but the `setInterval` runs on every cold launch and never clears. The constructor-at-import pattern is the same problem as #2 — these are wasted cycles on the cold path and another place an exception can escape before the boundary mounts.

### 5. The successful-login `Alert.alert` is a forced extra tap

`src/screens/auth/LoginScreen.tsx` line 64 (email/pw) and line 99 (SSO):

```ts
Alert.alert('Success', SuccessMessages.login.success);
```

This is a blocking native modal between the successful auth and `RootNavigator` switching to `Main`. Users have to dismiss it before they see the home tab. Removing both call sites makes every login feel instantly faster with zero behavior change — the user *just sees* the home screen. This is the single highest-impact "perceived speed" fix in the app.

### 6. Home tab gates first paint on a network fetch with no skeleton

`HomeScreen.tsx` returns `<LoadingSpinner />` while `useGetUserBookingsQuery` is loading (sub-agent confirmed at line ~620). On a fresh login (no RTK Query cache yet) every user sees a blank-with-spinner home tab while the booking call to `muster-production.up.railway.app/api/bookings` round-trips. There's no skeleton frame. Two options when we decide: (a) render the skeleton/empty home with sport-badge cards immediately and let bookings populate in place, (b) prefetch bookings in the loginUser thunk's fulfilled case so the home tab opens with data already cached. The empty-state route is cheaper and is what the App Store reviewers see on their throwaway test account anyway (Issue 1 of the rejection was an empty-state crash on team chats — same anti-pattern).

---

## P1 — Cold-launch wins worth fixing before resubmission

### 7. Font load can stall the splash for the full 5-second timeout

`App.tsx` 45–58: races `Font.loadAsync` against a 5-second `setTimeout`. The race is defensive — good — but the ceiling is high. Google Fonts can be slow on first launch when network is poor, and the user sees the iOS splash the entire time. Lower the timeout to ~1.5s and let the app render with system fonts; once the custom fonts arrive RN re-renders the text. (`expo-font` supports this pattern via `useFonts()` returning `[loaded, error]`.) Bonus: drop unused weights — the app currently loads 7 weights (`Fraunces_700Bold`, `_700Bold_Italic`, `_900Black`, `Nunito_400/500/600/700`); audit reveals not every weight is actually used.

### 8. Dark-mode branch contradicts the "light-only" rule and adds work

Memory says: **"The app is intentionally light-mode only. Never add `useColorScheme()` logic or dark mode overrides."**
Reality:
- `app.json` line 8: `"userInterfaceStyle": "automatic"` — iOS will give the app dark traits when the device is dark.
- `App.tsx` 91–95: `useTheme()` returns `isDark` and selects `MusterDarkTheme` vs. `MusterLightTheme`.
- `src/theme/ThemeContext.tsx` exists (106 lines) — non-trivial code path.

Either the rule has drifted or the dark code path is dead but still being evaluated. Setting `"userInterfaceStyle": "light"` in `app.json` and short-circuiting `isDark` to always `false` in the ThemeContext is a free win — less code on the critical path and aligns with the documented design intent.

### 9. Redux-persist whitelist stores access + refresh tokens in AsyncStorage (security)

`src/store/store.ts`:

```ts
whitelist: ['auth', 'subscription'],
```

The full `auth` slice — including `accessToken` and `refreshToken` — gets persisted to AsyncStorage on iOS. AsyncStorage on iOS is **not** in the secure enclave; it's a plist in app sandbox storage. The codebase already uses `expo-secure-store` for the same tokens via `TokenStorage`, so we have the right pattern in place — we just persist them in *both* places. Recommended: change the redux-persist transform so it strips `accessToken` and `refreshToken` from what's written to AsyncStorage, and let the SecureStore copy be the source of truth on cold boot. The REHYDRATE matcher would need to call into `TokenStorage` for those two fields.

Apple's reviewers don't statically scan for this, but it's the kind of thing a security review (e.g. for school district / municipal rec procurement, which is on the Muster Rec roadmap) will flag.

### 10. Google OAuth uses `auth.expo.io` proxy on native

`src/services/auth/SSOService.ts` line 101:

```ts
redirectUri = Platform.OS === 'web' ? makeRedirectUri() : 'https://auth.expo.io/@cburnha7/muster';
```

This works but adds (a) a third-party hop (Expo's proxy), (b) a dependency on the proxy being whitelisted in your Google Cloud Console redirect URIs, (c) ~500ms–2s of extra latency on every Google sign-in. Switching to a native redirect with `expo-auth-session/providers/google` and a custom URL scheme (you already have `com.googleusercontent.apps.297265818886-fcm56mh33g7uubur983mgfhbav1jbtpc` registered in `app.json` line 30) cuts the hop and is the path Expo's docs recommend for prod builds.

Same file: `fetchDiscoveryAsync('https://accounts.google.com')` runs on every Google sign-in tap. Google's OIDC discovery doc almost never changes — hardcode the two endpoints we use (`authorization_endpoint`, `token_endpoint`) and save ~200–500ms on every Google login.

### 11. Apple `expo-apple-authentication` is required at module eval

`SSOService.ts` 19–26:

```ts
let AppleAuthentication: any = null;
if (Platform.OS === 'ios') {
  try { AppleAuthentication = require('expo-apple-authentication'); } catch { ... }
}
```

The `require` runs when `SSOService` is imported (which happens whenever `LoginScreen` is imported, which happens at root mount because `AuthNavigator` direct-imports it — see #12). Native module init for Apple Auth gets a small head start on every cold launch even for users who'll sign in with email. Lazy-importing it inside `isAppleSignInAvailable`/`signInWithApple` shaves another small slice off TTI on the auth surface.

### 12. RootNavigator direct-imports all 3 navigators

`src/navigation/RootNavigator.tsx` 13–16: AuthNavigator, TabNavigator, and OnboardingNavigator are all imported eagerly, with the comment "Direct imports instead of lazy loading for web compatibility." On native, this means **TabNavigator (5 tabs × N screens deep) gets parsed and module-evaluated on the cold launch of an unauthenticated user** who will never see those screens. This is the single biggest reason a non-signed-in cold launch is slower than it needs to be. Wrap TabNavigator and OnboardingNavigator in `React.lazy` for native only (gate the web-compat comment behind `Platform.OS === 'web'`).

### 13. `serializableCheck` middleware runs in production

`src/store/store.ts` configures `serializableCheck` for every dispatch. It runs in dev and prod. On the boot path (REHYDRATE alone fires many actions), this is measurable. Set `serializableCheck: false` (or `immutableCheck: false`) in production builds — the dev-mode checks are valuable; the prod-mode cost isn't.

### 14. ErrorBoundary fallback shows raw stack traces to users

`ErrorBoundary.tsx` 62–80 renders `error.toString()` and `errorInfo.componentStack` to a `ScrollView`. If a real crash hits a real user (or an App Store reviewer), they see a wall of monospace JS stack. The Sentry capture is right; the user-facing message should be "Something went wrong. We've been notified. Tap to retry." with no stack. Wrap the stack reveal in `__DEV__` only. **High-priority App Store polish issue — reviewers will flag this if they hit any error.**

---

## P2 — Quality nits found en route (do whenever)

- `services/auth/AuthService.ts` (414 lines) is a near-duplicate of `services/api/AuthService.ts` (492 lines), used by only 2 files (`AvailabilityCalendarScreen`, `useAvailabilityCheck`). One of them should be deleted and call sites migrated.
- `authSlice.ts` defines `loadCachedUser` (lines 267–284) + three reducer cases for it (lines 569–585) — grep confirms it is **not called anywhere**. Dead code; safe to delete.
- `app.json` splash `backgroundColor: "#0052FF"` does not match the documented cobalt `#2040E0` from `src/theme/colors.ts`. Splash, web themeColor, and adaptiveIcon all use `#0052FF`. Brand drift — first impression of the app's color is off.
- `AuthNavigator.tsx` line 59 titles the InviteRegistration screen "Join Team" — per memory the brand term is "Roster," not "Team." (And the verb is "Join Up," not "Join.") Pre-rebrand strings still live in `AuthNavigator`, `RootNavigator` (`'Teams'` route, `'JoinTeam'` screen), and elsewhere. Not a perf issue — a polish/brand consistency issue.
- `App.tsx` 20–34: linking prefixes include `'https://muster.app'`, but the live domains per memory are `playmuster.com` and `muster-ecru.vercel.app`. Universal links from email never resolve.
- `expo-store-review` is pinned with `^` while all other expo-* deps use `~`. Probably benign, worth normalizing.
- `react-native-worklets` (0.7.2) and `react-native-worklets-core` (1.6.3) are both installed. Worth verifying both are needed — duplicate worklet runtimes have been a TurboModule cold-launch hazard in some RN versions. If only one is needed, drop the other.

---

## MVP pin candidates (if we need to ship 1.0.59 *now*)

Per your "Audit first, decide together" preference — these are the candidates I'd put on the cut/keep table. **None of these should be pinned without your decision.**

| Surface | Cost on cold-launch | Value at MVP | Recommend pin? |
|---|---|---|---|
| **Messages tab** (chat) | Imports a stack of message screens at root because of direct imports; chat services are heavy | Apple already flagged chat for an error in 1.0.58 | Strong candidate — pin the tab behind a flag while you stabilize the empty-state fix; ship Home + Events + Grounds + Leagues |
| **Milestone overlay system** | AsyncStorage read on every home mount + a network fetch for user stats | Gamification; nice but optional | Strong candidate — disable behind a flag for 1.0.59 |
| **`loadHomeData` inbox section** (invitations, debrief, ready-to-schedule leagues) | 5 parallel fetches on every home mount | Below the fold; users have to scroll to see it | Weak — already non-blocking; keep |
| **`OfflineIndicator`** | Mounted at root, sub-agent flagged as currently `returns null` | Zero | Easy delete — not a pin, just dead code |
| **`services/offline/*` (OfflineQueueService, SyncManager, OfflineService)** | 3 more singleton constructors at boot | Used for offline queueing of bookings | Medium — defer init until first network operation; keep code |
| **Dark mode code path** | Theme branching + dark theme constants | Zero per memory | Easy pin — disable in `app.json` + short-circuit `isDark` |
| **`services/auth/AuthService.ts` (duplicate)** | Constructor side-effects, doubled module-eval cost | Used by 2 minor screens | Easy pin — migrate those 2 screens to the canonical service, delete this file |

---

## What I want you to decide before I write any Kiro prompts

1. **App.json version:** confirm the marketing version we want on 1.0.59 (1.0.0? 1.0.59? something else?).
2. **Singleton constructor purge:** OK to convert `api/AuthService`, `NetworkService`, and the offline services to lazy-init? (My recommendation: yes.)
3. **Login success alert:** OK to delete both `Alert.alert("Success", …)` calls on the LoginScreen? (My recommendation: yes — biggest perceived-speed win in the app.)
4. **Home-skeleton vs. prefetch:** for the home-tab first paint, do we (a) render a skeleton and let bookings populate, or (b) prefetch bookings in the loginUser thunk so the home tab opens with cached data?
5. **Tabs to pin:** anything from the "MVP pin candidates" table above you want to act on, or do you want me to draft alternatives?
6. **Dark mode:** confirm we kill the dark code path (matches memory's "light-only" rule).
7. **Google OAuth path:** move off `auth.expo.io` proxy to native redirect now, or post-1.0.59?

Once you decide, I'll draft each as a standalone Kiro prompt in your usual format — full diagnostic steps, file-search instructions, edge cases, before/after verification, rollback notes. No bundles.

---

*Prepared by Claude. No code changed. Read-only audit of the boot/auth/home path.*
