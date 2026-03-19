# Player Rating System - Examples

## Example 1: Basic Calculation

### Game Setup
- **Event**: Pickup Basketball Game
- **Participants**: 10 players
- **Participant Ratings**: [2.5, 3.0, 2.8, 3.5, 2.2, 3.8, 2.9, 3.1, 2.7, 3.3]

### Step 1: Calculate Game Rating
```
mean_rating = (2.5 + 3.0 + 2.8 + 3.5 + 2.2 + 3.8 + 2.9 + 3.1 + 2.7 + 3.3) / 10
mean_rating = 29.8 / 10 = 2.98

game_rating = 1 + 2.98 = 3.98
```

### Step 2: Voting Results
Total votes cast: 15 votes

| Player | Votes Received | Vote Share | Game Score |
|--------|---------------|------------|------------|
| Alice (2.5) | 8 | 8/15 = 0.533 | 0.533 × 3.98 = 2.12 |
| Bob (3.0) | 5 | 5/15 = 0.333 | 0.333 × 3.98 = 1.33 |
| Carol (2.8) | 2 | 2/15 = 0.133 | 0.133 × 3.98 = 0.53 |
| Dave (3.5) | 0 | 0/15 = 0.000 | 0.000 × 3.98 = 0.00 |
| Others | 0 | 0/15 = 0.000 | 0.000 × 3.98 = 0.00 |

### Step 3: Update Player Ratings

**Alice's Rating Update:**
- Previous 19 games: [2.1, 2.3, 1.9, 2.4, 2.2, 2.0, 2.5, 2.1, 2.3, 2.2, 2.4, 2.1, 2.3, 2.0, 2.2, 2.4, 2.1, 2.3, 2.2]
- New game score: 2.12
- Last 20 games: [2.3, 1.9, 2.4, 2.2, 2.0, 2.5, 2.1, 2.3, 2.2, 2.4, 2.1, 2.3, 2.0, 2.2, 2.4, 2.1, 2.3, 2.2, 2.12]
- New rating: mean = 2.21

**Bob's Rating Update:**
- Previous rating: 3.0
- New game score: 1.33 (below his average)
- New rating: 2.95 (slightly decreased)

## Example 2: New Player

### Scenario
- **Player**: Emma (new player)
- **Starting Rating**: 1.0 (default)
- **First Game**: Pickup soccer with experienced players

### Game 1
- Game rating: 3.5 (experienced players)
- Emma receives: 3 votes out of 12 cast
- Vote share: 3/12 = 0.25
- Game score: 0.25 × 3.5 = 0.875
- **New rating**: 0.875 (only 1 game)

### Game 2
- Game rating: 3.2
- Emma receives: 5 votes out of 14 cast
- Vote share: 5/14 = 0.357
- Game score: 0.357 × 3.2 = 1.14
- **New rating**: (0.875 + 1.14) / 2 = 1.01

### Game 3
- Game rating: 3.8
- Emma receives: 6 votes out of 15 cast
- Vote share: 6/15 = 0.40
- Game score: 0.40 × 3.8 = 1.52
- **New rating**: (0.875 + 1.14 + 1.52) / 3 = 1.18

### After 20 Games
Emma's game scores: [0.875, 1.14, 1.52, 1.68, 1.95, 2.10, 2.25, 2.40, 2.55, 2.60, 2.70, 2.75, 2.80, 2.85, 2.90, 2.95, 3.00, 3.05, 3.10, 3.15]

**Final rating**: mean = 2.42 (Intermediate tier)

## Example 3: Vote Distribution Impact

### Scenario: Same game, different voting patterns

**Game Setup:**
- 8 players, game rating = 3.5
- Total votes cast = 10

### Pattern A: Concentrated Votes
| Player | Votes | Vote Share | Game Score |
|--------|-------|------------|------------|
| Star Player | 7 | 0.70 | 2.45 |
| Good Player | 3 | 0.30 | 1.05 |
| Others | 0 | 0.00 | 0.00 |

### Pattern B: Distributed Votes
| Player | Votes | Vote Share | Game Score |
|--------|-------|------------|------------|
| Player 1 | 2 | 0.20 | 0.70 |
| Player 2 | 2 | 0.20 | 0.70 |
| Player 3 | 2 | 0.20 | 0.70 |
| Player 4 | 2 | 0.20 | 0.70 |
| Player 5 | 2 | 0.20 | 0.70 |
| Others | 0 | 0.00 | 0.00 |

### Pattern C: Everyone Votes for Everyone
| Player | Votes | Vote Share | Game Score |
|--------|-------|------------|------------|
| All 8 | 10 each | 0.125 | 0.44 |

**Insight**: Concentrated votes reward standout performance, distributed votes recognize multiple contributors.

## Example 4: Game Quality Impact

### Same Player, Different Games

**Player**: Mike (current rating 2.5)
**Performance**: Receives 50% of votes in both games

### Game A: Beginner Game
- Participants: All rated 1.0-1.5
- Game rating: 1 + 1.2 = 2.2
- Vote share: 0.50
- Game score: 0.50 × 2.2 = 1.10

### Game B: Advanced Game
- Participants: All rated 3.5-4.5
- Game rating: 1 + 4.0 = 5.0
- Vote share: 0.50
- Game score: 0.50 × 5.0 = 2.50

**Insight**: Same vote share in a higher-rated game yields a better score. This encourages playing with better players.

## Example 5: Rating Progression

### Player Journey: Sarah

**Month 1 (Games 1-5):**
- Average game score: 1.2
- Rating: 1.2 (Developing)
- Tier: New Player → Developing

**Month 2 (Games 6-10):**
- Average game score: 1.8
- Rating: 1.5 (Developing)
- Trend: Improving ↑

**Month 3 (Games 11-15):**
- Average game score: 2.3
- Rating: 1.9 (Developing)
- Trend: Improving ↑

**Month 4 (Games 16-20):**
- Average game score: 2.6
- Rating: 2.2 (Intermediate)
- Tier: Developing → Intermediate
- Trend: Improving ↑

**Month 5 (Games 21-25):**
- Last 20 games average: 2.4
- Rating: 2.4 (Intermediate)
- Trend: Stable →

**Month 6 (Games 26-30):**
- Last 20 games average: 2.7
- Rating: 2.7 (Intermediate)
- Trend: Improving ↑

**Month 12 (Games 51-55):**
- Last 20 games average: 3.2
- Rating: 3.2 (Advanced)
- Tier: Intermediate → Advanced
- Trend: Stable →

## Example 6: Pickup vs League Ratings

### Player: Alex

**Pickup Games (Last 20):**
- Game scores: [2.1, 2.3, 2.5, 2.2, 2.4, 2.6, 2.3, 2.5, 2.4, 2.6, 2.5, 2.7, 2.4, 2.6, 2.5, 2.7, 2.6, 2.8, 2.7, 2.9]
- Average: 2.52
- **Pickup Rating: 2.52**

**League Games (Current Season - 12 games):**
- Game scores: [3.1, 3.3, 3.2, 3.4, 3.3, 3.5, 3.4, 3.6, 3.5, 3.7, 3.6, 3.8]
- Average: 3.45
- **League Rating: 3.45**

**Overall Rating:**
- (2.52 + 3.45) / 2 = 2.99
- **Overall Rating: 2.99** (Advanced tier)

**Insight**: Alex performs better in organized league play than casual pickup games.

## Example 7: Anti-Gaming Scenario

### Attempt: Vote Trading

**Setup:**
- 10 players in game
- Players A and B agree to vote for each other
- Other 8 players vote normally

**Voting Results:**
- Total votes cast: 16
- Player A receives: 1 vote (from B)
- Player B receives: 1 vote (from A)
- Player C receives: 8 votes (from others)
- Others receive: 6 votes total

**Game Scores (game rating = 3.5):**
- Player A: (1/16) × 3.5 = 0.22
- Player B: (1/16) × 3.5 = 0.22
- Player C: (8/16) × 3.5 = 1.75
- Others: Various

**Result**: Vote trading has minimal impact. Player C, who earned votes legitimately, gets much higher score.

## Example 8: Strategic Non-Voting

### Attempt: Reduce Total Votes

**Scenario A: Everyone Votes**
- 10 players, each votes for 2 others
- Total votes: 20
- Top player receives: 8 votes
- Vote share: 8/20 = 0.40
- Game score: 0.40 × 3.5 = 1.40

**Scenario B: 5 Players Don't Vote**
- 5 players vote for 2 others each
- Total votes: 10
- Top player receives: 8 votes (same)
- Vote share: 8/10 = 0.80
- Game score: 0.80 × 3.5 = 2.80

**Result**: Non-voting increases vote share for those who received votes, but:
1. Non-voters get 0 votes themselves
2. Reduces community engagement
3. May affect future invitations
4. System can detect and flag low participation

## Example 9: Leaderboard Rankings

### Top 10 Players

| Rank | Player | Rating | Games | Trend |
|------|--------|--------|-------|-------|
| 1 | Jordan | 4.2 | 156 | ↑ Improving |
| 2 | Taylor | 4.1 | 203 | → Stable |
| 3 | Morgan | 3.9 | 178 | → Stable |
| 4 | Casey | 3.8 | 145 | ↓ Declining |
| 5 | Riley | 3.8 | 167 | ↑ Improving |
| 6 | Alex | 3.7 | 189 | → Stable |
| 7 | Sam | 3.6 | 134 | ↑ Improving |
| 8 | Jamie | 3.5 | 198 | → Stable |
| 9 | Drew | 3.5 | 156 | ↑ Improving |
| 10 | Quinn | 3.4 | 142 | → Stable |

**Note**: Casey and Riley are tied at 3.8 but Casey is ranked higher due to more games played.

## Example 10: Rating Tier Distribution

### Typical Platform Distribution

```
Elite (4.0+)          ████ 5%
Advanced (3.0-3.9)    ████████████ 15%
Intermediate (2.0-2.9)████████████████████████████ 35%
Developing (1.0-1.9)  ████████████████████████ 30%
New Player (<1.0)     ████████████ 15%
```

**Insights:**
- Most players are Intermediate or Developing
- Elite tier is exclusive (top 5%)
- New players make up 15% (healthy influx)
- Normal distribution around 2.0-2.5

## Key Takeaways

1. **Game Quality Matters**: Playing with better players yields higher potential scores
2. **Consistency Wins**: Regular good performances beat occasional great ones
3. **Vote Trading Fails**: System is resistant to gaming attempts
4. **Improvement Tracked**: Rating trends show player development
5. **Fair System**: Everyone starts at 1.0, earns their rating through play
6. **Separate Contexts**: Pickup and league ratings track different play styles
7. **Community Driven**: Peer voting creates fair, democratic evaluation
8. **Transparent**: Clear formula, no hidden calculations
9. **Motivating**: Visible progress encourages continued participation
10. **Balanced**: Neither too easy nor too hard to improve rating
