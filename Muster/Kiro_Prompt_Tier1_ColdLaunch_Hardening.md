# Kiro Prompt — Tier 1 cold-launch hardening (Muster 1.0.73 line)

## Read this first — context, scope, and standard

You are doing a structural fix to the cold-launch path of the Muster Sport iOS app (React Native / Expo SDK 55, React 19.2, RN 0.83.4). This work has to land at the highest quality standard. Take your time. Do not cut corners. Do not skip verification steps. If anything below conflicts with what you observe in the code, stop and surface the conflict — do not "fix it your way."

The three problems you are solving in this single change are interdependent and should land together as one logical unit (the global handler is the safety net under the lazy-init refactor; the ErrorBoundary cleanup removes the user-visible blast radius if either of the first two misses an edge case).

**Working branch:** `charles-dev`. Confirm with `git rev-parse --abbrev-ref HEAD` in PowerShell before any edits.

**The three problems:**

1. **`src/services/api/AuthService.ts` runs SecureStore from its constructor at JS bundle evaluation time.** The singleton is instantiated at the bottom of the file (`export const authService = new AuthService();`) and the constructor synchronously calls `this.initializeTokenCache()`, which awaits `TokenStorage.getAccessToken()` → `SecureStore.getItemAsync` on iOS. This runs *before* the React tree mounts and *before* any error handler is installed. SecureStore is a native (TurboModule) call. Any unhandled rejection or native registration failure on this path takes down the JS thread. This matches the documented diagnosis of incident 2B176A02 ("native TurboModule called unconditionally during initial mount, ~2.7s after cold launch"). The previously-landed commit `5419b2a` only wrapped `Sentry.init` in try/catch — it did not address this constructor.

2. **No global JS error handler.** `ErrorUtils.setGlobalHandler` is not registered anywhere in the codebase. `ErrorBoundary` exists and catches React render errors, but it cannot catch errors thrown from constructors at module-eval time, async effects, `setTimeout`/`setInterval` callbacks, or native modules. The 2B176A02 fix-note in our records explicitly called for this handler; it is still missing.

3. **`src/components/error/ErrorBoundary.tsx` shows the raw JS stack to end users in production.** Lines 62–80 of the default fallback render `error.toString()` and `errorInfo.componentStack` directly into a `ScrollView`. If an Apple reviewer (or any real user) hits the fallback, they see a wall of monospace JS — which on its own is grounds for a Guideline 2.1(a) flag.

---

## Phase 0 — Diagnostic pass (DO THIS BEFORE ANY EDITS)

Run all of the following in PowerShell from `C:\Projects\AllRoads`. Do not skip any step. Paste the output into the PR description.

```powershell
git status
git rev-parse --abbrev-ref HEAD
git log --oneline -20
git log --oneline -- src/services/api/AuthService.ts | Select-Object -First 10
git log --oneline -- src/components/error/ErrorBoundary.tsx | Select-Object -First 10
git log --oneline -- index.js App.tsx | Select-Object -First 10
```

Then read these files end-to-end. Do not skim. Note exact line numbers as they exist *now*:

- `index.js` (Sentry init + registerRootComponent)
- `App.tsx` (root provider tree, font load, splash)
- `src/services/api/AuthService.ts` — focus on the constructor (around lines 41–57), `initializeTokenCache`, `ensureInitialized`, and every public method that reads `this.tokenCache` directly. Cataloge **every call site** of `tokenCache` inside the file.
- `src/services/auth/TokenStorage.ts` (the underlying SecureStore wrapper)
- `src/components/error/ErrorBoundary.tsx` (full file)
- `src/store/Provider.tsx` (so you understand what is already mounted by the time React is rendering)
- `src/navigation/RootNavigator.tsx` (so you know what calls ErrorBoundary's fallback flow)

Then run these searches and **paste the full output** into the PR description:

```powershell
# Every place the api/AuthService singleton is consumed
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "from\s+['\""].*services/api/AuthService" | Select-Object Path, LineNumber, Line

# Every tokenCache direct reader
Select-String -Path "src\services\api\AuthService.ts" -Pattern "tokenCache"

# Confirm there is no existing global handler anywhere
Select-String -Path "src\**\*.ts","src\**\*.tsx","index.js","App.tsx" -Pattern "setGlobalHandler"

# Confirm there is no existing unhandled rejection tracker
Select-String -Path "src\**\*.ts","src\**\*.tsx","index.js","App.tsx" -Pattern "unhandledRejection|HermesInternal|enablePromiseRejectionTracker"

# Make sure no one is depending on ErrorBoundary rendering the stack
Select-String -Path "src\**\*.tsx" -Pattern "componentStack|error.toString\(\)" -SimpleMatch
```

If any of those searches turns up something the rest of this prompt did not anticipate (e.g. a different file already holds a partial global handler, or someone has a test asserting the stack is rendered to the user), **stop and surface it**.

---

## Phase 1 — Fix #1: lazy-init AuthService token cache

### Goal

Move SecureStore access out of the constructor. The singleton must be safe to import at bundle-eval time even if the native side is not yet available. Token cache reads must remain synchronous-feeling for callers that already `await ensureInitialized()` — backward-compatible.

### Exact change set

**File:** `src/services/api/AuthService.ts`

1. **Remove the eager init in the constructor.** Replace:

   ```ts
   constructor() {
     // Initialize token cache on construction
     this.initPromise = this.initializeTokenCache();
   }
   ```

   With:

   ```ts
   constructor() {
     // No work at construction. Token cache is loaded lazily on the first
     // call to ensureInitialized(). This keeps cold-launch off of SecureStore
     // until after the React tree, ErrorBoundary, and global error handler
     // are all in place. Related: incident 2B176A02.
   }
   ```

2. **Make `ensureInitialized` the lazy entry point** (replaces the previous body):

   ```ts
   async ensureInitialized(): Promise<void> {
     if (this.initPromise) {
       return this.initPromise;
     }
     this.initPromise = this.initializeTokenCache().catch(err => {
       // Reset so a later caller can retry; do not poison the singleton.
       this.initPromise = null;
       // Surface to Sentry but never throw — the app must still be usable
       // even if SecureStore briefly fails (cold launch, locked device, etc.)
       try {
         const Sentry = require('@sentry/react-native');
         Sentry.captureException(err, {
           tags: { surface: 'auth.initializeTokenCache' },
         });
       } catch {}
       // Swallow — getAccessToken/getRefreshToken below will return null,
       // which forces the user to re-sign-in. That is the correct fallback.
     });
     return this.initPromise;
   }
   ```

3. **Audit every public method on `AuthService`** that reads `this.tokenCache`, `this.refreshToken`, or `this.tokenExpirationTime` *before* awaiting `ensureInitialized()`. For each such method, prepend `await this.ensureInitialized();`. Do not remove any existing awaits. The acceptable list of methods that may read state without awaiting init is: methods that *write* state (login, refresh, logout) — those are fine because they are setting the cache, not reading it.

4. **Add a defensive null check** to `initializeTokenCache` so it cannot crash on a malformed SecureStore payload:

   ```ts
   private async initializeTokenCache(): Promise<void> {
     try {
       const token = await TokenStorage.getAccessToken();
       this.tokenCache = typeof token === 'string' && token.length > 0
         ? token
         : null;
     } catch (error) {
       // Do not log the token. Log only the error class and message.
       const tag = error instanceof Error ? error.name : 'unknown';
       console.warn(`[AuthService] tokenCache init failed (${tag})`);
       this.tokenCache = null;
       throw error; // propagate to ensureInitialized's .catch
     }
   }
   ```

5. **Remove the existing `console.log` that prints a token prefix** (current lines around 50–53). Leaking even a 20-char prefix of a JWT to logs is unnecessary noise and a small privacy concern. Replace with `console.log('🔐 AuthService initialized')` with no token data.

### Edge cases to verify with code

- A user opens the app for the first time → SecureStore returns null → `tokenCache` stays null → RootNavigator sends them to AuthNavigator. ✅
- A user has a valid stored token → SecureStore returns the token → first call to `ensureInitialized` populates the cache → first authed API call uses it. ✅
- SecureStore throws (locked keychain, biometric prompt deferred, OS-level error) → `initializeTokenCache` rejects → `ensureInitialized`'s `.catch` resets `initPromise`, sends Sentry, swallows → next caller can retry. ✅
- Two API calls fire concurrently before init completes → both `await this.initPromise` and resolve to the same load. ✅
- App backgrounded mid-init → no special handling needed, init resolves when foregrounded. ✅
- `loginUser` thunk runs before `ensureInitialized` was ever called → `login()` writes the cache directly via `storeAuthData`; subsequent reads see the fresh value. Confirm by reading `storeAuthData`. ✅

### Do not change

- The shape of the exported singleton (`export const authService = new AuthService();` at the bottom of the file stays).
- The names or signatures of `login`, `register`, `ssoAuth`, `refreshToken`, `logout`, `storeAuthData`, or any public method.
- Any consumer file. This refactor must be backward compatible — no call sites should need to change.

---

## Phase 2 — Fix #2: register a global JS error handler

### Goal

Catch every uncaught JS error and unhandled promise rejection during cold launch and afterwards. Route to Sentry. Never crash the app silently.

### Where it goes

`index.js`. It must run **before** `registerRootComponent`. It must run **before** any of our service singletons are imported transitively. The handler itself must not depend on the React tree.

### Exact change set

**File:** `index.js`

Insert the following **immediately after** the existing `Sentry.init` try/catch block and **before** `registerRootComponent`:

```js
// ── Global JS error handler — last line of defense ──
// Catches: uncaught errors thrown from module-eval, constructors, async effects,
// setTimeout/setInterval callbacks, native module callbacks, and any code path
// that ErrorBoundary cannot reach. Documented as part of the incident 2B176A02
// remediation.
try {
  const defaultHandler =
    typeof ErrorUtils !== 'undefined' && ErrorUtils.getGlobalHandler
      ? ErrorUtils.getGlobalHandler()
      : null;

  if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      try {
        Sentry.captureException(error, {
          tags: {
            surface: 'globalHandler',
            isFatal: String(Boolean(isFatal)),
          },
        });
      } catch (e) {
        // Do not let Sentry capture failure mask the original error.
        console.error('Sentry capture failed in global handler:', e);
      }

      // In DEV, let RN show the red-box so we can actually debug.
      // In production, swallow non-fatal errors and let the JS thread keep
      // running. Fatal errors will still terminate; that is RN's contract.
      if (__DEV__ && defaultHandler) {
        defaultHandler(error, isFatal);
      }
    });
  }
} catch (e) {
  console.warn('Global error handler installation failed:', e);
}

// ── Unhandled promise rejection tracker ──
// React Native disables this by default in release. Re-enable so unhandled
// rejections route through Sentry instead of being silently swallowed.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const tracking = require('promise/setimmediate/rejection-tracking');
  tracking.enable({
    allRejections: true,
    onUnhandled: (id, error) => {
      try {
        Sentry.captureException(error, {
          tags: {
            surface: 'unhandledRejection',
            rejectionId: String(id),
          },
        });
      } catch {}
    },
    onHandled: () => {
      // Intentionally noop — once a rejection has a handler attached we
      // do not need to amend the earlier Sentry event.
    },
  });
} catch (e) {
  console.warn('Promise rejection tracking install failed:', e);
}
```

### Verify

- Confirm `ErrorUtils` is the React Native global; it is on RN ≥ 0.59 and is available in Expo SDK 55. Do not import it.
- The `promise/setimmediate/rejection-tracking` require path is the one shipped with the `promise` package that React Native depends on transitively. If your `node_modules` resolution differs (check with `npm ls promise`), adjust the require path before merging.
- Sentry's `beforeSend` filter in the existing `Sentry.init` already drops `Network request failed` and `AbortError`. That filter applies here too — good, no duplicate filtering needed.

### Edge cases to verify

- An error thrown at the top of `App.tsx` (module-eval time) → global handler captures it → Sentry records → in prod the app continues to next module. ✅
- A promise that rejects in a `useEffect` with no `.catch` → rejection tracker fires → Sentry records. ✅
- An error inside the global handler itself (e.g. Sentry network failure) → inner try/catch logs to console → does not throw. ✅
- DEV behavior unchanged → red-box still appears for fatal errors so debugging works. ✅

---

## Phase 3 — Fix #3: ErrorBoundary fallback — strip stack from production UI

### Goal

Users (and Apple reviewers) see a clean, branded "something went wrong" screen with a retry button. The stack trace and component stack still go to Sentry — they just do not render to the screen in production builds.

### Exact change set

**File:** `src/components/error/ErrorBoundary.tsx`

1. **Gate the stack reveal behind `__DEV__`.** In `DefaultErrorFallback`, replace the entire `<ScrollView style={[styles.errorDetails, …]}>` block (currently around lines 62–81) with a conditional:

   ```tsx
   {__DEV__ && (
     <ScrollView
       style={[styles.errorDetails, { backgroundColor: colors.errorLight }]}
     >
       <Text style={[styles.errorTitle, { color: colors.error }]}>
         Error:
       </Text>
       <Text style={[styles.errorText, { color: colors.error }]}>
         {error.toString()}
       </Text>
       {errorInfo && (
         <>
           <Text style={[styles.errorTitle, { color: colors.error }]}>
             Component Stack:
           </Text>
           <Text style={[styles.errorText, { color: colors.error }]}>
             {errorInfo.componentStack}
           </Text>
         </>
       )}
     </ScrollView>
   )}
   ```

2. **Improve the production-facing copy.** Replace the `message` Text element to:

   ```tsx
   <Text style={[styles.message, { color: colors.inkSecondary }]}>
     Muster ran into an unexpected error. We've been notified and are looking
     into it. Try again, and if it keeps happening, reach out to support.
   </Text>
   ```

3. **Add a Sentry event ID display in production** so users can include it in support emails. Inside `componentDidCatch`, capture and stash the event ID:

   ```ts
   componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
     console.error('Error Boundary caught an error:', error, errorInfo);
     const eventId = Sentry.captureException(error, {
       extra: { componentStack: errorInfo.componentStack },
     });
     this.setState({ errorInfo, eventId });
     this.props.onError?.(error, errorInfo);
   }
   ```

   Add `eventId: string | null` to `ErrorBoundaryState` and initial state. In the fallback, render a small line under the "Try Again" button:

   ```tsx
   {!__DEV__ && this.state.eventId && (
     <Text style={[styles.helpText, { color: colors.inkMuted }]}>
       Reference: {this.state.eventId.slice(0, 8)}
     </Text>
   )}
   ```

4. **Do not change** the hardcoded-color fallback strategy. The comment on line 28 ("uses hardcoded colors to avoid dependency on ThemeProvider") is correct — leave it. Reviewers may hit this screen before the theme has loaded.

### Edge cases to verify

- Production build, no Sentry event ID (e.g. Sentry init failed earlier) → `eventId` is null → reference line not rendered → fallback still works. ✅
- Dev build → stack reveal renders as before → developer debugging unaffected. ✅
- Two errors back-to-back → `resetError` clears all three pieces of state (`hasError`, `error`, `errorInfo`, **and** `eventId`). Update `resetError` to clear `eventId` too. ✅

---

## Phase 4 — Tests (required, no shortcuts)

Add tests under `tests/`. Use the existing `jest-expo` preset and `@testing-library/react-native` patterns. If any of these directories don't exist, create them.

### 4a. `tests/services/auth/AuthService.lazyInit.test.ts`

Required cases:

1. Importing `authService` does not call `TokenStorage.getAccessToken`. Mock `TokenStorage` and assert `getAccessToken` is **not** invoked at module-evaluation time. (Hint: use `jest.isolateModules` to control import timing.)
2. The first call to `ensureInitialized()` calls `TokenStorage.getAccessToken` exactly once.
3. Two concurrent calls to `ensureInitialized()` only call `TokenStorage.getAccessToken` once (shared promise).
4. If `TokenStorage.getAccessToken` rejects, `ensureInitialized()` resolves (does not reject), `initPromise` is reset to null, `Sentry.captureException` is called once with the `surface: 'auth.initializeTokenCache'` tag, and a subsequent call retries.
5. After a successful init, the cached token is read by `getToken()` without a second SecureStore call.

### 4b. `tests/globalHandler.test.ts`

Required cases:

1. After `index.js` evaluates, `ErrorUtils.getGlobalHandler()` returns our handler (or at minimum is not the RN default). Mock `Sentry` and `ErrorUtils` to verify.
2. Calling the installed handler with `(new Error('boom'), false)` invokes `Sentry.captureException` with the `surface: 'globalHandler'` tag and `isFatal: 'false'`.
3. In production (`__DEV__ = false`), the default RN handler is not invoked for non-fatal errors.
4. In development (`__DEV__ = true`), the default RN handler **is** invoked (so the redbox still appears).
5. An unhandled rejection routes through the rejection tracker and calls `Sentry.captureException` with `surface: 'unhandledRejection'`.

### 4c. `tests/components/error/ErrorBoundary.test.tsx`

Required cases:

1. In `__DEV__ = true`, throwing inside a child renders the stack reveal `ScrollView`.
2. In `__DEV__ = false`, throwing inside a child does **not** render the stack reveal — the `componentStack` string must not appear anywhere in the rendered tree.
3. In production, the Sentry event ID (mocked to a known value) renders truncated to the first 8 chars.
4. `resetError` clears `hasError`, `error`, `errorInfo`, and `eventId`.
5. `Sentry.captureException` is called once per caught error with `extra.componentStack` populated.

### 4d. Manual integration tests (run on real hardware before submission)

You must do **all** of these. Do not skip. Document the result of each in the PR description.

1. **Cold-launch on iPhone with no stored session** → app reaches LoginScreen in < 3s, no red box, no crash. Confirmed via Sentry: zero events fired.
2. **Cold-launch on iPhone with a valid stored session** → app skips Login, lands on Home, no red box, no crash.
3. **Cold-launch with a corrupted SecureStore entry** (manually overwrite the keychain entry with garbage via a debug build) → app falls back to LoginScreen, no crash, one Sentry event with `surface: auth.initializeTokenCache`.
4. **Cold-launch in airplane mode** with a valid stored session → app reaches Home offline; subsequent online recovery works.
5. **Manually throw inside HomeScreen's render** (debug build) → ErrorBoundary fallback shows the **dev** stack (proving dev gate works).
6. **Build the production bundle** (`eas build --platform ios --profile production`) and install on hardware. Manually throw inside HomeScreen's render via a debug entry point → ErrorBoundary fallback shows the **clean** copy, no stack, and the Sentry reference line.
7. **Reviewer-mode pass on iPad Air (M3) running iPadOS 26.4.x in iPhone compatibility mode**: cold-launch + sign-in + reach Home + sign-out + sign-in again. No crashes, no red boxes, no flashes of LoadingScreen.
8. **Sentry dashboard:** confirm three new event surfaces appear when you intentionally trigger errors during testing — `globalHandler`, `unhandledRejection`, `auth.initializeTokenCache`. Confirm `Network request failed` and `AbortError` are still being filtered (no spurious events).

---

## Phase 5 — Before/after verification

Capture and attach to the PR:

- **Before:** A symbolicated cold-launch trace from a debug build with the existing code (or, if you cannot reliably reproduce the 2.7s crash on demand, attach the latest matching Sentry event from the 2B176A02 incident as the baseline).
- **After:** A clean cold-launch trace from a debug build with this patch applied. Time-to-AuthNavigator on a fresh install on iPhone hardware. Time-to-Home on a returning user.
- **Sentry events captured during the manual test pass** (screenshots are fine).
- **Bundle size delta** (`npx expo export` before vs. after, sizes of the resulting iOS bundle) — should be near-zero; flag if it grows by > 5 KB.

---

## Phase 6 — Commit, push, rollback

Commit message (single commit; do not squash with anything else):

```
fix(boot): lazy-init AuthService + global error handler + ErrorBoundary prod polish

- AuthService no longer touches SecureStore at module-eval time. Token cache
  loads lazily on the first ensureInitialized() call, after the React tree
  and global error handler are in place. Addresses incident 2B176A02.
- ErrorUtils.setGlobalHandler installed in index.js with Sentry routing.
  Unhandled promise rejections now tracked via the promise package's
  rejection-tracking module (also Sentry-routed).
- ErrorBoundary fallback no longer renders the JS stack to end users in
  production builds. Dev builds unchanged. Production fallback now shows
  a short Sentry event ID for support correspondence.

Tests: tests/services/auth/AuthService.lazyInit.test.ts,
       tests/globalHandler.test.ts,
       tests/components/error/ErrorBoundary.test.tsx
```

Then in PowerShell from `C:\Projects\AllRoads`:

```powershell
git add .
git commit -m "fix(boot): lazy-init AuthService + global error handler + ErrorBoundary prod polish"
git pull origin charles-dev --rebase
git push origin charles-dev
```

### Rollback notes

If the production build is in trouble after this lands, the safe rollback is to revert this single commit (`git revert <sha>`). The three changes are independent in code but share one commit on purpose — they form one logical unit (lazy init + safety net + clean fallback). Reverting one without the others reintroduces the exact crash class incident 2B176A02 covered.

If only the ErrorBoundary cosmetic change needs to be reverted (e.g. support team needs the stack rendered to users for a triage period), do it as a separate revert PR — do not partial-revert the original.

---

## What "done" looks like

- All Phase 0 diagnostic output is in the PR description.
- All three code changes are in place, exactly as specified above.
- All four test files are added and passing locally (`npm test`).
- All eight manual integration test scenarios documented in the PR description with pass/fail.
- Before/after traces and bundle-size delta attached.
- A successful EAS production build has been produced (`eas build --platform ios --profile production`) and run on physical iPhone hardware.
- No regressions in: sign-in (email/pw, Apple, Google), sign-out, cold-launch with cached session, cold-launch without cached session, network error handling on auth.
- Sentry shows the three new surfaces firing only when expected.

If any of those items is incomplete, the PR is not ready to merge. No exceptions.
