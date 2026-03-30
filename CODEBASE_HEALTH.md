# Muster Codebase Health Audit

**Date:** 2026-03-29
**Branch:** shoe-polish
**Auditor:** Claude Code
**Status:** Tier 1 + Tier 2 fixes applied. Tier 3 remaining.

---

## Summary

| Category | Count | Severity |
|---|---|---|
| Dead files (safe to delete) | 43 | Low |
| Duplicate component groups | 12 | Medium |
| API mismatches (frontend config → no backend) | 11 | Critical |
| Raw fetch() calls bypassing service layer | 30+ | Medium |
| Hardcoded hex colors in .tsx files | 810 | Medium |
| TypeScript errors | 1,252 | Mixed |
| Uses of `: any` | 303 | Medium |
| console.log in frontend | 152 | Low |
| console.log in backend | 984 | Medium |
| Prisma models with missing cascade deletes | 7 | Critical |
| Backend TODOs in route handlers | 23 | Medium |
| Unused TS variable warnings | 175 | Low |
| ts-ignore/ts-expect-error | 1 | Low |

---

## Audit 1: Dead Code & Orphaned Files

### Frontend — Dead Components (18 files)

| File | Action |
|---|---|
| `src/components/dev/UserSwitcher.tsx` | Delete |
| `src/components/dues/BalanceStatusBadge.tsx` | Delete |
| `src/components/events/CourtSelector.tsx` | Delete |
| `src/components/events/DateEventList.tsx` | Delete |
| `src/components/events/RosterParticipantList.tsx` | Delete |
| `src/components/events/RosterSearchSection.tsx` | Delete |
| `src/components/events/TimeSlotPicker.tsx` | Delete |
| `src/components/home/EventSearchModal.tsx` | Delete (replaced by EventSearchPanel) |
| `src/components/home/PendingReservationsSection.tsx` | Delete |
| `src/components/league/CertificationForm.tsx` | Delete |
| `src/components/league/SuggestedDuesCalculator.tsx` | Delete |
| `src/components/profile/ContextSwitcher.tsx` | Delete |
| `src/components/profile/DependentsSection.tsx` | Delete |
| `src/components/rating/PlayerRatingCard.tsx` | Delete |
| `src/components/ui/AnimatedNumber.tsx` | Delete (never imported) |
| `src/components/ui/ErrorAnimation.tsx` | Delete |
| `src/components/ui/SkeletonLoader.tsx` | Delete (replaced by SkeletonBox) |
| `src/components/ui/SuccessAnimation.tsx` | Delete |

### Frontend — Dead Screens (12 files)

| File | Action |
|---|---|
| `src/screens/auth/RegisterScreen.tsx` | Delete (superseded by RegistrationScreen) |
| `src/screens/teams/AcceptGameChallengeScreen.tsx` | Delete |
| `src/screens/teams/CreateGameChallengeScreen.tsx` | Delete |
| `src/screens/teams/CreatePublicEventScreen.tsx` | Delete |
| `src/screens/teams/PublicEventDetailScreen.tsx` | Delete |
| `src/screens/events/VotePlayersScreen.tsx` | Delete |
| `src/screens/onboarding/FeatureOverviewScreen.tsx` | Delete |
| `src/screens/onboarding/GetStartedScreen.tsx` | Delete |
| `src/screens/onboarding/WelcomeScreen.tsx` | Delete |
| `src/screens/search/DiscoveryScreen.tsx` | Delete |
| `src/screens/leagues/PayLeagueDuesScreen.tsx` | Investigate (dues may be WIP) |
| `src/screens/teams/PayPlayerDuesScreen.tsx` | Investigate (dues may be WIP) |

### Frontend — Dead Services, Hooks, Types (6 files)

| File | Action |
|---|---|
| `src/services/api/BookingService.ts` | Delete (bookings go through RTK Query) |
| `src/services/mock/mockData.ts` + `index.ts` | Delete entire mock/ directory |
| `src/hooks/useColorScheme.ts` | Delete |
| `src/types/examples.ts` | Delete |
| `src/components/booking/index.ts` | Delete entire booking/ directory |
| `src/components/facilities/MapImageUploader.example.tsx` | Delete |

### Backend — Dead Files (4 files)

| File | Action |
|---|---|
| `server/src/middleware/active-context.ts` | Investigate |
| `server/src/middleware/rateLimiter.example.ts` | Delete |
| `server/src/services/CourtAvailabilityService.ts` | Delete |
| `server/src/services/RankingCalculationService.ts` | Investigate |

### Prisma — Unused Models

| Model | References | Action |
|---|---|---|
| `TeamTransaction` | 0 route/service references | Remove via migration |
| `Review` | Cleanup scripts only | Investigate |
| `FacilityAccessImage` | Cleanup scripts only | Investigate |
| `PlayerVote` | Cleanup scripts only | Investigate |

---

## Audit 2: Duplicate Components

### Critical Duplicates

1. **Button vs FormButton** — Two button components with different design systems. `Button.tsx` uses old theme (cobalt, heart, borderRadius 8). `FormButton.tsx` uses new M3 theme (primary, pill shape, haptics). **Action:** Deprecate Button.tsx, migrate all consumers to FormButton.

2. **SkeletonLoader vs SkeletonBox** — Two skeleton systems. SkeletonLoader uses opacity animation + old theme. SkeletonBox uses color interpolation + new theme. **Action:** Delete SkeletonLoader, migrate consumers.

3. **TeamCard and LeagueCard are structurally identical** — Same layout, same StyleSheet values, same patterns. Only differ in metadata text. **Action:** Consider shared ListItemCard base.

4. **BookingCard uses TouchableOpacity, not PressableCard** — The only card component still on the old interaction pattern. Also uses hardcoded colors and different borderRadius. **Action:** Migrate to PressableCard + design system.

### Duplicated Utility Functions

5. **`getSportIcon()` duplicated in 14+ files** — Same switch-case in TeamCard, EventCard, LeagueCard, FacilityCard, and detail screens. **Action:** Extract to `src/utils/sportUtils.ts`.

6. **`getSportColor()` duplicated AND inconsistent** — Cards have inline versions with DIFFERENT hex values than `sportColors.ts`. Basketball is `#E86825` in cards but `#FF6B35` in sportColors. **Action:** Reconcile to one source of truth in `sportColors.ts`.

7. **`formatSport()` duplicated in 4 files** — Capitalize + replace underscores. **Action:** Extract to shared utility.

8. **`formatDate()`/`formatTime()` duplicated in 30+ files** — Same toLocaleDateString/toLocaleTimeString patterns everywhere. **Action:** Extract to `src/utils/dateUtils.ts`.

### Pattern Inconsistencies

9. **EmptyState exists but 8+ screens roll their own** — Inline emptyState styles instead of using the shared component. **Action:** Migrate to shared EmptyState.

10. **Avatar rendering inline in 9+ files** — No shared Avatar component. Every screen builds its own circle + image/initial fallback. **Action:** Create `src/components/ui/Avatar.tsx`.

11. **LoadingSpinner vs ActivityIndicator** — 33 screens use LoadingSpinner (custom, old theme), 34 use raw ActivityIndicator. No consistent rule. **Action:** Standardize on one.

12. **14 modal components with no shared base** — Each builds its own backdrop/overlay. **Action:** Create BaseModal component.

---

## Audit 3: Naming Conventions

### Issues Found

1. **Backend service files: mixed PascalCase + kebab-case** — `AuthService.ts` vs `cancel-request.ts`, `connect-onboarding.ts`, `stripe-connect.ts`. **Fix:** Rename kebab-case to PascalCase.

2. **Component folder pluralization inconsistent** — `components/booking/` (singular) vs `components/bookings/` (plural), `league` (singular) vs `teams` (plural). **Fix:** Use plural consistently.

3. **Boolean naming: `isLoading` vs `loading`** — FormButton uses `loading` prop while Button uses `isLoading`. Most screens use `isLoading`. **Fix:** Standardize on `isLoading`.

4. **Backend Prisma import: two patterns** — `import { prisma } from '../index'` (singleton) vs `new PrismaClient()` (new instance per file). The latter creates unnecessary connection pools. **Fix:** Always use the singleton.

5. **Backend: service layer vs direct Prisma** — Some routes use services (`facilities.ts`, `leagues.ts`), others have 700+ lines of inline Prisma (`matches.ts`, `bookings.ts`). **Fix:** Extract inline Prisma to services.

6. **Backend success responses inconsistent** — Some routes wrap in `{ data: [...], pagination: {...} }`, others return arrays directly. **Fix:** Always wrap in `{ data }`.

7. **Old theme tokens still used in 8+ components** — `colors.cobalt`, `colors.ink`, `colors.heart`, `colors.gold` instead of `colors.primary`, `colors.onSurface`, `colors.error`. **Fix:** Migrate to M3 tokens.

8. **FormSelect uses hardcoded iOS colors** — `#007AFF`, `#FF3B30`, `#E8E8E8` instead of theme tokens. **Fix:** Retheme FormSelect.

---

## Audit 5: API Integration Alignment

### Frontend Endpoints That Don't Exist in Backend (11)

| Frontend Config | Backend Status |
|---|---|
| `/events/nearby` | No route (proximity via query params on /events) |
| `/events/recommended` | No route |
| `/facilities/nearby` | No route |
| `/facilities/:id/images` | No route (maps handled differently) |
| `/teams/nearby` | No route |
| `/teams/recommended` | No route |
| `/teams/:id/invite` | No route (use /add-member) |
| `/teams/:id/members/:userId/role` | No route |
| `/bookings/:id/cancel` | No route (cancel via DELETE on events) |
| `/notifications/*` (register, preferences, test) | Routes not mounted |
| `/search/events`, `/search/facilities` | Only /search/teams exists |

### Backend Routes Not in Frontend Config (22+)

Routes mounted but only accessed via raw `fetch()`: `/api/leagues`, `/api/matches`, `/api/seasons`, `/api/game-challenges`, `/api/public-events`, `/api/player-dues`, `/api/league-dues`, `/api/dependents`, `/api/promo-codes`, `/api/cancel-requests`, `/api/insurance-documents`, `/api/reservation-approvals`, `/api/escrow-transactions`, `/api/waivers`, `/api/courts`, `/api/rentals`, and more.

### Raw fetch() Bypassing Service Layer: 30+ instances

Most egregious: `CreatePublicEventScreen` (3 calls), `CreateGameChallengeScreen` (4 calls), `EventDetailsScreen` (3 calls), `CourtAvailabilityScreen` (5 calls).

---

## Audit 6: Prisma Schema Health

### Missing Cascade Deletes (Critical)

User deletion will BLOCK due to FK constraints on: `TeamMember`, `Booking`, `Review`, `FacilityRental`, `LeagueMembership`, `TeamTransaction`, `PromoCodeRedemption`. **Fix:** Add `onDelete: Cascade` or implement soft-delete.

### Missing Unique Constraints

- `User.phoneNumber` — no unique constraint
- `PromoCodeRedemption` — no `@@unique([userId, promoCodeId])`

### String Fields That Should Be Enums

15+ status fields use `String` instead of Prisma enums: `Event.status`, `Event.eventType`, `Event.skillLevel`, `Booking.status`, `Booking.paymentStatus`, `FacilityRental.status`, `Match.status`, `User.gender`, `User.membershipTier`, `LeagueMembership.memberType`, `BookingParticipant.role`.

---

## Audit 9: Style Consistency

### Key Findings

1. **810 hardcoded hex colors** in .tsx files — theme system exists but isn't fully adopted
2. **Spacing scale defined but unused** — 0 uses of `Spacing.*` in HomeScreen despite many padding/margin values
3. **iOS system colors in booking screens** — `#007AFF`, `#34C759`, `#FF3B30` conflict with the M3 design system
4. **50 legacy color aliases** in colors.ts add confusion — `cobalt` = `primary` = `pine` = `grass` all point to `#0052FF`
5. **152 console.log statements** in frontend, **984 in backend**

---

## Priority Fix Order

### Tier 1 — Critical (Fix First)
1. **Delete 43 dead files** — safest changes, immediate cleanup, reduces confusion
2. **Fix 7 cascade delete issues** — User deletion is currently broken
3. **Remove 11 phantom API endpoints** from frontend config — they cause silent 404s

### Tier 2 — High (Fix This Sprint)
4. **Consolidate Button → FormButton** — two competing components
5. **Extract duplicated sport utilities** (getSportIcon, getSportColor, formatSport) — 14+ duplications
6. **Fix FormSelect theming** — uses hardcoded iOS colors
7. **Standardize Prisma import** — remove `new PrismaClient()` instances
8. **Delete SkeletonLoader** (replaced by SkeletonBox)

### Tier 3 — Medium (Fix Next Sprint)
9. **Create shared Avatar component** — duplicated in 9+ files
10. **Create shared dateUtils** — duplicated in 30+ files
11. **Migrate booking screens to M3 colors** — iOS palette conflict
12. **Add missing Prisma enums** for status fields
13. **Move raw fetch() calls to service layer** — 30+ instances
14. **Rename backend kebab-case services** to PascalCase
15. **Migrate to shared EmptyState** — 8 screens with inline versions

### Tier 4 — Low (Nice to Have)
16. **Remove 152 frontend console.logs**
17. **Reduce 984 backend console.logs**
18. **Adopt Spacing tokens** across screens
19. **Remove legacy color aliases** from colors.ts
20. **Create BaseModal component** — 14 modals with no shared base
21. **Reduce `: any` usage** — 303 instances
