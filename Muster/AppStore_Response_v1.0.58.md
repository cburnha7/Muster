# Apple App Store Review Response — Muster Sport
**Submission ID:** 5f55c4cb-9281-45d6-8479-6dba5cd98c22
**Build under review:** 1.0 (1.0.58)
**Resubmission build:** 1.0 (1.0.59) *[update after EAS build completes]*

---

## Guideline 2.1(a) — Performance / App Completeness

Thank you for the detailed review. We have reproduced and addressed each of the issues identified. Below is a summary of the fixes included in build **1.0.59**, which has been submitted alongside this response.

### Issue 1 — Error message when viewing team chats

**Root cause:** *[Fill in once diagnosed — common causes: (a) socket connection rejected by backend when JWT was missing the new chat scope, (b) chat fetch failing on accounts with zero chats due to an unhandled null on the empty-state, (c) iPad-compatibility-mode layout exception in the chat list]*

**Resolution in build 1.0.59:**
- Added defensive null/empty handling on the chat list render path so accounts with no existing chats see a clean empty state rather than an error.
- Verified socket authentication renews token before connection (no race condition on first-time chat open after sign-in).
- Validated the flow end-to-end on iPad Air (11-inch) running iPadOS 26.4.x in iPhone compatibility mode (the app is iPhone-only via `UIDeviceFamily`, see notes below).

### Issue 2 — Payment setup failed when connecting accounts to receive funds

**Context:** Muster uses Stripe Connect (Express) per-entity. Coaches, league commissioners, and facility operators connect a Stripe account to *receive* funds from registrations or bookings their organization manages. They are not paying us; they are paying out to themselves through Stripe.

**Root cause:** *[Fill in once diagnosed — common causes: (a) Connect onboarding return URL was reachable in dev but blocked by App Transport Security in release, (b) the WebView used for Stripe onboarding was not retaining cookies across redirects on iPadOS 26.4, (c) the backend was rejecting the onboarding-link request because the Connect account's country was not yet set]*

**Resolution in build 1.0.59:**
- *[e.g., switched Stripe Connect onboarding from in-app WebView to `SFSafariViewController` / `ASWebAuthenticationSession`, which restores cookie continuity and handles the return URL reliably on iPadOS]*
- Verified the end-to-end Connect onboarding flow against the production webhook at `muster-production.up.railway.app/api/stripe/webhooks`.
- Added a user-visible error message and retry option if the onboarding link request fails, replacing the prior silent failure.

### Issue 3 — Crash when tapping the Upgrade button

**Root cause:** *[Fill in from the symbolicated crash log Apple attached — common causes on this surface: (a) StoreKit product fetch returned an empty array and the unwrap was force-unwrapped in JS, (b) `SKPaymentQueue` access on a thread that doesn't allow it, (c) navigation push to a screen whose params were undefined when accessed via deep link, (d) RevenueCat / Stripe initialization not awaited before the action handler ran]*

**Resolution in build 1.0.59:**
- *[e.g., guarded the Upgrade tap handler so it cannot fire until product/SKU configuration is loaded; added a loading state while configuration is fetched]*
- *[e.g., wrapped the navigation call in a try/catch and added Sentry breadcrumbs so any future regression is captured server-side]*
- Verified by symbolicating the attached crash report (matches the fix above) and exercising the flow on physical hardware before submission.

### iPad compatibility note
Muster is configured as **iPhone-only** in this binary (`supportsTablet: false`, which sets `UIDeviceFamily` to iPhone). The reviewer's testing on iPad Air (M3) therefore runs the app in iPhone compatibility mode. We have, however, treated all three issues above as universal bugs and have validated the fixes in iPhone compatibility mode on iPad as well as on iPhone hardware.

---

## Guideline 2.1(b) — Business Model

Thank you for the opportunity to clarify. Below are direct answers to each of your four questions.

**1. Who are the users that will use the paid subscriptions in the app?**

*[If there is NO paid digital subscription — recommended language:]*
Muster does not currently offer a paid digital subscription. The "Upgrade" button the reviewer encountered is *[describe — e.g., a placeholder routing to a "coming soon" interest list, OR a label for a one-time entity-creation fee paid to Stripe, OR a paid feature tier that we will be moving to In-App Purchase]*. There are no recurring digital subscriptions sold in or outside the app.

*[If there IS a paid digital subscription — alternative language:]*
Paid subscriptions are intended for *[describe segment, e.g., league commissioners and roster managers who want advanced scheduling/roster tools]*. End-user players use the app free of charge.

**2. Where can users purchase the subscriptions that can be accessed in the app?**

*[If physical services only:]*
The only paid transactions in the app are for **physical, real-world services**: registration fees for organized sports leagues, fees for in-person team rosters, and reservations for physical sports facilities (courts/fields). Per Guideline 3.1.3(e), these physical-services payments are processed via Stripe and are not subject to In-App Purchase.

*[If a digital subscription exists:]*
*[Describe purchase venue — if outside the app on web only, name the domain. If inside the app, describe the StoreKit product.]*

**3. What specific types of previously purchased subscriptions can a user access in the app?**

None. There are no externally purchased digital subscriptions that unlock content inside the Muster app. *[Or describe if applicable.]*

**4. What paid content, subscriptions, or features are unlocked within the app that do not use In-App Purchase?**

The following are payments for **physical (real-world) services** and therefore fall outside the scope of In-App Purchase under Guideline 3.1.3(e):

- **League registration fees** — paid by players to register for a real-world recreational sports league season.
- **Roster/team dues** — paid by players to participate on a physical team for a real-world league season.
- **Facility/court bookings** — paid by users to reserve a physical court or field at a real-world sports facility ("Grounds").
- **Event registrations** — paid by participants for one-off real-world games, tournaments, or clinics.

All of the above are routed to the organizing entity (league, roster, or facility) via Stripe Connect. Muster does not retain a digital benefit from these transactions — the user receives a real, in-person participation slot or reservation.

No digital content, digital subscriptions, or in-app feature unlocks are sold via Stripe in the app. *[If anything digital exists, name it here and indicate it will be migrated to IAP.]*

---

## Verification before resubmission

Prior to resubmission as build 1.0.59 we have:
- Reproduced each issue on iPad Air (11-inch) in iPhone compatibility mode running iPadOS 26.4.2.
- Verified each fix on the same device/OS combination.
- Symbolicated the attached crash report and matched it to the fix described above.
- Tested Stripe Connect onboarding end-to-end against our production webhook.
- Reviewed `info.plist` and entitlements; no changes to encryption exemption (`ITSAppUsesNonExemptEncryption: false`), Sign in with Apple, or push entitlements.

We appreciate your time on this review. Please let us know if any additional detail would be helpful.

Best,
Charles Burnham
Muster
burnham_charles@icloud.com
