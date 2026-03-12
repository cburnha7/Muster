🚀 API Request: GET /events/38dce243-ffd3-43ee-977d-45cb949f8099/can-book {headers: AxiosHeaders, data: undefined, params: undefined}
C:\Users\edwin\All Roads\src\services\api\BaseApiService.ts:277  GET http://localhost:3000/api/events/38dce243-ffd3-43ee-977d-45cb949f8099/can-book 404 (Not Found)
dispatchXhrRequest @ C:\Users\edwin\All Roads\node_modules\axios\lib\adapters\xhr.js:220
xhr @ C:\Users\edwin\All Roads\node_modules\axios\lib\adapters\xhr.js:16
dispatchRequest @ C:\Users\edwin\All Roads\node_modules\axios\lib\core\dispatchRequest.js:48
Promise.then
_request @ C:\Users\edwin\All Roads\node_modules\axios\lib\core\Axios.js:180
request @ C:\Users\edwin\All Roads\node_modules\axios\lib\core\Axios.js:41
Axios.<computed> @ C:\Users\edwin\All Roads\node_modules\axios\lib\core\Axios.js:228
wrap @ C:\Users\edwin\All Roads\node_modules\axios\lib\helpers\bind.js:12
get @ C:\Users\edwin\All Roads\src\services\api\BaseApiService.ts:277
await in get
canBookEvent @ C:\Users\edwin\All Roads\src\services\api\EventService.ts:222
bookEvent @ C:\Users\edwin\All Roads\src\services\api\EventService.ts:85
proceedWithBooking @ C:\Users\edwin\All Roads\src\screens\events\EventDetailsScreen.tsx:167
handleBookEvent @ C:\Users\edwin\All Roads\src\screens\events\EventDetailsScreen.tsx:155
onClick @ C:\Users\edwin\All Roads\node_modules\react-native-web\dist\modules\usePressEvents\PressResponder.js:314
executeDispatch @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:19116
runWithFiberInDEV @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:871
processDispatchQueue @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:19166
(anonymous) @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:19767
batchedUpdates$1 @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:3255
dispatchEventForPluginEventSystem @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:19320
dispatchEvent @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:23585
dispatchDiscreteEvent @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:23553
<div>
exports.createElement @ C:\Users\edwin\All Roads\node_modules\react\cjs\react.development.js:1054
createElement @ C:\Users\edwin\All Roads\node_modules\react-native-web\dist\exports\createElement\index.js:24
View @ C:\Users\edwin\All Roads\node_modules\react-native-web\dist\exports\View\index.js:111
react_stack_bottom_frame @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:25904
renderWithHooks @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:7662
updateForwardRef @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:9724
beginWork @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:12117
runWithFiberInDEV @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:871
performUnitOfWork @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:17641
workLoopSync @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:17469
renderRootSync @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:17450
performWorkOnRoot @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:16504
performSyncWorkOnRoot @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18972
flushSyncWorkAcrossRoots_impl @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18814
processRootScheduleInMicrotask @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18853
(anonymous) @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18991
<View>
exports.createElement @ C:\Users\edwin\All Roads\node_modules\react\cjs\react.development.js:1054
TouchableOpacity @ C:\Users\edwin\All Roads\node_modules\react-native-web\dist\exports\TouchableOpacity\index.js:90
react_stack_bottom_frame @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:25904
renderWithHooks @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:7662
updateForwardRef @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:9724
beginWork @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:12117
runWithFiberInDEV @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:874
performUnitOfWork @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:17641
workLoopSync @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:17469
renderRootSync @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:17450
performWorkOnRoot @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:16504
performSyncWorkOnRoot @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18972
flushSyncWorkAcrossRoots_impl @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18814
processRootScheduleInMicrotask @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18853
(anonymous) @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18991Understand this error
installHook.js:1 ❌ API Error: GET /events/38dce243-ffd3-43ee-977d-45cb949f8099/can-book {status: 404, statusText: 'Not Found', message: 'Request failed with status code 404', data: '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta char…977d-45cb949f8099/can-book</pre>\n</body>\n</html>\n'}
overrideMethod @ installHook.js:1
logError @ C:\Users\edwin\All Roads\src\services\api\BaseApiService.ts:237
(anonymous) @ C:\Users\edwin\All Roads\src\services\api\BaseApiService.ts:104
Promise.then
_request @ C:\Users\edwin\All Roads\node_modules\axios\lib\core\Axios.js:180
request @ C:\Users\edwin\All Roads\node_modules\axios\lib\core\Axios.js:41
Axios.<computed> @ C:\Users\edwin\All Roads\node_modules\axios\lib\core\Axios.js:228
wrap @ C:\Users\edwin\All Roads\node_modules\axios\lib\helpers\bind.js:12
get @ C:\Users\edwin\All Roads\src\services\api\BaseApiService.ts:277
await in get
canBookEvent @ C:\Users\edwin\All Roads\src\services\api\EventService.ts:222
bookEvent @ C:\Users\edwin\All Roads\src\services\api\EventService.ts:85
proceedWithBooking @ C:\Users\edwin\All Roads\src\screens\events\EventDetailsScreen.tsx:167
handleBookEvent @ C:\Users\edwin\All Roads\src\screens\events\EventDetailsScreen.tsx:155
onClick @ C:\Users\edwin\All Roads\node_modules\react-native-web\dist\modules\usePressEvents\PressResponder.js:314
executeDispatch @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:19116
runWithFiberInDEV @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:871
processDispatchQueue @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:19166
(anonymous) @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:19767
batchedUpdates$1 @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:3255
dispatchEventForPluginEventSystem @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:19320
dispatchEvent @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:23585
dispatchDiscreteEvent @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:23553
<div>
exports.createElement @ C:\Users\edwin\All Roads\node_modules\react\cjs\react.development.js:1054
createElement @ C:\Users\edwin\All Roads\node_modules\react-native-web\dist\exports\createElement\index.js:24
View @ C:\Users\edwin\All Roads\node_modules\react-native-web\dist\exports\View\index.js:111
react_stack_bottom_frame @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:25904
renderWithHooks @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:7662
updateForwardRef @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:9724
beginWork @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:12117
runWithFiberInDEV @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:871
performUnitOfWork @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:17641
workLoopSync @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:17469
renderRootSync @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:17450
performWorkOnRoot @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:16504
performSyncWorkOnRoot @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18972
flushSyncWorkAcrossRoots_impl @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18814
processRootScheduleInMicrotask @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18853
(anonymous) @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18991
<View>
exports.createElement @ C:\Users\edwin\All Roads\node_modules\react\cjs\react.development.js:1054
TouchableOpacity @ C:\Users\edwin\All Roads\node_modules\react-native-web\dist\exports\TouchableOpacity\index.js:90
react_stack_bottom_frame @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:25904
renderWithHooks @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:7662
updateForwardRef @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:9724
beginWork @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:12117
runWithFiberInDEV @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:874
performUnitOfWork @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:17641
workLoopSync @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:17469
renderRootSync @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:17450
performWorkOnRoot @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:16504
performSyncWorkOnRoot @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18972
flushSyncWorkAcrossRoots_impl @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18814
processRootScheduleInMicrotask @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18853
(anonymous) @ C:\Users\edwin\All Roads\node_modules\react-dom\cjs\react-dom-client.development.js:18991Understand this error
installHook.js:1 Booking error: {code: 'HTTP_404', message: 'Request failed with status code 404', details: '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta char…977d-45cb949f8099/can-book</pre>\n</body>\n</html>\n', timestamp: Tue Mar 10 2026 16:30:34 GMT-0400 (Eastern Daylight Time)}# Implementation Plan: League Management System

## Overview

This implementation plan breaks down the League Management System feature into discrete, incremental coding tasks. The feature adds organized competitive leagues to Muster with team rankings, match schedules, player statistics, rules documentation, and certification status. Implementation follows a bottom-up approach: database schema → backend API → frontend services → UI components → navigation integration.

## Tasks

- [x] 1. Database schema and migrations
  - [x] 1.1 Create Prisma schema models for leagues, matches, seasons, memberships, and documents
    - Add League model with fields for name, sport type, season dates, points config, certification status
    - Add LeagueMembership model with team statistics (wins, losses, points, goals)
    - Add Match model with scheduling, scores, and event linking
    - Add Season model for multi-season support
    - Add LeagueDocument and CertificationDocument models for PDF storage
    - Update Team model with league relations (homeMatches, awayMatches, leagueMemberships)
    - Update Event model with matches relation
    - Update User model with league organizer and document uploader relations
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ]* 1.2 Write property test for database referential integrity
    - **Property 40: Referential Integrity**
    - **Validates: Requirements 13.5**
  
  - [x] 1.3 Create and run database migration
    - Generate Prisma migration for new models
    - Run migration on development database
    - Verify all tables and relations created correctly
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 2. Backend API - League endpoints
  - [x] 2.1 Implement league CRUD operations in server/src/routes/leagues.ts
    - GET /api/leagues with filtering (sportType, isCertified, isActive, search) and pagination
    - GET /api/leagues/:id with populated relations (organizer, memberships, matches)
    - POST /api/leagues with validation (name uniqueness, dates, points config)
    - PUT /api/leagues/:id with operator authorization
    - DELETE /api/leagues/:id with operator authorization
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.1, 9.2, 9.3, 15.1, 15.2, 15.3_

  - [ ]* 2.2 Write property tests for league creation and validation
    - **Property 1: League Name Uniqueness Within Sport and Season**
    - **Property 2: League Creator Assignment**
    - **Property 24: League Browser Filtering**
    - **Property 25: League Browser Search**
    - **Property 42: Authenticated League Creation**
    - **Validates: Requirements 2.2, 2.3, 9.2, 9.3, 15.2**
  
  - [x] 2.3 Implement league membership endpoints in server/src/routes/leagues.ts
    - POST /api/leagues/:id/join with team captain validation
    - POST /api/leagues/:id/leave with team captain validation
    - GET /api/leagues/:id/members with pagination
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 15.6_
  
  - [ ]* 2.4 Write property tests for league membership operations
    - **Property 33: Join Button Conditional Display**
    - **Property 34: Team Captain Validation**
    - **Property 35: Duplicate Membership Prevention**
    - **Property 36: Conditional Join Approval**
    - **Property 43: Team Captain League Operations**
    - **Validates: Requirements 12.1, 12.3, 12.4, 12.5, 12.6, 15.6**
  
  - [x] 2.5 Implement standings and rankings endpoints in server/src/routes/leagues.ts
    - GET /api/leagues/:id/standings with season filtering
    - GET /api/leagues/:id/player-rankings with sorting and pagination
    - _Requirements: 3.1, 3.2, 5.1, 5.2, 5.4_
  
  - [ ]* 2.6 Write property tests for standings display
    - **Property 4: Standings Ordering**
    - **Property 5: Standings Data Completeness**
    - **Property 11: Player Rankings Aggregation**
    - **Property 12: Player Rankings Data Completeness**
    - **Property 13: Player Rankings Sortability**
    - **Validates: Requirements 3.1, 3.2, 3.5, 5.1, 5.2, 5.4, 14.4**

- [x] 3. Backend API - Match endpoints
  - [x] 3.1 Implement match CRUD operations in server/src/routes/matches.ts
    - GET /api/matches with filtering (leagueId, seasonId, teamId, status) and pagination
    - GET /api/matches/:id with populated relations (teams, event, league)
    - POST /api/matches with team membership validation
    - PUT /api/matches/:id with operator authorization
    - DELETE /api/matches/:id with operator authorization
    - _Requirements: 4.1, 4.2, 4.3, 11.1, 11.5, 15.4_
  
  - [ ]* 3.2 Write property tests for match creation and validation
    - **Property 7: Match Team Membership Validation**
    - **Property 8: Match Schedule Chronological Ordering**
    - **Property 30: Optional Event Linking**
    - **Property 38: Match Record Completeness**
    - **Validates: Requirements 4.2, 4.3, 11.1, 11.5, 13.2**
  
  - [x] 3.3 Implement match result recording endpoint in server/src/routes/matches.ts
    - POST /api/matches/:id/result with score validation
    - Calculate match outcome (home_win, away_win, draw)
    - Update LeagueMembership statistics for both teams
    - Trigger standings recalculation
    - Send notifications to participating teams
    - _Requirements: 4.5, 4.6, 14.1, 14.2, 17.2_
  
  - [ ]* 3.4 Write property tests for match result recording
    - **Property 9: Match Result Updates Membership Stats**
    - **Property 10: Goal Difference Calculation**
    - **Validates: Requirements 4.5, 4.6, 14.1, 14.2, 14.3**

- [x] 4. Backend API - Document management
  - [x] 4.1 Implement file upload service in server/src/services/DocumentService.ts
    - Create file upload handler with multer middleware
    - Validate PDF format and 10MB size limit
    - Store files in server/uploads/league-documents/{leagueId}/{documentType}/
    - Generate secure file URLs
    - Implement file deletion for document replacement
    - _Requirements: 6.2, 7.3, 13.4_
  
  - [ ]* 4.2 Write property tests for document validation
    - **Property 14: Document Upload Validation**
    - **Validates: Requirements 6.2, 7.3**
  
  - [x] 4.3 Implement document endpoints in server/src/routes/leagues.ts
    - GET /api/leagues/:id/documents
    - POST /api/leagues/:id/documents with file upload
    - DELETE /api/leagues/:id/documents/:documentId with operator authorization
    - GET /api/leagues/:id/documents/:documentId/download with access tracking
    - _Requirements: 6.1, 6.3, 6.4, 6.6, 15.5, 16.1, 16.5_
  
  - [ ]* 4.4 Write property tests for document storage and retrieval
    - **Property 15: Document Storage and Association**
    - **Property 16: Rules Document Conditional Display**
    - **Property 17: Document Retrieval**
    - **Property 45: Document Access Tracking**
    - **Validates: Requirements 6.3, 6.4, 6.6, 16.1, 16.5**
  
  - [x] 4.5 Implement certification endpoints in server/src/routes/leagues.ts
    - POST /api/leagues/:id/certify with bylaws PDF and board members JSON
    - Validate board members count (minimum 3)
    - Store certification documents
    - Update league.isCertified status
    - Send notifications to all league members
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 17.4_
  
  - [ ]* 4.6 Write property tests for certification
    - **Property 18: Certification Requirements Validation**
    - **Property 19: Certification Status Update**
    - **Property 22: Certification Documents Access**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 8.5**

- [x] 5. Backend API - Season management
  - [x] 5.1 Implement season endpoints in server/src/routes/seasons.ts
    - GET /api/seasons with filtering (leagueId, isActive) and pagination
    - GET /api/seasons/:id with standings
    - POST /api/seasons with operator authorization
    - PUT /api/seasons/:id with operator authorization
    - POST /api/seasons/:id/complete to archive standings
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_
  
  - [ ]* 5.2 Write property tests for season management
    - **Property 47: Season Completion**
    - **Property 48: New Season Creation**
    - **Property 49: Historical Season Access**
    - **Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5**

- [x] 6. Backend services - Ranking calculation
  - [x] 6.1 Implement RankingCalculationService in server/src/services/RankingCalculationService.ts
    - Calculate team standings with points, goal difference, goals scored sorting
    - Handle tied rankings with secondary criteria
    - Calculate player rankings by aggregating GameParticipation data
    - Cache rankings for performance (5-second update requirement)
    - _Requirements: 3.1, 3.3, 3.5, 5.1, 5.3, 14.3, 14.4, 14.5_
  
  - [ ]* 6.2 Write property tests for ranking calculation
    - **Property 6: Standings Reactivity**
    - **Property 26: League Browser Relevance Ordering**
    - **Validates: Requirements 3.3, 3.4, 3.5, 9.5**
  
  - [ ]* 6.3 Write unit tests for ranking edge cases
    - Test empty leagues with no matches
    - Test tied standings with all tiebreaker scenarios
    - Test goal difference calculation accuracy
    - Test player rankings with missing data
    - _Requirements: 3.5, 14.4, 14.6_

- [x] 7. Backend services - Notification integration
  - [x] 7.1 Extend NotificationService for league events in server/src/services/NotificationService.ts
    - Add notification templates for match scheduled, result recorded, rules updated, certification achieved
    - Implement recipient filtering (participating teams vs all members)
    - Respect user notification preferences
    - Queue notifications for batch delivery
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [ ]* 7.2 Write property test for notification delivery
    - **Property 46: League Event Notifications**
    - **Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5**

- [x] 8. Checkpoint - Backend API complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Frontend types and interfaces
  - [x] 9.1 Create TypeScript types in src/types/league.ts
    - Define League, LeagueMembership, Match, Season interfaces
    - Define PointsConfig, MatchStatus, MatchOutcome, MembershipStatus types
    - Define TeamStanding, PlayerRanking interfaces
    - Define LeagueDocument, CertificationDocument, BoardMember interfaces
    - Define CreateLeagueData, UpdateLeagueData, CreateMatchData types
    - Define LeagueFilters interface
    - _Requirements: All requirements (type safety)_
  
  - [x] 9.2 Add league types to src/types/index.ts
    - Export all league-related types
    - _Requirements: All requirements (type safety)_

- [x] 10. Frontend API services
  - [x] 10.1 Implement LeagueService in src/services/api/LeagueService.ts
    - Extend BaseApiService
    - Implement getLeagues, getLeagueById, createLeague, updateLeague, deleteLeague
    - Implement getStandings, getPlayerRankings
    - Implement joinLeague, leaveLeague
    - Implement getDocuments, uploadDocument, deleteDocument
    - Implement certifyLeague
    - Add request caching with CacheService
    - _Requirements: 2.1, 2.4, 2.5, 3.1, 3.2, 6.1, 6.6, 7.1, 9.1, 9.2, 9.3, 12.1, 12.2_
  
  - [ ]* 10.2 Write unit tests for LeagueService
    - Test API calls with mocked responses
    - Test error handling
    - Test cache integration
    - _Requirements: All API requirements_
  
  - [x] 10.3 Implement MatchService in src/services/api/MatchService.ts
    - Extend BaseApiService
    - Implement getMatches, getMatchById, createMatch, updateMatch, deleteMatch
    - Implement recordMatchResult
    - Add request caching
    - _Requirements: 4.1, 4.2, 4.5_
  
  - [ ]* 10.4 Write unit tests for MatchService
    - Test API calls with mocked responses
    - Test result recording
    - Test error handling
    - _Requirements: 4.1, 4.2, 4.5_
  
  - [x] 10.5 Implement SeasonService in src/services/api/SeasonService.ts
    - Extend BaseApiService
    - Implement getSeasons, getSeasonById, createSeason, updateSeason
    - Implement completeSeason
    - _Requirements: 18.1, 18.2, 18.3_

- [-] 11. Frontend state management
  - [x] 11.1 Create leaguesSlice in src/store/slices/leaguesSlice.ts
    - Define initial state with leagues array, loading, error
    - Implement reducers: setLeagues, addLeague, updateLeague, deleteLeague
    - Implement reducers: setStandings, setPlayerRankings
    - Implement reducers: setDocuments, addDocument, deleteDocument
    - Add selectors for filtering and sorting
    - _Requirements: All league requirements_
  
  - [x] 11.2 Create matchesSlice in src/store/slices/matchesSlice.ts
    - Define initial state with matches array, loading, error
    - Implement reducers: setMatches, addMatch, updateMatch, deleteMatch
    - Implement reducers: recordResult
    - Add selectors for filtering by league, team, status
    - _Requirements: All match requirements_
  
  - [x] 11.3 Update store configuration in src/store/store.ts
    - Add leaguesSlice and matchesSlice to rootReducer
    - Add to persist whitelist for offline support
    - _Requirements: All requirements_
  
  - [x] 11.4 Export slices from src/store/slices/index.ts
    - Export leaguesSlice and matchesSlice
    - _Requirements: All requirements_

- [x] 12. Frontend UI components - Cards and lists
  - [x] 12.1 Create LeagueCard component in src/components/ui/LeagueCard.tsx
    - Display league name, sport type, season dates, member count
    - Show certification badge if league is certified
    - Handle onPress navigation to league details
    - Use theme colors and typography
    - _Requirements: 8.1, 8.2, 9.1, 9.4_
  
  - [ ]* 12.2 Write property test for certification badge display
    - **Property 20: Certified Badge Display**
    - **Validates: Requirements 8.1**
  
  - [x] 12.3 Create StandingsTable component in src/components/league/StandingsTable.tsx
    - Display team rankings in table format
    - Show columns: rank, team name, played, wins, losses, draws, points, GF, GA, GD
    - Handle sorting by different columns
    - Show recent form (last 5 matches)
    - Use responsive layout for mobile
    - _Requirements: 3.1, 3.2, 3.5_
  
  - [x] 12.4 Create MatchCard component in src/components/league/MatchCard.tsx
    - Display match details: date, time, teams, scores
    - Show match status (scheduled, in_progress, completed, cancelled)
    - Display linked event information if available
    - Handle onPress navigation to match details
    - _Requirements: 4.3, 4.4, 11.2_
  
  - [x] 12.5 Create PlayerRankingsTable component in src/components/league/PlayerRankingsTable.tsx
    - Display player rankings in table format
    - Show columns: rank, player name, team, matches played, avg rating, performance score
    - Handle sorting by different metrics
    - Use pagination for large datasets
    - _Requirements: 5.1, 5.2, 5.4_

- [x] 13. Frontend UI components - Forms
  - [x] 13.1 Create LeagueForm component in src/components/league/LeagueForm.tsx
    - Input fields: name, description, sport type, skill level
    - Season dates: start date, end date pickers
    - Points system configuration: win, draw, loss points
    - Image upload for league logo
    - Validation with error messages
    - _Requirements: 2.1, 2.4_
  
  - [x] 13.2 Create MatchForm component in src/components/league/MatchForm.tsx
    - Team selection dropdowns (filtered to league members)
    - Date and time pickers for scheduling
    - Optional event linking with search
    - Notes text area
    - Validation with error messages
    - _Requirements: 4.1, 4.2_
  
  - [x] 13.3 Create MatchResultForm component in src/components/league/MatchResultForm.tsx
    - Score inputs for home and away teams
    - Outcome display (calculated from scores)
    - Confirmation dialog before submission
    - _Requirements: 4.5_
  
  - [x] 13.4 Create DocumentUploadForm component in src/components/league/DocumentUploadForm.tsx
    - File picker for PDF selection
    - Document type selection (rules, schedule, other)
    - File size and format validation
    - Upload progress indicator
    - _Requirements: 6.1, 6.2_
  
  - [x] 13.5 Create CertificationForm component in src/components/league/CertificationForm.tsx
    - Bylaws PDF upload
    - Board members input (dynamic list, minimum 3)
    - Each member: name and role fields
    - Validation with error messages
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 14. Frontend screens - League browsing
  - [x] 14.1 Create LeaguesBrowserScreen in src/screens/leagues/LeaguesBrowserScreen.tsx
    - SearchBar for league name search
    - Filter controls: sport type, certification status, season status
    - FlatList of LeagueCard components
    - Pull-to-refresh functionality
    - Pagination with infinite scroll
    - Empty state when no leagues found
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 14.2 Write property tests for league browser
    - **Property 21: Certification Filter**
    - **Property 23: League Browser Data Completeness**
    - **Validates: Requirements 8.3, 9.1**
  
  - [x] 14.3 Create LeagueDetailsScreen in src/screens/leagues/LeagueDetailsScreen.tsx
    - League header with name, sport, season, certification badge
    - League info section: description, dates, points system
    - TabView with 5 tabs: Standings, Matches, Players, Teams, Info
    - Action buttons: Join League (conditional), Manage (operator only)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.4, 12.1_
  
  - [ ]* 14.4 Write property test for league details display
    - **Property 3: League Operator Permissions**
    - **Property 41: Public League Viewing**
    - **Validates: Requirements 15.1, 15.3**

- [ ] 15. Frontend screens - League management
  - [x] 15.1 Create CreateLeagueScreen in src/screens/leagues/CreateLeagueScreen.tsx
    - Use LeagueForm component
    - Handle form submission with validation
    - Call LeagueService.createLeague
    - Navigate to league details on success
    - Show error messages on failure
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 15.2 Create ManageLeagueScreen in src/screens/leagues/ManageLeagueScreen.tsx
    - Edit league info section with LeagueForm
    - Manage teams section: list members, add/remove teams
    - Upload documents section with DocumentUploadForm
    - Certification section with CertificationForm
    - Only accessible to league operator
    - _Requirements: 2.4, 2.5, 6.1, 6.6, 7.1, 15.3, 15.5_
  
  - [x] 15.3 Create CreateMatchScreen in src/screens/leagues/CreateMatchScreen.tsx
    - Use MatchForm component
    - Handle form submission with validation
    - Call MatchService.createMatch
    - Navigate to match details on success
    - Only accessible to league operator
    - _Requirements: 4.1, 4.2, 15.4_
  
  - [x] 15.4 Create RecordMatchResultScreen in src/screens/leagues/RecordMatchResultScreen.tsx
    - Display match details (teams, date)
    - Use MatchResultForm component
    - Handle result submission
    - Call MatchService.recordMatchResult
    - Show updated standings after submission
    - Only accessible to league operator
    - _Requirements: 4.5, 4.6, 15.4_

- [ ] 16. Frontend screens - Document viewing
  - [x] 16.1 Create DocumentViewerScreen in src/screens/leagues/DocumentViewerScreen.tsx
    - Display PDF using platform-appropriate viewer
    - iOS: Use react-native-pdf or WebView with PDF URL
    - Android: Use react-native-pdf or WebView with PDF URL
    - Web: Use iframe or browser native PDF viewer
    - Support zoom, scroll, page navigation
    - Provide download button as fallback
    - Track document access for analytics
    - _Requirements: 6.5, 16.1, 16.2, 16.3, 16.4, 16.5_
  
  - [ ]* 16.2 Write property test for document viewing
    - **Property 44: Document Download Fallback**
    - **Validates: Requirements 16.4**

- [ ] 17. Frontend screens - Tab views
  - [x] 17.1 Create StandingsTab component in src/screens/leagues/tabs/StandingsTab.tsx
    - Use StandingsTable component
    - Season selector dropdown
    - Refresh button to recalculate standings
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 17.2 Create MatchesTab component in src/screens/leagues/tabs/MatchesTab.tsx
    - FlatList of MatchCard components
    - Filter by status (all, scheduled, completed)
    - Sort by date (ascending/descending)
    - Create Match button (operator only)
    - _Requirements: 4.3, 4.4_
  
  - [x] 17.3 Create PlayersTab component in src/screens/leagues/tabs/PlayersTab.tsx
    - Use PlayerRankingsTable component
    - Sort selector dropdown
    - Season filter
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 17.4 Create TeamsTab component in src/screens/leagues/tabs/TeamsTab.tsx
    - FlatList of TeamCard components
    - Show all league members
    - Navigate to team details on card press
    - _Requirements: 10.1, 10.2, 10.5_
  
  - [x] 17.5 Create InfoTab component in src/screens/leagues/tabs/InfoTab.tsx
    - Display league description
    - Show points system configuration
    - List league documents with "View" buttons
    - Show certification info and documents (if certified)
    - _Requirements: 6.4, 6.5, 8.5_

- [ ] 18. Navigation integration
  - [x] 18.1 Create LeaguesStackNavigator in src/navigation/stacks/LeaguesStackNavigator.tsx
    - Define stack screens: LeaguesBrowser, LeagueDetails, CreateLeague, ManageLeague, CreateMatch, RecordMatchResult, DocumentViewer
    - Configure screen options and headers
    - _Requirements: 1.1, 1.2_
  
  - [x] 18.2 Update TabNavigator in src/navigation/TabNavigator.tsx
    - Add Leagues tab with trophy icon
    - Position between Teams and Bookings tabs
    - Configure active/inactive states
    - _Requirements: 1.1, 1.3, 1.4_
  
  - [x] 18.3 Update navigation types in src/navigation/types.ts
    - Add LeaguesStack to MainTabParamList
    - Define LeaguesStackParamList with all screen params
    - _Requirements: 1.1_
  
  - [ ]* 18.4 Write property test for navigation access
    - **Property 27: Team Reference Integrity**
    - **Property 31: Event Data Integration**
    - **Property 32: Event League Context Display**
    - **Validates: Requirements 10.1, 10.2, 11.2, 11.4**

- [ ] 19. Integration with existing features
  - [x] 19.1 Update TeamDetailsScreen to show league participation
    - Add "Leagues" section listing all leagues the team is in
    - Show league name, season, current standing
    - Navigate to league details on press
    - _Requirements: 10.5_
  
  - [ ]* 19.2 Write property test for team league display
    - **Property 28: Active Member Deletion Prevention**
    - **Property 29: Team League Participation Display**
    - **Validates: Requirements 10.4, 10.5**
  
  - [x] 19.3 Update EventDetailsScreen to show league context
    - Add "League Match" badge if event is linked to a match
    - Show league name and match details
    - Navigate to league details on press
    - _Requirements: 11.4_
  
  - [x] 19.4 Update TeamService to prevent deletion of active league members
    - Check for active league memberships before deletion
    - Return error if team is in any active league
    - _Requirements: 10.4_

- [x] 20. Checkpoint - Frontend implementation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Integration tests
  - [ ]* 21.1 Write integration tests for league creation flow
    - Test complete flow: create league → add teams → create matches → record results → view standings
    - Verify database state at each step
    - Test error handling and rollback
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.5, 3.1_
  
  - [ ]* 21.2 Write integration tests for certification flow
    - Test complete flow: create league → upload documents → submit certification → verify badge display
    - Test validation errors
    - Test notification delivery
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 17.4_
  
  - [ ]* 21.3 Write integration tests for season management
    - Test complete flow: create season → add teams → play matches → complete season → create new season
    - Verify standings archived correctly
    - Verify new season resets standings
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_
  
  - [ ]* 21.4 Write integration tests for document management
    - Test upload, view, replace, delete flows
    - Test access control
    - Test download fallback
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 16.1, 16.2, 16.3, 16.4_

- [ ] 22. End-to-end testing
  - [ ]* 22.1 Write E2E test for league operator workflow
    - Create league → invite teams → schedule matches → record results → view standings
    - Test on iOS, Android, and web platforms
    - _Requirements: All operator requirements_
  
  - [ ]* 22.2 Write E2E test for team captain workflow
    - Browse leagues → join league → view standings → view match schedule
    - Test on iOS, Android, and web platforms
    - _Requirements: All member requirements_
  
  - [ ]* 22.3 Write E2E test for certification workflow
    - Create league → upload bylaws → add board members → submit certification → verify badge
    - Test on iOS, Android, and web platforms
    - _Requirements: All certification requirements_

- [x] 23. Final checkpoint - Complete feature
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows across multiple components
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The implementation follows a bottom-up approach: database → backend → frontend services → UI → navigation
- All code should use TypeScript for type safety
- All UI components should use the theme system (colors, typography, spacing)
- All API calls should include proper error handling and loading states
- All forms should include validation with user-friendly error messages
- Document upload requires file storage configuration (local for dev, S3 for production)
- PDF viewing requires platform-specific libraries (react-native-pdf or WebView)
- Notification delivery integrates with existing NotificationService
- Player rankings aggregate data from existing GameParticipation records
