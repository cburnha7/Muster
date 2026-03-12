# Design Document: Player Salute Ranking System

## Overview

The Player Salute Ranking system implements a reputation-based peer recognition mechanism where players acknowledge exceptional performance by saluting others after games. The system creates a dynamic, self-reinforcing ranking where salutes from highly-ranked players carry more weight, incentivizing both giving and receiving recognition.

The core innovation is the weighted salute mechanism: each salute's value is multiplied by the saluter's historical average, creating a virtuous cycle where recognition from respected players is more valuable. This design naturally rewards consistent performance and creates meaningful differentiation in rankings.

## Architecture

The system follows a service-oriented architecture with clear separation between data management, business logic, and presentation layers:

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (Salute UI, Rankings Display, Player Profiles)         │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                    Service Layer                         │
│  ┌──────────────────┐  ┌──────────────────────────┐    │
│  │ SaluteService    │  │ RankingService           │    │
│  │ - giveSalute()   │  │ - calculateAverage()     │    │
│  │ - validateSalute│  │ - getPlayerRanking()     │    │
│  └──────────────────┘  └──────────────────────────┘    │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                    Data Layer                            │
│  ┌──────────────────┐  ┌──────────────────────────┐    │
│  │ Salute Storage   │  │ Player Storage           │    │
│  │ (Time-series)    │  │ (Aggregated metrics)     │    │
│  └──────────────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Time-series storage**: Salutes are stored with timestamps to enable efficient 365-day rolling window calculations
2. **Cached averages**: Player salute averages are cached and updated incrementally to avoid expensive recalculations
3. **Atomic transactions**: Salute operations are atomic to maintain consistency between salute records and player averages
4. **Default seeding**: New players start with a 1.0 average to prevent zero-value salutes and enable immediate participation

## Components and Interfaces

### SaluteService

Manages the creation and validation of salutes.

```typescript
interface SaluteService {
  /**
   * Records salutes from a player after a game
   * @throws ValidationError if salutes are invalid
   * @throws GameNotFoundError if game doesn't exist
   */
  giveSalutes(
    gameId: string,
    saluterId: string,
    recipientIds: string[]
  ): Promise<SaluteTransaction[]>;

  /**
   * Validates salute constraints
   * @returns ValidationResult with errors if invalid
   */
  validateSalutes(
    gameId: string,
    saluterId: string,
    recipientIds: string[]
  ): ValidationResult;

  /**
   * Gets salutes given by a player in a specific game
   */
  getSalutesForGame(
    gameId: string,
    playerId: string
  ): Promise<Salute[]>;
}
```

### RankingService

Calculates and manages player rankings based on salute averages.

```typescript
interface RankingService {
  /**
   * Calculates a player's current salute average
   * Uses 365-day rolling window
   */
  calculateSaluteAverage(
    playerId: string,
    asOfDate?: Date
  ): Promise<number>;

  /**
   * Gets ranked list of players
   * @param limit Maximum number of players to return
   */
  getPlayerRankings(
    limit?: number,
    offset?: number
  ): Promise<PlayerRanking[]>;

  /**
   * Gets a specific player's ranking position
   */
  getPlayerRank(playerId: string): Promise<PlayerRankInfo>;

  /**
   * Updates a player's cached average after receiving a salute
   */
  updatePlayerAverage(
    playerId: string,
    newSaluteValue: number
  ): Promise<void>;
}
```

### SaluteCalculator

Pure calculation logic for salute values and averages.

```typescript
interface SaluteCalculator {
  /**
   * Calculates the weighted value of a salute
   * @param saluterAverage The historical average of the player giving the salute
   * @returns Weighted salute value (base 1.0 * saluterAverage)
   */
  calculateSaluteValue(saluterAverage: number): number;

  /**
   * Calculates average from a list of salute values
   * @param saluteValues Array of weighted salute values
   * @returns Mean of salute values, or 1.0 if empty
   */
  calculateAverage(saluteValues: number[]): number;

  /**
   * Filters salutes to those within the time window
   * @param salutes All salutes for a player
   * @param windowDays Number of days to include (default 365)
   * @param asOfDate Reference date (default now)
   */
  filterByTimeWindow(
    salutes: Salute[],
    windowDays: number,
    asOfDate?: Date
  ): Salute[];
}
```

### GameService

Manages game lifecycle and participant tracking.

```typescript
interface GameService {
  /**
   * Gets all participants in a game
   */
  getGameParticipants(gameId: string): Promise<Player[]>;

  /**
   * Checks if a player participated in a game
   */
  isParticipant(gameId: string, playerId: string): Promise<boolean>;

  /**
   * Checks if salute window is still open for a game
   */
  isSaluteWindowOpen(gameId: string): Promise<boolean>;
}
```

## Data Models

### Salute

Represents a single salute transaction.

```typescript
interface Salute {
  id: string;
  gameId: string;
  saluterId: string;
  recipientId: string;
  saluteValue: number;        // Weighted value (1.0 * saluter's average)
  saluterAverageAtTime: number; // Saluter's average when salute was given
  timestamp: Date;
  createdAt: Date;
}
```

### SaluteTransaction

Result of a salute operation.

```typescript
interface SaluteTransaction {
  salute: Salute;
  recipientNewAverage: number;
}
```

### PlayerRanking

Player information with ranking metrics.

```typescript
interface PlayerRanking {
  playerId: string;
  playerName: string;
  saluteAverage: number;
  totalSalutesReceived: number; // In past 365 days
  rank: number;
}
```

### PlayerRankInfo

Detailed ranking information for a specific player.

```typescript
interface PlayerRankInfo {
  player: Player;
  saluteAverage: number;
  totalSalutesReceived: number;
  rank: number;
  percentile: number;
}
```

### ValidationResult

Result of salute validation.

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  code: string;
  message: string;
  field?: string;
}
```

## Correctness Properties


A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Salute Limit Enforcement
*For any* game and player, when the player attempts to give salutes, the system SHALL accept up to 3 valid salutes and reject any additional salutes beyond the third.

**Validates: Requirements 1.1, 1.3**

### Property 2: Self-Salute Rejection
*For any* game and player, when the player attempts to salute themselves, the system SHALL reject the salute.

**Validates: Requirements 1.2**

### Property 3: Duplicate Salute Rejection
*For any* game and player, when the player attempts to salute the same recipient multiple times in a single game, the system SHALL reject duplicate salutes and only record the first salute.

**Validates: Requirements 1.4**

### Property 4: Participant-Only Salutes
*For any* game, when a player attempts to salute another player, the system SHALL only accept the salute if the recipient is a participant in that game.

**Validates: Requirements 1.5, 6.2**

### Property 5: Salute Value Calculation
*For any* salute, the calculated salute value SHALL equal 1.0 multiplied by the saluter's historical average at the time the salute is given.

**Validates: Requirements 2.1, 2.3**

### Property 6: Salute Data Persistence
*For any* salute transaction, the system SHALL store both the base salute count (1.0) and the calculated weighted salute value, along with the saluter's average at the time of the salute.

**Validates: Requirements 2.4**

### Property 7: Salute History Recording
*For any* salute given to a recipient, the salute SHALL appear in the recipient's salute history with the correct weighted value.

**Validates: Requirements 3.1**

### Property 8: Average Calculation Correctness
*For any* player, the calculated salute average SHALL equal the arithmetic mean of all salute values received in the past 365 days, or 1.0 if no salutes were received in that period.

**Validates: Requirements 3.2, 3.3**

### Property 9: Time Window Filtering
*For any* player's salute history, when calculating the salute average, the system SHALL include only salutes with timestamps within the past 365 days from the calculation date and exclude all older salutes.

**Validates: Requirements 3.4, 4.2**

### Property 10: Average Update Immediacy
*For any* player, after receiving a new salute, querying the player's salute average SHALL reflect the newly received salute in the calculation.

**Validates: Requirements 3.5**

### Property 11: Timestamp Persistence
*For any* salute, the stored salute record SHALL include a timestamp indicating when the salute was given.

**Validates: Requirements 4.1**

### Property 12: Ranking Order Correctness
*For any* set of players, the ranking list SHALL be ordered by salute average in descending order, with ties broken by total salute count in descending order.

**Validates: Requirements 5.1, 5.4**

### Property 13: Ranking Data Completeness
*For any* player in a ranking list, the ranking entry SHALL include the player's current salute average and total number of salutes received in the past 365 days.

**Validates: Requirements 5.2, 5.3**

### Property 14: Game Association
*For any* salute, the salute record SHALL be associated with a specific game identifier.

**Validates: Requirements 6.1**

### Property 15: Salute Window Validation
*For any* game, salutes SHALL be accepted when the salute submission window is open and rejected when the window is closed.

**Validates: Requirements 6.3, 6.4**

### Property 16: Transaction Atomicity
*For any* salute operation, either all effects SHALL occur (salute record created, recipient's average updated, saluter's salute count incremented) or none SHALL occur, with no partial state persisted.

**Validates: Requirements 7.1**

## Error Handling

### Validation Errors

The system defines specific error codes for validation failures:

- `SELF_SALUTE`: Player attempted to salute themselves
- `DUPLICATE_SALUTE`: Player attempted to salute the same recipient multiple times in one game
- `SALUTE_LIMIT_EXCEEDED`: Player attempted to give more than 3 salutes in one game
- `NON_PARTICIPANT`: Player attempted to salute a non-participant
- `WINDOW_CLOSED`: Player attempted to salute after the submission window closed
- `GAME_NOT_FOUND`: Referenced game does not exist
- `PLAYER_NOT_FOUND`: Referenced player does not exist

### Error Response Format

All validation errors follow a consistent format:

```typescript
{
  valid: false,
  errors: [
    {
      code: "SALUTE_LIMIT_EXCEEDED",
      message: "Cannot salute more than 3 players per game",
      field: "recipientIds"
    }
  ]
}
```

### Transactional Rollback

If any error occurs during salute processing after validation:
1. Roll back any partial database writes
2. Return an error response with details
3. Log the error for debugging
4. Maintain system consistency (no orphaned records)

### Edge Case Handling

- **New players**: Default to 1.0 average to enable immediate participation
- **Empty salute history**: Return 1.0 average to prevent division by zero
- **Concurrent salutes**: Use database-level locking to prevent race conditions
- **Clock skew**: Use server-side timestamps for all date calculations

## Testing Strategy

### Dual Testing Approach

The system will be validated using both unit tests and property-based tests:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property-based tests**: Verify universal properties across randomized inputs

Both testing approaches are complementary and necessary for comprehensive coverage. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across the input space.

### Property-Based Testing Configuration

**Library**: fast-check (already installed in the project)

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: player-salute-ranking, Property {N}: {property title}`

**Test Organization**:
```
tests/
  properties/
    salute-validation.property.test.ts    # Properties 1-4, 15
    salute-calculation.property.test.ts   # Properties 5-6
    average-calculation.property.test.ts  # Properties 7-10
    ranking.property.test.ts              # Properties 12-13
    data-integrity.property.test.ts       # Properties 11, 14, 16
```

### Unit Testing Focus

Unit tests will cover:
- Specific examples demonstrating correct behavior
- Edge cases (new players, empty histories, boundary dates)
- Error conditions (invalid inputs, missing data)
- Integration between services
- Database transaction behavior

### Test Data Generation

Property tests will use smart generators that:
- Generate valid game structures with participants
- Generate realistic date ranges around the 365-day boundary
- Generate player histories with varying salute patterns
- Generate edge cases (empty lists, single items, maximum limits)
- Ensure generated data respects domain constraints

### Coverage Goals

- 100% of correctness properties implemented as property tests
- All error codes covered by unit tests
- All edge cases explicitly tested
- Integration tests for end-to-end salute workflows
