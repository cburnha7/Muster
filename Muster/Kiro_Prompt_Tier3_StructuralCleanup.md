# Kiro Prompt — Tier 3 structural cleanup (Muster 1.0.73 line)

## Read this first — context, scope, and standard

You are landing four structural changes that don't move user-visible numbers as dramatically as Tier 1 (crash hardening) or Tier 2 (perceived speed), but each removes a real risk or a real cost from the production app: a singleton with module-load side effects, plaintext tokens in AsyncStorage, an OAuth proxy hop, and an always-on dev-only middleware running in production. The bar is the same as the prior two PRs: no shortcuts, real-hardware verification, before/after measurements where they make sense, no scope drift.

If anything below conflicts with what you observe in the code, stop and surface it — do not "fix it your way."

**Working branch:** `charles-dev`. Confirm with `git rev-parse --abbrev-ref HEAD` in PowerShell before any edits.

**Prerequisites:**
- Tier 1 PR merged (`fix(boot): lazy-init AuthService + global error handler + ErrorBoundary prod polish`).
- Tier 2 PR merged (`perf(boot+auth): skeleton home, lazy navigators, faster font load, no success alert`).

If either is unmerged, stop and surface that. The token-relocation fix in Phase 2 of this prompt relies on the Tier 1 global handler being present, and the lazy navigators in Tier 2 affect how the NetworkService consumers are evaluated at startup.

**The four problems:**

1. **`src/services/network/NetworkService.ts` runs work in its constructor at module load**: `setupNetworkMonitoring()` adds `window.addEventListener('online'/'offline', ...)` and starts a 30-second `setInterval` from inside `constructor()`. The singleton is instantiated on line 118 at module-eval time, so all of this fires during cold launch before the React tree and the global error handler are in place. (Same anti-pattern Tier 1 addressed for AuthService.) **Separate concern, surfaced for your decision:** on native, this service never actually checks the network — `navigator.onLine` is the only signal it reads, and the codebase never wires it to NetInfo. So on iOS the service is always reporting "connected." Fix #1 in this prompt is *only* the constructor lazy-init. We will flag the dead-NetInfo issue at the end as a separate decision; do not silently expand scope here.

2. **`src/store/store.ts` persists the entire `auth` slice into AsyncStorage** via redux-persist's `whitelist: ['auth', 'subscription']`. That means `accessToken` and `refreshToken` end up in an AsyncStorage plist on iOS, which is **not** in the secure enclave. `TokenStorage` already writes the same tokens to SecureStore (which is the correct place), so we have the right pattern available — we just need to stop duplicating the tokens into the insecure copy. We also need to migrate session restore to read tokens from SecureStore instead of relying on the REHYDRATE matcher.

3. **`src/services/auth/SSOService.ts` Google sign-in uses the `auth.expo.io` proxy** on native (line 101: `'https://auth.expo.io/@cburnha7/muster'`) and runs a live OIDC discovery fetch on every sign-in tap (line 103: `fetchDiscoveryAsync('https://accounts.google.com')`). The proxy adds a third-party hop, a dependency on the Expo proxy being whitelisted in Google Cloud Console, and ~500ms–2s of latency. The discovery fetch hardly ever produces different results; hardcoding the two endpoints we actually use saves another ~200–500ms. The custom URL scheme for native redirect is already registered in `app.json` (line 30, `com.googleusercontent.apps.297265818886-fcm56mh33g7uubur983mgfhbav1jbtpc`).

4. **`src/store/store.ts` runs `serializableCheck` on every dispatch in production builds.** RTK's serializability middleware is valuable in dev — it catches Date/Map/Set bugs and persistence mistakes — but it has a real per-dispatch cost in prod, and the boot path (REHYDRATE + many subsequent slice initializations) hits it hard. Same applies to `immutableCheck`.

---

## Phase 0 — Diagnostic pass (DO THIS BEFORE ANY EDITS)

Run all of the following in PowerShell from `C:\Projects\AllRoads`. Paste output into the PR description.

```powershell
git status
git rev-parse --abbrev-ref HEAD
git log --oneline -20

# Confirm Tier 1 + Tier 2 commits landed
git log --oneline --grep="fix\(boot\)" -i | Select-Object -First 5
git log --oneline --grep="perf\(boot\+auth\)" -i | Select-Object -First 5

# NetworkService consumers
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "from\s+['\""].*services/network" | Select-Object Path, LineNumber, Line

# Confirm NetInfo / expo-network is NOT already wired (we want to know)
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "@react-native-community/netinfo|expo-network" -SimpleMatch

# Redux-persist token surface
Select-String -Path "src\store\store.ts" -Pattern "whitelist|blacklist|persistConfig|transform"
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "REHYDRATE" -SimpleMatch

# Confirm the only Google OAuth call site
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "signInWithGoogle|GoogleAuthProvider|fetchDiscoveryAsync|auth\.expo\.io" -SimpleMatch

# Confirm app.json has the URL scheme
Select-String -Path "app.json" -Pattern "googleusercontent"

# RTK config
Select-String -Path "src\store\store.ts" -Pattern "serializableCheck|immutableCheck|getDefaultMiddleware"
```

Read these files end-to-end:

- `src/services/network/NetworkService.ts` (full file — 133 lines)
- `src/components/ui/OfflineFeatureWarning.tsx` and `src/components/ui/SyncStatusCard.tsx` and `src/hooks/useOfflineCapability.ts` (the three consumers that use `useNetworkState` — confirm none reaches into `networkService.getCurrentState()` directly at module-eval time)
- `src/store/store.ts` (full file)
- `src/store/slices/authSlice.ts` (specifically the REHYDRATE matcher around lines 362–378, and the `loadCachedUser` thunk if it has not been deleted yet)
- `src/services/auth/TokenStorage.ts` (so you know the SecureStore surface)
- `src/services/auth/SSOService.ts` (full file — 177 lines)
- `app.json` (confirm bundleIdentifier and the Google URL scheme line by line; you'll need them exact)
- `eas.json` (confirm `appVersionSource: "remote"`; no changes needed here)

If your diagnostic grep turns up an NetInfo import somewhere we missed, stop and surface it. If `loadCachedUser` is still referenced after Tier 1, stop and surface it (it should already be dead).

---

## Phase 1 — Fix #1: lazy-init NetworkService

### Goal

Move the `window.addEventListener` registrations and the `setInterval` out of the constructor. They run on first consumer access, not at module-eval time. The exported singleton becomes safe to import without side effects.

This is the *minimum* fix. It does not address the dead-NetInfo issue on native (the service still reports always-connected on iOS). That decision is at the end of this prompt and is **not** in scope for this PR.

### Exact change set

**File:** `src/services/network/NetworkService.ts`

1. **Strip the constructor.** Replace:

   ```ts
   constructor() {
     this.setupNetworkMonitoring();
   }
   ```

   With:

   ```ts
   private monitoringStarted = false;

   constructor() {
     // No work at construction. Network monitoring boots lazily on the
     // first subscribe() call. Keeps cold launch off of window event
     // registration and the 30s polling timer until something actually
     // needs the network state. Pattern matches the Tier 1 lazy-init
     // refactor of AuthService.
   }
   ```

2. **Refactor `setupNetworkMonitoring` to be idempotent and tracked.** Rename it to `ensureMonitoring` and gate it on `monitoringStarted`:

   ```ts
   private intervalHandle: ReturnType<typeof setInterval> | null = null;
   private onlineHandler: (() => void) | null = null;
   private offlineHandler: (() => void) | null = null;

   private ensureMonitoring(): void {
     if (this.monitoringStarted) return;
     this.monitoringStarted = true;

     if (Platform.OS === 'web' && typeof window !== 'undefined') {
       this.onlineHandler = () => {
         this.updateNetworkState({
           isConnected: true,
           isInternetReachable: true,
         });
       };
       this.offlineHandler = () => {
         this.updateNetworkState({
           isConnected: false,
           isInternetReachable: false,
         });
       };
       window.addEventListener('online', this.onlineHandler);
       window.addEventListener('offline', this.offlineHandler);
     }

     // Initial state probe — fire-and-forget; do not await at module level.
     this.checkNetworkStatus();

     // Periodic recheck (existing 30s cadence).
     this.intervalHandle = setInterval(() => {
       this.checkNetworkStatus();
     }, 30000);
   }
   ```

3. **Add a teardown for symmetry**, so tests and future hot-reload scenarios can stop the service cleanly:

   ```ts
   public teardown(): void {
     if (!this.monitoringStarted) return;

     if (this.intervalHandle !== null) {
       clearInterval(this.intervalHandle);
       this.intervalHandle = null;
     }
     if (
       Platform.OS === 'web' &&
       typeof window !== 'undefined' &&
       this.onlineHandler &&
       this.offlineHandler
     ) {
       window.removeEventListener('online', this.onlineHandler);
       window.removeEventListener('offline', this.offlineHandler);
       this.onlineHandler = null;
       this.offlineHandler = null;
     }

     this.monitoringStarted = false;
   }
   ```

4. **Call `ensureMonitoring` from `subscribe`** so first consumer triggers init:

   ```ts
   public subscribe(listener: (state: NetworkState) => void): () => void {
     this.ensureMonitoring();
     this.listeners.push(listener);
     listener(this.currentState);
     return () => {
       const index = this.listeners.indexOf(listener);
       if (index > -1) {
         this.listeners.splice(index, 1);
       }
       // If no more consumers, tear down to free the interval.
       if (this.listeners.length === 0) {
         this.teardown();
       }
     };
   }
   ```

5. **Also call `ensureMonitoring` from `getCurrentState`** for the rare case a caller wants a snapshot without subscribing:

   ```ts
   public getCurrentState(): NetworkState {
     this.ensureMonitoring();
     return { ...this.currentState };
   }
   ```

### Edge cases to verify

- Cold launch on native with no immediate consumer → constructor does nothing; no listeners; no timer. ✅
- First `useNetworkState()` mount → `subscribe` fires `ensureMonitoring` → timer starts. ✅
- All consumers unmount → `teardown` clears the interval; timer stops. ✅
- Consumer re-mounts later → `ensureMonitoring` re-arms cleanly. ✅
- Web build → `window` listeners added on first mount; removed when all consumers gone. ✅
- `Platform.OS === 'web'` but `window` is undefined (SSR-ish edge) → `typeof window !== 'undefined'` guard prevents throw. ✅
- Two simultaneous `subscribe()` calls during the same tick → `monitoringStarted` flag dedupes. ✅

### Do not change

- The four consumers (`OfflineFeatureWarning`, `SyncStatusCard`, `useOfflineCapability`, `RootNavigator`'s `useNetworkState` import). Public API is preserved.
- The `useNetworkState` hook itself.
- The 30-second polling cadence. (Lowering it would be a behavior change; not in scope.)

---

## Phase 2 — Fix #2: Stop persisting tokens to AsyncStorage; route session restore through SecureStore

### Goal

`accessToken` and `refreshToken` no longer land in AsyncStorage. SecureStore remains the only durable store for them. On cold launch, an async boot effect reads them from SecureStore and dispatches them into Redux *after* rehydration. The `user` object (non-sensitive profile data) continues to live in the redux-persist whitelist.

This is the trickiest of the four — read carefully.

### Background you'll need

- redux-persist's REHYDRATE matcher in `src/store/slices/authSlice.ts` runs **synchronously** when the rehydration completes. It cannot await an async SecureStore read.
- `TokenStorage` (SecureStore on iOS) is already used at write time by the login flows.
- We will introduce a `createTransform` that strips `accessToken` and `refreshToken` from what's written to AsyncStorage, and a small `bootSessionFromSecureStore` thunk that loads them post-rehydration.

### Exact change set

**File:** `src/store/store.ts`

1. **Add the transform** to strip sensitive fields from the persisted `auth` slice:

   ```ts
   import { createTransform } from 'redux-persist';
   import type { AuthState } from './slices/authSlice';

   /**
    * Strip access/refresh tokens before writing the auth slice to AsyncStorage.
    * Tokens live in SecureStore (TokenStorage) only. On rehydrate we restore the
    * user profile from AsyncStorage and the tokens from SecureStore via a boot
    * thunk dispatched right after persistStore() completes.
    */
   const stripTokensTransform = createTransform<AuthState, AuthState>(
     // inbound (state → storage): scrub tokens
     (inboundState: AuthState) => ({
       ...inboundState,
       accessToken: null,
       refreshToken: null,
     }),
     // outbound (storage → state): also scrub, in case an older build wrote tokens
     // before this transform existed. Defense in depth.
     (outboundState: AuthState) => ({
       ...outboundState,
       accessToken: null,
       refreshToken: null,
     }),
     { whitelist: ['auth'] }
   );
   ```

2. **Wire the transform into `persistConfig`**:

   ```ts
   const persistConfig = {
     key: 'root',
     storage: AsyncStorage,
     whitelist: ['auth', 'subscription'],
     blacklist: [
       'api',
       'eventsApi',
       'cancelRequestsApi',
       'insuranceDocumentsApi',
       'context',
     ],
     throttle: 1000,
     transforms: [stripTokensTransform],
   };
   ```

**File:** `src/store/slices/authSlice.ts`

3. **Update the REHYDRATE matcher** so it does *not* consume tokens from the persisted payload (it now never has them). The user/onboarding state still rehydrates normally; tokens come in via the new thunk below.

   Find the matcher around lines 362–378 and replace its body with:

   ```ts
   builder.addMatcher(
     action => action.type === 'persist/REHYDRATE',
     (state, action: any) => {
       const persisted = action.payload?.auth;
       if (persisted?.user) {
         // Profile restored. Tokens come in via bootSessionFromSecureStore.
         state.user = persisted.user;
         state.isAuthenticated = true; // tentative; cleared if SecureStore is empty
       }
       state.isBootLoading = false;
     }
   );
   ```

4. **Add the new thunk** that reads tokens from SecureStore after rehydration:

   ```ts
   /**
    * Restore access/refresh tokens from SecureStore on cold launch.
    * Dispatched once, right after persistStore() finishes hydrating the
    * profile from AsyncStorage. If SecureStore has no token, we clear the
    * tentative isAuthenticated state set by the REHYDRATE matcher.
    */
   export const bootSessionFromSecureStore = createAsyncThunk(
     'auth/bootSessionFromSecureStore',
     async (_, { dispatch, rejectWithValue }) => {
       try {
         const [accessToken, refreshToken] = await Promise.all([
           TokenStorage.getAccessToken(),
           TokenStorage.getRefreshToken(),
         ]);
         if (!accessToken) {
           // No session in SecureStore — drop any tentative auth state.
           dispatch(clearAuth());
           return { accessToken: null, refreshToken: null };
         }
         return { accessToken, refreshToken };
       } catch (error: any) {
         return rejectWithValue(error?.message ?? 'SecureStore read failed');
       }
     }
   );
   ```

5. **Add the corresponding reducer cases**:

   ```ts
   builder
     .addCase(bootSessionFromSecureStore.fulfilled, (state, action) => {
       const { accessToken, refreshToken } = action.payload;
       state.accessToken = accessToken;
       state.refreshToken = refreshToken ?? null;
       // If tokens present, keep isAuthenticated; if not, REHYDRATE/clearAuth
       // already reset it.
       state.isAuthenticated = !!accessToken && !!state.user;
     })
     .addCase(bootSessionFromSecureStore.rejected, state => {
       // Read failed — treat as no session, do not crash boot.
       state.accessToken = null;
       state.refreshToken = null;
       state.isAuthenticated = false;
     });
   ```

**File:** `src/store/Provider.tsx`

6. **Dispatch the new thunk** after persistor bootstraps. Update the `ReduxProvider`:

   ```ts
   import { store, persistor } from './store';
   import { bootSessionFromSecureStore } from './slices/authSlice';
   // ... existing imports ...

   export const ReduxProvider: React.FC<ReduxProviderProps> = ({ children }) => {
     const [isReady, setIsReady] = useState(false);
     const { colors } = useTheme();

     useEffect(() => {
       let settled = false;

       const markReady = () => {
         if (!settled) {
           settled = true;
           // Kick off the SecureStore session restore. The reducer cases
           // above update the auth slice when it resolves. We do not await
           // this — boot should not block on it; the RootNavigator's
           // isBootLoading is already false by the time we get here.
           store.dispatch(bootSessionFromSecureStore() as any);
           setIsReady(true);
         }
       };

       const unsubscribe = persistor.subscribe(() => {
         const { bootstrapped } = persistor.getState();
         if (bootstrapped) {
           markReady();
           unsubscribe();
         }
       });

       if (persistor.getState().bootstrapped) {
         markReady();
       }

       const timeout = setTimeout(markReady, 2000);

       return () => {
         unsubscribe();
         clearTimeout(timeout);
       };
     }, []);

     return (
       <Provider store={store}>
         {isReady ? (
           children
         ) : (
           <View style={{ flex: 1, backgroundColor: colors.background }} />
         )}
       </Provider>
     );
   };
   ```

### One-time migration concern

Existing users on builds before this change have their tokens in AsyncStorage (via redux-persist) AND in SecureStore (via TokenStorage). After this change ships:

- The inbound transform will strip tokens on the next write, so AsyncStorage will eventually be clean.
- The outbound transform also scrubs tokens, so even if an old AsyncStorage payload is read, the in-memory state will not include them.
- The session restore reads from SecureStore, which has been populated all along. Existing logged-in users do **not** get logged out.

If for any reason `TokenStorage.getAccessToken()` returns null on a user who was previously logged in (e.g. SecureStore was wiped during a keychain reset), the thunk treats it as "no session" and the user has to sign in again. This is the correct fallback.

Add a short note in the PR description acknowledging this — anyone whose SecureStore got cleared but who still has a stale AsyncStorage profile will be bumped to LoginScreen on first launch of this build. That is the desired behavior.

### Edge cases to verify

- Existing logged-in user → AsyncStorage has user profile; SecureStore has tokens → REHYDRATE restores user; thunk restores tokens; user lands on Home as before. ✅
- Existing logged-in user whose SecureStore was wiped → REHYDRATE restores user; thunk finds null → `clearAuth` fires → user sees LoginScreen. ✅
- New install → AsyncStorage empty; SecureStore empty → REHYDRATE finds nothing; thunk finds null; user sees LoginScreen. ✅
- User signs in (post-change) → `loginUser.fulfilled` writes tokens to Redux (in-memory) AND `storeAuthData` writes them to SecureStore (durable) → next cold launch restores correctly. ✅
- User signs out → `logoutUser` clears Redux + clears SecureStore via `TokenStorage.clearAll()` → next cold launch is a clean LoginScreen. ✅
- Concurrent dispatch of `bootSessionFromSecureStore` (defensive) → only one read happens because the thunk is dispatched once from `ReduxProvider`'s `markReady`. ✅
- `getAccessToken` throws → `.rejected` case fires; auth state cleared; no crash. ✅

### Do not change

- `TokenStorage` itself. Its API is correct.
- The login/SSO/refresh thunks. They already write to SecureStore via `storeAuthData`/`storeTokens`.
- The whitelist entries beyond `auth` — `subscription` continues to persist normally.

---

## Phase 3 — Fix #3: Drop the auth.expo.io proxy + hardcode Google OIDC endpoints

### Goal

Google sign-in uses a native redirect via the custom URL scheme already registered in `app.json`. The OIDC discovery fetch is replaced with hardcoded endpoint constants. The code path is shorter, faster, and removes a third-party dependency on Expo's proxy.

### Background you'll need

- `app.json` line ~30 already registers the iOS reversed-client-ID URL scheme: `com.googleusercontent.apps.297265818886-fcm56mh33g7uubur983mgfhbav1jbtpc`. This is the iOS-client-ID-derived scheme that Google expects for native redirects when using `expo-auth-session`.
- `GOOGLE_IOS_CLIENT_ID` is declared in `SSOService.ts` (line 32) but currently unused. The comment correctly says "iOS client IDs are for the native Google Sign-In SDK only" — that comment was right for `@react-native-google-signin/google-signin`, but for `expo-auth-session` on native we *do* want to use the iOS client ID with the iOS reversed-client URL scheme as the redirect. The web client ID + Expo proxy is the older pattern we're replacing.
- The redirect URI Google expects for native is the reversed-client-ID format: `com.googleusercontent.apps.297265818886-fcm56mh33g7uubur983mgfhbav1jbtpc:/oauthredirect` (note the `:` and `/oauthredirect` suffix — `makeRedirectUri` builds this).

### Exact change set

**File:** `src/services/auth/SSOService.ts`

1. **Hardcode the Google OIDC endpoints** at the top of the file. Remove the `fetchDiscoveryAsync` import:

   ```ts
   import {
     makeRedirectUri,
     AuthRequest,
     ResponseType,
   } from 'expo-auth-session';
   import * as WebBrowser from 'expo-web-browser';
   import { Platform } from 'react-native';
   import { SSOUserData } from '../../types/auth';

   // Google's OIDC endpoints rarely change. Hardcoding skips a 200–500ms
   // discovery fetch on every sign-in. If Google ever rotates these, sign-in
   // will start failing with a clear "token exchange failed" error and we'll
   // see it in Sentry. Last confirmed against Google's public discovery doc
   // at https://accounts.google.com/.well-known/openid-configuration on
   // <DATE OF THIS PR>. Update the date when re-verifying.
   const GOOGLE_DISCOVERY = {
     authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
     tokenEndpoint: 'https://oauth2.googleapis.com/token',
     revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
   };
   ```

2. **Switch the native redirect URI to the reversed-client-ID scheme**:

   ```ts
   const GOOGLE_WEB_CLIENT_ID =
     '297265818886-cn0vu6f658teborvhfdpsjqs0t1q48dl.apps.googleusercontent.com';
   const GOOGLE_IOS_CLIENT_ID =
     '297265818886-fcm56mh33g7uubur983mgfhbav1jbtpc.apps.googleusercontent.com';

   // Native redirect uses the reversed iOS client ID scheme registered in
   // app.json's CFBundleURLTypes. No more auth.expo.io proxy.
   const GOOGLE_IOS_REDIRECT_SCHEME =
     'com.googleusercontent.apps.297265818886-fcm56mh33g7uubur983mgfhbav1jbtpc';
   ```

3. **Rewrite `signInWithGoogle`** to use the new path:

   ```ts
   async signInWithGoogle(): Promise<SSOUserData> {
     // Pick client + redirect per platform.
     // Web: web client ID, browser-page redirect via makeRedirectUri().
     // Native: iOS client ID, reversed-client-ID custom scheme redirect.
     const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
     const clientId = isNative ? GOOGLE_IOS_CLIENT_ID : GOOGLE_WEB_CLIENT_ID;
     const redirectUri = isNative
       ? makeRedirectUri({ scheme: GOOGLE_IOS_REDIRECT_SCHEME, path: 'oauthredirect' })
       : makeRedirectUri();

     const request = new AuthRequest({
       clientId,
       redirectUri,
       scopes: ['openid', 'profile', 'email'],
       responseType: ResponseType.Code,
       usePKCE: true,
     });

     const result = await request.promptAsync(GOOGLE_DISCOVERY);

     if (result.type === 'cancel' || result.type === 'dismiss') {
       throw new Error('User cancelled');
     }
     if (result.type !== 'success' || !result.params?.code) {
       throw new Error('Google Sign In failed');
     }

     const tokenResponse = await fetch(GOOGLE_DISCOVERY.tokenEndpoint, {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: new URLSearchParams({
         client_id: clientId,
         code: result.params.code,
         code_verifier: request.codeVerifier || '',
         grant_type: 'authorization_code',
         redirect_uri: redirectUri,
       }).toString(),
     });

     if (!tokenResponse.ok) {
       const errBody = await tokenResponse.text().catch(() => '');
       throw new Error(
         `Token exchange failed: ${tokenResponse.status} ${errBody}`
       );
     }

     const tokens = await tokenResponse.json();
     const accessToken = tokens.access_token;
     const idToken = tokens.id_token || '';

     if (!accessToken) {
       throw new Error('No access token received');
     }

     const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
       headers: { Authorization: `Bearer ${accessToken}` },
     });
     if (!res.ok) throw new Error('Failed to fetch Google user info');
     const info = await res.json();

     if (!info.id) throw new Error('No user ID from Google');

     return {
       provider: 'google',
       providerId: info.id,
       providerToken: idToken || accessToken,
       email: info.email || '',
       firstName: info.given_name || '',
       lastName: info.family_name || '',
     };
   }
   ```

4. **Lazy-require Apple Auth too while you're here** (this was a Tier 4 nit but it lives in the same file and the diff is tiny). Move the `require('expo-apple-authentication')` out of module scope into `isAppleSignInAvailable()`/`signInWithApple()`:

   ```ts
   // Top of file: remove the module-load require block (lines 19–26).

   // Replace isAppleSignInAvailable():
   async isAppleSignInAvailable(): Promise<boolean> {
     if (Platform.OS !== 'ios') return false;
     try {
       const AppleAuthentication = require('expo-apple-authentication');
       return await AppleAuthentication.isAvailableAsync();
     } catch {
       return false;
     }
   }

   // Replace signInWithApple() — first line becomes a fresh require:
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
     // ... rest of existing body unchanged from line ~53 onward ...
   }
   ```

### Google Cloud Console — coordination step (do NOT skip)

After the code change builds, but **before** you ship to TestFlight, verify in the Google Cloud Console (project `allroads-1282025`):

1. **iOS OAuth client** (`297265818886-fcm56mh33g7uubur983mgfhbav1jbtpc.apps.googleusercontent.com`) — confirm Bundle ID matches `com.muster.app`. No redirect URIs need to be configured on the iOS client itself; the reversed-client-ID custom scheme is implicit.
2. **Web OAuth client** (`297265818886-cn0vu6f658teborvhfdpsjqs0t1q48dl.apps.googleusercontent.com`) — confirm the authorized redirect URIs include whatever the current web build uses via `makeRedirectUri()`. **Do not remove** the existing `https://auth.expo.io/@cburnha7/muster` redirect URI until you have run a full TestFlight cycle with the new code path and confirmed it works on hardware. Once verified, that legacy URI can be removed in a follow-up change.

Document the state of both clients in the PR description with screenshots from the Google Cloud Console.

### Edge cases to verify

- New Google sign-in on iOS hardware → no Expo proxy hop; browser opens directly via the custom scheme; returns through `oauthredirect` → token exchange succeeds. ✅
- User cancels the Google sheet → `result.type === 'cancel'` → throws `'User cancelled'` → existing handler in LoginScreen does not show error. ✅
- Token exchange fails (network drop mid-flow) → caught error → Sentry event (via Tier 1 global handler if untcaught, or via existing catch in LoginScreen). ✅
- Apple sign-in still works → `require` is now lazy → first SSO tap triggers module init. ✅
- Apple Auth native module unavailable (rare; corrupted install) → require throws → caught → graceful error. ✅
- Web Google sign-in → still uses web client + `makeRedirectUri()` (page redirect); no change in behavior. ✅
- Discovery endpoints rotate (hypothetical) → token exchange fails with a clear error → we see it in Sentry → update constants. Acceptable trade-off for the per-call latency saved.

### Do not change

- `signInWithApple` body internals (only the require placement).
- The `SSOUserData` return shape.
- `LoginScreen.handleSSOLogin` — it consumes `SSOUserData` and doesn't care how we got there.

---

## Phase 4 — Fix #4: Disable serializableCheck + immutableCheck in production

### Goal

Dev builds keep both checks (they're valuable). Production builds skip them.

### Exact change set

**File:** `src/store/store.ts`

1. **Update the middleware factory** to pass `false` for both checks in production:

   ```ts
   export const store = configureStore({
     reducer: persistedReducer,
     middleware: getDefaultMiddleware =>
       getDefaultMiddleware({
         serializableCheck: __DEV__
           ? {
               ignoredActions: [
                 'persist/PERSIST',
                 'persist/REHYDRATE',
                 eventsApi.reducerPath,
               ],
               ignoredPaths: [
                 'events.events',
                 'bookings.bookings',
                 'facilities.facilities',
                 'teams.teams',
                 'leagues.leagues',
                 'matches.matches',
               ],
               isSerializable: (value: any) => {
                 if (value instanceof Date) return true;
                 return true; // existing escape hatch — flagged but preserved
               },
             }
           : false,
         immutableCheck: __DEV__,
       }).concat(
         resetApiCacheListenerMiddleware.middleware,
         api.middleware,
         eventsApi.middleware,
         cancelRequestsApi.middleware,
         insuranceDocumentsApi.middleware,
         contextRecoveryMiddleware
       ),
     devTools: __DEV__,
   });
   ```

   Note: I switched `devTools: process.env.NODE_ENV !== 'production'` to `devTools: __DEV__` for consistency with the other checks. Same effective behavior.

### Edge cases to verify

- Dev build → checks run; previously-passing actions continue to pass. ✅
- Prod build → checks do not run; no console warnings; dispatch is measurably faster on boot. ✅
- Adding a new slice with a non-serializable field in dev → still gets flagged. ✅

### Do not change

- The existing `ignoredActions` and `ignoredPaths` lists (preserved exactly inside the dev branch).
- The middleware concat order — `resetApiCacheListenerMiddleware.middleware` must run **before** the RTK Query middleware (preserved).

---

## Phase 5 — Tests (required, no shortcuts)

Add tests under `tests/`. Use existing `jest-expo` + `@testing-library/react-native` patterns.

### 5a. `tests/services/network/NetworkService.lazyInit.test.ts`

Required cases:

1. Importing the module does not call `window.addEventListener` (mock `window` for web) and does not call `setInterval`.
2. First `subscribe(listener)` call triggers `setInterval` exactly once.
3. Second `subscribe(listener)` call does NOT trigger `setInterval` a second time (`monitoringStarted` flag).
4. Unsubscribing the last listener calls `clearInterval`.
5. After teardown, a subsequent `subscribe()` re-arms the interval cleanly.
6. On web with `window` mocked, `online`/`offline` listeners are attached/detached symmetrically.

### 5b. `tests/store/persistence.tokenStripping.test.ts`

Required cases:

1. The `stripTokensTransform.in` function nulls `accessToken` and `refreshToken` on the way to storage.
2. The `stripTokensTransform.out` function nulls them on the way back out (defense in depth for old storage).
3. Other fields (`user`, `isBootLoading`, etc.) pass through untouched.
4. Simulate REHYDRATE with a legacy payload that contains tokens → after the transform runs, tokens are not present in the rehydrated state.

### 5c. `tests/store/slices/bootSessionFromSecureStore.test.ts`

Required cases:

1. With a valid token in SecureStore (mock TokenStorage) and a user in state, after the thunk resolves: `accessToken`, `refreshToken`, `isAuthenticated = true`.
2. With no token in SecureStore: `clearAuth` is dispatched; `isAuthenticated = false`.
3. With a token in SecureStore but no user in state: `isAuthenticated = false` (because `!!state.user` gates it).
4. SecureStore throws → `.rejected` case fires → state is cleared; no exception escapes.
5. The thunk is safely idempotent if dispatched twice (no double-clear).

### 5d. `tests/services/auth/SSOService.google.test.ts`

Required cases:

1. On iOS, `signInWithGoogle` uses the iOS client ID and the reversed-client-ID redirect URI. Mock `AuthRequest`; assert constructor args.
2. On web, `signInWithGoogle` uses the web client ID and `makeRedirectUri()` (no scheme override).
3. `fetchDiscoveryAsync` is NOT called anywhere (grep + spy).
4. Token exchange POSTs to `https://oauth2.googleapis.com/token` (hardcoded), not to a discovery-resolved endpoint.
5. User-cancel result type bubbles up as `Error('User cancelled')`.

### 5e. `tests/services/auth/SSOService.appleLazy.test.ts`

Required cases:

1. Importing `SSOService` does not load `expo-apple-authentication`. Spy on `require` (or use a manual mock that throws on import) and assert it is not called at module init.
2. First call to `isAppleSignInAvailable()` triggers the require.
3. Second call does not re-require (Node module cache handles this naturally).
4. On non-iOS, `isAppleSignInAvailable` returns `false` without calling the require.

### 5f. `tests/store/middleware.prodGating.test.ts`

Required cases:

1. With `__DEV__ = true`, the store's middleware stack includes the serializability check (test by dispatching a non-serializable action and asserting the console.warn fires).
2. With `__DEV__ = false`, the same dispatch does **not** warn.
3. `devTools` is enabled only in dev.

### 5g. Manual integration tests (real hardware before submission)

Do all of these. Document each result in the PR description.

1. **Cold launch authenticated** → user lands on Home; SecureStore restore works; no flicker of LoginScreen.
2. **Cold launch unauthenticated** → user lands on LoginScreen.
3. **Cold launch with SecureStore manually wiped** (use the iOS Settings → General → Reset → Reset Keychain on a dev device, or use a debug helper that clears it) → user lands on LoginScreen, not on Home with a stale profile.
4. **Sign in with Google on iOS hardware** → browser opens directly (no auth.expo.io); successful sign-in; correct profile data returned.
5. **Sign in with Apple on iOS hardware** → native Apple sheet opens; sign-in works; `expo-apple-authentication` was lazy-loaded.
6. **Sign in with email/password** → no regression.
7. **Sign out** → tokens cleared from SecureStore (confirm via debug helper); subsequent cold launch is clean.
8. **Network state UI** → unplug Wi-Fi on a Mac running the web build; confirm `OfflineFeatureWarning` shows; reconnect; warning hides. (On native, this remains a no-op until the NetInfo decision below is made.)
9. **Production build** via `eas build --platform ios --profile production` installed on hardware. Measure cold-launch time-to-Home for an authenticated user. Compare to the pre-Tier-3 measurement from the Tier 2 PR. Should be slightly faster due to (a) no constructor work in NetworkService, (b) no serializableCheck on REHYDRATE-triggered dispatches.
10. **AsyncStorage inspection** — use a debug build with a helper that dumps the AsyncStorage `persist:root` key. Confirm `auth.accessToken` and `auth.refreshToken` are `null` (or absent) in the dumped JSON.
11. **Sentry pass** — confirm no new errors during the test pass. The Tier 1 global handler should remain quiet.

---

## Phase 6 — Before/after verification

Attach to the PR:

- **AsyncStorage dump** (before and after). The "after" dump must show no token values under the `auth` key.
- **Google sign-in network trace** (before and after) on iOS hardware. Before: requests to `auth.expo.io` and `accounts.google.com/.well-known/openid-configuration`. After: neither — only `accounts.google.com/o/oauth2/v2/auth` (browser side) and `oauth2.googleapis.com/token`.
- **Google sign-in latency** measured tap → home, before vs. after. Expected savings: 500ms–2s.
- **Cold-launch trace** comparing the dispatch overhead of REHYDRATE in dev vs. prod (Hermes profiler).
- **Screen recording** of a Google sign-in on the new build, on iOS hardware.

---

## Phase 7 — Commit, push, rollback

Commit message (single commit):

```
refactor(boot+auth): lazy NetworkService, SecureStore-only tokens, native Google OAuth, prod-only RTK checks

- NetworkService no longer registers listeners or a polling timer at module
  load. Monitoring boots on first subscribe(); teardown clears on last
  unsubscribe. Same pattern as the Tier 1 AuthService lazy-init.
- Redux-persist stripTokensTransform removes accessToken/refreshToken from
  what's written to AsyncStorage. SecureStore (TokenStorage) is now the only
  durable token store. New bootSessionFromSecureStore thunk restores tokens
  into Redux after persistor rehydration, dispatched once by ReduxProvider.
- SSOService.signInWithGoogle uses native redirect via the iOS reversed-
  client-ID URL scheme (registered in app.json) instead of auth.expo.io.
  OIDC discovery is now hardcoded (no per-sign-in fetch). expo-apple-
  authentication is lazy-required.
- store.ts disables serializableCheck and immutableCheck in production
  builds. Dev behavior unchanged.

Tests: tests/services/network/NetworkService.lazyInit.test.ts,
       tests/store/persistence.tokenStripping.test.ts,
       tests/store/slices/bootSessionFromSecureStore.test.ts,
       tests/services/auth/SSOService.google.test.ts,
       tests/services/auth/SSOService.appleLazy.test.ts,
       tests/store/middleware.prodGating.test.ts
```

Then in PowerShell from `C:\Projects\AllRoads`:

```powershell
git add .
git commit -m "refactor(boot+auth): lazy NetworkService, SecureStore-only tokens, native Google OAuth, prod-only RTK checks"
git pull origin charles-dev --rebase
git push origin charles-dev
```

### Rollback notes

These four changes share a commit because the token-relocation is interlocked with the redux-persist transform and the new boot thunk — splitting them mid-PR is risky. But they are independently revertable later:

- **NetworkService lazy-init:** safe to revert alone if some consumer broke.
- **Token relocation:** if rolled back, AsyncStorage starts holding tokens again. Do not roll back without also reverting any auth-state migration assumptions in downstream PRs.
- **Google OAuth native redirect:** if it breaks for any reason, revert this single change and the previous `auth.expo.io` proxy path resumes — *provided* you have not yet removed the proxy URI from the Web OAuth client in Google Cloud Console. **Do not remove that proxy URI until at least one full TestFlight cycle on the new code path.**
- **RTK check gating:** trivially safe to revert; only affects performance.

If a partial revert is needed, do it as a separate PR with its own measurement.

---

## Out of scope — surface but do not fix

**NetworkService doesn't actually use NetInfo on native.** It reads `navigator.onLine` only, which on iOS effectively always returns `true`. So on a real iPhone with the Wi-Fi off, the app currently reports as "connected" anyway. The OfflineIndicator and SyncStatusCard UIs in this codebase are quietly broken on native. The right fix is to wire `expo-network` or `@react-native-community/netinfo`, but doing so is a behavior change and out of scope for this structural-cleanup PR. **Surface this in the PR description as an open question for Charles to decide on separately.** Do not silently extend scope.

---

## What "done" looks like

- All Phase 0 diagnostic output is in the PR description.
- All four code change sets are in place exactly as specified.
- All six test files are added and passing locally (`npm test`).
- All eleven manual integration tests documented with pass/fail in the PR description.
- AsyncStorage dump (before vs. after) attached.
- Google sign-in network trace (before vs. after) attached.
- Cold-launch and Google sign-in latency measurements attached.
- Google Cloud Console state documented (both iOS + Web clients) with screenshots.
- The "NetworkService does not use NetInfo on native" question surfaced explicitly in the PR description, with no behavior change in this PR.
- A successful EAS production build (`eas build --platform ios --profile production`) installed and exercised on physical iPhone hardware.
- No regressions in: cold launch (auth + authed paths), sign-in (email/pw, Apple, Google), sign-out, onboarding, deep-link invite capture, offline UI (web only; native unchanged per the out-of-scope note above).
- Sentry stays quiet during the manual test pass.

If any of those items is incomplete, the PR is not ready to merge. No exceptions.
