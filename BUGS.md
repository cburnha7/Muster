# Muster — Bug & Health Audit

**Date:** 2026-03-29
**Branch:** shoe-polish

---

## P0 — Blocks Launch

### P0-1: Dual AuthService with conflicting storage keys
**Area:** Auth architecture
`services/auth/AuthService.ts` stores tokens under `auth_token`, `refresh_token`, `user_data`.
`services/api/AuthService.ts` (+ `TokenStorage`) stores under `muster_access_token`, `muster_refresh_token`, `muster_user`.
Both are active in the app. They can disagree on auth state, causing ghost sessions, stale tokens, and login/logout inconsistencies.

### P0-2: Logout does not clear TokenStorage
**Area:** Auth — logout flow
`AuthContext.logout()` calls `auth/AuthService.clearStoredAuth()` which clears the `auth_token` keys — but never calls `TokenStorage.clearAll()`. The `muster_*` keys persist. On next app start, `loadCachedUser()` finds stale tokens and potentially re-authenticates with an invalidated session.

### P0-3: Two independent token refresh mechanisms that can race
**Area:** Auth — token refresh
RTK Query interceptor (`store/api.ts`) and Axios interceptor (`BaseApiService.ts`) both handle 401s independently. Depending on which API layer made the request, either or both can fire on the same 401, causing duplicate refresh calls, token overwrites, and potential session corruption.

### P0-4: `auth/AuthService.ts` still uses AsyncStorage on web
**Area:** Auth — web platform
Line 3 imports `AsyncStorage`, line 470-475 calls `AsyncStorage.removeItem()` on web. This contradicts the TOKEN_REFRESH_FIX which said AsyncStorage was removed. Only removed from `api/AuthService.ts`, not `auth/AuthService.ts`.

### P0-5: No database indexes on critical foreign keys
**Area:** Database performance
The following high-traffic columns have **zero indexes**:
- `Event.organizerId`, `Event.facilityId`, `Event.startTime`
- `Booking.userId`, `Booking.eventId`, `Booking.status`
- `FacilityCourt.facilityId`
- `Facility.latitude`, `Facility.longitude`

Every event listing, booking query, and facility search does a sequential table scan. This will collapse at scale.

### P0-6: Facility update/delete endpoints lack owner authorization
**Area:** Security
`server/src/routes/facilities.ts` lines 610 and 772 have `// TODO: Add authorization check — only owner can update/delete`. Currently any authenticated non-dependent user can update or delete any facility.

### P0-7: No `process.on('unhandledRejection')` handler
**Area:** Server stability
Express 4 does not catch rejected promises from async route handlers. No `express-async-errors` or async wrapper is used. No `unhandledRejection` or `uncaughtException` handlers are registered. An uncaught async error will crash the server silently.

---

## P1 — Bad UX / Significant Issues

### P1-1: HomeScreen has zero error handling
**Area:** Home screen
Lines 199-201, 210, 217-219 in `HomeScreen.tsx` have empty catch blocks. If bookings, debriefs, or invitations fetches fail, the user sees nothing — errors are silently swallowed.

### P1-2: HomeScreen loading state is bare text
**Area:** Home screen
Shows plain `"Loading..."` text with no spinner. Every other list screen uses `LoadingSpinner`.

### P1-3: ProfileScreen has no loading or error state
**Area:** Profile screen
Renders immediately from `useAuth()` context with no fallback for loading or fetch failures.

### P1-4: No consistent API error response shape
**Area:** Server — all routes
Four different error response patterns exist across 30 route files:
- Pattern A (majority): `{ error: string }`
- Pattern B (AuthController only): `{ error, message, statusCode }`
- Pattern C (events): `{ error, details }`
- Pattern D (cancel-requests): status derived from `error.message` string matching

**187** raw `res.status(500)` calls and **226** raw `res.status(400)` calls. No shared error utility, no `AppError` class, no error code enum.

### P1-5: No request validation middleware on any endpoint
**Area:** Server — all routes
Zero usage of zod, joi, yup, or any runtime validation library. All request body validation is manual inline `if (!field)` checks. TypeScript interfaces exist but provide no runtime safety.

### P1-6: ESLint is broken
**Area:** Build tooling
Config error: `ESLint couldn't find the config "@typescript-eslint/recommended" to extend from`. Lint cannot run at all.

### P1-7: 94 frontend test failures, 46 backend test failures
**Area:** Test suite
- Frontend: 49 of 89 suites failed, 94 of 723 tests failed
- Backend: 7 of 32 suites failed, 46 of 547 tests failed
- Backend failures partly caused by `EADDRINUSE` — `app.listen()` fires at import time in `src/index.ts`, conflicting with test server setup

### P1-8: Production debug logging not gated behind `__DEV__`
**Area:** Security / performance
`BaseApiService.ts` logs every request token, user ID, and headers. `AuthService.ts` logs token cache state on every `getToken()` call. `store/api.ts` logs `X-User-Id` header on every request. All fire in production.

### P1-9: Missing composite indexes for primary query patterns
**Area:** Database performance
No composite indexes for the most common filter combinations:
- `Event.[sportType, startTime]` — primary browse pattern
- `Event.[status, startTime]` — active/upcoming filter
- `Booking.[userId, status]` — user bookings page
- `Booking.[eventId, status]` — participant/debrief lookups
- `Facility.[ownerId, isActive]` — owner facility listings
- `TeamMember.[teamId, status]` — roster member counts

---

## P2 — Cosmetic / Code Health

### P2-1: SkeletonLoader is dead code
**Area:** Components
`SkeletonLoader` and `SkeletonForm` exist in `src/components/ui/SkeletonLoader.tsx` but are imported by zero screens.

### P2-2: No generic reusable EmptyState component
**Area:** Components
Every screen re-implements its own inline empty state with slightly different styling, icons, and CTAs. `EmptyHomeState` exists but is scoped only to HomeScreen.

### P2-3: EventsListScreen doesn't use shared ErrorDisplay
**Area:** Consistency
Has its own custom inline error UI while every other list screen uses `ErrorDisplay`.

### P2-4: Incomplete refactors — backup files left in repo
**Area:** Code hygiene
Three leftover files in `src/screens/facilities/`:
- `EditFacilityScreen.tsx.backup` (Mar 21)
- `EditFacilityScreen_new.tsx` (Mar 29, actively modified — refactor in progress)
- `GroundAvailabilityScreen.tsx.backup` (Mar 21)

### P2-5: Frontend tsconfig picks up server files
**Area:** Build
`server/src/scripts/assign-facilities-to-owner.ts` is included by the frontend tsconfig, causing 6 TS errors (TS1434, TS1005, TS1228).

### P2-6: Server tsconfig error
**Area:** Build
`server/tsconfig.json` uses `customConditions` with an incompatible `moduleResolution` setting → TS5098 error.

### P2-7: Global Express error handler is effectively bypassed
**Area:** Server
The error handler at `index.ts:156-184` exists but is never reached — every route catches its own errors and sends responses directly. No route calls `next(err)`.

### P2-8: AuthContext dependent fetch silently fails
**Area:** Auth
`context/AuthContext.tsx` line 102: dependent fetch uses `.catch(() => {})` — completely silent failure.

### P2-9: Missing indexes on lower-traffic foreign keys
**Area:** Database
- `User.guardianId`
- `Review.userId`, `Review.facilityId`
- `FacilityAvailability.facilityId`, `FacilityRateSchedule.facilityId`
- `FacilityAccessImage.facilityId`
- `Team.leagueId`
- `Match.eventId`, `Match.rentalId`
- `LeagueDocument.uploadedBy`, `CertificationDocument.uploadedBy`

---

## Status of Previous Fix Files

| Fix File | Status |
|----------|--------|
| `TOKEN_REFRESH_FIX.md` | ✅ Fully implemented in `api/AuthService.ts` and `store/api.ts` |
| `TOKEN_STORAGE_SYNC_FIX.md` | ✅ Fully implemented in `BaseApiService.ts` |
| `USER_ID_HEADER_FIX.md` | ✅ Fully implemented (frontend side) |
| `WEB_MAP_COMPATIBILITY_FIX.md` | ✅ Fully implemented with platform checks and fallback UI |

**However:** The fixes were applied to the `api/` layer but the `auth/` layer was not unified, leaving P0-1 through P0-4 as residual issues.

---

## Summary

| Severity | Count |
|----------|-------|
| **P0 — Blocks Launch** | 7 |
| **P1 — Bad UX** | 9 |
| **P2 — Cosmetic** | 9 |
| **Total** | 25 |
