# Player Rating System - Quick Reference

## The Formula

```
game_rating = 1 + mean(rating of all participants)
vote_share = votes_received / votes_actually_cast  
game_score = vote_share × game_rating
player_rating = mean(game_scores over last 20 games [pickup] or current season [league])
new player default = 1.0
```

## Rating Tiers

| Rating | Tier | Color |
|--------|------|-------|
| 4.0+ | Elite | 🟡 Gold |
| 3.0-3.9 | Advanced | 🟠 Orange |
| 2.0-2.9 | Intermediate | 🟢 Green |
| 1.0-1.9 | Developing | 🔵 Blue |
| < 1.0 | New Player | ⚪ Gray |

## Quick Example

**Game with 10 players, average rating 2.5:**
- Game rating = 1 + 2.5 = 3.5
- You get 6 votes out of 15 cast
- Vote share = 6/15 = 0.40
- Your game score = 0.40 × 3.5 = 1.40

## Files Created

### Types
- `src/types/rating.ts` - All rating types

### Services  
- `src/services/rating/PlayerRatingService.ts` - Rating calculations

### UI Components
- `src/screens/events/VotePlayersScreen.tsx` - Voting interface
- `src/components/rating/PlayerRatingCard.tsx` - Rating display

### Documentation
- `docs/player-rating-system.md` - Complete guide
- `docs/player-rating-implementation-summary.md` - Implementation details
- `docs/player-rating-examples.md` - Calculation examples
- `docs/player-rating-quick-reference.md` - This file

## Database Migration

```bash
cd server
npx prisma migrate dev --name add-player-rating-system
npx prisma generate
```

## Key Methods

```typescript
// Calculate game rating
PlayerRatingService.calculateGameRating(participantRatings)

// Calculate vote share
PlayerRatingService.calculateVoteShare(votesReceived, totalVotesCast)

// Calculate game score
PlayerRatingService.calculateGameScore(voteShare, gameRating)

// Calculate player rating
PlayerRatingService.calculatePlayerRating(gameParticipations, eventType)

// Process event ratings
PlayerRatingService.processEventRatings(eventId, participants, votes, eventType)

// Update player rating
PlayerRatingService.updatePlayerRating(userId, allGameParticipations)

// Get rating display
PlayerRatingService.getRatingDisplay(rating)

// Rank players
PlayerRatingService.rankPlayers(players, type)
```

## Usage

### Display Rating
```tsx
<PlayerRatingCard rating={playerRating} showDetails={true} />
<PlayerRatingCard rating={playerRating} compact={true} />
```

### Vote After Game
```tsx
navigation.navigate('VotePlayersScreen', {
  eventId: event.id,
  eventTitle: event.title,
});
```

## API Endpoints (To Implement)

```
POST   /api/events/:eventId/votes
GET    /api/events/:eventId/participants
GET    /api/users/:userId/rating
GET    /api/leaderboard?type=overall|pickup|league
```

## Constants

```typescript
DEFAULT_RATING = 1.0
PICKUP_GAMES_WINDOW = 20
MIN_GAMES_FOR_RATING = 3
MAX_RATING = 5.0
MIN_RATING = 0.0
```

## Anti-Gaming Features

✅ Vote dilution (voting for everyone = equal shares)
✅ Game quality weighting (better players = higher game rating)
✅ Historical averaging (single game limited impact)
✅ Anonymous voting
✅ No self-voting
✅ Participation required

## Next Steps

1. ✅ Types defined
2. ✅ Service implemented
3. ✅ UI components created
4. ✅ Documentation written
5. ⏳ Run database migration
6. ⏳ Implement backend API routes
7. ⏳ Add voting notifications
8. ⏳ Test with users

## Testing Checklist

- [ ] New player starts at 1.0
- [ ] Game rating calculates correctly
- [ ] Vote share calculates correctly
- [ ] Game score calculates correctly
- [ ] Player rating updates
- [ ] Pickup uses last 20 games
- [ ] League uses current season
- [ ] Can't vote for self
- [ ] Can vote for multiple
- [ ] Votes are anonymous
- [ ] Tiers display correctly
- [ ] Leaderboards work
- [ ] Trends calculate correctly

## Support

See full documentation in:
- `docs/player-rating-system.md`
- `docs/player-rating-examples.md`
