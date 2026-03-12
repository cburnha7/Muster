# League Test Data Summary

## Overview
The database has been seeded with comprehensive league management test data to demonstrate all features of the League Management System.

## Data Created

### Leagues (3)

#### 1. SF Summer Basketball League
- **Sport**: Basketball
- **Skill Level**: Advanced
- **Status**: Active, Certified
- **Season**: Started 30 days ago, ends in 30 days
- **Organizer**: Edwin Chen
- **Teams**: 3 teams (Bay Area Ballers, Golden Gate Hoops, Mission District Dunkers)
- **Matches**: 5 matches (3 completed, 2 upcoming)
- **Documents**: 2 (Rules, Schedule)
- **Certification**: Complete with 4 board members

#### 2. Bay Area Soccer Championship
- **Sport**: Soccer
- **Skill Level**: Advanced
- **Status**: Active, Certified
- **Season**: Started 45 days ago, ends in 45 days
- **Organizer**: John Smith
- **Teams**: 3 teams (Sunset Strikers, Pacific FC, Bay United)
- **Matches**: 5 matches (3 completed, 2 upcoming)
- **Documents**: 1 (Rules)
- **Certification**: Complete with 3 board members

#### 3. Weekend Warriors Basketball
- **Sport**: Basketball
- **Skill Level**: Intermediate
- **Status**: Active, Not Certified
- **Season**: Starts in 7 days, 60-day season
- **Organizer**: Sarah Johnson
- **Teams**: None yet (registration open)
- **Matches**: None yet
- **Documents**: None yet
- **Certification**: Not certified

### Teams (6)

1. **Bay Area Ballers** (Basketball, Advanced)
   - Captain: Edwin Chen
   - Member: John Smith
   - League: SF Summer Basketball League
   - Standing: 1st place (12 points, 4-1-0)

2. **Sunset Strikers** (Soccer, Intermediate)
   - Captain: Sarah Johnson
   - Member: Edwin Chen
   - League: Bay Area Soccer Championship
   - Standing: 1st place (13 points, 4-1-1)

3. **Golden Gate Hoops** (Basketball, Advanced)
   - Captain: John Smith
   - League: SF Summer Basketball League
   - Standing: 2nd place (9 points, 3-2-0)

4. **Mission District Dunkers** (Basketball, Intermediate)
   - Captain: Sarah Johnson
   - League: SF Summer Basketball League
   - Standing: 3rd place (6 points, 2-3-0)

5. **Pacific FC** (Soccer, Advanced)
   - Captain: John Smith
   - League: Bay Area Soccer Championship
   - Standing: 2nd place (10 points, 3-2-1)

6. **Bay United** (Soccer, Intermediate)
   - Captain: Edwin Chen
   - League: Bay Area Soccer Championship
   - Standing: 3rd place (7 points, 2-3-1)

### Matches (10)

#### Basketball League Matches

**Completed:**
1. Bay Area Ballers 95 - 88 Golden Gate Hoops (25 days ago)
2. Golden Gate Hoops 82 - 79 Mission District Dunkers (20 days ago)
3. Mission District Dunkers 76 - 92 Bay Area Ballers (15 days ago)

**Upcoming:**
4. Bay Area Ballers vs Mission District Dunkers (in 3 days)
5. Golden Gate Hoops vs Bay Area Ballers (in 10 days)

#### Soccer League Matches

**Completed:**
1. Sunset Strikers 3 - 1 Pacific FC (35 days ago)
2. Pacific FC 2 - 2 Bay United (28 days ago)
3. Bay United 1 - 2 Sunset Strikers (21 days ago)

**Upcoming:**
4. Sunset Strikers vs Bay United (in 5 days)
5. Pacific FC vs Sunset Strikers (in 12 days)

### League Memberships (6)

All memberships are active with complete statistics:
- Matches played
- Wins, losses, draws
- Points
- Goals for/against
- Goal difference

### Documents (3)

1. **Basketball League Rules** (512 KB PDF)
2. **Basketball Schedule** (256 KB PDF)
3. **Soccer League Rules** (768 KB PDF)

### Certification Documents (2)

1. **Basketball League Bylaws**
   - Board Members: Edwin Chen (President), John Smith (VP), Sarah Johnson (Secretary), Mike Davis (Treasurer)
   - File Size: 1 MB

2. **Soccer League Bylaws**
   - Board Members: John Smith (President), Sarah Johnson (VP), Edwin Chen (Treasurer)
   - File Size: 1.25 MB

## Testing Scenarios

### 1. Browse Leagues
- Navigate to Leagues tab
- See 3 leagues listed
- Filter by sport type (Basketball/Soccer)
- Filter by certification status
- Search by name

### 2. View League Details
- Click on any league
- See league information
- View 5 tabs: Standings, Matches, Players, Teams, Info
- Check standings with current rankings
- View match schedule (past and upcoming)
- See team list
- View documents and certification info

### 3. View Standings
- SF Summer Basketball League:
  - 1st: Bay Area Ballers (12 pts, 4-1-0)
  - 2nd: Golden Gate Hoops (9 pts, 3-2-0)
  - 3rd: Mission District Dunkers (6 pts, 2-3-0)

- Bay Area Soccer Championship:
  - 1st: Sunset Strikers (13 pts, 4-1-1)
  - 2nd: Pacific FC (10 pts, 3-2-1)
  - 3rd: Bay United (7 pts, 2-3-1)

### 4. View Match Schedule
- See completed matches with scores
- See upcoming matches with dates
- Filter by status (scheduled/completed)
- Sort by date

### 5. Team Integration
- Go to Team Details for any team
- See "Leagues" section showing league participation
- View current standing in league
- Navigate to league details from team page

### 6. Event Integration
- Events can be linked to league matches
- League context displayed in event details
- Navigate to league from event

### 7. League Management (Operators Only)
- Create new league
- Edit league information
- Add/remove teams
- Schedule matches
- Record match results
- Upload documents
- Submit certification

### 8. Team Deletion Protection
- Try to delete a team in an active league
- Should receive error: "Cannot delete team that is currently participating in active leagues"
- Error includes league information

## API Endpoints to Test

### Leagues
- `GET /api/leagues` - List all leagues
- `GET /api/leagues/:id` - Get league details
- `GET /api/leagues/:id/standings` - Get standings
- `GET /api/leagues/:id/player-rankings` - Get player rankings
- `POST /api/leagues/:id/join` - Join league
- `POST /api/leagues/:id/leave` - Leave league

### Matches
- `GET /api/matches` - List matches
- `GET /api/matches/:id` - Get match details
- `POST /api/matches/:id/result` - Record match result

### Teams
- `GET /api/teams/:id/leagues` - Get team's leagues
- `DELETE /api/teams/:id` - Delete team (should fail for active members)

### Documents
- `GET /api/leagues/:id/documents` - List documents
- `GET /api/leagues/:id/documents/:docId/download` - Download document

## User Accounts for Testing

All users have password: `password123`

1. **edwin@muster.app** (Edwin Chen)
   - Organizer of SF Summer Basketball League
   - Captain of Bay Area Ballers
   - Member of Sunset Strikers and Bay United

2. **john@example.com** (John Smith)
   - Organizer of Bay Area Soccer Championship
   - Captain of Golden Gate Hoops and Pacific FC
   - Member of Bay Area Ballers

3. **sarah@example.com** (Sarah Johnson)
   - Organizer of Weekend Warriors Basketball
   - Captain of Mission District Dunkers
   - Member of Sunset Strikers

## Points System

### Basketball Leagues
- Win: 3 points (SF Summer) / 2 points (Weekend Warriors)
- Draw: 1 point
- Loss: 0 points

### Soccer League
- Win: 3 points
- Draw: 1 point
- Loss: 0 points

## Next Steps

1. Launch the app and navigate to the Leagues tab
2. Browse the leagues and view details
3. Check standings and match schedules
4. Test team integration by viewing team details
5. Test league management features (if logged in as organizer)
6. Try to delete a team in an active league to test protection

## Notes

- All leagues have realistic data with proper statistics
- Matches have scores and outcomes that match the standings
- Certification documents include board member information
- The data demonstrates both active leagues (in progress) and upcoming leagues (registration open)
- Team deletion protection is active for all teams in active leagues
