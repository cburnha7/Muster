# Implementation Plan: Auto-Generate Time Slots

## Overview

This implementation plan converts the auto-generate time slots feature design into actionable coding tasks. The feature automatically generates and maintains a rolling 365-day window of bookable time slots for all courts, eliminating manual setup work for ground operators.

The implementation follows a phased approach:
1. **Service Layer**: Build core slot generation services
2. **API Refactoring**: Update court creation to use async slot generation
3. **Backfill Script**: Populate slots for existing courts
4. **Cron Job**: Maintain rolling window automatically
5. **Monitoring**: Add observability and alerts

## Tasks

- [x] 1. Create OperatingHoursService
  - Create `server/src/services/OperatingHoursService.ts`
  - Implement `getOperatingHours(facilityId)` to query FacilityAvailability table
  - Implement `getDefaultHours()` returning 06:00-22:00 for all days
  - Implement `isOpenOnDate(facilityId, date)` to check if facility is open
  - Implement `getTimeSlotsForDay(dayOfWeek, hours)` to generate hourly time ranges
  - Add validation for operating hours format (HH:MM, startTime < endTime)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 1.1 Write unit tests for OperatingHoursService
  - Test default hours fallback when no operating hours defined
  - Test day-of-week filtering
  - Test blocked days exclusion
  - Test invalid time format handling
  - _Requirements: 2.2, 2.3_

- [x] 2. Create TimeSlotGeneratorService
  - [x] 2.1 Create service file and core structure
    - Create `server/src/services/TimeSlotGeneratorService.ts`
    - Define TypeScript interfaces: `TimeSlotGenerationOptions`, `TimeSlotGenerationResult`, `OperatingHours`
    - Inject OperatingHoursService dependency
    - Add logger for structured logging
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Implement date and time utility functions
    - Implement `normalizeToUTCMidnight(date)` to set date to 00:00:00.000 UTC
    - Implement `calculate365DayRange(startDate)` to compute 365-day window
    - Implement `formatTime(hour)` to convert hour to HH:MM format
    - Implement `parseTime(timeStr)` to convert HH:MM to Date object
    - Handle leap year calculations correctly
    - _Requirements: 1.5, 1.6, 8.1, 8.2, 8.4, 8.5_

  - [ ]* 2.3 Write property test for date normalization
    - **Property 5: UTC Midnight Normalization**
    - **Validates: Requirements 1.5, 8.1**
    - Use fast-check to generate random dates
    - Verify all normalized dates have hours/minutes/seconds/milliseconds = 0
    - Verify dates are in UTC timezone

  - [x] 2.4 Implement generateSlotsForDate method
    - Accept courtId, date, operatingHours array, and pricePerHour
    - Get day of week from date
    - Filter operating hours for that day of week
    - Return empty array if day is blocked (isBlocked=true)
    - Generate hourly slots from startTime to endTime
    - Create slot objects with: courtId, date (UTC midnight), startTime (HH:MM), endTime (HH:MM), price, status="available"
    - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.3, 9.1, 9.2_

  - [ ]* 2.5 Write property test for slot duration
    - **Property 2: One-Hour Slot Duration**
    - **Validates: Requirements 1.2**
    - Generate slots for random dates and operating hours
    - Verify all slots have exactly 60-minute duration
    - Parse startTime and endTime to verify difference

  - [ ]* 2.6 Write property test for operating hours compliance
    - **Property 7: Operating Hours Compliance**
    - **Validates: Requirements 2.1, 2.4**
    - Generate random operating hours configurations
    - Generate slots and verify all fall within specified time ranges
    - Test with various day-of-week combinations

  - [x] 2.7 Implement batchInsertSlots method
    - Accept array of slot data and optional batchSize (default 1000)
    - Split slots into batches of specified size
    - Use Prisma's `createMany` with `skipDuplicates: true`
    - Catch unique constraint violations (P2002) and log as info
    - Catch foreign key violations (P2003) and throw CourtNotFoundError
    - Return object with `inserted` and `skipped` counts
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 2.8 Write property test for idempotent generation
    - **Property 11: Idempotent Generation**
    - **Validates: Requirements 3.4, 5.2**
    - Create test court and generate slots multiple times (2-5 runs)
    - Verify slot count remains unchanged after first generation
    - Verify no duplicate slots exist

  - [x] 2.9 Implement checkSlotCoverage method
    - Accept courtId and target days (default 365)
    - Use Prisma aggregate to get MAX(date) for the court
    - Return null if no slots exist
    - Calculate days between latest slot date and target date (today + 365 days)
    - Return object with: hasCompleteCoverage (boolean), latestSlotDate, missingDays
    - _Requirements: 3.2, 3.3_

  - [x] 2.10 Implement generateSlotsForCourt method
    - Accept TimeSlotGenerationOptions: courtId, startDate, endDate, skipExisting
    - Query court data including facility reference
    - Return early with warning if court not found
    - Get operating hours via OperatingHoursService
    - Use facility default price if court pricePerHour is null
    - Loop through each date in range, generate slots for each date
    - Collect all slots into array
    - Call batchInsertSlots to insert with duplicate handling
    - Return TimeSlotGenerationResult with metrics
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 9.1_

  - [ ]* 2.11 Write property test for 365-day coverage
    - **Property 1: 365-Day Rolling Window Coverage**
    - **Validates: Requirements 1.1, 4.2**
    - Generate slots for random court
    - Query all slots and extract unique dates
    - Verify exactly 365 unique dates exist
    - Verify dates are consecutive with no gaps

  - [x] 2.12 Implement generateRollingWindow method
    - Accept courtId parameter
    - Calculate 365-day range from current date
    - Call generateSlotsForCourt with calculated range
    - Return TimeSlotGenerationResult
    - _Requirements: 1.1, 3.1, 4.2_

  - [ ]* 2.13 Write unit tests for TimeSlotGeneratorService
    - Test generateSlotsForDate with default hours (06:00-22:00)
    - Test generateSlotsForDate with custom operating hours
    - Test generateSlotsForDate skips blocked days
    - Test generateSlotsForDate handles leap year dates (Feb 29)
    - Test checkSlotCoverage identifies incomplete coverage
    - Test checkSlotCoverage confirms complete 365-day coverage
    - Test batchInsertSlots handles duplicate constraint violations gracefully
    - Test generateSlotsForCourt handles missing court gracefully
    - _Requirements: 2.2, 2.3, 5.4, 7.1, 8.5_

- [x] 3. Checkpoint - Verify service layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Refactor court creation API
  - [x] 4.1 Create async slot generation queue function
    - Create `queueSlotGeneration(courtId)` function in `server/src/routes/courts.ts`
    - Add 100ms delay to ensure transaction is committed
    - Instantiate TimeSlotGeneratorService
    - Call `generateRollingWindow(courtId)` with try-catch
    - Log success with metrics (courtId, slotsGenerated, duration)
    - Log errors and call `trackFailedGeneration(courtId, error)` on failure
    - Return Promise<void>
    - _Requirements: 6.3, 7.1_

  - [x] 4.2 Update POST /api/facilities/:id/courts endpoint
    - Remove existing inline slot generation code (lines that create FacilityTimeSlot records)
    - After court creation succeeds, call `queueSlotGeneration(court.id).catch(...)` without awaiting
    - Ensure API returns 201 response immediately with court data
    - Add error logging for async failures (should not affect response)
    - _Requirements: 6.1, 6.2, 6.3, 7.1_

  - [ ]* 4.3 Write integration test for async slot generation
    - **Property 15: Async Execution Pattern**
    - **Validates: Requirements 6.3**
    - Measure API response time for court creation
    - Verify response returns before slot generation completes
    - Verify response time is under 500ms
    - Wait for async generation to complete
    - Verify slots were created successfully

  - [ ]* 4.4 Write integration test for graceful failure
    - **Property 16: Graceful Failure Isolation**
    - **Validates: Requirements 7.1, 7.5**
    - Mock TimeSlotGeneratorService to throw error
    - Create court via API
    - Verify court creation succeeds (201 response)
    - Verify court exists in database
    - Verify error was logged

- [x] 5. Create backfill script
  - [x] 5.1 Create backfill script file
    - Create `server/src/scripts/backfillTimeSlots.ts`
    - Import PrismaClient and TimeSlotGeneratorService
    - Create main async function `backfillTimeSlots()`
    - Add console logging for progress tracking
    - _Requirements: 4.1, 4.5_

  - [x] 5.2 Implement court identification logic
    - Query FacilityCourt with filter: `isActive: true, timeSlots: { none: {} }`
    - Select court id, name, and facility name
    - Log count of courts found
    - Exit early if no courts need backfill
    - _Requirements: 4.1_

  - [x] 5.3 Implement slot generation loop
    - Loop through each court with progress indicator
    - Call `timeSlotGenerator.generateRollingWindow(courtId)` for each
    - Track success count, error count, and total slots generated
    - Log success or error for each court
    - Continue processing remaining courts if one fails
    - _Requirements: 4.2, 4.3, 7.5_

  - [x] 5.4 Add summary reporting
    - Log final summary: courts processed, successful, failed, total slots
    - Exit with code 1 if any failures occurred
    - Exit with code 0 on complete success
    - Disconnect Prisma client in finally block
    - _Requirements: 4.5_

  - [ ]* 5.5 Write unit test for backfill script
    - **Property 13: Zero-Slot Court Identification**
    - **Validates: Requirements 4.1**
    - Create mix of courts: some with slots, some without
    - Run backfill identification logic
    - Verify only courts with zero slots are identified
    - Verify courts with existing slots are not processed

- [x] 6. Checkpoint - Test backfill script on staging
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create cron job for maintenance
  - [x] 7.1 Create TimeSlotMaintenanceJob class
    - Create `server/src/jobs/TimeSlotMaintenanceJob.ts`
    - Define CronJobMetrics interface
    - Create class with TimeSlotGeneratorService dependency
    - Add structured logger
    - _Requirements: 3.1, 3.5_

  - [x] 7.2 Implement execute method
    - Query all active courts (isActive=true)
    - Initialize metrics object: executionDate, courtsProcessed, slotsGenerated, courtsWithErrors, duration, errors array
    - Loop through courts and call processCourt for each
    - Aggregate metrics from each court
    - Call retryFailedGenerations at end
    - Calculate total duration
    - Return CronJobMetrics
    - _Requirements: 3.1, 3.2, 3.5, 7.3_

  - [x] 7.3 Implement processCourt method
    - Accept courtId parameter
    - Call checkSlotCoverage(courtId, 365)
    - Return early if hasCompleteCoverage is true
    - Call generateRollingWindow(courtId) if coverage incomplete
    - Catch errors and return error message
    - Return object with slotsGenerated and optional error
    - _Requirements: 3.2, 3.3, 7.5_

  - [ ]* 7.4 Write property test for gap filling
    - **Property 12: Gap Filling**
    - **Validates: Requirements 3.3**
    - Create court with partial slot coverage (e.g., 200 days)
    - Run maintenance job processCourt method
    - Verify missing slots are generated
    - Verify existing slots are not modified
    - Verify total coverage reaches 365 days

  - [x] 7.5 Implement retryFailedGenerations method
    - Create in-memory Map to track failed generations: courtId -> FailedGeneration
    - Define FailedGeneration interface: courtId, failedAt, error, retryCount
    - Implement trackFailedGeneration function to add/update failures
    - In retryFailedGenerations, loop through failed courts
    - Attempt generateRollingWindow for each
    - Remove from map on success, increment retryCount on failure
    - Return count of successful retries
    - _Requirements: 7.2, 7.3_

  - [ ]* 7.6 Write property test for retry recovery
    - **Property 17: Retry Recovery**
    - **Validates: Requirements 7.3**
    - Simulate failed generation by tracking in failure map
    - Run retryFailedGenerations
    - Verify slots are successfully created on retry
    - Verify court is removed from failure tracking

  - [x] 7.7 Create cron job scheduler
    - Create `server/src/jobs/index.ts` or update existing job scheduler
    - Import node-cron library (install if needed: `npm install node-cron @types/node-cron`)
    - Import TimeSlotMaintenanceJob
    - Schedule job with cron.schedule('0 0 * * *', ...) for daily at 00:00 UTC
    - Set timezone option to 'UTC'
    - In job callback, instantiate and execute TimeSlotMaintenanceJob
    - Log metrics on completion
    - Send alert on failure
    - _Requirements: 3.1_

  - [ ]* 7.8 Write unit tests for maintenance job
    - Test execute method processes all active courts
    - Test processCourt skips courts with complete coverage
    - Test processCourt generates missing slots for incomplete coverage
    - Test error handling continues processing remaining courts
    - Test retryFailedGenerations successfully retries
    - _Requirements: 3.2, 3.5, 7.5_

- [x] 8. Add configuration and monitoring
  - [x] 8.1 Create configuration file
    - Create `server/src/config/timeslots.ts`
    - Export timeSlotConfig object with: rollingWindowDays (365), defaultStartTime ('06:00'), defaultEndTime ('22:00'), slotDurationMinutes (60), batchSize (1000), cronSchedule ('0 0 * * *'), maxRetries (3), retryDelayMs (1000), maxGenerationTimeMs (5000), maxCronDurationMs (120000), alertIfNoSlotsAfterHours (24), alertIfSuccessRateBelow (0.95)
    - Import and use config values in services and jobs
    - _Requirements: 1.2, 2.2, 3.5, 6.1, 6.4_

  - [x] 8.2 Add structured logging
    - Update TimeSlotGeneratorService to log: generation started, generation completed, generation failed, duplicate slots detected
    - Include relevant context in logs: courtId, facilityId, dateRange, slotsGenerated, slotsSkipped, duration, errors
    - Update TimeSlotMaintenanceJob to log: job started, job completed, court processing, retry attempts
    - _Requirements: 7.2, 7.4_

  - [x] 8.3 Add performance monitoring
    - Track generation duration in TimeSlotGenerationResult
    - Log warning if generation exceeds maxGenerationTimeMs (5000ms)
    - Track cron job duration in CronJobMetrics
    - Log warning if cron job exceeds maxCronDurationMs (120000ms)
    - _Requirements: 6.1, 6.4, 3.5_

  - [ ]* 8.4 Write property test for performance
    - Verify single court generation completes within 5 seconds
    - Create test court and measure generation time
    - Assert duration is less than 5000ms
    - _Requirements: 6.1_

- [ ] 9. Add property tests for remaining properties
  - [ ]* 9.1 Write property test for default available status
    - **Property 3: Default Available Status**
    - **Validates: Requirements 1.3, 9.2**
    - Generate slots for random court
    - Verify all newly created slots have status="available"

  - [ ]* 9.2 Write property test for price inheritance
    - **Property 4: Price Inheritance**
    - **Validates: Requirements 1.4, 9.1**
    - Generate courts with various pricePerHour values (including null)
    - Generate slots and verify price matches court or facility default

  - [ ]* 9.3 Write property test for time format validation
    - **Property 6: Time Format Validation**
    - **Validates: Requirements 1.6, 8.2**
    - Generate slots for random dates
    - Verify all startTime and endTime match HH:MM format (regex: /^\d{2}:\d{2}$/)
    - Verify hours are 00-23, minutes are 00-59

  - [ ]* 9.4 Write property test for default operating hours
    - **Property 8: Default Operating Hours**
    - **Validates: Requirements 2.2**
    - Create facility without operating hours
    - Generate slots for court in that facility
    - Verify all slots have startTime >= 06:00 and endTime <= 22:00

  - [ ]* 9.5 Write property test for closed day exclusion
    - **Property 9: Closed Day Exclusion**
    - **Validates: Requirements 2.3**
    - Create operating hours with some days marked isBlocked=true
    - Generate slots
    - Verify no slots exist for blocked days of week

  - [ ]* 9.6 Write property test for complete coverage verification
    - **Property 10: Complete Coverage Verification**
    - **Validates: Requirements 3.2**
    - Generate slots for court
    - Query MAX(date) from slots
    - Verify max date is at least 365 days from current date

  - [ ]* 9.7 Write property test for duplicate handling resilience
    - **Property 14: Duplicate Handling Resilience**
    - **Validates: Requirements 5.4**
    - Generate slots for court
    - Attempt to insert same slots again
    - Verify no error is thrown
    - Verify duplicate count is logged
    - Verify slot count remains unchanged

  - [ ]* 9.8 Write property test for price update immutability
    - **Property 18: Price Update Immutability**
    - **Validates: Requirements 9.3**
    - Create court with initial price and generate slots
    - Update court's pricePerHour to different value
    - Verify existing slot prices remain unchanged

  - [ ]* 9.9 Write property test for sequential continuity
    - **Property 19: Sequential Continuity**
    - **Validates: Requirements 9.4**
    - Generate slots for random date
    - Sort slots by startTime
    - Verify each slot's endTime equals next slot's startTime (no gaps)

  - [ ]* 9.10 Write property test for non-available slot preservation
    - **Property 20: Non-Available Slot Preservation**
    - **Validates: Requirements 10.1, 10.2**
    - Create slots with status "rented" and "blocked"
    - Run slot generation again
    - Verify rented and blocked slots are not modified or deleted

  - [ ]* 9.11 Write property test for manual slot preservation
    - **Property 21: Manual Slot Preservation**
    - **Validates: Requirements 10.4**
    - Manually create custom time slot (non-standard time or price)
    - Run slot generation
    - Verify manual slot is not modified or deleted

- [x] 10. Integration and final testing
  - [x] 10.1 Create end-to-end integration test
    - Test complete flow: create facility with operating hours → create court → verify async slot generation → verify 365-day coverage → verify operating hours respected
    - Test maintenance job: create court with partial coverage → run job → verify gaps filled
    - Test backfill: create court without slots → run backfill → verify slots created
    - _Requirements: 1.1, 2.1, 3.2, 4.2_

  - [ ]* 10.2 Write integration test for existing system compatibility
    - **Property 20 & 21: Preservation of existing slots**
    - Create court with existing rentals (status="rented")
    - Create manually blocked slots (status="blocked")
    - Run slot generation
    - Verify rentals and blocks are preserved
    - Verify new available slots are created around them
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 10.3 Performance testing
    - Create 100 test courts
    - Measure time to generate slots for all courts
    - Verify total time is under 2 minutes (120000ms)
    - Measure API response time for court creation
    - Verify response time is under 500ms
    - _Requirements: 6.1, 6.2, 6.4, 3.5_

  - [x] 10.4 Update API documentation
    - Document that court creation now generates slots asynchronously
    - Document that slots are generated for 365-day rolling window
    - Document default operating hours (06:00-22:00)
    - Document that existing rentals and blocks are preserved
    - Add note about backfill script for existing courts

- [x] 11. Checkpoint - Final verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Implementation uses TypeScript with existing Prisma schema (no schema changes required)
- Async slot generation ensures API remains fast (<500ms response time)
- Cron job maintains rolling 365-day window automatically
- Backfill script handles existing courts without slots
