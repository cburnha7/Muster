# Requirements Document

## Introduction

This feature enhances the ground management system by automatically generating time slots for courts/fields when they are created or edited. This eliminates manual setup work for ground operators and ensures courts are immediately available for booking. The system maintains a rolling 90-day window of available time slots and respects facility operating hours.

## Glossary

- **Court**: A bookable unit within a facility (e.g., tennis court, basketball court, soccer field)
- **Time_Slot**: A specific date and time period when a court can be booked, stored in the FacilityTimeSlot table
- **Slot_Generator**: The system component responsible for creating time slots
- **Rolling_Window**: A continuous 90-day period from the current date for which time slots exist
- **Operating_Hours**: The daily time range during which a facility is open for bookings
- **Cron_Job**: A scheduled background task that runs at specified intervals
- **Backfill**: The process of generating missing time slots for existing courts
- **Slot_Duration**: The length of each bookable time period (default: 1 hour)
- **UTC**: Coordinated Universal Time, the timezone standard for storing dates

## Requirements

### Requirement 1: Automatic Slot Generation on Court Creation

**User Story:** As a ground operator, I want time slots to be automatically created when I add a new court, so that the court is immediately available for booking without manual setup.

#### Acceptance Criteria

1. WHEN a court is created via POST /api/facilities/:id/courts, THE Slot_Generator SHALL create time slots for a 90-day period starting from the creation date
2. THE Slot_Generator SHALL create time slots with 1-hour duration increments
3. THE Slot_Generator SHALL set all generated time slots to "available" status by default
4. THE Slot_Generator SHALL set the price for each time slot to match the court's pricePerHour field
5. THE Slot_Generator SHALL store dates in UTC normalized to midnight
6. THE Slot_Generator SHALL store start and end times in HH:MM format using 24-hour notation

### Requirement 2: Operating Hours Integration

**User Story:** As a ground operator, I want automatically generated time slots to respect my facility's operating hours, so that bookings are only available during times when my facility is open.

#### Acceptance Criteria

1. WHERE a facility has operating hours defined, THE Slot_Generator SHALL create time slots only within those operating hours
2. WHERE a facility has no operating hours defined, THE Court_Creation_API SHALL reject the request and prompt the operator to set hours of operation first
3. WHEN operating hours specify closed days, THE Slot_Generator SHALL not create time slots for those days
4. THE Slot_Generator SHALL respect day-of-week restrictions defined in operating hours

### Requirement 3: Rolling Window Maintenance

**User Story:** As a ground operator, I want the system to automatically maintain time slots for the next 90 days, so that my courts remain bookable without manual intervention.

#### Acceptance Criteria

1. THE Cron_Job SHALL execute daily at 00:00 UTC
2. WHEN the Cron_Job executes, THE Slot_Generator SHALL verify all courts have time slots for the next 90 days
3. WHEN time slots are missing for future dates, THE Slot_Generator SHALL create the missing time slots
4. THE Slot_Generator SHALL not create duplicate time slots for dates that already have slots
5. THE Cron_Job SHALL complete execution within 2 minutes for all courts in the system

### Requirement 4: Backfill for Existing Courts

**User Story:** As a system administrator, I want existing courts without time slots to be automatically populated, so that all courts in the system are immediately bookable.

#### Acceptance Criteria

1. THE Backfill_Script SHALL identify all courts that have zero time slots
2. WHEN a court has zero time slots, THE Backfill_Script SHALL generate time slots for a 365-day rolling window
3. THE Backfill_Script SHALL apply the same operating hours logic as new court creation
4. THE Backfill_Script SHALL execute once during deployment
5. THE Backfill_Script SHALL log the number of courts processed and slots created

### Requirement 5: Duplicate Prevention

**User Story:** As a system administrator, I want to ensure no duplicate time slots are ever created, so that the booking system remains consistent and reliable.

#### Acceptance Criteria

1. WHEN generating time slots, THE Slot_Generator SHALL query existing slots for the target court and date range
2. IF a time slot already exists for a specific court, date, and time, THEN THE Slot_Generator SHALL skip creating that slot
3. THE Slot_Generator SHALL use a unique constraint on (courtId, date, startTime) to prevent duplicates at the database level
4. WHEN a duplicate insertion is attempted, THE Slot_Generator SHALL log the conflict and continue processing remaining slots

### Requirement 6: Performance Requirements

**User Story:** As a ground operator, I want court creation to remain fast, so that I can efficiently set up my facility without delays.

#### Acceptance Criteria

1. WHEN a single court is created, THE Slot_Generator SHALL complete slot generation within 5 seconds
2. THE Court_Creation_API SHALL respond within 500 milliseconds
3. WHERE slot generation takes longer than 500 milliseconds, THE Slot_Generator SHALL execute asynchronously after the API response
4. THE Cron_Job SHALL process all courts in the system within 2 minutes

### Requirement 7: Error Handling and Recovery

**User Story:** As a system administrator, I want slot generation failures to be handled gracefully, so that court creation is never blocked and issues can be identified and resolved.

#### Acceptance Criteria

1. IF slot generation fails during court creation, THEN THE Court_Creation_API SHALL complete successfully and log the error
2. WHEN slot generation fails, THE Slot_Generator SHALL record the failure with court ID, timestamp, and error message
3. WHEN the Cron_Job executes, THE Slot_Generator SHALL retry failed generations from previous attempts
4. IF a court has zero time slots 24 hours after creation, THEN THE Monitoring_System SHALL send an alert to system administrators
5. THE Slot_Generator SHALL continue processing remaining courts when an individual court fails

### Requirement 8: Timezone Handling

**User Story:** As a ground operator in any timezone, I want time slots to be correctly generated and displayed in my local time, so that bookings align with my facility's actual operating hours.

#### Acceptance Criteria

1. THE Slot_Generator SHALL store all dates in UTC normalized to midnight
2. THE Slot_Generator SHALL store time values in HH:MM format without timezone information
3. WHEN displaying time slots to users, THE Frontend_Application SHALL convert UTC dates to the user's local timezone
4. THE Slot_Generator SHALL correctly handle Daylight Saving Time transitions
5. THE Slot_Generator SHALL correctly handle leap years when calculating the 90-day window

### Requirement 9: Slot Configuration Consistency

**User Story:** As a ground operator, I want generated time slots to match my court's pricing and availability settings, so that bookings are processed correctly.

#### Acceptance Criteria

1. WHEN generating time slots, THE Slot_Generator SHALL set the price to match the court's pricePerHour field
2. THE Slot_Generator SHALL set the status field to "available" for all generated slots
3. WHEN a court's pricePerHour is updated, THE Slot_Generator SHALL not modify existing time slot prices
4. THE Slot_Generator SHALL create time slots with sequential 1-hour increments with no gaps

### Requirement 10: Integration with Existing Systems

**User Story:** As a system administrator, I want automatic slot generation to work seamlessly with existing rental and blocking functionality, so that no existing features are disrupted.

#### Acceptance Criteria

1. THE Slot_Generator SHALL not modify time slots that have status "booked" or "blocked"
2. WHEN generating slots for dates with existing rentals, THE Slot_Generator SHALL skip those specific time slots
3. THE Slot_Generator SHALL work with the existing Prisma FacilityTimeSlot schema without modifications
4. THE Slot_Generator SHALL not interfere with manual time slot creation or editing by operators

## Validation Rules

### Time Slot Generation
- Rolling window must be exactly 365 days from the current date
- Slot duration must be exactly 1 hour (60 minutes)
- Start time must be before end time
- Time slots must not overlap for the same court
- Dates must be valid and account for leap years

### Operating Hours
- Operating hours start time must be before end time
- Day of week must be 0-6 (0=Sunday, 6=Saturday)
- Time format must be HH:MM in 24-hour notation
- If no operating hours exist, default to 06:00-22:00

### Performance
- Single court slot generation: ≤ 5 seconds
- API response time: ≤ 500 milliseconds
- Daily cron job execution: ≤ 2 minutes
- Backfill script: No time limit (runs once during deployment)

### Data Integrity
- No duplicate slots for same court, date, and time
- All slots must reference a valid court ID
- All dates must be in UTC
- All times must be in HH:MM format

## Success Criteria

1. New courts have 365 days of time slots immediately after creation
2. Existing courts without slots are backfilled during deployment
3. Daily cron job maintains the rolling 365-day window
4. No duplicate time slots exist in the database
5. Court creation API responds in under 500ms
6. Slot generation respects facility operating hours
7. System handles DST and leap year transitions correctly
8. Failed slot generations are retried automatically
9. Operators receive alerts if courts have no slots after 24 hours
10. All existing rental and blocking functionality continues to work

## Out of Scope

The following items are explicitly excluded from this feature:

- Custom slot durations per court (future enhancement)
- Variable pricing by time of day or day of week (future enhancement)
- Automatic deletion of past time slots (historical records are retained)
- Manual specification of date ranges for slot generation (only 365-day rolling window supported)
- Slot generation for specific events or tournaments (separate feature)
- Modification of existing booked or blocked slots
- Real-time slot generation based on user requests
- Slot generation for facilities without courts

## Technical Constraints

- Must use existing Prisma schema (FacilityTimeSlot table)
- Must not break existing rental or blocking functionality
- Must be timezone-aware (store UTC, display local)
- Must handle leap years correctly
- Must handle Daylight Saving Time transitions correctly
- Must work with PostgreSQL database
- Must integrate with existing Express.js API routes
- Must support Node.js cron job scheduling

## Dependencies

- Existing ground-management feature (court creation API)
- Prisma ORM and FacilityTimeSlot schema
- Node.js cron job scheduler (node-cron or similar)
- PostgreSQL database with timezone support
- Existing facility operating hours data (if defined)

## Future Enhancements

- Configurable slot durations (30 min, 1 hour, 2 hours)
- Dynamic pricing based on time of day or demand
- Seasonal operating hours with automatic slot adjustment
- Bulk slot modification tools for operators
- Slot generation preview before court creation
- Custom rolling window duration per facility
- Integration with external calendar systems
- Automatic slot archival for historical data management
