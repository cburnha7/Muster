# Implementation Plan: Player Salute Ranking System

## Overview

This implementation plan breaks down the Player Salute Ranking system into discrete, incremental tasks. The approach focuses on building core calculation logic first, then data persistence, service layer, and finally UI integration. Each task builds on previous work and includes validation through tests.

## Tasks

- [ ] 1. Set up data models and type definitions
  - Create TypeScript interfaces for Salute, PlayerRanking, ValidationResult, and related types
  - Define error code constants
  - Create type guards for runtime validation
  - _Requirements: All requirements (foundational)_

- [ ]* 1.1 Write unit tests for type guards
  - Test type guard functions with valid and invalid inputs
  - _Requirements: 7.4_

- [ ] 2. Implement SaluteCalculator (pure calculation logic)
  - [ ] 2.1 Implement calculateSaluteValue function
    - Calculate weighted salute value (1.0 * saluterAverage)
    - Handle edge case of new players (default 1.0)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 2.2 Write property test for salute value calculation
    - **Property 5: Salute Value Calculation**
    - **Validates: Requirements 2.1, 2.3**

  - [ ] 2.3 Implement calculateAverage function
    - Calculate mean of salute values
    - Return 1.0 for empty arrays
    - _Requirements: 3.2, 3.3_

  - [ ]* 2.4 Write property test for average calculation
    - **Property 8: Average Calculation Correctness**
    - **Validates: Requirements 3.2, 3.3**

  - [ ] 2.5 Implement filterByTimeWindow function
    - Filter salutes to 365-day window
    - Handle date comparisons correctly
    - _Requirements: 3.4, 4.2_

  - [ ]* 2.6 Write property test for time window filtering
    - **Property 9: Time Window Filtering**
    - **Validates: Requirements 3.4, 4.2**

- [ ] 3. Implement salute validation logic
  - [ ] 3.1 Implement validateSalutes function
    - Check salute limit (max 3)
    - Check for self-salutes
    - Check for duplicate recipients
    - Check for non-participants
    - Return ValidationResult with specific error codes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 3.2 Write property test for salute limit enforcement
    - **Property 1: Salute Limit Enforcement**
    - **Validates: Requirements 1.1, 1.3**

  - [ ]* 3.3 Write property test for self-salute rejection
    - **Property 2: Self-Salute Rejection**
    - **Validates: Requirements 1.2**

  - [ ]* 3.4 Write property test for duplicate salute rejection
    - **Property 3: Duplicate Salute Rejection**
    - **Validates: Requirements 1.4**

  - [ ]* 3.5 Write property test for participant-only salutes
    - **Property 4: Participant-Only Salutes**
    - **Validates: Requirements 1.5, 6.2**

  - [ ]* 3.6 Write unit tests for validation error messages
    - Test each error code is returned correctly
    - _Requirements: 7.4_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement data storage layer
  - [ ] 5.1 Create SaluteRepository interface and implementation
    - saveSalute(salute): Promise<Salute>
    - getSalutesForPlayer(playerId, startDate, endDate): Promise<Salute[]>
    - getSalutesForGame(gameId, playerId): Promise<Salute[]>
    - Use appropriate storage mechanism (SQLite via expo-sqlite or AsyncStorage)
    - _Requirements: 3.1, 4.1, 6.1_

  - [ ]* 5.2 Write property test for salute data persistence
    - **Property 6: Salute Data Persistence**
    - **Validates: Requirements 2.4**

  - [ ]* 5.3 Write property test for salute history recording
    - **Property 7: Salute History Recording**
    - **Validates: Requirements 3.1**

  - [ ]* 5.4 Write property test for timestamp persistence
    - **Property 11: Timestamp Persistence**
    - **Validates: Requirements 4.1**

  - [ ]* 5.5 Write property test for game association
    - **Property 14: Game Association**
    - **Validates: Requirements 6.1**

  - [ ] 5.6 Create PlayerStatsRepository interface and implementation
    - getPlayerStats(playerId): Promise<PlayerStats>
    - updatePlayerAverage(playerId, newAverage, totalSalutes): Promise<void>
    - getPlayerRankings(limit, offset): Promise<PlayerRanking[]>
    - _Requirements: 3.5, 5.1, 5.2, 5.3_

  - [ ]* 5.7 Write unit tests for repository error handling
    - Test database connection failures
    - Test constraint violations
    - _Requirements: 7.1_

- [ ] 6. Implement RankingService
  - [ ] 6.1 Implement calculateSaluteAverage method
    - Fetch salutes from repository
    - Filter by time window
    - Calculate average using SaluteCalculator
    - _Requirements: 3.2, 3.4_

  - [ ]* 6.2 Write property test for average update immediacy
    - **Property 10: Average Update Immediacy**
    - **Validates: Requirements 3.5**

  - [ ] 6.3 Implement getPlayerRankings method
    - Fetch all player stats
    - Sort by average (descending), then by count (descending)
    - Apply pagination
    - _Requirements: 5.1, 5.4_

  - [ ]* 6.4 Write property test for ranking order correctness
    - **Property 12: Ranking Order Correctness**
    - **Validates: Requirements 5.1, 5.4**

  - [ ]* 6.5 Write property test for ranking data completeness
    - **Property 13: Ranking Data Completeness**
    - **Validates: Requirements 5.2, 5.3**

  - [ ] 6.6 Implement updatePlayerAverage method
    - Recalculate average after new salute
    - Update cached stats in repository
    - _Requirements: 3.5_

- [ ] 7. Implement GameService integration
  - [ ] 7.1 Add methods to existing GameService (or create if needed)
    - getGameParticipants(gameId): Promise<Player[]>
    - isParticipant(gameId, playerId): Promise<boolean>
    - isSaluteWindowOpen(gameId): Promise<boolean>
    - _Requirements: 1.5, 6.2, 6.3, 6.4_

  - [ ]* 7.2 Write property test for salute window validation
    - **Property 15: Salute Window Validation**
    - **Validates: Requirements 6.3, 6.4**

  - [ ]* 7.3 Write unit tests for game service integration
    - Test participant lookup
    - Test window timing logic
    - _Requirements: 6.3, 6.4_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement SaluteService
  - [ ] 9.1 Implement giveSalutes method
    - Validate salutes using validation logic
    - Get saluter's current average
    - Calculate salute values
    - Save salutes to repository (atomic transaction)
    - Update recipient averages
    - Return SaluteTransaction results
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.3, 3.1, 3.5, 7.1_

  - [ ]* 9.2 Write property test for transaction atomicity
    - **Property 16: Transaction Atomicity**
    - **Validates: Requirements 7.1**

  - [ ]* 9.3 Write unit tests for giveSalutes error scenarios
    - Test validation failures
    - Test database failures
    - Test rollback behavior
    - _Requirements: 7.1_

  - [ ] 9.4 Implement getSalutesForGame method
    - Query repository for game-specific salutes
    - _Requirements: 6.1_

- [ ] 10. Create Redux slice for salute state management
  - [ ] 10.1 Create saluteSlice with actions and reducers
    - Actions: giveSalutes, fetchPlayerRankings, fetchPlayerStats
    - Reducers: handle loading, success, error states
    - Use RTK Query or createAsyncThunk for API calls
    - _Requirements: All requirements (state management)_

  - [ ]* 10.2 Write unit tests for Redux slice
    - Test action creators
    - Test reducers
    - Test selectors
    - _Requirements: All requirements_

- [ ] 11. Create UI components for salute system
  - [ ] 11.1 Create SaluteSelectionModal component
    - Display list of game participants
    - Allow selection of up to 3 players
    - Show validation errors
    - Submit salutes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 11.2 Create PlayerRankingsScreen component
    - Display ranked list of players
    - Show salute average and total count
    - Implement pagination
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 11.3 Create PlayerStatsCard component
    - Display individual player's ranking info
    - Show salute average, rank, percentile
    - Show recent salute history
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 11.4 Write component tests for UI
    - Test SaluteSelectionModal interactions
    - Test PlayerRankingsScreen rendering
    - Test PlayerStatsCard display
    - _Requirements: UI requirements_

- [ ] 12. Integrate salute system with game flow
  - [ ] 12.1 Add salute prompt after game completion
    - Trigger SaluteSelectionModal when game ends
    - Handle salute window timing
    - Show success/error feedback
    - _Requirements: 6.3, 6.4_

  - [ ] 12.2 Add rankings navigation
    - Add rankings tab or menu item
    - Link to PlayerRankingsScreen
    - _Requirements: 5.1_

  - [ ] 12.3 Add player stats to profile
    - Display PlayerStatsCard in profile screen
    - Show personal ranking information
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 13. Final checkpoint - End-to-end testing
  - Ensure all tests pass, ask the user if questions arise.
  - Verify complete salute workflow from game completion to ranking update
  - Test edge cases and error scenarios
