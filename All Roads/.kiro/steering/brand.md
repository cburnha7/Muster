# Muster — Brand Identity

## Name & Voice
- App name: **Muster**
- Tagline: **Find a game. Find your people.**
- Join a game: **Join Up**
- Leave a game: **Step Out**
- Recognise a player: **Salute**
- A group of players: **Roster** (covers both formal teams and recurring pickup crews — never use "Team" or "Outfit")
- An organised competition: **League** (never use "Competition", "Tournament" or "Division")

## Logo
- Use `<MusterIcon />` from `src/theme/MusterIcon.tsx`
- Always render with `variant="dark"` on light backgrounds
- Always render with `variant="light"` on dark backgrounds
- Always render with `variant="grass"` on green backgrounds

## Theme files
All UI must import tokens from `src/theme/` — never hardcode colors or fonts.
- `src/theme/colors.ts` — full palette
- `src/theme/typography.ts` — Fraunces + Nunito, full type scale
- `src/theme/brand.ts` — brand constants, salute rules, error codes
- `src/theme/index.ts` — barrel export, import everything from here

## Colors
- Primary brand: `colors.grass` (#3D8C5E)
- Primary hover: `colors.grassLight` (#5BAB79)
- Accent / Salute: `colors.court` (#E8A030)
- Salute glow: `colors.courtLight` (#F4BC60)
- Info / links: `colors.sky` (#5B9FD4)
- Errors: `colors.track` (#D45B5B)
- Light background: `colors.chalk` (#F7F4EE)
- Dark background: `colors.ink` (#1C2320)
- Dark card surface: `colors.inkMid` (#2A3430)
- Secondary text: `colors.inkFaint` (#6B7C76)

## Typography
- Display / hero text: `fonts.display` — Fraunces 700
- Italic accent: `fonts.displayItalic` — Fraunces 700 Italic
- Screen headings: `fonts.heading` — Fraunces 900
- Buttons & tab labels: `fonts.ui` — Nunito 900
- Badges & caps labels: `fonts.label` — Nunito 800
- Body copy: `fonts.body` — Nunito 400

## Vocabulary rules
- Use **"Cancel"** for abandoning or reversing actions, forms, bookings, transactions, and flows the user initiated (e.g. cancelling a court booking, cancelling event creation, dismissing a confirmation dialog)
- Use **"Step Out"** exclusively for leaving something the user is a member or participant of — leaving a league, leaving a roster, or leaving an event they joined
- Never use "Book" or "Register" — use **Join Up**
- Never use "Like", "Kudos", or "Props" — use **Salute**
- Never use "Team", "Group", or "Outfit" — use **Roster**
- Never use "Competition", "Tournament", or "Division" — use **League**
- Never use "Members" in the context of a roster — use **Players**

## Salute rules
- Max 3 salutes per player per game
- Salute window closes 24 hours after game end
- Players cannot salute themselves
- Import constants from `brand.salute` — never hardcode these values
