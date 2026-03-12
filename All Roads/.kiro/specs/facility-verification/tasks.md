# Implementation Plan: Facility Verification and Management

## Overview

This plan breaks down the implementation of facility verification, rate scheduling, and availability management into discrete, testable tasks.

## Tasks

- [ ] 1. Update Backend API Routes
  - Update facilities route to include new fields
  - Add verification status filtering
  - _Requirements: 1.1, 1.5, 9.2_

- [ ] 2. Implement Rate Calculation Service
  - [ ] 2.1 Create rate calculator service
    - Implement price calculation algorithm
    - Handle rate priority logic
    - Support time-based rate selection
    - _Requirements: 4.1-4.8, 8.1-8.7_
  
  - [ ] 2.2 Add rate schedule API endpoints
    - POST /api/facilities/:id/rates (create)
    - GET /api/facilities/:id/rates (list)
    - PUT /api/facilities/:id/rates/:rateId (update)
    - DELETE /api/facilities/:id/rates/:rateId (delete)
    - POST /api/facilities/:id/calculate-price (calculate)
    - _Requirements: 4.1-4.8_

- [ ] 3. Implement Availability Management
  - [ ] 3.1 Create availability service
    - Check time slot availability
    - Handle recurring schedules
    - Detect booking conflicts
    - Apply buffer time rules
    - _Requirements: 5.1-5.8_
  
  - [ ] 3.2 Add availability API endpoints
    - POST /api/facilities/:id/availability (create)
    - GET /api/facilities/:id/availability (list)
    - PUT /api/facilities/:id/availability/:slotId (update)
    - DELETE /api/facilities/:id/availability/:slotId (delete)
    - GET /api/facilities/:id/availability/check (check)
    - _Requirements: 5.1-5.8_

- [ ] 4. Implement Verification System
  - [ ] 4.1 Create verification service
    - Handle verification submission
    - Track verification status
    - Implement expiration logic
    - _Requirements: 1.1-1.7, 2.1-2.8_
  
  - [ ] 4.2 Add verification API endpoints
    - POST /api/facilities/:id/verification (submit)
    - GET /api/facilities/:id/verification (status)
    - PUT /api/admin/verifications/:id/review (admin review)
    - _Requirements: 1.1-1.7, 2.1-2.8_

- [ ] 5. Update Facility Routes
  - [ ] 5.1 Extend GET /api/facilities/:id
    - Include verification status
    - Include access instructions
    - Include rate schedules
    - Include availability summary
    - _Requirements: 3.1-3.7, 6.1-6.7, 9.1-9.7_
  
  - [ ] 5.2 Update POST /api/facilities
    - Add access instructions field
    - Add parking info field
    - Add minimum booking hours
    - Add buffer time
    - _Requirements: 3.1-3.7_

- [ ] 6. Update Mobile App Types
  - [ ] 6.1 Add TypeScript interfaces
    - FacilityVerification interface
    - VerificationDocument interface
    - FacilityRateSchedule interface
    - FacilityAvailability interface
    - FacilityAccessImage interface
    - _Requirements: All_

- [ ] 7. Update Facility Details Screen
  - [ ] 7.1 Add verification badge display
    - Show "Verified" badge for approved facilities
    - Display verification date
    - _Requirements: 9.1-9.7_
  
  - [ ] 7.2 Add access instructions section
    - Display formatted access instructions
    - Show parking information
    - Display access images
    - _Requirements: 3.1-3.7, 6.1-6.7_
  
  - [ ] 7.3 Add rate information display
    - Show base hourly rate
    - Display "Price varies" when applicable
    - Link to rate calendar
    - _Requirements: 8.1-8.7_

- [ ] 8. Create Rate Calendar Component
  - Display pricing for different days/times
  - Show peak hours and discounts
  - Allow date selection for booking
  - _Requirements: 8.1-8.7_

- [ ] 9. Create Availability Picker Component
  - Show available time slots for selected date
  - Display buffer time between bookings
  - Highlight unavailable times
  - Calculate price for selected time
  - _Requirements: 5.1-5.8, 8.1-8.7_

- [ ] 10. Update Booking Flow
  - [ ] 10.1 Add availability check before booking
    - Verify time slot is available
    - Check minimum booking duration
    - Apply buffer time rules
    - _Requirements: 5.1-5.8_
  
  - [ ] 10.2 Calculate dynamic pricing
    - Use rate calculator service
    - Display price breakdown
    - Show applied rates and discounts
    - _Requirements: 4.1-4.8, 8.1-8.7_
  
  - [ ] 10.3 Include access instructions in confirmation
    - Send access instructions via email
    - Display in booking details
    - Send reminder 24 hours before
    - _Requirements: 6.1-6.7_

- [ ] 11. Create Facility Owner Dashboard
  - [ ] 11.1 Verification status card
    - Show current verification status
    - Display expiration date
    - Show days until expiration
    - Button to submit/resubmit verification
    - _Requirements: 9.1-9.7_
  
  - [ ] 11.2 Rate schedule manager
    - List all rate schedules
    - Add/edit/delete rates
    - Preview rate calendar
    - _Requirements: 4.1-4.8_
  
  - [ ] 11.3 Availability manager
    - Set weekly recurring schedule
    - Block specific dates
    - Set buffer time
    - Preview availability calendar
    - _Requirements: 5.1-5.8_
  
  - [ ] 11.4 Access instructions editor
    - Rich text editor for instructions
    - Upload access images
    - Preview how users will see it
    - _Requirements: 3.1-3.7_

- [ ] 12. Create Admin Verification Review Screen
  - [ ] 12.1 Verification queue
    - List pending verifications
    - Show facility details
    - Display submitted documents
    - _Requirements: 2.1-2.8_
  
  - [ ] 12.2 Document viewer
    - View uploaded documents
    - Zoom and download capabilities
    - _Requirements: 2.1-2.8, 7.1-7.7_
  
  - [ ] 12.3 Review actions
    - Approve button
    - Reject button with reason
    - Request more information
    - Add reviewer notes
    - _Requirements: 2.1-2.8_

- [ ] 13. Implement Verification Expiration
  - [ ] 13.1 Create cron job for expiration check
    - Run daily
    - Mark expired verifications
    - Hide facilities from search
    - _Requirements: 2.8, 9.6_
  
  - [ ] 13.2 Create reminder system
    - Send email 30 days before expiration
    - Send email 7 days before expiration
    - Send in-app notifications
    - _Requirements: 9.7_

- [ ] 14. Add Search Filtering
  - Filter facilities by verification status
  - Only show verified facilities in public search
  - Allow owners to see their unverified facilities
  - _Requirements: 9.2_

- [ ] 15. Update Facility List Screen
  - Display verification badge on facility cards
  - Show "Verified" filter option
  - Display starting price with "from $X/hr"
  - _Requirements: 9.1-9.2_

- [ ] 16. Implement Multi-Facility Management
  - [ ] 16.1 Facility switcher component
    - Dropdown to select facility
    - Show verification status for each
    - _Requirements: 10.1-10.7_
  
  - [ ] 16.2 Bulk operations
    - Copy rate schedules between facilities
    - Copy availability between facilities
    - _Requirements: 10.4_
  
  - [ ] 16.3 Aggregated dashboard
    - Show stats across all facilities
    - List all facilities with status
    - _Requirements: 10.5_

- [ ] 17. Add Contact Owner Feature
  - [ ] 17.1 Contact button in booking details
    - "Contact Owner" button
    - Opens messaging interface
    - _Requirements: 6.6-6.7_
  
  - [ ] 17.2 In-app messaging
    - Send message to facility owner
    - Protect personal contact info
    - Notify owner of new messages
    - _Requirements: 6.6-6.7_

- [ ] 18. Testing and Documentation
  - [ ] 18.1 Write unit tests
    - Test rate calculation logic
    - Test availability checking
    - Test time slot parsing
    - Test price breakdown
  
  - [ ] 18.2 Write integration tests
    - Test verification submission flow
    - Test rate schedule CRUD
    - Test availability management
    - Test booking with dynamic pricing
  
  - [ ] 18.3 Update API documentation
    - Document all new endpoints
    - Add request/response examples
    - Document error codes

- [ ] 19. Final Integration and Testing
  - Test complete verification workflow
  - Test rate calculation with various scenarios
  - Test availability management
  - Test booking flow with access instructions
  - Verify security measures
  - Test on iOS, Android, and Web

## Notes

- Tasks are ordered by dependency
- Each task should be completed and tested before moving to the next
- Backend tasks (1-5) should be completed before frontend tasks (6-17)
- Testing (18) should be done incrementally alongside implementation
- Final integration (19) validates the complete feature

## Priority

**Phase 1 (MVP):**
- Tasks 1-5: Core backend functionality
- Tasks 6-10: Basic mobile UI
- Task 14: Search filtering

**Phase 2 (Enhanced):**
- Tasks 11-12: Owner and admin dashboards
- Task 13: Expiration system
- Tasks 15-16: Enhanced UI and multi-facility

**Phase 3 (Complete):**
- Task 17: Messaging
- Tasks 18-19: Testing and polish
