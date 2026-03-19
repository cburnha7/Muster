# Player Rating System - Implementation Summary

## Overview
Implemented a comprehensive peer-voting based player rating system using the specified formula:
- `game_rating = 1 + mean(rating of all participants)`
- `vote_share = votes_received / votes_actually_cast`
- `game_score = vote_share × game_rating`
- `player_rating = mean(game_scores over last 20 games [pickup] or current season [league])`
- `new player default = 1.0`

## Files Created

### Type Definitions
- **`src/types/rating.ts`** - Complete type system for ratings
  - PlayerRating, GameParticipation, PlayerVote interfaces
  - Rating constants (default 1.0, pickup window 20 games, etc.)

### Services
- **`src/services/rating/PlayerRatingService.ts`** - Core rating calculation engine
  - `calculateGameRating()` - Calculates game quality from participant ratings
  - `calculateVoteShare()` - Calculates vote percentage
  - `calculateGameScore()` - Combines vote share with game rating
  - `calculatePlayerRating()` - Averages game scores (last 20 for pickup, season for league)
  - `processEventRatings()` - Processes all votes after a game
  - `updatePlayerRating()` - Updates player's overall rating
  - `getRatingDisplay()` - Formats rating for UI (stars, label, color)
  - `rankPlayers()` - Creates leaderboards
  - `calculateRatingTrend()` - Determines if improving/declining/stable

### UI Components
- **`src/screens/events/VotePlayersScreen.tsx`** - Post-game voting interface
  - Shows all participants with avatars and current ratings
  - Multi-select voting
  - Vote count display
  - Submit or skip options

- **`src/components/rating/PlayerRatingCard.tsx`** - Rating display component
  - Large rating display with stars
  - Tier labels (Elite, Advanced, Intermediate, etc.)
  - Pickup vs League rating breakdown
  - Games played statistics
  - Compact mode for inline display

### Documentation
- **`docs/player-rating-system.md`** - Complete system documentation
  - Formula explanations with examples
  - Database schema
  - API endpoints
  - Anti-gaming measures
  - Best practices
  - FAQ

- **`docs/player-rating-implementation-summary.md`** - This file

## Database Changes

### User Model Updates
```prisma
model User {
  // New rating fields
  currentRating Float @default(1.0)
  pickupRating  Float @default(1.0)
  leagueRating  Float @default(1.0)
  totalGamesPlayed Int @default(0)
  pickupGamesPlayed Int @default(0)
  leagueGamesPlayed Int @default(0)
  ratingLastUpdated DateTime @default(now())
  
  // New relations
  gameParticipations GameParticipation[]
  votesGiven      PlayerVote[]  @relation("VoterVotes")
  votesReceived   PlayerVote[]  @relation("ReceivedVotes")
}
```

### New Models

**GameParticipation** - Tracks each player's participation in a game
- Stores game score, votes received/cast, game rating
- Links user to event
- Tracks event type (pickup/league/tournament)
- Includes season ID for league games

**PlayerVote** - Records individual votes
- Links voter to voted-for player
- Associated with specific event
- Unique constraint prevents duplicate votes
- Indexed for fast lookups

**Event Model Updates**
- Added relations to GameParticipation and PlayerVote

## Rating Tiers

| Rating | Tier | Color | Description |
|--------|------|-------|-------------|
| 4.0+ | Elite | Gold | Top-tier players |
| 3.0-3.9 | Advanced | Orange | Highly skilled |
| 2.0-2.9 | Intermediate | Green | Solid players |
| 1.0-1.9 | Developing | Blue | Learning |
| < 1.0 | New Player | Gray | Just starting |

## How It Works

### 1. After Game Completion
```typescript
// Event organizer marks event as completed
event.status = 'completed';

// Voting opens for 48 hours
// Participants can vote for other players
```

### 2. Players Vote
```typescript
// Player opens VotePlayersScreen
// Selects players who performed well
// Can vote for multiple players
// Submits votes

POST /api/events/:eventId/votes
{
  votedForIds: ['user1', 'user2', 'user3']
}
```

### 3. Rating Calculation (after voting closes)
```typescript
// Step 1: Get all participants and their current ratings
const participants = [
  { userId: 'A', currentRating: 2.5 },
  { userId: 'B', currentRating: 3.0 },
  { userId: 'C', currentRating: 2.8 },
  // ...
];

// Step 2: Calculate game rating
const gameRating = 1 + mean([2.5, 3.0, 2.8, ...]) = 3.77;

// Step 3: Count votes
const votes = [
  { voterId: 'A', votedForId: 'B' },
  { voterId: 'A', votedForId: 'C' },
  { voterId: 'B', votedForId: 'C' },
  // ...
];
const totalVotesCast = 8;
const votesForPlayerC = 5;

// Step 4: Calculate vote share for Player C
const voteShare = 5 / 8 = 0.625;

// Step 5: Calculate game score for Player C
const gameScore = 0.625 × 3.77 = 2.36;

// Step 6: Create GameParticipation record
GameParticipation.create({
  userId: 'C',
  eventId: 'event123',
  gameScore: 2.36,
  votesReceived: 5,
  votesCast: 2, // Player C voted for 2 others
  gameRating: 3.77,
  participantCount: 10,
  playedAt: new Date(),
  eventType: 'pickup',
});

// Step 7: Update player rating
const last20Games = getLastNGames('C', 20, 'pickup');
const newRating = mean(last20Games.map(g => g.gameScore));
User.update({ userId: 'C', pickupRating: newRating });
```

### 4. Display Updated Ratings
```typescript
// Player sees updated rating in profile
<PlayerRatingCard rating={playerRating} />

// Rating shows on event cards
<EventCard event={event} showPlayerRating={true} />

// Leaderboards update
<Leaderboard type="pickup" />
```

## Key Features

### Fair & Transparent
- Clear formula, no hidden calculations
- All players start at 1.0
- Historical average prevents manipulation
- Anonymous voting

### Anti-Gaming Measures
1. **Vote Dilution**: Voting for everyone = equal shares
2. **Game Quality**: Better players = higher game rating
3. **Historical Average**: Single game has limited impact
4. **No Self-Voting**: Can't vote for yourself
5. **Participation Required**: Must attend to vote

### Separate Rating Types
- **Pickup Rating**: Last 20 games (rolling window)
- **League Rating**: Current season only
- **Overall Rating**: Average of both (or whichever you play)

### Rating Trends
- Improving: Recent games better than previous
- Declining: Recent games worse than previous
- Stable: Consistent performance

## Usage Examples

### Submit Votes After Game
```typescript
import { VotePlayersScreen } from './screens/events/VotePlayersScreen';

// Navigate to voting screen after game
navigation.navigate('VotePlayersScreen', {
  eventId: event.id,
  eventTitle: event.title,
});
```

### Display Player Rating
```typescript
import { PlayerRatingCard } from './components/rating/PlayerRatingCard';

// Full rating card
<PlayerRatingCard 
  rating={playerRating} 
  showDetails={true} 
/>

// Compact inline display
<PlayerRatingCard 
  rating={playerRating} 
  compact={true} 
/>
```

### Calculate Ratings (Backend)
```typescript
import { PlayerRatingService } from './services/rating/PlayerRatingService';

// After voting closes
const calculation = await PlayerRatingService.processEventRatings(
  eventId,
  participants,
  votes,
  'pickup'
);

// Create game participation records
const participations = PlayerRatingService.createGameParticipations(
  eventId,
  participants,
  calculation,
  votes,
  'pickup',
  new Date()
);

// Update each player's rating
for (const participant of participants) {
  const allGames = await getPlayerGames(participant.userId);
  const updatedRating = PlayerRatingService.updatePlayerRating(
    participant.userId,
    allGames
  );
  await savePlayerRating(updatedRating);
}
```

### Get Leaderboard
```typescript
const players = await getAllPlayers();
const ranked = PlayerRatingService.rankPlayers(players, 'overall');

// ranked = [
//   { rank: 1, userId: 'A', currentRating: 4.2, ... },
//   { rank: 2, userId: 'B', currentRating: 3.8, ... },
//   { rank: 3, userId: 'C', currentRating: 3.8, ... }, // Tied
//   { rank: 4, userId: 'D', currentRating: 3.5, ... },
// ]
```

## Migration Steps

### 1. Run Database Migration
```bash
cd server
npx prisma migrate dev --name add-player-rating-system
npx prisma generate
```

### 2. Backfill Existing Users
```sql
UPDATE users SET 
  currentRating = 1.0,
  pickupRating = 1.0,
  leagueRating = 1.0,
  totalGamesPlayed = 0,
  pickupGamesPlayed = 0,
  leagueGamesPlayed = 0,
  ratingLastUpdated = NOW();
```

### 3. Add Backend Routes
```typescript
// POST /api/events/:eventId/votes
// GET /api/events/:eventId/participants
// GET /api/users/:userId/rating
// GET /api/leaderboard
```

### 4. Add Navigation
```typescript
// Add VotePlayersScreen to navigation stack
<Stack.Screen 
  name="VotePlayersScreen" 
  component={VotePlayersScreen} 
/>
```

### 5. Trigger Voting After Games
```typescript
// When event is marked complete
if (event.status === 'completed') {
  // Send notification to participants
  notifyParticipants(event.id, 'Vote for your fellow players!');
  
  // Show voting prompt in app
  showVotingPrompt(event.id);
}
```

## Testing Checklist

- [ ] New player starts at 1.0 rating
- [ ] Game rating calculates correctly (1 + mean)
- [ ] Vote share calculates correctly (votes/total)
- [ ] Game score calculates correctly (share × rating)
- [ ] Player rating updates after voting
- [ ] Pickup rating uses last 20 games
- [ ] League rating uses current season
- [ ] Can't vote for yourself
- [ ] Can vote for multiple players
- [ ] Votes are anonymous
- [ ] Rating tiers display correctly
- [ ] Leaderboards rank correctly
- [ ] Rating trends calculate correctly
- [ ] Compact rating display works
- [ ] Full rating card shows all details

## Next Steps

### Immediate
1. Run database migration
2. Implement backend API routes
3. Add voting notification system
4. Test with real users

### Future Enhancements
1. Rating history graphs
2. Achievement badges
3. Rating decay for inactive players
4. Category-specific ratings (offense, defense, etc.)
5. Team aggregate ratings
6. Rating predictions
7. Comparative stats with friends
8. Tournament-specific ratings

## Benefits

### For Players
- Fair evaluation by peers
- Track improvement over time
- Compare with others
- Motivation to improve
- Recognition for good play

### For Organizers
- Balance teams by rating
- Set skill-appropriate events
- Identify top players
- Build competitive leagues
- Encourage participation

### For Platform
- Engagement metric
- Quality indicator
- Community building
- Retention tool
- Competitive advantage

## Summary

The player rating system is fully implemented with:
- ✅ Complete type system
- ✅ Rating calculation service
- ✅ Voting UI
- ✅ Rating display components
- ✅ Database schema
- ✅ Comprehensive documentation
- ✅ Anti-gaming measures
- ✅ Separate pickup/league ratings
- ✅ Leaderboards
- ✅ Rating trends

Ready for database migration and backend API implementation!
