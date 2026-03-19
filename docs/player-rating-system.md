# Player Rating System

## Overview

The Muster player rating system is a peer-voting based system that calculates player ratings based on votes received from fellow participants after each game. The system is designed to be fair, transparent, and resistant to manipulation.

## Rating Formula

### Core Formulas

```
game_rating = 1 + mean(rating of all participants)
vote_share = votes_received / votes_actually_cast
game_score = vote_share × game_rating
player_rating = mean(game_scores over last 20 games [pickup] or current season [league])
new player default = 1.0
```

### Formula Breakdown

**1. Game Rating**
- Represents the overall quality/competitiveness of the game
- Higher when more skilled players participate
- Minimum value: 1.0 (all new players)
- Typical range: 1.0 - 5.0
- Example: If 10 players with ratings [2.5, 3.0, 2.8, 3.5, 2.2, 3.8, 2.9, 3.1, 2.7, 3.3] play:
  - Mean rating = 2.98
  - Game rating = 1 + 2.98 = 3.98

**2. Vote Share**
- Represents what percentage of votes a player received
- Range: 0.0 - 1.0 (0% - 100%)
- Example: If 8 players cast votes and you received 5 votes:
  - Vote share = 5 / 8 = 0.625 (62.5%)

**3. Game Score**
- Your performance score for that specific game
- Combines vote share with game quality
- Higher game ratings amplify good performances
- Example: 0.625 vote share × 3.98 game rating = 2.49 game score

**4. Player Rating**
- Your overall rating across multiple games
- **Pickup games**: Average of last 20 games
- **League games**: Average of current season games
- **Overall rating**: Average of pickup and league ratings (or whichever you play)

## How It Works

### After a Game

1. **Game Completes**: Event status changes to "completed"
2. **Voting Opens**: All participants can vote for other players
3. **Vote Period**: 24-48 hours to cast votes
4. **Calculation**: System calculates ratings once voting closes
5. **Update**: All participant ratings are updated

### Voting Rules

- **Who can vote**: Only participants who attended the game
- **Vote for**: Any other participant (not yourself)
- **Multiple votes**: Yes, you can vote for multiple players
- **Required**: No, voting is optional but encouraged
- **Anonymous**: Yes, votes are anonymous
- **Deadline**: 48 hours after game completion

### Rating Calculation Process

```typescript
// Step 1: Calculate game rating
const participantRatings = [2.5, 3.0, 2.8, 3.5, 2.2];
const meanRating = 2.8;
const gameRating = 1 + 2.8 = 3.8;

// Step 2: Count votes
const totalVotesCast = 12; // Total votes from all players
const votesForPlayer = 7; // Votes this player received

// Step 3: Calculate vote share
const voteShare = 7 / 12 = 0.583;

// Step 4: Calculate game score
const gameScore = 0.583 × 3.8 = 2.22;

// Step 5: Update player rating
const last20GameScores = [2.22, 2.45, 1.98, 2.67, ...]; // Last 20 games
const playerRating = mean(last20GameScores) = 2.35;
```

## Rating Tiers

| Rating | Tier | Description | Color |
|--------|------|-------------|-------|
| 4.0+ | Elite | Top-tier players, consistently excellent | Gold (#FFD700) |
| 3.0-3.9 | Advanced | Highly skilled, competitive players | Orange (#FF6B35) |
| 2.0-2.9 | Intermediate | Solid players, good fundamentals | Green (#4CAF50) |
| 1.0-1.9 | Developing | Learning and improving | Blue (#2196F3) |
| < 1.0 | New Player | Just starting out | Gray (#9E9E9E) |

## Database Schema

### User Table Updates
```prisma
model User {
  // Rating fields
  currentRating Float @default(1.0)
  pickupRating  Float @default(1.0)
  leagueRating  Float @default(1.0)
  totalGamesPlayed Int @default(0)
  pickupGamesPlayed Int @default(0)
  leagueGamesPlayed Int @default(0)
  ratingLastUpdated DateTime @default(now())
  
  // Relations
  gameParticipations GameParticipation[]
  votesGiven      PlayerVote[]  @relation("VoterVotes")
  votesReceived   PlayerVote[]  @relation("ReceivedVotes")
}
```

### GameParticipation Table
```prisma
model GameParticipation {
  id          String   @id @default(uuid())
  userId      String
  eventId     String
  gameScore   Float    @default(0)
  votesReceived Int    @default(0)
  votesCast   Int      @default(0)
  gameRating  Float    @default(1.0)
  participantCount Int @default(0)
  playedAt    DateTime
  eventType   String   // pickup, league, tournament
  seasonId    String?
  
  user        User     @relation(fields: [userId], references: [id])
  event       Event    @relation(fields: [eventId], references: [id])
  
  @@unique([userId, eventId])
}
```

### PlayerVote Table
```prisma
model PlayerVote {
  id          String   @id @default(uuid())
  eventId     String
  voterId     String
  votedForId  String
  createdAt   DateTime @default(now())
  
  event       Event    @relation(fields: [eventId], references: [id])
  voter       User     @relation("VoterVotes", fields: [voterId], references: [id])
  votedFor    User     @relation("ReceivedVotes", fields: [votedForId], references: [id])
  
  @@unique([eventId, voterId, votedForId])
}
```

## API Endpoints

### Submit Votes
```typescript
POST /api/events/:eventId/votes
Body: {
  votedForIds: string[] // Array of user IDs
}
Response: {
  success: boolean
  votesSubmitted: number
}
```

### Get Event Participants (for voting)
```typescript
GET /api/events/:eventId/participants
Response: {
  participants: Array<{
    userId: string
    firstName: string
    lastName: string
    profileImage?: string
    currentRating: number
  }>
}
```

### Get Player Rating
```typescript
GET /api/users/:userId/rating
Response: {
  userId: string
  currentRating: number
  pickupRating: number
  leagueRating: number
  totalGamesPlayed: number
  pickupGamesPlayed: number
  leagueGamesPlayed: number
  lastUpdated: Date
}
```

### Get Leaderboard
```typescript
GET /api/leaderboard?type=overall|pickup|league&limit=50
Response: {
  players: Array<{
    rank: number
    userId: string
    firstName: string
    lastName: string
    rating: number
    gamesPlayed: number
  }>
}
```

## UI Components

### VotePlayersScreen
- Shown after game completion
- List of all participants with avatars and current ratings
- Multi-select interface
- Shows vote count
- Submit or skip options

### PlayerRatingCard
- Displays player's rating with stars
- Shows tier label (Elite, Advanced, etc.)
- Breakdown of pickup vs league ratings
- Total games played
- Can be compact or detailed

### Rating Display in Profile
- Large rating display
- Rating trend (improving/declining/stable)
- Recent game history
- Leaderboard position

## User Experience

### For Players

**After Joining a Game:**
1. Play the game
2. Receive notification when game ends
3. Open voting screen (optional)
4. Select players who performed well
5. Submit votes
6. See updated ratings after voting closes

**Viewing Ratings:**
- See your own rating in profile
- See other players' ratings on their profiles
- View leaderboards (overall, pickup, league)
- Track rating history and trends

### For Organizers

**Event Management:**
- Mark event as completed
- System automatically opens voting
- Monitor voting participation
- Ratings update automatically

## Anti-Gaming Measures

### Built-in Protections

1. **Vote Dilution**: Voting for everyone gives everyone equal share
2. **Game Quality**: Better players = higher game rating = more valuable votes
3. **Historical Average**: Single game can't drastically change rating
4. **Anonymous Voting**: Can't see who voted for whom
5. **No Self-Voting**: Can't vote for yourself
6. **Participation Required**: Must attend game to vote

### Example Scenarios

**Scenario 1: Vote Trading**
- Players A and B agree to vote for each other
- If everyone else also votes, their vote share is diluted
- Impact is minimal on overall rating

**Scenario 2: Strategic Non-Voting**
- Player doesn't vote to reduce total votes cast
- Increases vote share for those who received votes
- But reduces game participation, may affect future invites

**Scenario 3: Voting for Everyone**
- Player votes for all participants
- Everyone gets equal vote share
- No advantage gained

## Rating Stability

### New Players
- Start at 1.0 rating
- First 3 games: "New Player" badge shown
- Rating stabilizes after 5-10 games
- Encouraged to play regularly

### Established Players
- Rating based on recent performance
- Pickup: Last 20 games (rolling window)
- League: Current season only
- Prevents rating stagnation

### Rating Trends
- **Improving**: Recent games > previous games
- **Declining**: Recent games < previous games
- **Stable**: Consistent performance
- Calculated over 5-game windows

## Best Practices

### For Players

**Voting Guidelines:**
- Vote for players who:
  - Showed good sportsmanship
  - Played well technically
  - Were team players
  - Made the game enjoyable
- Don't vote based on:
  - Personal friendships
  - Vote trading agreements
  - Winning/losing team

**Improving Your Rating:**
- Play consistently
- Be a good teammate
- Show good sportsmanship
- Help newer players
- Communicate well
- Play in higher-rated games

### For Organizers

**Event Setup:**
- Set appropriate skill level requirements
- Use eligibility restrictions for balanced games
- Encourage voting after games
- Remind players to vote

**Community Building:**
- Recognize top-rated players
- Create skill-appropriate events
- Use ratings for team balancing
- Celebrate improvement

## Technical Implementation

### Service: PlayerRatingService

**Key Methods:**
```typescript
// Calculate game rating
calculateGameRating(participantRatings: number[]): number

// Calculate vote share
calculateVoteShare(votesReceived: number, totalVotesCast: number): number

// Calculate game score
calculateGameScore(voteShare: number, gameRating: number): number

// Calculate player rating
calculatePlayerRating(gameParticipations: GameParticipation[], eventType: 'pickup' | 'league'): number

// Process event ratings
processEventRatings(eventId, participants, votes, eventType, seasonId?): Promise<GameRatingCalculation>

// Update player rating
updatePlayerRating(userId, allGameParticipations): PlayerRating

// Get rating display
getRatingDisplay(rating: number): { rating, stars, label, color }

// Rank players
rankPlayers(players: PlayerRating[], type: 'overall' | 'pickup' | 'league'): Array<PlayerRating & { rank }>
```

### Background Jobs

**Daily:**
- Close voting for games completed 48 hours ago
- Calculate ratings for newly closed votes
- Update player ratings
- Generate leaderboards

**Weekly:**
- Calculate rating trends
- Send rating update notifications
- Archive old game participations

## Migration Guide

### Database Migration

```bash
cd server
npx prisma migrate dev --name add-player-rating-system
npx prisma generate
```

### Backfill Existing Data

```typescript
// For existing users
UPDATE users SET 
  currentRating = 1.0,
  pickupRating = 1.0,
  leagueRating = 1.0,
  totalGamesPlayed = 0,
  ratingLastUpdated = NOW();

// For existing completed events
// Run rating calculation script to process historical games
```

## Future Enhancements

### Potential Features

1. **Rating Badges**: Special badges for milestones
2. **Rating History Graph**: Visual trend over time
3. **Comparative Stats**: Compare with friends
4. **Achievement System**: Unlock achievements based on rating
5. **Rating Decay**: Inactive players' ratings decay slowly
6. **Weighted Voting**: More experienced players' votes worth more
7. **Category Ratings**: Separate ratings for different skills
8. **Team Ratings**: Aggregate team ratings from members
9. **Tournament Ratings**: Separate tournament rating system
10. **Rating Predictions**: Predict rating changes before games

### Analytics

- Rating distribution across platform
- Average rating by sport type
- Rating progression over time
- Voting participation rates
- Correlation between rating and game attendance

## Support & FAQ

### Common Questions

**Q: Why is my rating not changing?**
A: Ratings update after voting closes (48 hours after game). Need at least 3 games for stable rating.

**Q: Can I see who voted for me?**
A: No, all votes are anonymous to prevent gaming the system.

**Q: What if no one votes?**
A: Game still counts as played, but no rating change occurs. Encourage teammates to vote!

**Q: How do I improve my rating?**
A: Play consistently, be a good teammate, and participate in higher-rated games.

**Q: What's a good rating?**
A: 2.0+ is solid, 3.0+ is advanced, 4.0+ is elite. Most players are 1.5-2.5.

**Q: Do tournament games count?**
A: Yes, but they're tracked separately and don't affect pickup/league ratings directly.

## Summary

The player rating system provides:
- Fair, peer-based evaluation
- Transparent calculation method
- Resistance to gaming
- Separate pickup and league ratings
- Historical tracking
- Leaderboards and rankings
- Integration with event eligibility

It encourages good sportsmanship, regular participation, and community building while providing a meaningful measure of player skill and reliability.
