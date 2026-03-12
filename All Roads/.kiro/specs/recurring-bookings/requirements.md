# Recurring Court Bookings - Requirements

## Overview
Enable users to book court/field time slots on a recurring basis (weekly or monthly) with conflict detection and flexible cancellation options.

## User Stories

### As a user, I want to:
1. Book a court on a recurring schedule (weekly or monthly) so I don't have to manually book each session
2. See which dates in my recurring series have conflicts before confirming
3. Choose to skip conflicting dates or cancel the entire booking
4. View all instances of my recurring booking in My Reservations
5. Cancel a single instance or the entire remaining series
6. Have cancelled slots automatically restored to availability

## Functional Requirements

### 1. Booking Flow Enhancement
- After selecting a court/field and time slot, show "Repeat this booking" toggle
- When enabled, display:
  - Recurrence frequency selector (Weekly or Monthly)
  - End date picker (required)
  - Preview of booking series with dates

### 2. Recurrence Options
**Weekly:**
- Same day of week and time every week
- Example: Every Monday at 3:00 PM - 4:00 PM

**Monthly:**
- Same day of month and time every month
- Example: 15th of every month at 3:00 PM - 4:00 PM
- Handle edge cases (e.g., 31st when month has 30 days)

### 3. End Date Validation
- End date must be selected before confirmation
- End date must be within facility's rolling availability window (365 days)
- End date must be after start date
- Show clear error messages for invalid dates

### 4. Conflict Detection
**Check each instance against:**
- Court availability (not blocked or booked)
- Facility hours of operation
- Rolling availability window

**Conflict Resolution:**
- Show list of conflicting dates with reasons
- Options:
  - "Book Available Slots Only" - skip conflicts
  - "Cancel" - abort entire booking
- Display summary: "X of Y slots available"

### 5. Booking Confirmation
**On confirmation:**
- Create individual FacilityRental records for each instance
- Link all instances with shared `recurringGroupId`
- Store recurrence metadata in RecurringBooking table
- Charge user for all confirmed instances
- Send confirmation with booking details

### 6. My Reservations Display
**Visual Grouping:**
- Group recurring instances together
- Show recurring icon/badge
- Display: "Weekly booking (5 remaining)"
- Expandable to see all instances
- Each instance shows individual date/time

### 7. Cancellation Options
**Single Instance:**
- Cancel one occurrence
- Restore that time slot to availability
- Keep other instances active
- Update recurring series count

**Entire Series:**
- Cancel all future unstarted instances
- Restore all future slots to availability
- Keep past/completed instances in history
- Mark series as cancelled

### 8. Refund Policy
- Follow same refund rules as single bookings
- Calculate refund per instance based on cancellation time
- Show total refund amount for series cancellation

## Database Schema Changes

### RecurringBooking Table (New)
```prisma
model RecurringBooking {
  id              String   @id @default(uuid())
  userId          String
  courtId         String
  facilityId      String
  frequency       String   // 'weekly' or 'monthly'
  startDate       DateTime
  endDate         DateTime
  startTime       String   // HH:mm format
  endTime         String   // HH:mm format
  dayOfWeek       Int?     // 0-6 for weekly (0 = Sunday)
  dayOfMonth      Int?     // 1-31 for monthly
  status          String   // 'active', 'cancelled', 'completed'
  totalInstances  Int
  bookedInstances Int
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User     @relation(fields: [userId], references: [id])
  court           Court    @relation(fields: [courtId], references: [id])
  facility        Facility @relation(fields: [facilityId], references: [id])
  rentals         FacilityRental[]
}
```

### FacilityRental Table (Update)
```prisma
model FacilityRental {
  // ... existing fields ...
  recurringGroupId    String?
  recurringBooking    RecurringBooking? @relation(fields: [recurringGroupId], references: [id])
  isRecurring         Boolean @default(false)
  instanceNumber      Int?    // 1, 2, 3... for ordering
}
```

## Business Rules

### Pricing
- User pays for all confirmed instances upfront
- Partial refunds for cancelled instances based on timing
- No additional fees for recurring bookings

### Limits
- Maximum 52 instances per recurring booking (1 year weekly)
- Maximum 12 instances per recurring booking (1 year monthly)
- End date cannot exceed facility's availability window

### Conflicts
- If >50% of instances have conflicts, suggest alternative time
- Show conflict reasons: "Blocked by owner", "Already booked", "Outside hours"

### Notifications
- Reminder 24 hours before each instance
- Alert if future instance becomes unavailable (owner blocks)
- Confirmation email with all booking dates

## Edge Cases

### Monthly Bookings
- If day doesn't exist in month (e.g., Feb 31), skip that month
- Show warning: "February skipped (day 31 doesn't exist)"

### Facility Changes
- If hours of operation change, notify user of affected instances
- If court is deleted, cancel all future instances with full refund

### User Actions
- If user cancels account, cancel all future recurring bookings
- If user is banned, cancel all bookings with no refund

## Success Metrics
- % of bookings that are recurring
- Average instances per recurring booking
- Conflict resolution rate (book vs cancel)
- Cancellation rate (single vs series)

## Out of Scope (Future Enhancements)
- Bi-weekly recurrence
- Custom recurrence patterns (every 2 weeks, etc.)
- Automatic rebooking when conflicts are resolved
- Recurring booking templates
- Sharing recurring bookings with team
