# Muster — Complete Feature Inventory & Persona Gap Analysis

## As of 2026-03-30, based on full codebase audit

---

# PART 1: FEATURE INVENTORY

Every feature below is documented from the actual code — Prisma models, API routes, screens, and components. Status labels:

- **Fully functional** — works end to end
- **Partially implemented** — UI exists but backend incomplete, or vice versa
- **Stubbed / Placeholder** — component exists but doesn't do anything real
- **Broken** — was built but currently doesn't work
- **Not implemented** — doesn't exist in the code

---

## 1. Authentication & Account

### Sign-Up (Fully functional)
- **Email/password registration** — 3-step wizard: (1) First Name + Last Name, (2) Email + Username, (3) Password + Terms agreement.
- **SSO registration** — Apple and Google sign-in via `registerWithSSO()`. SSO can be used instead of password at Step 3.
- **Account linking** — `POST /api/auth/link-account` lets a user link an SSO provider to an existing email account.
- **Rate-limited** — 3 registrations per 15 minutes.

### Sign-In (Fully functional)
- **Email/username + password** login with "Remember Me" toggle.
- **SSO login** — Apple and Google via `loginWithSSO()`.
- **Rate-limited** — 5 logins per 15 minutes.

### Token Management (Fully functional)
- JWT access tokens + refresh tokens (stored in `RefreshToken` model).
- `POST /api/auth/refresh` issues a new access token.
- `POST /api/auth/logout` invalidates the refresh token.
- Client-side token storage via AsyncStorage with a mutex lock preventing duplicate refresh races.

### Password Reset (Fully functional)
- `POST /api/auth/forgot-password` sends reset email (rate-limited: 3 per 15 min).
- `POST /api/auth/reset-password` accepts token + new password.
- `PasswordResetToken` model tracks token, expiry, and used status.
- `ResetPasswordScreen` includes password strength indicator.

### Account Deletion (Not implemented)
- The Settings screen references account management but there is **no delete-account API endpoint or screen**. The User model has no soft-delete or deactivation field.

---

## 2. Onboarding

### Flow (Fully functional — 5 steps)

| Step | Screen | What It Collects |
|------|--------|-----------------|
| 1 | IntentSelectionScreen | Multi-select intents: Player, Captain, Guardian, Commissioner, Facility Owner |
| 2 | SportSelectionScreen | Multi-select sports from a grid |
| 3 | LocationSetupScreen | Auto-detect geolocation or manual city/state entry; skip option |
| 4 | PersonaSetupScreen | Persona-specific action: set up team, add child, create league, add facility, or set skill level (for Player) |
| 5 | ProfileFinishScreen | Confirms completion, routes to entity creation if persona action selected |

- **User model fields**: `onboardingComplete`, `intents[]`, `sportPreferences[]`, `locationCity`, `locationState`, `locationLat`, `locationLng`.
- **API**: `GET /api/users/onboarding` checks status; `PUT /api/users/onboarding` marks complete.
- **Can it be skipped?** Location step can be skipped. Persona action can be deferred ("I'll do this later"). The overall flow cannot be bypassed — the app checks `onboardingComplete` at root navigation.
- **Can it be re-done?** Intents can be changed later from Settings (`PUT /api/users/intents`). Sport preferences can be edited on the profile. Location can be updated. The onboarding wizard itself cannot be re-run.

---

## 3. User Profiles

### User Model Fields
- **Identity**: id, email (nullable for dependents), username, password (nullable for SSO), firstName, lastName, displayName, phoneNumber, dateOfBirth, profileImage, gender.
- **Membership**: membershipTier, role (member/admin).
- **Ratings**: currentRating, pickupRating, leagueRating, totalGamesPlayed, pickupGamesPlayed, leagueGamesPlayed, ratingLastUpdated, ageBracket.
- **Location**: locationCity, locationState, locationLat, locationLng.
- **Onboarding**: onboardingComplete, intents[], sportPreferences[].
- **Dependent fields**: isDependent, guardianId, transferNotificationSent.
- **Trial**: trialTier, trialExpiry, trialNotified7d, trialNotified1d.
- **Payments**: stripeAccountId (Stripe Connect Express).
- **Tier**: tierTag (display badge).

### Profile Screen (Fully functional)
- Shows profile photo, name, stats (games played, salutes received, teams count).
- Recent games list.
- My teams list.
- Logout button.
- API: `GET /api/users/profile/stats` returns events organized, attended, bookings, teams.

### Edit Profile (Fully functional)
- Editable: photo (upload), first name, last name, email, phone, DOB, gender, sport preferences (multi-select), address with autocomplete.
- API: `PUT /api/users/:id` updates profile; `POST /api/users/profile/image` uploads photo.

### Sport Ratings (Fully functional)
- `PlayerSportRating` model tracks per-sport bracket and overall ratings, percentiles, event counts.
- `GET /api/users/sport-ratings/:userId` returns ratings.
- `SportRatingsSection` component displays them on the profile.

### Avatar/Photo (Fully functional)
- Upload via base64 or URL (`POST /api/users/profile/image`).
- Delete (`DELETE /api/users/profile/image`).
- `OptimizedImage` component with lazy loading.

---

## 4. Dependent / Family Management

### Dependent Creation (Fully functional)
- `POST /api/dependents` creates a dependent linked to guardian.
- `DependentFormScreen` collects: first name, last name, DOB, sport preferences, profile photo.
- Dependents are User records with `isDependent=true` and `guardianId` set.
- Dependents have nullable email and password (no login credentials).

### Dependent Listing & Editing (Fully functional)
- `GET /api/dependents` lists guardian's dependents.
- `GET /api/dependents/:id` and `PUT /api/dependents/:id` for viewing/editing.
- `DependentProfileScreen` shows dependent info, events, teams.

### Guardian Switching / Active User Context (Fully functional)
- `HeaderUserSelector` component in navigation lets guardian switch between self and dependents.
- `X-Active-User-Id` header sent on API requests to act on behalf of dependent.
- `useActiveUserId()` and `useDependentContext()` hooks manage client state.
- Home screen shows `FamilyPulseSection` with dependent activities.

### What Dependents Can't Do
- `requireNonDependent` middleware blocks dependents from: renting facilities, creating events (implied by rental route guard), and other financial actions.

### Age-Based Transfer (Partially implemented)
- `POST /api/dependents/:id/transfer` endpoint exists for when a dependent turns 18.
- `TransferAccountScreen` UI exists with dependent selection and confirmation.
- `transferNotificationSent` field on User tracks notification status.
- **Gap**: No automated trigger when dependent turns 18. Transfer must be manually initiated.

---

## 5. Events / Games

### Event Model Fields
- **Core**: id, title, description, sportType, skillLevel, eventType, status, startTime, endTime, maxParticipants, currentParticipants, price, equipment[], rules, imageUrl.
- **Eligibility**: eligibilityMinAge, eligibilityMaxAge, ageRestricted, minPlayerRating, genderRestriction, eligibilityIsInviteOnly, eligibilityRestrictedToTeams[], eligibilityRestrictedToLeagues[].
- **Privacy**: isPrivate, invitedUserIds[].
- **Invite-only**: minimumPlayerCount, wasAutoOpenedToPublic, autoOpenedAt.
- **Location**: facilityId, rentalId, timeSlotId.
- **League**: scheduledStatus, coveringTeamId, isGroupFeeCovered.
- **Cancellation**: cancellationReason.

### Event Types Supported
The `eventType` field accepts: pickup, practice, tournament, league game, and other string values. The `CreateEventScreen` wizard step 3 lets users select event type, gender, skill level, and age restrictions.

### Event Creation Wizard (Fully functional — 5 steps)

| Step | What It Collects |
|------|-----------------|
| 1 | Sport type selection (grid of sport icons) |
| 2 | Facility, court, date, time slot selection |
| 3 | Event type, gender restriction, skill level, age range |
| 4 | Visibility (public/private), max participants, price per person |
| 5 | Invite players and/or rosters |

- Facility selection queries `facilityService.getAuthorizedFacilities()` (facilities user owns + unused future rentals).
- Court/time slot availability checked via `facilityService.getAvailableSlots()`.
- Player/roster search for invitations.
- Private events set `isPrivate=true` and populate `invitedUserIds[]`.

### Event Discovery (Fully functional)
- `GET /api/events` supports filtering by: sportType, sportTypes (CSV), minPlayerRating, status, organizerId, userId, latitude/longitude/radiusMiles (Haversine distance), locationQuery, page/limit.
- `EventSearchPanel` on home screen with sport + location + radius filters.
- `EventSearchResultsScreen` displays filtered results.
- Private events are visibility-enforced: only organizer or invited users can view via `GET /api/events/:id`.

### RSVP / Booking (Fully functional)
- `eventService.bookEvent()` — join an event.
- `eventService.cancelBooking()` — cancel participation.
- `eventService.stepOut()` — remove self from event.
- `currentParticipants` counter auto-incremented on the Event model.
- `Booking` model tracks status, price, payment info.
- Waiver check: if facility requires waiver, user must sign before booking (`eventService.getWaiverStatus()`, `eventService.signWaiver()`).
- Insurance check: if facility requires insurance, user must have valid document.

### Participant Management (Fully functional)
- `GET /api/events/:id/participants` returns confirmed participants with roster mapping for game events.
- Event detail screen shows participant list with profiles.
- Organizer can view all participants.

### Eligibility Rules (Partially implemented)
- Data model supports: skill level, age range, gender restriction, invite-only, team/league restrictions, minPlayerRating (0-100 percentile).
- **Client-side**: CreateEvent wizard collects these settings.
- **Server-side enforcement**: The `GET /api/events` route filters by `minPlayerRating`. Private event access is enforced. However, age and gender restrictions appear to be **display-only** — no server-side validation prevents an ineligible user from booking.

### Equipment & Rules (Fully functional)
- `equipment` is a String array on Event.
- `rules` is a String field.
- Both displayed on EventDetailsScreen and editable via EditEventScreen.

### Pricing (Fully functional)
- `price` field on Event (per-person cost).
- `perPersonPrice` and `minAttendeeCount` on Booking for public events.
- Stripe integration for payment processing.

### Post-Game: Debrief & Salutes (Fully functional)
- `GET /api/debrief` returns events eligible for debrief (ended within 24h, no debrief submitted).
- `GET /api/debrief/:eventId` returns debrief details (participants, existing salutes, facility rating).
- `DebriefScreen` lets users give salutes to participants and rate the facility.
- `Salute` model: unique per (event, fromUser, toUser).
- `FacilityRating` model: 1-5 rating per (user, facility, event).
- `PlayerVote` model exists for voting on standout players.
- `GameParticipation` model tracks per-game stats (gameScore, votesReceived, votesCast, gameRating).

### Calendar Integration (Not implemented)
- No native calendar export (`.ics`) or OS calendar sync exists.
- The app has its own `EventsCalendar` component (react-native-calendars) for in-app display only.

---

## 6. Teams / Rosters

### Team Model Fields
- **Core**: id, name, description, sportType, sportTypes[], skillLevel, maxMembers, isPrivate, genderRestriction, imageUrl.
- **Financial**: balance, joinFee, joinFeeType ('one_time' or 'monthly'), stripeAccountId, lastBalanceUpdate.
- **Legacy**: leagueId (direct league link, superseded by LeagueMembership).

### Team Creation Wizard (Fully functional — 5+ steps)
- Sport selection, team name, gender/age/skill restrictions, visibility (public/private), max players, price (join fee), invite players.
- Feature-gated: requires Roster tier subscription. Shows `UpsellModal` if on Free plan.

### Roles (Fully functional)
- `TeamMember` model with `role` field: "captain", "co_captain", "member".
- `status` field: "active", "pending", "removed".
- Captain can: edit team, add/remove members, promote/demote.
- Co-captain: same as captain (enforced client-side, not differentiated server-side).
- Member: can view team details, leave team.

### Join Codes (Partially implemented)
- `JoinTeamScreen` exists with invite code input, validation, and join flow.
- `teamService.validateInviteCode()` and `teamService.joinTeam()` API calls from client.
- **Gap**: The server route for generating/validating invite codes is not clearly visible in the main routes file — this may rely on a code generation mechanism on the Team model or a separate utility not found in the primary route audit.

### Team Detail Screen (Fully functional)
- Shows team hero (sport, record, members count), member list, dues status per member.
- Tabs or sections for: Members, Roster info, Dues status.
- Actions: edit team, add/remove members, view team chat, pay dues, leave team.
- `GET /api/teams/:id` returns team with member details.
- `PUT /api/teams/:id` for updates.

### Roster Management (Fully functional)
- Add member: `AddMemberSearch` component with player search.
- Remove member: via team detail actions.
- Promote/demote: role changes.
- View member dues status: `playerDuesService.getPlayerDues()`.

### Team Wallet / Balance (Partially implemented)
- `balance` field on Team tracks USD balance.
- `TeamTransaction` model records: join_fee, top_up, booking_debit, refund with balance tracking.
- `stripeAccountId` for Stripe Connect.
- **Gap**: No top-up UI flow found. Balance is debited for bookings but the mechanism for crediting (beyond join fees) is unclear from client screens.

### Join Fees and Dues (Partially implemented)
- `joinFee` and `joinFeeType` on Team model.
- `PlayerDuesPayment` model tracks per-player, per-roster, per-season dues.
- `POST /api/player-dues` initiates payment (returns Stripe client secret).
- `POST /api/player-dues/:paymentId/confirm` confirms payment.
- `GET /api/player-dues/status` and `/roster-status` check payment status.
- `PayPlayerDuesScreen` exists for the payment flow.
- `DuesStatusBadge` component shows payment status.

### Team Challenges (Stubbed)
- `POST /api/game-challenges` endpoint exists — creates a game challenge (one roster challenges another for a pickup game).
- `GameChallengeService` exists on the client.
- **No dedicated UI screen** for browsing/accepting/managing challenges.

### Team Stats (Partially implemented)
- No W/L record computed directly on Team.
- `LeagueMembership` tracks matchesPlayed, wins, losses, draws, points, goalsFor, goalsAgainst, goalDifference — but these are league-level stats, not standalone team stats.
- Team detail screen shows member count but not a win/loss record outside of league context.

---

## 7. Leagues

### League Model Fields
- **Core**: id, name, description, sportType, skillLevel, leagueType ("team" or "pickup"), visibility ("public" or "private"), membershipFee.
- **Format**: leagueFormat ("season", "season_with_playoffs", "tournament"), playoffTeamCount, eliminationFormat ("single_elimination", "double_elimination"), gameFrequency.
- **Season**: seasonId, seasonName, startDate, endDate, isActive.
- **Points**: pointsConfig JSON (default: win=3, draw=1, loss=0).
- **Schedule**: suggestedRosterSize, registrationCloseDate, preferredGameDays[], preferredTimeWindowStart/End, seasonGameCount, scheduleGenerated, scheduleFrequency, autoGenerateMatchups.
- **Restrictions**: minPlayerRating, genderRestriction.
- **Certification**: isCertified, certifiedAt.
- **Pricing**: pricingType ("free" or "paid"), stripeConnectAccountId.
- **Lock**: lockedFromDeletion.

### League Creation Wizard (Fully functional — 6+ steps)
- Format selection (season, season with playoffs, tournament).
- Host/league name (auto-generates from host name).
- Sport selection.
- Season dates (start, end).
- Games per season.
- Preferred game days/times.
- Gender, age, skill restrictions.
- Visibility.
- Invite rosters.
- Feature-gated: requires League tier subscription.

### League Formats (Partially implemented)
- **Season** (round-robin): Fully functional. Schedule generation, matches, standings.
- **Season with playoffs**: Data model supports it (playoffTeamCount, eliminationFormat). Match model has bracket fields (bracketRound, bracketPosition, gameNumber, placeholderHome/Away, bracketFlag). **Playoff bracket generation and progression are not fully implemented in UI.**
- **Tournament**: Same bracket fields exist. **Tournament-only flow (no regular season) is not fully implemented.**

### Commissioner Powers (Fully functional)
- Edit league settings (`ManageLeagueScreen`).
- Invite rosters.
- Upload league documents (rules, waivers).
- Create matches (`CreateMatchScreen`).
- Record match results (`RecordMatchResultScreen`).
- Assign facilities to matches (`AssignFacilityScreen`).
- View roster strikes (`StrikeIndicator`).
- Delete league (with confirmation, blocked once matches are played).
- View league ledger/transactions (`LeagueLedger`).

### Team Registration (Fully functional)
- Commissioner invites rosters from `ManageLeagueScreen` (search and invite).
- `LeagueMembership` model tracks team-league relationship with status (active, pending, withdrawn).
- `GET /api/teams/:id/leagues` shows leagues a team belongs to.

### League Dues (Partially implemented)
- **Per-team (league dues)**: `POST /api/league-dues` initiates payment (roster manager pays commissioner). `POST /api/league-dues/confirm` confirms. Status endpoints exist.
- **Per-player (player dues)**: Separate flow via `POST /api/player-dues`.
- **Season model**: `pricingType`, `duesAmount`, `gamesPerTeam`, `avgCourtCost`, `suggestedMinDues`.
- `GET /api/seasons/suggested-dues` calculates minimum dues based on sport, games, and roster size.
- `PayLeagueDuesScreen` exists.
- **Gap**: The end-to-end flow of collecting dues from all players, tracking who has paid, and blocking unpaid rosters from playing is **partially wired** — individual payment and status endpoints work, but automated enforcement (block team if dues not paid) is not clear.

### Schedule Generation (Partially implemented)
- `scheduleGenerated` flag on League.
- `GET /api/users/leagues-ready-to-schedule` returns leagues ready for schedule generation.
- `SchedulingScreen` displays matches in a calendar view.
- **Gap**: The actual schedule generation algorithm (round-robin matchup creation) is not clearly exposed as a single API endpoint. Commissioner creates matches individually via `POST /api/matches`. `autoGenerateMatchups` field exists but the automation behind it is unclear.

### Match Creation & Score Reporting (Fully functional)
- `POST /api/matches` creates a match (leagueId, seasonId, homeTeamId, awayTeamId, scheduledAt, eventId, rentalId).
- `RecordMatchResultScreen` submits scores.
- Match model tracks: homeScore, awayScore, outcome (home_win, away_win, draw), status.

### Standings (Fully functional)
- `LeagueMembership` caches: matchesPlayed, wins, losses, draws, points, goalsFor, goalsAgainst, goalDifference.
- `StandingsTable` component and `StandingsTab` in league details.
- Points system configurable via `pointsConfig` JSON (default: 3/1/0).

### Playoffs & Brackets (Partially implemented)
- Match model has full bracket support: `bracketRound`, `bracketPosition`, `gameNumber`, `placeholderHome/Away`, `bracketFlag`.
- `playoffTeamCount` and `eliminationFormat` on League.
- **Gap**: No dedicated bracket visualization UI. No automated bracket progression (advancing winners to next round). Bracket fields exist in the data model but the full playoff experience is not built.

### League Documents (Fully functional)
- `LeagueDocument` model: fileName, fileUrl, fileSize, mimeType, documentType (rules, schedule, other).
- `DocumentUploadForm` component for uploading.
- `DocumentViewerScreen` for viewing.
- Commissioner uploads from `ManageLeagueScreen`.

### Facility Assignment (Fully functional)
- `AssignFacilityScreen` lets commissioner assign a facility/court to a match.
- Match model has `rentalId` for linking to facility rental.

### League Deletion (Fully functional)
- `GET /api/leagues/:id/deletion-preview` previews impact.
- `LeagueDeletionConfirmScreen` for confirmation.
- `lockedFromDeletion` prevents deletion after matches are played.

### Certification (Partially implemented)
- `isCertified` and `certifiedAt` on League.
- `CertificationDocument` model (bylaws, board_of_directors with JSON boardMembers).
- **Gap**: No UI flow for submitting or managing certification documents. Filter `isCertified` exists on league browse endpoint.

---

## 8. Facilities / Grounds

### Facility Model Fields
- **Core**: id, name, description, sportTypes[], amenities[], imageUrl, rating, pricePerHour, isActive, isVerified, verificationStatus.
- **Contact**: contactName, contactPhone, contactEmail, contactWebsite.
- **Address**: street, city, state, zipCode, country, latitude, longitude.
- **Booking Config**: minimumBookingHours, bufferTimeMins, slotIncrementMinutes (30 or 60), requiresBookingConfirmation, requiresInsurance.
- **Access**: accessInstructions, parkingInfo, facilityMapUrl, facilityMapThumbnailUrl.
- **Cancellation**: noticeWindowHours, teamPenaltyPct, penaltyDestination, cancellationPolicyHours.
- **Waiver**: waiverRequired, waiverText, waiverVersion.
- **Payments**: stripeConnectAccountId.

### Facility Creation Wizard (Fully functional — 3+ steps)
- Facility info (name, address, contact).
- Courts management (add multiple courts).
- Hours of operation.
- Amenities, pricing, cancellation policy.
- Duplicate detection modal.
- Feature-gated: requires Ground Basic or Ground Pro subscription.

### Court Management (Fully functional)
- `FacilityCourt` model: name, sportType, capacity, isIndoor, isActive, pricePerHour (override), displayOrder, boundaryCoordinates (JSON for map).
- `POST /api/facilities/:facilityId/courts` creates courts.
- `ManageGroundScreen` for CRUD operations.
- `AddCourtScreen` for new courts.
- `EditCourtModal` for editing.
- `CourtListManager` component manages the list.

### Availability Scheduling (Fully functional)
- `FacilityAvailability` model: recurring (dayOfWeek + time) or one-time (specificDate).
- `FacilityCourtAvailability`: per-court availability, supports blocking with reason.
- `FacilityTimeSlot`: specific date/time slots with status (available, blocked, rented) and price.
- `GroundAvailabilityScreen` for facility-wide availability.
- `CourtAvailabilityScreen` for viewing and booking slots.
- `TimeSlotGrid` component for visual slot display.
- `BlockTimeSlotModal` for blocking slots.

### Booking/Rental Flow (Fully functional)
- `POST /api/facilities/:facilityId/courts/:courtId/slots/:slotId/rent` creates a rental.
- `FacilityRental` model: status (pending_approval, confirmed, cancelled, completed, no_show), payment tracking, escrow, cancellation details, recurring/bulk booking support.
- `RecurringBooking` model supports weekly/monthly recurring rentals.
- Insurance check enforced if facility requires it.
- Booking confirmation check if facility requires manual approval.
- `RentalConfirmationModal`, `BulkBookingConfirmationModal` for confirmation flows.

### Reservation Approval (Fully functional)
- `GET /api/reservation-approvals` lists pending rentals for facility owner.
- `POST /api/reservation-approvals/:rentalId/approve` and `/deny`.
- `MyRentalsScreen` and `PendingReservationDetailsScreen` for owner management.
- `OwnerReservationsSection` component.

### Cancellation Policies (Fully functional)
- Configurable: `cancellationPolicyHours`, `noticeWindowHours`, `teamPenaltyPct`, `penaltyDestination`.
- `CancellationPolicyScreen`, `CancellationPolicyForm`, `CancellationPolicyPicker`, `CancellationPolicyDisplay` components.
- `CancelRequest` model for cancellation request workflow (pending > approved/denied).
- `CancelReservationModal` for user-initiated cancellation.
- `DELETE /api/rentals/:rentalId` applies refund policy.

### Insurance Documents (Fully functional)
- `POST /api/insurance-documents` uploads document (PDF/JPEG/PNG, max 10MB).
- `GET /api/insurance-documents` lists documents with status filter.
- `InsuranceDocument` model: documentUrl, policyName, expiryDate, status.
- `InsuranceDocumentForm`, `InsuranceDocumentsSection`, `InsuranceDocumentSelector` components.
- Rentals can attach insurance: `attachedInsuranceDocumentId` on `FacilityRental`.

### Waivers (Fully functional)
- `GET /api/waivers/facility/:facilityId` returns waiver text.
- `GET /api/waivers/facility/:facilityId/status` checks if user has signed.
- `POST /api/waivers/sign` records signature with IP address.
- `WaiverSignature` model: unique per (user, facility, waiverVersion).

### Facility Verification (Partially implemented)
- `FacilityVerification` model: status (pending, approved, rejected, expired), review notes.
- `VerificationDocument` model for supporting documents.
- Admin routes: `GET /api/admin/verifications/pending`, `PUT /api/admin/verifications/:id/review`.
- **Gap**: No facility-owner-facing UI to submit verification documents. Admin review is API-only (no admin panel UI).

### Ratings & Reviews (Partially implemented)
- `Review` model: rating (int), comment, userId, facilityId.
- `FacilityRating` model: 1-5 rating per (user, facility, event) — used in post-game debrief.
- `rating` field on Facility (computed average).
- **Gap**: No standalone review/rating screen for facilities. Ratings are only collected via post-game debrief. No way to browse facility reviews.

### Map View (Fully functional)
- `FacilityMapView`, `GroundsMapView`, `GroundsMapViewWrapper` components.
- `ViewToggle` component to switch between list and map views.
- `GroundMapPreview` for facility detail screen.
- Latitude/longitude stored on Facility with index.
- `FacilityMapEditorScreen` for uploading facility map images.

### Pricing (Fully functional)
- `pricePerHour` on Facility (base rate).
- `pricePerHour` override on `FacilityCourt`.
- `FacilityRateSchedule` model: supports base, peak, seasonal, discount rates with day-of-week and time-of-day targeting, priority levels.
- `price` field on `FacilityTimeSlot` for slot-specific pricing.

### Escrow System (Fully functional)
- `EscrowTransaction` model: types include authorization, capture, surplus_payout, shortfall_charge, refund.
- `GET /api/escrow-transactions` returns transaction log.
- `EscrowTransactionLog` component displays transaction history.
- `escrowBalance` tracked on `FacilityRental`.

---

## 9. Messaging

### Conversation Types (Fully functional)
- `ConversationType` enum: TEAM_CHAT, GAME_THREAD, LEAGUE_CHANNEL, DIRECT_MESSAGE.
- `Conversation` model: type, entityId (team/event/league ID), name, pinnedMessageId, isArchived, parentConversationId (sub-channels).

### Conversation Creation (Fully functional)
- **Team chat**: `POST /api/conversations/team/:teamId` — get-or-create, requires team membership.
- **Game thread**: `POST /api/conversations/event/:eventId` — get-or-create, requires event participation.
- **DM**: `GET /api/conversations/dm/:userId` — get-or-create, requires shared context (same team or event).
- **League channel**: Supported by data model and enum, endpoint exists.
- **New conversation**: `NewConversationScreen` lets users start DMs or team chats by browsing teams and recent players.

### Conversation List (Fully functional)
- `ConversationListScreen` with filter tabs: All, Teams, Games, Leagues, DMs.
- Shows avatar, name, last message preview, unread count.
- Mute/unmute via `conversationService.setMuted()`.
- `FloatingActionButton` for creating new conversations.
- Polling for conversation updates.

### Chat Screen (Fully functional)
- `ChatScreen` with message bubbles (own vs others), day headers, system messages.
- **Send messages**: text input with send button.
- **Edit/delete**: own messages only.
- **Reactions**: `ReactionPicker` component, `MessageReaction` model (unique per message+user+emoji).
- **Pinning**: admin can pin messages, `PinnedMessageBanner` displayed.
- **Reply threads**: `replyToId` on Message model supports threading.
- **System messages**: `MessageType.SYSTEM` for automated messages (member joined, etc.).
- **Message priority**: `MessagePriority` enum (NORMAL, URGENT).
- **Optimistic updates**: messages appear instantly before server confirmation.
- **Polling**: 30-second interval for new messages.

### Unread Tracking (Fully functional)
- `GET /api/conversations/unread-count` returns total unread count.
- `lastReadAt` on `ConversationParticipant` tracks read position.
- `conversationService.markRead()` updates read position.

### Muting (Fully functional)
- `isMuted` on `ConversationParticipant`.
- Toggle from conversation list (long-press actions).

### Archiving (Partially implemented)
- `isArchived` field on Conversation model.
- **Gap**: No UI for archiving/unarchiving conversations.

---

## 10. Payments

### Stripe Integration (Fully functional)
- **Stripe Webhooks**: `POST /api/stripe/webhooks` handles subscription events, payment intents, transfers.
- **Stripe Connect**: Two flows:
  - User-level: `POST /api/stripe/connect/onboard` for individual users.
  - Entity-level: `POST /api/connect/onboard` for rosters, facilities, leagues (returns Stripe account link URL).
  - `GET /api/connect/status/:entityType/:entityId` checks onboarding status.
  - `GET /api/connect/accounts` lists user's Connect accounts.

### What Can Be Paid For
- **Facility rentals**: via rental creation flow.
- **Event fees**: price on Event, collected via booking.
- **Player dues**: per-player, per-roster, per-season via `/api/player-dues`.
- **League dues**: roster-to-commissioner via `/api/league-dues`.
- **Team join fees**: via team join flow (join_fee on Team).
- **Public event per-person fees**: via booking with perPersonPrice.

### Promo Codes (Fully functional)
- Admin creates: `POST /api/admin/promo-codes`.
- User validates: `POST /api/promo-codes/validate`.
- User redeems: `POST /api/promo-codes/redeem` with selected tier.
- `PromoCode` model with trialDurationDays, `PromoCodeRedemption` tracks usage.
- `RedeemCodeScreen` UI exists.

### Transaction History (Partially implemented)
- `PurchaseHistorySection` component exists in profile.
- `TeamTransaction`, `LeagueTransaction`, `EscrowTransaction` models track different transaction types.
- **Gap**: No unified transaction history screen across all payment types.

### Refund Handling (Partially implemented)
- Webhook handler has `transfer.reversed` with a TODO comment.
- Cancellation policies apply refund percentages.
- `EscrowTransaction` supports "refund" type.
- **Gap**: Full refund flow (user-initiated, admin-processed) is not end-to-end in the UI.

---

## 11. Subscriptions

### Tiers (Fully functional in data model)
- **Free**: Default tier.
- **Roster** ($10/mo): Create and manage teams.
- **League** ($25/mo): Create and manage leagues.
- **Ground Basic** ($40/mo): List and manage basic facilities.
- **Ground Pro** ($75/mo): Advanced facility features.

### Subscription Model
- `Subscription`: plan, status (active, past_due, cancelled, trialing), stripeCustomerId, stripeSubscriptionId, stripePriceId, currentPeriodStart/End, cancelAtPeriodEnd.
- `GET /api/subscriptions/:userId` returns subscription (defaults to free).
- `POST /api/subscriptions` creates/updates after Stripe checkout.

### Feature Gating (Fully functional)
- `useFeatureGate()` hook checks if feature is available for current plan.
- `UpsellModal` component shows required plan and upgrade CTA.
- `PLAN_HIERARCHY` and `PLAN_INFO` define tier ordering and features.
- Feature gates enforced on: team creation (Roster), league creation (League), facility creation (Ground Basic/Pro).

### Trial Periods (Partially implemented)
- User model has `trialTier`, `trialExpiry`, `trialNotified7d`, `trialNotified1d`.
- Promo code redemption sets trial tier and expiry.
- **Gap**: No Stripe trial integration. Trials are managed via promo codes only.

### Upgrade/Downgrade Flow (Partially implemented)
- UpsellModal links to Stripe checkout.
- **Gap**: No in-app subscription management screen (change plan, cancel, view billing history). Users presumably manage via Stripe's customer portal.

---

## 12. Notifications

### Push Notification Infrastructure (Partially implemented)
- Expo Notifications configured: permission requests (iOS/Android), token registration, foreground/background listeners, badge management.
- `NotificationService` handles scheduling and cancellation.
- `NotificationProvider` wraps the app.
- `useNotifications()` hook for component access.
- **Gap**: Token is registered client-side but **backend push delivery is not implemented** — no endpoint receives device tokens, no server-side push sending logic found. Notifications are currently **local-only** (scheduled on device, not triggered by server events).

### What Events Trigger Notifications
- **Local notifications**: Event reminders can be scheduled on-device.
- **Server-triggered push**: Not implemented. No notification when: a message is received, a game score is posted, a booking is confirmed, a team invite arrives, etc.

### Notification Preferences (Stubbed)
- `NotificationPreferencesScreen` exists with toggles for: event reminders, event updates, new event alerts, marketing emails, push notifications.
- **The API calls (`getNotificationPreferences()`, `updateNotificationPreferences()`) are noted as "not yet implemented" in the screen code.** The toggles render but don't persist.

### In-App Notification Center (Not implemented)
- No notification feed, bell icon, or notification center exists.
- `InboxSection` on home screen shows invitations and cancel requests, but this is not a general notification system.

---

## 13. Search

### Event Search (Fully functional)
- `EventSearchPanel` on home screen.
- `SearchBar` component with filter modal (sport type, skill level, price range, date range).
- Server-side filtering via `GET /api/events` with location radius (Haversine), sport, skill, status.
- `EventSearchResultsScreen` displays results.

### Team Search (Fully functional)
- `GET /api/search/teams?query=<string>` — server-side search by name.
- `TabSearchModal` for team search from Teams tab.

### League Search (Fully functional)
- `GET /api/leagues?search=<string>` with sport and certification filters.
- Browseable from `LeaguesBrowserScreen`.

### Facility Search (Fully functional)
- `GET /api/facilities?sportType=<string>` with sport filter.
- `FacilitiesListScreen` with sport filter chips and "free only" toggle.

### User/Player Search (Fully functional)
- `GET /api/users/search?query=<string>` — search by name or email.
- Used in: team member invites, event invites, new conversation creation.

### Unified Search (Partially implemented)
- `SearchService` on client supports multi-entity search with unified filters.
- `TabSearchModal` provides tabbed search UI.
- **Gap**: No single global search bar that searches across all entity types simultaneously.

---

## 14. Settings

### Settings Screen (Fully functional)
- Account info display.
- **Intents/personas management**: toggle interests (player, captain, guardian, commissioner, facility owner).
- **Connected accounts**: view linked SSO providers (Apple, Google), disconnect option.
- **Insurance documents**: upload and manage.
- **Purchase history**: view past transactions.
- **Edit dependent profiles**: navigate to dependent form.
- **Promo code redemption**: navigate to redeem screen.
- **Account transfer**: navigate to transfer screen (for dependents aging out).
- **Terms, privacy, support links**.
- **Logout**.

### Dark Mode (Not implemented)
- No dark mode toggle, theme switching, or dark color scheme anywhere in the codebase.

### Location Services (Fully functional)
- Location permissions requested during onboarding.
- Location used for event/facility discovery.
- `LocationService` manages geolocation.

### Stripe Connect Setup (Fully functional)
- `UserConnectSection` and `ConnectAccountsSection` components in profile/settings.
- Onboarding flow redirects to Stripe.

---

## 15. Admin

### Admin Routes (Partially implemented)
- `GET /api/admin/verifications/pending` — list pending facility verifications.
- `PUT /api/admin/verifications/:id/review` — approve/reject with notes.
- `POST /api/admin/promo-codes` — create promo codes.
- `GET /api/admin/promo-codes` — list all promo codes.
- `POST /api/logs` and `GET /api/logs` — app logging.

### Admin UI (Not implemented)
- **No admin panel or admin screens exist.** All admin actions are API-only.
- The `role` field on User supports "admin" but no admin-specific navigation or screens are built.

---

## 16. Offline & Sync

### Offline Support (Partially implemented)
- `OfflineService` provides data caching (50MB limit, TTL management).
- `OfflineQueueService` queues actions for later sync.
- `SyncManager` orchestrates syncing.
- `NetworkService` detects online/offline state.
- `OfflineIndicator` banner and `OfflineFeatureWarning` component.
- `SyncStatusCard` shows sync state.
- `useOfflineCapability()` hook.
- **Gap**: The infrastructure exists but the depth of offline support (which screens work offline, what data is cached) is not deeply integrated across all features.

---

## 17. Monitoring & Logging

### App Logging (Fully functional)
- `AppLog` model: logType (validation, button, error, api_error), message, userId, screen, metadata JSON.
- `POST /api/logs` accepts single or batch entries.
- `GET /api/logs` queries logs with filters.
- `LoggingService` on client for centralized logging.

### Crash Reporting (Stubbed)
- `CrashReportingService` exists with device/app info collection.
- **Marked as ready for Sentry/Bugsnag integration but not connected to any service.**

### Performance Monitoring (Stubbed)
- `PerformanceMonitoringService` tracks metrics.
- Utility functions in `performance.ts`.
- **Not connected to an external APM service.**

---

## 18. Public Events & Game Challenges

### Public Events (Partially implemented)
- `POST /api/public-events` creates a public event with per-person price and minimum attendee count.
- Roster manager creates the event; price and minimum enforced.
- `PublicEventService` on client.
- **Gap**: No dedicated public events browsing screen. Public events appear in general event search.

### Game Challenges (Stubbed)
- `POST /api/game-challenges` creates a challenge (one roster challenges another).
- `GameChallengeService` on client.
- **No UI for browsing, accepting, or managing challenges.**

---

## Data Model Summary: 35 Prisma Models

| Model | Purpose |
|-------|---------|
| User | Core user with auth, ratings, location, dependent support |
| Event | Games/practices/tournaments with eligibility and privacy |
| Facility | Venues with courts, availability, waivers, insurance |
| Team | Rosters with balance, join fees, Stripe Connect |
| League | Organized play with formats, points, certification |
| TeamMember | Team membership with roles |
| Booking | Event participation with payment tracking |
| BookingParticipant | Multi-party booking with escrow |
| Review | Facility reviews |
| FacilityRating | Post-game facility ratings |
| FacilityVerification | Admin verification workflow |
| VerificationDocument | Supporting docs for verification |
| FacilityRateSchedule | Dynamic pricing rules |
| FacilityAvailability | Facility-level time availability |
| FacilityAccessImage | Facility photos |
| FacilityCourt | Individual courts within facilities |
| FacilityCourtAvailability | Per-court availability |
| FacilityTimeSlot | Bookable time slots |
| FacilityRental | Court rentals with escrow and cancellation |
| CancelRequest | Cancellation request workflow |
| RecurringBooking | Recurring rental series |
| GameParticipation | Per-game player stats |
| PlayerVote | Post-game player voting |
| Salute | Post-game player recognition |
| LeagueMembership | Team-league join with standings cache |
| Match | League/tournament matches with bracket support |
| Season | League seasons with pricing |
| RosterStrike | Team penalty tracking |
| LeagueDocument | League rules/schedule uploads |
| CertificationDocument | League certification docs |
| RefreshToken | Auth refresh tokens |
| PasswordResetToken | Password reset tokens |
| TeamTransaction | Team wallet ledger |
| LeagueTransaction | League financial ledger |
| PlayerDuesPayment | Per-player dues tracking |
| Subscription | User subscription plan |
| PromoCode | Admin-created promo codes |
| PromoCodeRedemption | Code redemption tracking |
| InsuranceDocument | User insurance uploads |
| EscrowTransaction | Rental escrow ledger |
| WaiverSignature | Facility waiver signatures |
| PlayerSportRating | Per-sport player ratings |
| AppLog | Application event logging |
| Conversation | Chat conversations |
| ConversationParticipant | Chat membership |
| Message | Chat messages |
| MessageReaction | Message reactions |

---
---

# PART 2: PERSONA-BASED GAP ANALYSIS

---

## Persona A: Coach Mike

**Mike is the volunteer head coach of the New Gloucester Spring Soccer U12 team. He has 14 kids on his roster (ages 10-12). The league has 8 teams, plays games on Saturdays, and practices Tuesday and Thursday evenings.**

---

### 1. Pre-Season Setup

#### Creating the team

Mike opens Muster, signs up (email/password or Google), completes onboarding selecting "Captain" intent and "Soccer" sport. At Step 4 he's prompted to "Set up team" — this routes him to the `CreateTeamScreen` wizard.

**What works:**
- Mike can name his team "New Gloucester Spring Soccer U12".
- He can select Soccer as the sport.
- He can set skill level (Beginner/Intermediate/Advanced).
- He can set a max of 14 members.
- He can make the team public or private.

**What's missing:**
- **No age bracket field on Team.** There's no "U12" designation. The `genderRestriction` field exists but no `ageGroup` or `ageRange`. Mike can put "U12" in the description but it's not structured data.
- **No "youth team" designation.** Nothing distinguishes a kids' team from an adult team in the data model.
- **Subscription required.** Team creation requires the Roster tier ($10/mo). Mike — a volunteer coach — hits a paywall before he can even set up his team. This is a **major friction point**. A volunteer coach for a youth league will not want to pay $10/month for the privilege of organizing.

#### Adding 14 kids to the roster

This is where things get complicated. There are two paths:

**Path A — Mike adds kids as dependents (not practical):**
Mike would have to create 14 dependent profiles himself. But dependents are tied to a guardian account — Mike isn't the guardian/parent. This path doesn't work for a coach.

**Path B — Parents sign up and join (the intended flow):**
Each parent downloads Muster, creates an account, adds their child as a dependent, and joins Mike's team via an invite code. This means:
- Mike creates the team and gets an invite code.
- Mike texts/emails the code to 14 families.
- Each parent signs up (3-step registration), completes onboarding (5 steps), adds their child as a dependent (DependentFormScreen), then navigates to JoinTeamScreen and enters the code.
- Each parent switches to their child's profile context and joins the team as the child.

**Realistic friction:** This is **8-10 steps per parent** before they're on the roster. For 14 families, this is a massive onboarding ask. Compare to Mike's current flow: he creates a group text, texts everyone the practice schedule, done.

**What's missing:**
- **No bulk invite (email/SMS).** Mike can't send invite links to parents from the app. He has to manually distribute the code.
- **No "join on behalf of child" shortcut.** Parents must create their own account, add dependent, switch context, then join. There's no "Coach Mike invited Jake to the team — tap to join" flow.
- **No roster import.** Mike has a Google Sheet with all 14 kids. He can't import it.

#### Communicating with parents

Once parents join, Mike can message them via Team Chat (`POST /api/conversations/team/:teamId`). This works — it creates a team conversation and all members are participants.

**What works:** Team chat exists and supports messages, reactions, pinning.

**What's missing:**
- **No push notifications.** Messages only appear when parents open the app and check the Messages tab. There's no server-side push, so a welcome message from Mike sits unseen until a parent happens to open Muster. This is a **dealbreaker** for replacing group texts.

---

### 2. League Registration

The league commissioner has created the league in Muster. Mike needs to register his team.

**What works:**
- Mike can browse leagues from `LeaguesBrowserScreen` and find his league by sport or search.
- The commissioner has sent Mike a roster invite from `ManageLeagueScreen`.
- Mike sees the invitation in his invitations inbox (Home screen `InboxSection`).
- He can accept, which creates a `LeagueMembership` linking his team to the league.

**What's missing:**
- **Registration fee flow is unclear.** `membershipFee` exists on League, and league dues payment exists, but the flow for "pay to register your team" at join time is not clearly tied to the invitation acceptance.
- **No document submission at registration.** The league commissioner might need proof of insurance, roster verification, or age verification. There's no mechanism for teams to submit documents to the league during registration.
- **No roster freeze/lock.** After registration, nothing prevents Mike from changing his roster (adding/removing kids). Leagues typically freeze rosters after a date.

---

### 3. Practice Scheduling

Mike needs twice-weekly practices at the town field.

**What works:**
- Mike can create events via `CreateEventScreen` with type "practice".
- He can set sport, date, time, description, max participants.

**What's MISSING (critical):**
- **No recurring events.** The event model has no recurrence fields. Mike must manually create **every single practice** — that's ~24 separate events for a 12-week season (Tue + Thu). This is a **dealbreaker**. Compare to: Mike currently sends one text saying "Practice is Tuesdays and Thursdays at 5pm, same field."
- **No free-text location.** Events require a Facility from the database. Mike's town field probably isn't listed in Muster. He can't just type "New Gloucester Elementary School Field, behind the gym." He'd have to create a facility (which requires a Ground Basic subscription at $40/mo) or pick no location.
- **No RSVP for practices.** Events do support RSVP (booking), but the RSVP flow is designed for games with pricing and participant limits. There's no lightweight "attending / not attending" toggle suitable for practices where there's no cost and no limit.
- **No practice reminders.** Without server-side push notifications, parents won't get reminders.
- **No rain cancellation broadcast.** Mike can cancel the event and post in team chat, but without push notifications, parents might not see it in time.

---

### 4. Game Day

Saturday. Mike's team plays at 10am.

**What works:**
- If the commissioner has created the match and it's linked to an event, the game appears in the event feed.
- Parents can see match details (time, opponent) from the league details screen (MatchesTab).
- The match has a facility link if the commissioner assigned one.
- After the game, the commissioner (or Mike as the manager) can record the score via `RecordMatchResultScreen`.
- Standings update automatically on `LeagueMembership`.

**What's missing:**
- **No game-day reminders** (no push notifications).
- **No directions integration.** Facility has latitude/longitude and address, but there's no "Get Directions" button that opens Apple Maps/Google Maps. The `GroundMapPreview` shows a map but no navigation intent.
- **No pre-game communication channel.** Mike could post in team chat, but there's no game-specific thread that includes both teams (game threads exist but are per-event, and it's unclear if both teams' parents are auto-added).
- **No attendance tracking.** There's no way for Mike to mark which kids showed up for the game. `GameParticipation` exists but it's for player ratings, not attendance.
- **No lineup management.** Mike can't set a starting lineup or substitute plan.

---

### 5. Ongoing Communication

#### Message all parents about schedule changes
**Works:** Team chat. **Missing:** Push notifications, so messages go unseen.

#### Share information about upcoming tournaments
**Works:** Mike can post in team chat with text. **Missing:** No file/document sharing in chat. No shared team calendar or bulletin board.

#### Coordinate carpools for away games
**Not supported.** No carpool feature, no address sharing between parents, no transportation coordination tools.

#### Track which kids attended each practice/game
**Not supported.** No attendance tracking feature exists.

#### Handle a kid leaving the team mid-season
**Works:** Mike (as captain) can remove a member from the roster via team details. The `TeamMember` status changes to "removed".
**Missing:** No notification to the league that the roster changed. No documentation/audit trail.

---

### 6. End of Season

#### Team's final record
**Works (if in a league):** `LeagueMembership` tracks W/L/D, points, goal differential. `StandingsTable` shows final standings.

#### Season stats or awards
**Partially exists:** `PlayerSportRating` tracks per-sport ratings. `Salute` and `PlayerVote` exist for recognition. `GameParticipation` tracks per-game stats.
**Missing:** No season summary screen, no "MVP award" flow, no team stats dashboard, no coach-driven awards ceremony.

#### Recognize standout players
**Partially exists:** Post-game salutes let participants recognize each other. **Missing:** Coach can't separately call out players. No end-of-season awards.

#### Team persistence
**Works:** Teams persist after the season. The roster stays intact. Mike could reuse it for fall soccer. **Missing:** No "season archive" or "start new season" flow at the team level. The team just continues.

---

### Coach Mike Summary

| Need | Muster Today | Verdict |
|------|-------------|---------|
| Create a team | Works but paywalled ($10/mo) | Friction |
| Add 14 kids | Parents must individually sign up + add dependent + join | Major friction |
| Bulk invite parents | Not supported | Missing |
| Recurring practices | Not supported — create each one manually | Dealbreaker |
| Free-text location | Not supported — requires Facility record | Dealbreaker |
| Practice RSVP | Technically works but overkill | Friction |
| Team chat | Works | Good |
| Push notifications | Not implemented | Dealbreaker |
| League registration | Works via invitation | Good |
| Game schedule | Works via league matches | Good |
| Score reporting | Works | Good |
| Standings | Works | Good |
| Attendance tracking | Not supported | Missing |
| Rain cancellation alert | No push = parents won't see it | Dealbreaker |
| Carpool coordination | Not supported | Missing |
| Season summary | Not supported | Missing |

**Bottom line: Mike cannot replace group texts with Muster today.** The lack of push notifications alone makes it impossible — parents won't check the app proactively. Add the inability to create recurring events and the friction of onboarding 14 families, and Muster is significantly harder than Mike's current workflow of a group text + Google Sheet.

---

## Persona B: Parent Sarah

**Sarah is the mother of Jake (10, soccer) and Sophie (8, tennis). She works full-time and manages both kids' sports.**

---

### 1. Getting Started

#### Signing up
Sarah downloads Muster. Registration is a 3-step wizard (name, email/username, password). Then 5-step onboarding (intent: Guardian, sports: Soccer + Tennis, location, persona action: add a child).

**What works:** The flow is clear and guided. Guardian intent is well-supported.

**Time estimate:** 5-7 minutes for registration + onboarding + adding two dependents.

#### Adding Jake (age 10) as a dependent
At onboarding Step 4 (PersonaSetupScreen, Guardian persona), Sarah is prompted to "Add a child." This routes to `DependentFormScreen`: first name, last name, DOB, sport preferences, photo.

**What works:** Straightforward form. Jake becomes a User record with `isDependent=true` and `guardianId=Sarah.id`.

#### Adding Sophie (age 8)
Sarah navigates to Settings > edit dependent profiles > add another dependent. Same form.

**What's missing:**
- **Onboarding only prompts for one child.** Sarah has to manually find the Settings path to add Sophie. The onboarding flow should ask "Do you have more children?" or let her add multiple.

#### Joining Jake's soccer team
Coach Mike sends Sarah the team invite code (via text, since Muster can't send it). Sarah opens JoinTeamScreen, enters the code, validates, joins.

**But wait:** Sarah needs to join **as Jake**, not as herself. She must:
1. Switch active user context to Jake (via HeaderUserSelector).
2. Navigate to JoinTeam.
3. Enter the code.
4. Confirm join.

**Friction:** The context-switching UX is non-obvious. Sarah might accidentally join herself instead of Jake. There's no prompt like "Who is joining this team?"

#### Finding Sophie's tennis group
Sophie plays casual weekly tennis — this isn't a formal team or league. Sarah's options:
- Search for tennis events via EventSearch. If someone creates a recurring pickup tennis event... but recurring events don't exist.
- Search for tennis teams. If the group organizer created a team, Sarah could join it.
- **Most likely:** Sophie's tennis group isn't in Muster at all, because the organizer uses a group text.

**Gap:** Muster has no concept of a casual recurring group activity that isn't a formal team or a one-off event.

---

### 2. Weekly Schedule Check (Monday morning)

Sarah wants to see what's happening this week for both kids.

**What exists:**
- `HomeScreen` has a calendar date selector and shows events/bookings.
- `EventsCalendar` component with multi-dot marking.
- Home screen context respects dependent switching (via `useActiveUserId()`).

**What's missing:**
- **No combined family calendar.** Sarah can see Jake's events when switched to Jake's context, and Sophie's events when switched to Sophie. She **cannot see both kids' events on one screen.** `FamilyPulseSection` on the home screen shows some dependent activity, but it's not a unified calendar view.
- **Practices don't show up** unless Mike created individual events (which he probably won't because there's no recurring event support).
- **Sophie's tennis probably isn't in Muster at all.**

**Verdict:** Sarah cannot replace her shared Google Calendar with Muster. She'd still need Google Calendar and would use Muster only for the subset of events that are formally created in the app.

---

### 3. RSVP Management

Jake can't make Thursday practice (dentist appointment).

**What exists:**
- If Thursday practice is an event in Muster, Sarah could switch to Jake's context, find the event, and cancel the booking (step out).
- Coach Mike would see that Jake stepped out from the participant list.

**What's missing:**
- **No "absent with reason" flow.** Sarah can step out of the event, but there's no way to add a note like "dentist appointment." She'd have to separately message Coach Mike.
- **No partial RSVP.** Sarah can't say "Jake is coming to Saturday's game but not Thursday's practice" in one flow. She'd have to find each event separately and manage them individually.
- **RSVP is all-or-nothing.** There's no "maybe" or "tentative" status. Just booked or not booked.

---

### 4. Game Day Logistics (Saturday)

**What works:**
- If the game is an event in Muster, Sarah can see time and facility location.
- Facility has address, latitude/longitude, and a map preview.
- After the game, score is reported and standings update.

**What's missing:**
- **No reminder notifications** (no server-side push).
- **No "Get Directions" button.** Sarah sees a map but can't tap to navigate.
- **No carpool coordination.**
- **No "arrive by" time** distinct from game start time. Mike might want kids there at 9:30 for a 10am game, but the event only has one startTime.
- **No game-day weather check or field status update.** If the field is unplayable, there's no quick "game canceled" alert (no push).

---

### 5. Communication

Coach Mike messages the team about a schedule change.

**What works:**
- The message appears in the team chat conversation.
- Sarah can see it when she opens Messages tab.
- She can respond, ask questions.
- She can DM Coach Mike privately (if they share a team context).

**What's broken:**
- **No push notification.** Sarah has no idea Mike sent a message unless she opens Muster and checks. If it's an urgent cancellation (game in 1 hour), Sarah might find out too late — or not at all.
- **Compare to group text:** Sarah's phone buzzes immediately. She sees the message on her lock screen. She can respond instantly. Muster is **strictly worse** for time-sensitive communication.

---

### 6. Sophie's Tennis

**What exists:** Not much. Sophie's casual weekly tennis group doesn't map well to any Muster entity.

- **As a Team?** The organizer would need a Roster subscription ($10/mo) for casual weekly tennis. Overkill.
- **As recurring Events?** Recurring events don't exist. The organizer would create individual events each week.
- **As a League?** Definitely not — it's casual tennis, not competitive play.

**Verdict:** Sophie's tennis stays on a group text. Muster has no value for this use case.

---

### 7. End of Season / Ongoing

**Can Sarah see Jake's game history?**
Partially. `GameParticipation` records exist. The profile shows recent events. But there's no "Jake's season summary" screen showing all games, results, and stats in one view.

**Can Jake join a summer basketball league?**
Sarah could browse leagues by sport. If a basketball league exists in Muster, she can discover it. The `LeaguesBrowserScreen` supports browsing and searching.

**Can Sarah manage Sophie's transition to structured tennis?**
Only if the structured program exists in Muster as a team or league. No migration tools or recommendations.

---

### Parent Sarah Summary

| Need | Muster Today | Verdict |
|------|-------------|---------|
| Sign up and add 2 kids | Works but flow only prompts for 1 child | Friction |
| Join Jake's team via code | Works but context-switching is confusing | Friction |
| Find Sophie's tennis group | Probably not in Muster | Not supported |
| Combined family calendar | Not supported — must switch between kids | Dealbreaker |
| See practice schedule | Only if practices are individual events | Unreliable |
| RSVP with reason | Step out works, no reason field | Missing |
| Get game-day reminders | No push notifications | Dealbreaker |
| Get directions to game | Map shown but no navigation | Missing |
| Read Coach Mike's messages | Works but no push notification | Dealbreaker |
| Respond to messages | Works | Good |
| DM the coach | Works | Good |
| See game results | Works | Good |
| See Jake's season summary | Not supported | Missing |
| Manage both kids' sports in one place | Not supported | Dealbreaker |

**Bottom line: Sarah would download Muster because Coach Mike told her to, use it grudgingly for Jake's team, and continue using group texts + Google Calendar for everything else.** Muster adds an app to her workflow without replacing any existing tools. The lack of push notifications and combined family calendar means it's strictly additive friction.

---
---

# CRITICAL GAPS — WHAT'S MISSING FOR REAL USERS

---

## Must-Have for Coaches (Blocks Adoption)

| Gap | Why It's a Blocker | Effort | Frontend/Backend |
|-----|-------------------|--------|-----------------|
| **Push notifications (server-side)** | Without push, messages go unseen. Coaches can't alert parents about cancellations, schedule changes, or game updates. The entire messaging system is useless without push. | Large | Backend (FCM/APNs integration, device token storage, notification dispatch service) |
| **Recurring events** | Coaches schedule practices twice a week for 12+ weeks. Creating 24+ individual events is absurd. No coach will do this. | Medium | Both (recurrence fields on Event model, recurrence creation logic, UI for "repeat weekly") |
| **Free-text location / location without a Facility** | Town fields, school gyms, and parks are not "facilities" in Muster. Coaches need to type an address or place name. | Small | Both (optional address fields on Event, remove Facility requirement) |
| **Subscription cost for volunteers** | A volunteer youth coach paying $10/mo to organize a team is a non-starter. Youth sports leagues often have zero budget for coaching tools. | N/A (business decision) | N/A |
| **Bulk invite (SMS/email link)** | Coaches need to send one link to 14 families, not distribute a code and hope everyone figures out the 8-step signup flow. | Medium | Both (invite link generation, deep link handling, streamlined onboarding for invited users) |

## Must-Have for Parents (Blocks Adoption)

| Gap | Why It's a Blocker | Effort | Frontend/Backend |
|-----|-------------------|--------|-----------------|
| **Push notifications** | Same as above — parents won't check the app proactively. | Large | Backend |
| **Combined family calendar** | Parents with 2+ kids need one view of the whole week. Switching between child contexts per-screen is unworkable. | Medium | Frontend (aggregate events across all dependents on home/calendar screen) |
| **Simpler onboarding for invited parents** | 8-10 steps before a parent is on the roster is too many. "Coach Mike invited Jake — tap to join" should be 3 steps max. | Medium | Both (invite deep links, pre-populated join flow, skip non-essential onboarding steps) |

## High-Impact Improvements (Significantly Better Experience)

| Gap | Impact | Effort |
|-----|--------|--------|
| **"Get Directions" button** on event/facility screens (open native maps) | Parents can navigate to games | Small (frontend only) |
| **RSVP with reason** ("Can't attend — dentist") | Coaches see who's absent and why | Small (add note field to step-out/cancel flow) |
| **Attendance tracking** (coach marks who showed up) | Coaches need this for end-of-season records | Medium |
| **Game-day arrival time** distinct from start time | "Be there at 9:30, game at 10" | Small (add field to Event) |
| **Rain/cancellation alert** (urgent message type with push) | Time-sensitive communication | Medium (needs push infrastructure) |
| **Multi-child onboarding** (add multiple dependents during onboarding) | Parents with 2+ kids | Small (frontend loop in onboarding wizard) |
| **Lightweight "attending/not attending" toggle** for practices | Simpler than full booking flow | Medium |
| **Account deletion** | GDPR/App Store requirement | Medium (backend endpoint + UI) |

## Nice-to-Have (Would Delight But Not Block)

| Gap | Impact | Effort |
|-----|--------|--------|
| Carpool coordination tool | Parents would love it | Large |
| Season summary / awards | End-of-season engagement | Medium |
| Calendar export (`.ics`) | Sync with Google Calendar / Apple Calendar | Small |
| Admin panel (web-based) | Manage verifications, promo codes, support | Large |
| Dark mode | User preference | Medium |
| Notification preferences that work | Clean up the stubbed screen | Small |
| Bracket visualization for playoffs | Visual tournament brackets | Medium |
| Roster import from spreadsheet | Coach uploads existing roster | Medium |
| In-app notification center | Bell icon with activity feed | Medium |
| File sharing in chat | Share PDFs, images, docs | Medium |
| Auto schedule generation for leagues | Round-robin generation at the click of a button | Medium |

## Things Muster Already Does Better Than Current Tools

| Advantage | vs. Group Texts + Spreadsheets |
|-----------|-------------------------------|
| **Structured team rosters** with roles (captain, member) | Group texts have no structure — anyone can add/remove people |
| **League standings auto-calculated** | Currently done manually in spreadsheets |
| **Score reporting and match tracking** | Currently done via email to a coordinator who manually updates a sheet |
| **Facility booking with availability, pricing, and escrow** | Currently done via phone calls and paper calendars |
| **Player ratings and skill-based matchmaking** | Doesn't exist in current workflows |
| **Post-game debrief and salutes** | No equivalent — sportsmanship recognition doesn't happen digitally |
| **Insurance document management** | Currently paper-based or email attachments |
| **Waiver signing flow** | Currently paper forms at the field |
| **Dues tracking per player** | Currently a nightmare of Venmo requests and spreadsheet rows |
| **Multi-sport support** | Each sport currently has its own disconnected group text |
| **Dependent management with guardian controls** | No equivalent in group texts |

---

## Final Assessment

**If a youth soccer league in New Gloucester, Maine tried to use Muster today:**

1. **The commissioner** could create the league, invite teams, create matches, and report scores. This part works reasonably well.

2. **Coach Mike** would hit walls immediately: the subscription paywall, the inability to create recurring practices, and the lack of a way to quickly onboard 14 families. He'd create the team, struggle to get parents on board, and fall back to group texts for actual communication because messages in Muster have no push notifications.

3. **Parent Sarah** would download the app, spend 10 minutes signing up and adding Jake, join the team, and then rarely open the app again because it doesn't notify her of anything. She'd continue using group texts for communication and Google Calendar for scheduling. Muster would be one more app she has to check rather than a replacement for anything.

**The core value proposition — replacing the mess of group texts, spreadsheets, and emails with one app — is not achievable today.** The foundation is strong (data models are thorough, many features are well-built), but three infrastructure gaps prevent real-world adoption:

1. **No push notifications** = no one knows when something happens
2. **No recurring events** = coaches won't enter their schedule
3. **Too much friction to get started** = parents won't complete onboarding

Fix those three things and Muster becomes a genuinely useful tool for youth sports. Without them, it's a well-engineered app that no one will actually use.
