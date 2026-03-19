# Design Document: League Management System

## Overview

The League Management System extends Muster's sports booking platform to support organized competitive leagues. This feature enables league operators to create and manage leagues with team rankings, match schedules, player statistics, rules documentation, and certification status.

### Key Features

- League creation and configuration with customizable points systems
- Team rankings with automatic calculation based on match results
- Match scheduling linked to existing Event system
- Player performance aggregation across league matches
- PDF document management for rules, bylaws, and board of directors documentation
- League certification system with visual distinction
- League browsing and filtering interface
- Season management for recurring competitions
- Integration with existing Team and Event models
- Role-based access control for operators vs members
- Notification system for league updates

### Design Goals

1. **Seamless Integration**: Leverage existing Team and Event models to minimize data duplication
2. **Scalability**: Support multiple concurrent leagues with hundreds of teams and thousands of matches
3. **Performance**: Calculate rankings efficiently with sub-5-second updates after match results
4. **Flexibility**: Support various sports with configurable points systems
5. **User Experience**: Provide intuitive interfaces for both operators and participants
6. **Data Integrity**: Maintain referential integrity across leagues, teams, matches, and events
7. **Security**: Enforce proper access control for sensitive operations and documents

## Architecture

### High-Level Architecture

The League Management System follows Muster's existing service-oriented architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ League       │  │ Standings    │  │ Match        │      │
│  │ Browser      │  │ Display      │  │ Schedule     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      State Management                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Redux Store (leaguesSlice, matchesSlice)           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ LeagueService│  │ RankingCalc  │  │ DocumentMgr  │      │
│  │ (API)        │  │ Service      │  │ Service      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ /api/leagues │  │ /api/matches │  │ /api/seasons │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │ File Storage │  │ Prisma ORM   │      │
│  │ Database     │  │ (S3/Local)   │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
LeaguesTab
├── LeaguesBrowserScreen
│   ├── SearchBar
│   ├── FilterControls (sport, certification, season status)
│   └── LeagueCard[] (with certification badge)
│
├── LeagueDetailsScreen
│   ├── LeagueHeader (name, sport, season, certification badge)
│   ├── LeagueInfoSection (description, dates, points system)
│   ├── TabView
│   │   ├── StandingsTab
│   │   │   └── StandingsTable
│   │   ├── MatchesTab
│   │   │   └── MatchSchedule
│   │   ├── PlayersTab
│   │   │   └── PlayerRankingsTable
│   │   ├── TeamsTab
│   │   │   └── TeamCard[]
│   │   └── InfoTab
│   │       ├── RulesDocumentViewer
│   │       └── CertificationInfo
│   └── ActionButtons (Join League, Manage)
│
├── CreateLeagueScreen
│   └── LeagueForm
│       ├── BasicInfoSection
│       ├── SeasonDatesSection
│       └── PointsSystemSection
│
├── ManageLeagueScreen
│   ├── EditLeagueInfo
│   ├── ManageTeams
│   ├── UploadDocuments
│   └── CertificationSection
│
├── CreateMatchScreen
│   └── MatchForm
│       ├── TeamSelection
│       ├── EventLinking
│       └── ScheduleSection
│
└── RecordMatchResultScreen
    └── ResultForm
        ├── ScoreInput
        └── OutcomeSelection
```

## Components and Interfaces

### Database Schema

#### Extended League Model

```prisma
model League {
  id          String   @id @default(uuid())
  name        String
  description String?
  sportType   String
  skillLevel  String
  
  // Season management
  seasonId    String?
  seasonName  String?
  startDate   DateTime?
  endDate     DateTime?
  isActive    Boolean  @default(true)
  
  // Points system configuration (stored as JSON)
  pointsConfig Json @default("{\"win\": 3, \"draw\": 1, \"loss\": 0}")
  
  // Certification
  isCertified Boolean @default(false)
  certifiedAt DateTime?
  
  // Metadata
  imageUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Foreign Keys
  organizerId String

  // Relations
  organizer   User     @relation("LeagueOrganizer", fields: [organizerId], references: [id])
  memberships LeagueMembership[]
  matches     Match[]
  seasons     Season[]
  documents   LeagueDocument[]
  certificationDocs CertificationDocument[]

  @@index([sportType])
  @@index([isActive])
  @@index([isCertified])
  @@map("leagues")
}
```

#### New LeagueMembership Model

```prisma
model LeagueMembership {
  id          String   @id @default(uuid())
  status      String   @default("active") // active, pending, withdrawn
  joinedAt    DateTime @default(now())
  leftAt      DateTime?
  
  // Statistics (cached for performance)
  matchesPlayed Int @default(0)
  wins        Int @default(0)
  losses      Int @default(0)
  draws       Int @default(0)
  points      Int @default(0)
  goalsFor    Int @default(0)
  goalsAgainst Int @default(0)
  goalDifference Int @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Foreign Keys
  leagueId    String
  teamId      String
  seasonId    String?

  // Relations
  league      League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  season      Season?  @relation(fields: [seasonId], references: [id])

  @@unique([leagueId, teamId, seasonId])
  @@index([leagueId])
  @@index([teamId])
  @@index([seasonId])
  @@map("league_memberships")
}
```

#### New Match Model

```prisma
model Match {
  id          String   @id @default(uuid())
  
  // Match details
  scheduledAt DateTime
  playedAt    DateTime?
  status      String   @default("scheduled") // scheduled, in_progress, completed, cancelled
  
  // Results
  homeScore   Int?
  awayScore   Int?
  outcome     String?  // home_win, away_win, draw
  
  // Optional event linking
  eventId     String?
  
  // Metadata
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Foreign Keys
  leagueId    String
  seasonId    String?
  homeTeamId  String
  awayTeamId  String

  // Relations
  league      League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  season      Season?  @relation(fields: [seasonId], references: [id])
  homeTeam    Team     @relation("HomeMatches", fields: [homeTeamId], references: [id])
  awayTeam    Team     @relation("AwayMatches", fields: [awayTeamId], references: [id])
  event       Event?   @relation(fields: [eventId], references: [id])

  @@index([leagueId])
  @@index([seasonId])
  @@index([homeTeamId])
  @@index([awayTeamId])
  @@index([scheduledAt])
  @@map("matches")
}
```

#### New Season Model

```prisma
model Season {
  id          String   @id @default(uuid())
  name        String   // "Spring 2024", "Fall 2024"
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean  @default(true)
  isCompleted Boolean  @default(false)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Foreign Keys
  leagueId    String

  // Relations
  league      League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  memberships LeagueMembership[]
  matches     Match[]

  @@index([leagueId])
  @@index([isActive])
  @@map("seasons")
}
```

#### New LeagueDocument Model

```prisma
model LeagueDocument {
  id          String   @id @default(uuid())
  fileName    String
  fileUrl     String
  fileSize    Int
  mimeType    String   @default("application/pdf")
  documentType String  // rules, schedule, other
  uploadedAt  DateTime @default(now())
  
  // Foreign Keys
  leagueId    String
  uploadedBy  String

  // Relations
  league      League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  uploader    User     @relation("DocumentUploader", fields: [uploadedBy], references: [id])

  @@index([leagueId])
  @@map("league_documents")
}
```

#### New CertificationDocument Model

```prisma
model CertificationDocument {
  id          String   @id @default(uuid())
  documentType String  // bylaws, board_of_directors
  fileName    String
  fileUrl     String
  fileSize    Int
  mimeType    String   @default("application/pdf")
  
  // Board of Directors data (JSON array)
  boardMembers Json?   // [{name: string, role: string}]
  
  uploadedAt  DateTime @default(now())
  approvedAt  DateTime?
  
  // Foreign Keys
  leagueId    String
  uploadedBy  String

  // Relations
  league      League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  uploader    User     @relation("CertificationUploader", fields: [uploadedBy], references: [id])

  @@index([leagueId])
  @@map("certification_documents")
}
```

#### Updates to Existing Models

```prisma
// Add to Team model
model Team {
  // ... existing fields ...
  
  // New relations
  leagueMemberships LeagueMembership[]
  homeMatches Match[] @relation("HomeMatches")
  awayMatches Match[] @relation("AwayMatches")
}

// Add to Event model
model Event {
  // ... existing fields ...
  
  // New relation
  matches Match[]
}

// Add to User model
model User {
  // ... existing fields ...
  
  // New relations
  uploadedDocuments LeagueDocument[] @relation("DocumentUploader")
  uploadedCertifications CertificationDocument[] @relation("CertificationUploader")
}
```

### API Endpoints

#### League Endpoints

```typescript
// GET /api/leagues
// Query params: sportType, isCertified, isActive, search, page, limit
// Returns: PaginatedResponse<League>

// GET /api/leagues/:id
// Returns: League with populated relations

// POST /api/leagues
// Body: CreateLeagueData
// Returns: League

// PUT /api/leagues/:id
// Body: UpdateLeagueData
// Returns: League

// DELETE /api/leagues/:id
// Returns: void

// GET /api/leagues/:id/standings
// Query params: seasonId
// Returns: TeamStanding[]

// GET /api/leagues/:id/player-rankings
// Query params: seasonId, sortBy, page, limit
// Returns: PaginatedResponse<PlayerRanking>

// POST /api/leagues/:id/join
// Body: { teamId: string }
// Returns: LeagueMembership

// POST /api/leagues/:id/leave
// Body: { teamId: string }
// Returns: void

// POST /api/leagues/:id/certify
// Body: FormData with bylaws PDF and board members JSON
// Returns: League

// GET /api/leagues/:id/documents
// Returns: LeagueDocument[]

// POST /api/leagues/:id/documents
// Body: FormData with PDF file
// Returns: LeagueDocument

// DELETE /api/leagues/:id/documents/:documentId
// Returns: void
```

#### Match Endpoints

```typescript
// GET /api/matches
// Query params: leagueId, seasonId, teamId, status, page, limit
// Returns: PaginatedResponse<Match>

// GET /api/matches/:id
// Returns: Match with populated relations

// POST /api/matches
// Body: CreateMatchData
// Returns: Match

// PUT /api/matches/:id
// Body: UpdateMatchData
// Returns: Match

// DELETE /api/matches/:id
// Returns: void

// POST /api/matches/:id/result
// Body: { homeScore: number, awayScore: number }
// Returns: Match (triggers ranking recalculation)

// GET /api/matches/:id/stats
// Returns: MatchStatistics
```

#### Season Endpoints

```typescript
// GET /api/seasons
// Query params: leagueId, isActive, page, limit
// Returns: PaginatedResponse<Season>

// GET /api/seasons/:id
// Returns: Season with standings

// POST /api/seasons
// Body: CreateSeasonData
// Returns: Season

// PUT /api/seasons/:id
// Body: UpdateSeasonData
// Returns: Season

// POST /api/seasons/:id/complete
// Returns: Season (archives standings)

// GET /api/seasons/:id/standings
// Returns: TeamStanding[]
```

### TypeScript Interfaces

```typescript
// League types
export interface League {
  id: string;
  name: string;
  description?: string;
  sportType: string;
  skillLevel: string;
  seasonId?: string;
  seasonName?: string;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  pointsConfig: PointsConfig;
  isCertified: boolean;
  certifiedAt?: Date;
  imageUrl?: string;
  organizerId: string;
  organizer?: User;
  memberCount?: number;
  matchCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PointsConfig {
  win: number;
  draw: number;
  loss: number;
}

export interface CreateLeagueData {
  name: string;
  description?: string;
  sportType: string;
  skillLevel: string;
  seasonName?: string;
  startDate?: Date;
  endDate?: Date;
  pointsConfig?: PointsConfig;
  imageUrl?: string;
}

export interface UpdateLeagueData {
  name?: string;
  description?: string;
  skillLevel?: string;
  seasonName?: string;
  startDate?: Date;
  endDate?: Date;
  pointsConfig?: PointsConfig;
  imageUrl?: string;
  isActive?: boolean;
}

export interface LeagueFilters {
  sportType?: string;
  isCertified?: boolean;
  isActive?: boolean;
  search?: string;
}

// Match types
export interface Match {
  id: string;
  leagueId: string;
  seasonId?: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam?: Team;
  awayTeam?: Team;
  scheduledAt: Date;
  playedAt?: Date;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  outcome?: MatchOutcome;
  eventId?: string;
  event?: Event;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MatchOutcome = 'home_win' | 'away_win' | 'draw';

export interface CreateMatchData {
  leagueId: string;
  seasonId?: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
  eventId?: string;
  notes?: string;
}

export interface UpdateMatchData {
  scheduledAt?: Date;
  status?: MatchStatus;
  notes?: string;
}

export interface RecordMatchResultData {
  homeScore: number;
  awayScore: number;
}

// Standings types
export interface TeamStanding {
  rank: number;
  team: Team;
  membership: LeagueMembership;
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    form: MatchOutcome[]; // Last 5 matches
  };
}

export interface LeagueMembership {
  id: string;
  leagueId: string;
  teamId: string;
  seasonId?: string;
  status: MembershipStatus;
  joinedAt: Date;
  leftAt?: Date;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  createdAt: Date;
  updatedAt: Date;
}

export type MembershipStatus = 'active' | 'pending' | 'withdrawn';

// Player ranking types
export interface PlayerRanking {
  rank: number;
  player: User;
  team: Team;
  stats: {
    matchesPlayed: number;
    averageRating: number;
    totalVotes: number;
    goalsScored?: number;
    assists?: number;
    performanceScore: number;
  };
}

// Season types
export interface Season {
  id: string;
  leagueId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSeasonData {
  leagueId: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

// Document types
export interface LeagueDocument {
  id: string;
  leagueId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  documentType: DocumentType;
  uploadedAt: Date;
  uploadedBy: string;
  uploader?: User;
}

export type DocumentType = 'rules' | 'schedule' | 'other';

export interface CertificationDocument {
  id: string;
  leagueId: string;
  documentType: CertificationType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  boardMembers?: BoardMember[];
  uploadedAt: Date;
  approvedAt?: Date;
  uploadedBy: string;
  uploader?: User;
}

export type CertificationType = 'bylaws' | 'board_of_directors';

export interface BoardMember {
  name: string;
  role: string;
}
```

## Data Models

### Points System Configuration

The points system is stored as JSON in the League model, allowing flexibility for different sports:

```typescript
// Default configuration (soccer/football)
{
  "win": 3,
  "draw": 1,
  "loss": 0
}

// Alternative configurations
// Basketball (no draws)
{
  "win": 2,
  "draw": 0,
  "loss": 0
}

// Custom tournament format
{
  "win": 5,
  "draw": 2,
  "loss": 1
}
```

### Ranking Calculation Algorithm

Team rankings are calculated using the following priority:

1. **Total Points**: Primary sorting criterion
2. **Goal Difference**: Secondary tiebreaker (goalsFor - goalsAgainst)
3. **Goals Scored**: Tertiary tiebreaker
4. **Head-to-Head Record**: Final tiebreaker (if applicable)

```typescript
function calculateStandings(memberships: LeagueMembership[], matches: Match[]): TeamStanding[] {
  // Sort by points DESC, goalDifference DESC, goalsFor DESC
  const sorted = memberships.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  
  // Assign ranks
  return sorted.map((membership, index) => ({
    rank: index + 1,
    team: membership.team,
    membership,
    stats: {
      matchesPlayed: membership.matchesPlayed,
      wins: membership.wins,
      losses: membership.losses,
      draws: membership.draws,
      points: membership.points,
      goalsFor: membership.goalsFor,
      goalsAgainst: membership.goalsAgainst,
      goalDifference: membership.goalDifference,
      form: getRecentForm(membership.teamId, matches, 5),
    },
  }));
}
```

### Player Ranking Aggregation

Player rankings aggregate data from GameParticipation records for events linked to league matches:

```typescript
function calculatePlayerRankings(
  leagueId: string,
  seasonId?: string
): PlayerRanking[] {
  // 1. Get all matches for league/season
  // 2. Get all GameParticipation records for those matches
  // 3. Aggregate by player:
  //    - Count matches played
  //    - Average rating (gameScore / matchesPlayed)
  //    - Total votes received
  // 4. Calculate performance score
  // 5. Sort by performance score DESC
  
  const performanceScore = (
    averageRating * 0.6 +
    (totalVotes / matchesPlayed) * 0.4
  );
  
  return rankings;
}
```

### File Storage Strategy

Documents are stored using a hybrid approach:

1. **Development**: Local file system in `server/uploads/league-documents/`
2. **Production**: AWS S3 or similar cloud storage
3. **File naming**: `{leagueId}/{documentType}/{timestamp}-{originalName}`
4. **Access control**: Signed URLs with expiration for secure access
5. **Size limits**: 10MB per document
6. **Allowed types**: PDF only for rules and certification documents

## Data Flow Diagrams

### Match Result Recording Flow

```
User (Operator) → RecordMatchResultScreen
                    ↓
                  Validate scores
                    ↓
                  POST /api/matches/:id/result
                    ↓
Backend:          Update Match record
                    ↓
                  Calculate outcome (win/draw/loss)
                    ↓
                  Update LeagueMembership stats for both teams
                    ↓
                  Recalculate standings
                    ↓
                  Send notifications to teams
                    ↓
                  Return updated Match
                    ↓
Frontend:         Update Redux store
                    ↓
                  Refresh StandingsTable
                    ↓
                  Show success message
```

### League Certification Flow

```
User (Operator) → ManageLeagueScreen
                    ↓
                  Upload Bylaws PDF
                    ↓
                  Enter Board Members (min 3)
                    ↓
                  POST /api/leagues/:id/certify (FormData)
                    ↓
Backend:          Validate PDF format and size
                    ↓
                  Validate board members count
                    ↓
                  Store files in secure storage
                    ↓
                  Create CertificationDocument records
                    ↓
                  Update League.isCertified = true
                    ↓
                  Send notifications to members
                    ↓
                  Return updated League
                    ↓
Frontend:         Update Redux store
                    ↓
                  Display certification badge
                    ↓
                  Show success message
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas of redundancy:

1. **File validation properties (6.2, 7.3)**: Both test PDF format and 10MB size limit - can be combined into one comprehensive file validation property
2. **Document storage properties (6.3, 7.5)**: Both test document persistence and association - can be combined
3. **Notification properties (17.1-17.4)**: All test that notifications are sent for different events - can be combined into one property about notification triggers
4. **Access control properties (15.1-15.6)**: Multiple properties about role-based access - can be consolidated into fewer comprehensive properties
5. **Data display properties (3.2, 5.2, 9.1)**: Multiple properties testing that specific fields are rendered - can be combined by entity type
6. **Team ranking calculation (14.1-14.4)**: Multiple properties about ranking calculation steps - can be combined into comprehensive ranking properties

After reflection, the following properties provide unique validation value without redundancy:

### Property 1: League Name Uniqueness Within Sport and Season

*For any* league creation attempt, if a league with the same name, sport type, and overlapping season dates already exists, the system should reject the creation with a uniqueness error.

**Validates: Requirements 2.2**

### Property 2: League Creator Assignment

*For any* league creation, the creating user should be automatically assigned as the league operator.

**Validates: Requirements 2.3**

### Property 3: League Operator Permissions

*For any* league, only the league operator should be able to edit league details, add/remove members, record match results, and upload certification documents.

**Validates: Requirements 2.4, 2.5, 15.3, 15.4, 15.5**

### Property 4: Standings Ordering

*For any* league with multiple teams, the standings table should order teams by total points descending, then by goal difference descending, then by goals scored descending.

**Validates: Requirements 3.1, 3.5, 14.4**

### Property 5: Standings Data Completeness

*For any* team in a standings table, the displayed data should include team name, matches played, wins, losses, draws, total points, goals for, goals against, and goal difference.

**Validates: Requirements 3.2**

### Property 6: Standings Reactivity

*For any* match result recording, the standings table should reflect the updated rankings after the operation completes.

**Validates: Requirements 3.4, 4.6**

### Property 7: Match Team Membership Validation

*For any* match creation attempt, if either participating team is not a league member, the system should reject the creation with a validation error.

**Validates: Requirements 4.2**

### Property 8: Match Schedule Chronological Ordering

*For any* league, the match schedule should display matches ordered by scheduled date ascending, with all required fields (date, time, location, teams) present.

**Validates: Requirements 4.3**

### Property 9: Match Result Updates Membership Stats

*For any* match result recording, the system should update both participating teams' membership statistics (matches played, wins/losses/draws, goals for/against, points) according to the configured points system.

**Validates: Requirements 4.5, 4.6, 14.1, 14.2**

### Property 10: Goal Difference Calculation

*For any* team membership, the goal difference should always equal goals scored minus goals conceded.

**Validates: Requirements 14.3**

### Property 11: Player Rankings Aggregation

*For any* league, player rankings should aggregate statistics from all game participations linked to league matches, including matches played, average rating, and total votes.

**Validates: Requirements 5.1, 5.3, 14.5**

### Property 12: Player Rankings Data Completeness

*For any* player in a rankings table, the displayed data should include player name, team affiliation, matches played, and performance metrics.

**Validates: Requirements 5.2**

### Property 13: Player Rankings Sortability

*For any* player rankings table, sorting by any performance metric should reorder the list according to that metric in descending order.

**Validates: Requirements 5.4**

### Property 14: Document Upload Validation

*For any* document upload attempt (rules, bylaws, board of directors), if the file is not PDF format or exceeds 10MB, the system should reject the upload with a validation error.

**Validates: Requirements 6.2, 7.3**

### Property 15: Document Storage and Association

*For any* successful document upload, the system should store the file and create a database record associating it with the league.

**Validates: Requirements 6.3, 6.6, 7.5**

### Property 16: Rules Document Conditional Display

*For any* league, the "View Rules" button should be displayed if and only if a rules document exists for that league.

**Validates: Requirements 6.4**

### Property 17: Document Retrieval

*For any* document view request, the system should retrieve the correct file from storage and make it available to the user.

**Validates: Requirements 16.1**

### Property 18: Certification Requirements Validation

*For any* certification submission, if the board of directors list contains fewer than 3 members or the bylaws document is invalid, the system should reject the certification.

**Validates: Requirements 7.2, 7.3**

### Property 19: Certification Status Update

*For any* valid certification submission, the system should mark the league as certified and store the certification documents.

**Validates: Requirements 7.4, 7.5**

### Property 20: Certified Badge Display

*For any* league card in the browser, a certification badge should be displayed if and only if the league is certified.

**Validates: Requirements 8.1**

### Property 21: Certification Filter

*For any* league browser with certification filter enabled, only certified leagues should be displayed in the results.

**Validates: Requirements 8.3**

### Property 22: Certification Documents Access

*For any* certified league, users should be able to access and view the board of directors and bylaws documents.

**Validates: Requirements 8.5**

### Property 23: League Browser Data Completeness

*For any* league card in the browser, the displayed data should include league name, sport type, season dates, and member count.

**Validates: Requirements 9.1**

### Property 24: League Browser Filtering

*For any* combination of filters (sport type, certification status, season status), the league browser should return only leagues matching all applied filters.

**Validates: Requirements 9.2**

### Property 25: League Browser Search

*For any* search query, the league browser should return only leagues whose names contain the query string (case-insensitive).

**Validates: Requirements 9.3**

### Property 26: League Browser Relevance Ordering

*For any* league browser display without explicit sorting, leagues should be ordered with active leagues first, then upcoming, then completed.

**Validates: Requirements 9.5**

### Property 27: Team Reference Integrity

*For any* league membership creation, the system should reference an existing team record by ID and display team details from that record.

**Validates: Requirements 10.1, 10.2**

### Property 28: Active Member Deletion Prevention

*For any* team deletion attempt, if the team is an active member of any league, the system should reject the deletion with an error.

**Validates: Requirements 10.4**

### Property 29: Team League Participation Display

*For any* team details screen, the system should display a list of all leagues the team is currently participating in.

**Validates: Requirements 10.5**

### Property 30: Optional Event Linking

*For any* match creation, the system should allow creating matches with or without linking to an event record.

**Validates: Requirements 11.1, 11.5**

### Property 31: Event Data Integration

*For any* match linked to an event, the match display should show event details (location, time, participants) from the linked event record.

**Validates: Requirements 11.2**

### Property 32: Event League Context Display

*For any* event that is part of a league match, the event details screen should display the league context.

**Validates: Requirements 11.4**

### Property 33: Join Button Conditional Display

*For any* league view, the "Join League" button should be displayed if and only if the user is a captain or admin of at least one team.

**Validates: Requirements 12.1**

### Property 34: Team Captain Validation

*For any* league join attempt, if the user does not have captain or admin role for the selected team, the system should reject the request with an authorization error.

**Validates: Requirements 12.3**

### Property 35: Duplicate Membership Prevention

*For any* league join attempt, if the team is already a league member, the system should reject the request with a validation error.

**Validates: Requirements 12.4**

### Property 36: Conditional Join Approval

*For any* league join attempt, if the league requires approval, the system should create a pending membership; if open registration, the system should create an active membership immediately.

**Validates: Requirements 12.5, 12.6**

### Property 37: League Record Completeness

*For any* league creation, the database record should contain all required fields: name, sport type, season dates, points system configuration, and certification status.

**Validates: Requirements 13.1**

### Property 38: Match Record Completeness

*For any* match creation, the database record should contain all required fields: scheduled date, participating team IDs, and optional event ID.

**Validates: Requirements 13.2**

### Property 39: Membership Record Completeness

*For any* league membership creation, the database record should link a team to a league and include the join date.

**Validates: Requirements 13.3**

### Property 40: Referential Integrity

*For any* database operation, foreign key constraints should prevent creating orphaned records (matches without valid league/team IDs, memberships without valid league/team IDs).

**Validates: Requirements 13.5**

### Property 41: Public League Viewing

*For any* authenticated user, the system should allow viewing public league information regardless of membership status.

**Validates: Requirements 15.1**

### Property 42: Authenticated League Creation

*For any* league creation attempt by an unauthenticated user, the system should reject the request with an authentication error.

**Validates: Requirements 15.2**

### Property 43: Team Captain League Operations

*For any* team captain, the system should allow joining leagues with their team and withdrawing their team from leagues.

**Validates: Requirements 15.6**

### Property 44: Document Download Fallback

*For any* platform that cannot display PDFs natively, the system should provide a download option for league documents.

**Validates: Requirements 16.4**

### Property 45: Document Access Tracking

*For any* document view or download, the system should log the access event for analytics.

**Validates: Requirements 16.5**

### Property 46: League Event Notifications

*For any* league event (match scheduled, result recorded, rules updated, certification achieved), the system should send notifications to relevant parties (participating teams or all members) while respecting user notification preferences.

**Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5**

### Property 47: Season Completion

*For any* season completion operation, the system should archive the current standings and statistics while marking the season as completed.

**Validates: Requirements 18.1, 18.2**

### Property 48: New Season Creation

*For any* league, the operator should be able to create a new season, which resets team standings to zero while preserving team memberships.

**Validates: Requirements 18.3, 18.5**

### Property 49: Historical Season Access

*For any* completed season, users should be able to view the archived standings and statistics.

**Validates: Requirements 18.4**

## Error Handling

### Validation Errors

The system will validate inputs and return appropriate error messages:

```typescript
// League creation validation
- League name required (min 3 characters)
- Sport type must be valid enum value
- Season dates: startDate must be before endDate
- Points config: win/draw/loss must be non-negative integers

// Match creation validation
- Both teams must be league members
- Scheduled date must be in the future (for new matches)
- Home and away teams must be different
- If event linked, event must exist and not be linked to another match

// Document upload validation
- File must be PDF format (MIME type: application/pdf)
- File size must not exceed 10MB
- File name must not contain special characters

// Certification validation
- Board of directors must have at least 3 members
- Each board member must have name and role
- Bylaws document must be valid PDF
```

### Authorization Errors

```typescript
// 401 Unauthorized
- User not authenticated
- Token expired or invalid

// 403 Forbidden
- User is not league operator (for edit/delete operations)
- User is not team captain (for join/leave operations)
- User does not have permission to access document
```

### Not Found Errors

```typescript
// 404 Not Found
- League not found
- Match not found
- Team not found
- Document not found
- Season not found
```

### Conflict Errors

```typescript
// 409 Conflict
- League name already exists for sport/season
- Team already member of league
- Match already has result recorded
- Season dates overlap with existing season
```

### Server Errors

```typescript
// 500 Internal Server Error
- Database connection failed
- File storage service unavailable
- Ranking calculation failed
- Notification service failed

// Error recovery strategies:
- Retry failed operations with exponential backoff
- Queue failed notifications for later delivery
- Cache rankings to serve stale data if calculation fails
- Log all errors for monitoring and debugging
```

### Client-Side Error Handling

```typescript
// Network errors
- Display offline message
- Queue operations for retry when online
- Show cached data with staleness indicator

// Validation errors
- Display inline error messages on form fields
- Prevent form submission until errors resolved
- Provide helpful error messages with correction guidance

// Permission errors
- Redirect to login if unauthenticated
- Display "Access Denied" message if unauthorized
- Suggest contacting league operator for access
```

## Testing Strategy

### Dual Testing Approach

The League Management System will use both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of league creation, match recording, and certification
- Edge cases like empty leagues, tied standings, missing documents
- Integration points between leagues, teams, and events
- Error conditions and validation failures
- UI component rendering and user interactions

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs (see Correctness Properties section)
- Ranking calculation correctness across random match results
- Data integrity across random operations
- Access control enforcement across random user roles
- Notification delivery across random league events

### Property-Based Testing Configuration

**Library**: fast-check (JavaScript/TypeScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: league-management, Property {number}: {property_text}`

**Example Property Test**:

```typescript
import fc from 'fast-check';

// Feature: league-management, Property 9: Match Result Updates Membership Stats
describe('Match Result Recording', () => {
  it('should update both teams membership stats according to points system', () => {
    fc.assert(
      fc.property(
        fc.record({
          homeScore: fc.integer({ min: 0, max: 10 }),
          awayScore: fc.integer({ min: 0, max: 10 }),
          pointsConfig: fc.record({
            win: fc.integer({ min: 0, max: 5 }),
            draw: fc.integer({ min: 0, max: 3 }),
            loss: fc.integer({ min: 0, max: 1 }),
          }),
        }),
        async ({ homeScore, awayScore, pointsConfig }) => {
          // Setup: Create league with custom points config
          const league = await createTestLeague({ pointsConfig });
          const homeTeam = await createTestTeam();
          const awayTeam = await createTestTeam();
          await addTeamToLeague(league.id, homeTeam.id);
          await addTeamToLeague(league.id, awayTeam.id);
          
          // Create and record match result
          const match = await createMatch(league.id, homeTeam.id, awayTeam.id);
          await recordMatchResult(match.id, homeScore, awayScore);
          
          // Verify: Check membership stats updated correctly
          const homeMembership = await getLeagueMembership(league.id, homeTeam.id);
          const awayMembership = await getLeagueMembership(league.id, awayTeam.id);
          
          // Both teams should have 1 match played
          expect(homeMembership.matchesPlayed).toBe(1);
          expect(awayMembership.matchesPlayed).toBe(1);
          
          // Verify goals
          expect(homeMembership.goalsFor).toBe(homeScore);
          expect(homeMembership.goalsAgainst).toBe(awayScore);
          expect(awayMembership.goalsFor).toBe(awayScore);
          expect(awayMembership.goalsAgainst).toBe(homeScore);
          
          // Verify outcome and points
          if (homeScore > awayScore) {
            expect(homeMembership.wins).toBe(1);
            expect(homeMembership.points).toBe(pointsConfig.win);
            expect(awayMembership.losses).toBe(1);
            expect(awayMembership.points).toBe(pointsConfig.loss);
          } else if (homeScore < awayScore) {
            expect(homeMembership.losses).toBe(1);
            expect(homeMembership.points).toBe(pointsConfig.loss);
            expect(awayMembership.wins).toBe(1);
            expect(awayMembership.points).toBe(pointsConfig.win);
          } else {
            expect(homeMembership.draws).toBe(1);
            expect(homeMembership.points).toBe(pointsConfig.draw);
            expect(awayMembership.draws).toBe(1);
            expect(awayMembership.points).toBe(pointsConfig.draw);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage for service layer
- **Property Test Coverage**: All 49 correctness properties implemented
- **Integration Test Coverage**: All API endpoints tested
- **E2E Test Coverage**: Critical user flows (create league, join league, record match, view standings)

### Testing Tools

- **Unit Testing**: Jest + React Native Testing Library
- **Property Testing**: fast-check
- **API Testing**: Supertest
- **E2E Testing**: Detox (React Native) or Playwright (Web)
- **Mocking**: jest.mock() for external dependencies
- **Test Data**: Factory functions for generating test leagues, teams, matches

### Continuous Integration

- Run all tests on every pull request
- Require 100% property test pass rate
- Require minimum 80% unit test coverage
- Run E2E tests on staging environment before production deployment
- Monitor test execution time and optimize slow tests

