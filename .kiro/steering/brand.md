# Muster — Brand Identity

## Name & Voice
- App name: **Muster**
- Tagline: **Muster the Troops.**
- Secondary tagline: **Find a game. Find your people.**
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
- Primary green: `colors.pine` (#2D5F3F) — pine figure / brand green
- Primary red: `colors.heart` (#C0392B) — centre figure / primary accent
- Primary blue: `colors.navy` (#1B2A4A) — right figure / info / links
- Bronze: `colors.bronze` (#C4A882) — icon background / warm accent
- App background: `colors.cream` (#EEEBE3)
- Light surface: `colors.chalk` (#F7F4EE)
- Primary text: `colors.ink` (#1B2A4A)
- Secondary text: `colors.inkFaint` (#6B7A96)

## Typography
- Display / hero text: `fonts.display` — Fraunces 700
- Italic accent: `fonts.displayItalic` — Fraunces 700 Italic
- Screen headings: `fonts.heading` — Fraunces 900
- Buttons & tab labels: `fonts.ui` — Nunito 900
- Badges & caps labels: `fonts.label` — Nunito 800
- Body copy: `fonts.body` — Nunito 400

## Vocabulary rules
- Never use "Cancel" — use **Step Out**
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
