# Ground Management Implementation Tasks

## Overview
Implement ground/facility management with multiple fields/courts, availability calendars, and rentable time slots. Each field/court operates independently with its own calendar showing blocked and rented slots.

## Task List

### Phase 1: Database Schema & Backend Foundation

- [x] 1. Database Schema Setup
  - [x] 1.1 Create FacilityCourt table (fields/courts within a ground)
  - [x] 1.2 Create FacilityTimeSlot table (time slots per field/court with status)
  - [x] 1.3 Create FacilityRental table (user rentals of specific time slots)
  - [x] 1.4 Update Facility table to add facilityMapUrl field
  - [x] 1.5 Update Event table to add rentalId foreign key
  - [x] 1.6 Create database indexes for performance
  - [x] 1.7 Run Prisma migrations

- [x] 2. Backend API - Court Management
  - [x] 2.1 Implement GET /api/facilities/:id/courts (list all courts)
  - [x] 2.2 Implement POST /api/facilities/:id/courts (create court)
  - [x] 2.3 Implement PUT /api/facilities/:id/courts/:courtId (update court)
  - [x] 2.4 Implement DELETE /api/facilities/:id/courts/:courtId (delete court)
  - [x] 2.5 Add authorization checks (only facility owner can manage)

- [x] 3. Backend API - Time Slot Management
  - [x] 3.1 Implement GET /api/facilities/:id/courts/:courtId/slots (get time slots)
  - [x] 3.2 Implement POST /api/facilities/:id/courts/:courtId/slots/block (block time slot)
  - [x] 3.3 Implement DELETE /api/facilities/:id/courts/:courtId/slots/:slotId/unblock (unblock)
  - [x] 3.4 Implement GET /api/facilities/:id/courts/:courtId/availability (check availability)
  - [x] 3.5 Add validation to prevent double-booking

- [x] 4. Backend API - Rental Management
  - [x] 4.1 Implement POST /api/facilities/:id/courts/:courtId/slots/:slotId/rent (rent slot)
  - [x] 4.2 Implement DELETE /api/rentals/:rentalId (cancel rental)
  - [x] 4.3 Implement GET /api/rentals/my-rentals (user's rentals)
  - [x] 4.4 Implement GET /api/facilities/:id/rentals (operator's view of all rentals)
  - [x] 4.5 Add rental confirmation logic and status updates

- [x] 5. Backend API - Event-Rental Integration
  - [x] 5.1 Update POST /api/events to accept rentalId
  - [x] 5.2 Add validation to ensure event time matches rental slot
  - [x] 5.3 Add validation to ensure only renter can create event for their rental
  - [x] 5.4 Update GET /api/events to include rental information

### Phase 2: Frontend - Calendar Libraries Setup

- [x] 6. Install and Configure Calendar Libraries
  - [x] 6.1 Install react-native-calendars (for month view with marked dates)
  - [x] 6.2 Install @react-native-community/datetimepicker (for time selection)
  - [x] 6.3 Configure calendar theme to match Muster brand colors
  - [x] 6.4 Create calendar utility functions for date/time handling
  - [x] 6.5 Test calendar components on iOS, Android, and Web

### Phase 3: Frontend - Court Management UI

- [x] 7. Court Management Screen
  - [x] 7.1 Create ManageGroundScreen.tsx (main hub for operators)
  - [x] 7.2 Create CourtListManager component (list of courts with actions)
  - [x] 7.3 Create AddCourtModal component (form to create new court)
  - [x] 7.4 Create EditCourtModal component (form to update court)
  - [x] 7.5 Add delete court confirmation dialog
  - [x] 7.6 Integrate with court management API endpoints

- [x] 8. Facility Map Upload & Editor
  - [x] 8.1 Create FacilityMapEditorScreen.tsx
  - [x] 8.2 Create MapImageUploader component (image upload with preview)
  - [x] 8.3 Implement POST /api/facilities/:id/map endpoint
  - [x] 8.4 Add image validation (size, format, dimensions)
  - [x] 8.5 Display uploaded map in facility details

- [ ] 9. Court Boundary Drawing (Optional Enhancement)
  - [ ] 9.1* Install react-native-svg for drawing
  - [ ] 9.2* Create MapCanvas component (SVG canvas)
  - [ ] 9.3* Create DrawingToolbar component (polygon, rectangle tools)
  - [ ] 9.4* Implement coordinate normalization/denormalization
  - [ ] 9.5* Save boundary coordinates to court record
  - [ ] 9.6* Display court boundaries on facility map

### Phase 4: Frontend - Availability Calendar UI

- [x] 10. Ground Operator Availability Calendar
  - [x] 10.1 Create GroundAvailabilityScreen.tsx
  - [x] 10.2 Implement month view using react-native-calendars
  - [x] 10.3 Create CourtSelector component (multi-select court picker)
  - [x] 10.4 Create TimeSlotGrid component (15-minute increment slots)
  - [x] 10.5 Implement color coding (available=green, blocked=red, rented=blue)
  - [x] 10.6 Add block time slot functionality with reason input
  - [x] 10.7 Add unblock time slot functionality
  - [x] 10.8 Display all rentals across courts in unified view

- [x] 11. User Rental Booking Flow
  - [x] 11.1 Create CourtAvailabilityScreen.tsx (user-facing)
  - [x] 11.2 Implement date picker using react-native-calendars
  - [x] 11.3 Mark dates with availability indicators on calendar
  - [x] 11.4 Implement time picker using @react-native-community/datetimepicker
  - [x] 11.5 Show available time slots for selected date
  - [x] 11.6 Create RentalConfirmationModal component
  - [x] 11.7 Implement rental booking flow
  - [x] 11.8 Show rental confirmation screen with details

- [x] 12. My Rentals Screen
  - [x] 12.1 Create MyRentalsScreen.tsx
  - [x] 12.2 Display list of user's upcoming rentals
  - [x] 12.3 Display list of user's past rentals
  - [x] 12.4 Add cancel rental functionality with confirmation
  - [x] 12.5 Add "Create Event" button for each rental
  - [x] 12.6 Show rental status (confirmed, cancelled, completed)

### Phase 5: Event-Rental Integration

- [x] 13. Create Event from Rental
  - [x] 13.1 Update CreateEventScreen to accept rentalId parameter
  - [x] 13.2 Pre-fill event form with rental details (location, date, time)
  - [x] 13.3 Lock location and time fields when creating from rental
  - [x] 13.4 Add validation to ensure event matches rental slot
  - [x] 13.5 Link event to rental in database
  - [x] 13.6 Update event details screen to show rental information

- [ ] 14. Event Display Updates
  - [x] 14.1 Update EventCard to show if event is tied to a rental
  - [x] 14.2 Update EventDetailsScreen to display court/field information
  - [ ] 14.3 Show facility map with highlighted court (if boundaries defined)
  - [ ] 14.4 Add navigation from event to facility details

### Phase 6: Notifications & Reminders

- [ ] 15. Rental Notifications
  - [ ] 15.1 Send confirmation notification when rental is booked
  - [ ] 15.2 Send reminder notification 24 hours before rental
  - [ ] 15.3 Send reminder notification 1 hour before rental
  - [ ] 15.4 Send cancellation notification when rental is cancelled
  - [ ] 15.5 Notify ground operator of new rentals

- [ ] 16. Operator Notifications
  - [ ] 16.1 Send daily summary of upcoming rentals to operators
  - [ ] 16.2 Notify operator when rental is cancelled
  - [ ] 16.3 Add in-app notification center for rental updates

### Phase 7: Advanced Features

- [ ] 17. Bulk Operations
  - [ ] 17.1 Implement bulk block time slots (select multiple slots at once)
  - [ ] 17.2 Implement bulk unblock time slots
  - [ ] 17.3 Create availability templates (e.g., "Weekdays 9am-5pm")
  - [ ] 17.4 Apply templates to multiple courts at once

- [ ] 18. Calendar Views
  - [ ] 18.1 Implement week view for availability calendar
  - [ ] 18.2 Implement day view for detailed time slot management
  - [ ] 18.3 Add view switcher (month/week/day)
  - [ ] 18.4 Persist user's preferred view in local storage

- [ ] 19. Search & Filters
  - [ ] 19.1 Add search by court name
  - [ ] 19.2 Add filter by sport type
  - [ ] 19.3 Add filter by availability status
  - [ ] 19.4 Add date range filter for rentals

- [ ] 20. Analytics Dashboard (Optional)
  - [ ] 20.1* Create GroundAnalyticsScreen.tsx
  - [ ] 20.2* Show court utilization rates
  - [ ] 20.3* Show revenue per court
  - [ ] 20.4* Show popular time slots
  - [ ] 20.5* Show booking patterns and trends

### Phase 8: Testing & Quality Assurance

- [ ] 21. Unit Tests
  - [ ] 21.1 Test coordinate normalization/denormalization functions
  - [ ] 21.2 Test availability checking logic
  - [ ] 21.3 Test time slot validation
  - [ ] 21.4 Test rental booking logic
  - [ ] 21.5 Test double-booking prevention

- [ ] 22. Integration Tests
  - [ ] 22.1 Test court CRUD operations
  - [ ] 22.2 Test time slot blocking/unblocking
  - [ ] 22.3 Test rental booking flow
  - [ ] 22.4 Test event creation from rental
  - [ ] 22.5 Test rental cancellation and slot release

- [ ] 23. E2E Tests
  - [ ] 23.1 Test complete operator flow (create court → set availability → view rentals)
  - [ ] 23.2 Test complete user flow (browse courts → rent slot → create event)
  - [ ] 23.3 Test cancellation flow (cancel rental → slot becomes available)
  - [ ] 23.4 Test conflict scenarios (double-booking attempts)

- [ ] 24. Performance Testing
  - [ ] 24.1 Test calendar rendering with 100+ time slots
  - [ ] 24.2 Test map editor with 10+ courts
  - [ ] 24.3 Test availability API response time
  - [ ] 24.4 Optimize slow queries with database indexes

### Phase 9: Documentation & Deployment

- [ ] 25. Documentation
  - [ ] 25.1 Document API endpoints in OpenAPI/Swagger format
  - [ ] 25.2 Create operator guide for managing courts and availability
  - [ ] 25.3 Create user guide for renting time slots
  - [ ] 25.4 Document database schema changes
  - [ ] 25.5 Create troubleshooting guide

- [ ] 26. Deployment
  - [ ] 26.1 Run database migrations on staging environment
  - [ ] 26.2 Deploy backend API to staging
  - [ ] 26.3 Deploy frontend to staging
  - [ ] 26.4 Conduct UAT with test operators and users
  - [ ] 26.5 Deploy to production
  - [ ] 26.6 Monitor for errors and performance issues

## Implementation Notes

### Calendar Library Usage

**react-native-calendars:**
- Use for month view display
- Mark dates with dots/colors to indicate availability
- Handle date selection
- Show blocked dates, rental dates, and available dates with different markers

**@react-native-community/datetimepicker:**
- Use for time selection within a selected date
- Display time picker after user selects a date from calendar
- Support 15-minute increment time slots
- Handle start time and end time selection

**Combined Flow:**
1. User selects date from react-native-calendars month view
2. System fetches available time slots for that date
3. User selects time using @react-native-community/datetimepicker
4. System validates availability and confirms booking

### Color Coding Standards

- **Available**: `#3D8C5E` (grass green)
- **Blocked**: `#D45B5B` (track red)
- **Rented**: `#5B9FD4` (sky blue)
- **Unavailable**: `#6B7C76` (soft gray)
- **Selected**: `#E8A030` (court orange)

### Time Slot Granularity

- Default: 15-minute increments
- Minimum rental duration: 30 minutes
- Maximum rental duration: 4 hours
- Operators can customize per court

### Authorization Rules

- Only facility owners can create/edit/delete courts
- Only facility owners can block/unblock time slots
- Any registered user can rent available time slots
- Only the renter can create events for their rental
- Only the renter or facility owner can cancel a rental

### Validation Rules

- Court name must be unique within a facility
- Time slots cannot overlap for the same court
- Rental end time must be after start time
- Cannot rent blocked time slots
- Cannot double-book time slots
- Event time must match rental slot time
- Cannot cancel rental less than 2 hours before start time

### Performance Considerations

- Cache availability data in Redux for 5 minutes
- Lazy load time slots as user scrolls calendar
- Debounce availability checks (300ms)
- Use optimistic updates for better UX
- Implement pagination for rental lists (20 per page)

### Offline Support

- Cache court list locally
- Queue rental bookings when offline
- Sync when connection restored
- Show offline indicator in UI
- Prevent booking when offline (requires real-time availability)

## Success Criteria

- [ ] Ground operators can create and manage multiple courts/fields
- [ ] Each court has its own availability calendar
- [ ] Operators can block time slots with reasons
- [ ] Users can browse and rent available time slots
- [ ] Rented slots are locked and not visible to other users
- [ ] Renters can create events tied to their rentals
- [ ] Operators can view all rentals in unified calendar
- [ ] Rental confirmations and reminders are sent
- [ ] Cancelled rentals return slots to available status
- [ ] Calendar loads in < 1 second
- [ ] No double-booking possible
- [ ] All tests pass with > 80% coverage

## Dependencies

### NPM Packages
- `react-native-calendars` - Month view calendar with marked dates
- `@react-native-community/datetimepicker` - Time picker component
- `react-native-svg` - Drawing court boundaries (optional)
- `react-native-gesture-handler` - Touch interactions for drawing (optional)
- `expo-image-picker` - Facility map upload
- `expo-notifications` - Rental reminders

### Backend
- Prisma ORM for database operations
- Express.js for API endpoints
- Node-cron for scheduled notifications

## Migration Strategy

### Phase 1: Schema Migration
1. Create new tables without breaking existing functionality
2. Add foreign keys with nullable constraints initially
3. Run migrations on staging first

### Phase 2: Data Migration
1. Create default court for each existing facility
2. Migrate existing bookings to reference default court
3. Set default availability for all courts

### Phase 3: Feature Rollout
1. Enable for beta testers (select operators)
2. Gather feedback and iterate
3. Full rollout to all users
4. Monitor adoption and usage metrics

## Future Enhancements

- [ ] AI-powered court detection from map images
- [ ] Dynamic pricing based on demand
- [ ] Recurring rental bookings
- [ ] Waitlist for fully booked slots
- [ ] Integration with external calendar systems
- [ ] Mobile app push notifications
- [ ] Equipment rental tied to court bookings
- [ ] Court maintenance scheduling
- [ ] Multi-facility management dashboard
- [ ] Revenue analytics and reporting
