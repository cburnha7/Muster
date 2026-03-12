# Event Types Update Summary

## Overview
Updated event types from "Individual", "Team Based", "Pickup", "Tournament" to simplified "Game", "Practice", "Pickup" to better reflect actual use cases.

## Changes Applied

### 1. Type Definition (`src/types/index.ts`)
**Before:**
```typescript
export enum EventType {
  INDIVIDUAL = 'individual',
  TEAM_BASED = 'team_based',
  PICKUP = 'pickup',
  TOURNAMENT = 'tournament',
}
```

**After:**
```typescript
export enum EventType {
  GAME = 'game',
  PRACTICE = 'practice',
  PICKUP = 'pickup',
}
```

### 2. Event Type Meanings

#### Game
- Organized competitive matches
- Team-based or individual competition
- Typically scheduled in advance
- May be part of a league/season
- Ratings count toward season-based player rating

#### Practice
- Training sessions
- Skill development
- Team practice
- Lower weight in player ratings
- May be part of a league/season

#### Pickup
- Casual, spontaneous games
- Open to anyone
- No formal teams required
- Ratings based on last 20 games (rolling window)
- Most common for community play

### 3. UI Updates

#### CreateEventScreen (`src/screens/events/CreateEventScreen.tsx`)
- Updated event type dropdown options
- Changed team selection logic: Game/Practice events can have teams, Pickup is open
- Updated helper text for team selection

#### EditEventScreen (`src/screens/events/EditEventScreen.tsx`)
- Updated event type dropdown options to match create screen

### 4. Rating System Updates (`src/types/rating.ts`, `src/services/rating/PlayerRatingService.ts`)

**Event Type Mapping:**
- `'game' | 'practice' | 'pickup'` replaces `'pickup' | 'league' | 'tournament'`

**Rating Calculation Logic:**
- **Pickup**: Last 20 games (rolling window)
- **Game**: Season-based (all games in current season)
- **Practice**: Season-based (all practices in current season)

**Player Rating Calculation:**
- Games and Pickup weighted 2x more than Practice
- Formula: `((pickup_rating × pickup_count) + (game_rating × game_count × 2) + (practice_rating × practice_count)) / (pickup_count + game_count × 2 + practice_count)`
- If only one type: Use that type's rating
- Practice sessions contribute but with lower weight

### 5. Mock Data Updates

#### Frontend (`src/services/mock/mockData.ts`)
- Updated mock events to use new types
- Changed TEAM_BASED → GAME
- Changed TOURNAMENT → PRACTICE

#### Backend (`server/src/prisma/seed.ts`)
- Updated seed data event types
- 'casual' → 'pickup'
- 'competitive' → 'game'
- 'tournament' → 'practice'

### 6. Database Schema
No changes required - `eventType` field is String type, accepts any values.

## Rationale

### Why These Three Types?

1. **Game** - Covers all competitive play (was "Individual", "Team Based", "Tournament")
   - Simpler mental model
   - Flexible for any sport format
   - Clear competitive intent

2. **Practice** - Dedicated training/development
   - Distinct from competitive play
   - Lower stakes, learning focus
   - Still tracked for player development

3. **Pickup** - Casual, spontaneous play
   - Already well-understood term
   - Different rating calculation (last 20 games)
   - Community-driven

### Benefits

- **Simpler**: 3 types instead of 4
- **Clearer**: Each type has distinct purpose
- **Flexible**: "Game" covers multiple competitive formats
- **Familiar**: "Pickup" is universally understood in sports
- **Better ratings**: Practice weighted differently than competitive play

## Migration Notes

### Existing Data
If you have existing events in the database:
- `individual` → Should be migrated to `game` or `pickup`
- `team_based` → Should be migrated to `game`
- `tournament` → Should be migrated to `game`
- `pickup` → No change needed

### Migration Script (if needed)
```sql
-- Update existing event types
UPDATE events SET eventType = 'game' WHERE eventType IN ('individual', 'team_based', 'tournament');
-- pickup events remain unchanged
```

## Files Modified

1. `src/types/index.ts` - EventType enum
2. `src/types/rating.ts` - GameParticipation and RatingSnapshot types
3. `src/services/rating/PlayerRatingService.ts` - Rating calculation logic
4. `src/screens/events/CreateEventScreen.tsx` - Event type options and logic
5. `src/screens/events/EditEventScreen.tsx` - Event type options
6. `src/services/mock/mockData.ts` - Mock event data
7. `server/src/prisma/seed.ts` - Seed data
8. `docs/event-types-update.md` - This document

## Testing Checklist

- [ ] Create new Game event
- [ ] Create new Practice event
- [ ] Create new Pickup event
- [ ] Edit existing events
- [ ] Verify team selection shows for Game/Practice
- [ ] Verify team selection hidden for Pickup
- [ ] Test player rating calculation with mixed event types
- [ ] Verify practice events weighted lower in ratings
- [ ] Check event list displays correct types
- [ ] Verify event filtering by type

## Summary

Event types simplified from 4 to 3 clear categories: Game (competitive), Practice (training), and Pickup (casual). This provides better clarity for users and more accurate player ratings by distinguishing competitive play from practice sessions.
