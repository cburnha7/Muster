# Design Document: Facility Verification and Management

## Overview

This document outlines the technical design for implementing facility verification, rate scheduling, and availability management in the Muster platform. The system enables facility owners to verify their ownership, set flexible pricing, manage availability, and provide access instructions to users.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile/Web Client                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Facility   │  │     Rate     │  │ Availability │     │
│  │    Screens   │  │   Calendar   │  │   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Express)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Verification │  │     Rate     │  │ Availability │     │
│  │   Routes     │  │    Routes    │  │    Routes    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Verification │  │     Rate     │  │ Availability │     │
│  │   Service    │  │  Calculator  │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer (Prisma ORM)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Verification │  │     Rate     │  │ Availability │     │
│  │    Models    │  │    Models    │  │    Models    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                         │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Backend API Routes

#### Verification Routes (`/api/facilities/:id/verification`)

```typescript
// Submit verification request
POST /api/facilities/:id/verification
Body: {
  documents: File[] // Multipart form data
}
Response: {
  verificationId: string
  status: 'pending'
  submittedAt: Date
}

// Get verification status
GET /api/facilities/:id/verification
Response: {
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  submittedAt: Date
  reviewedAt?: Date
  expiresAt?: Date
  rejectionReason?: string
  documents: Document[]
}

// Admin: Review verification
PUT /api/admin/verifications/:id/review
Body: {
  status: 'approved' | 'rejected'
  rejectionReason?: string
  reviewerNotes?: string
}
```

#### Rate Schedule Routes (`/api/facilities/:id/rates`)

```typescript
// Create rate schedule
POST /api/facilities/:id/rates
Body: {
  name: string
  rateType: 'base' | 'peak' | 'seasonal' | 'discount'
  hourlyRate: number
  startDate?: Date
  endDate?: Date
  daysOfWeek?: number[]
  startTime?: string
  endTime?: string
  minHours?: number
  priority: number
}

// List rate schedules
GET /api/facilities/:id/rates
Response: RateSchedule[]

// Update rate schedule
PUT /api/facilities/:id/rates/:rateId
Body: Partial<RateSchedule>

// Delete rate schedule
DELETE /api/facilities/:id/rates/:rateId

// Calculate price for booking
POST /api/facilities/:id/calculate-price
Body: {
  startTime: Date
  endTime: Date
}
Response: {
  totalPrice: number
  breakdown: {
    hours: number
    baseRate: number
    appliedRates: AppliedRate[]
    subtotal: number
    fees: number
    total: number
  }
}
```

#### Availability Routes (`/api/facilities/:id/availability`)

```typescript
// Set availability
POST /api/facilities/:id/availability
Body: {
  dayOfWeek?: number
  startTime: string
  endTime: string
  isRecurring: boolean
  specificDate?: Date
  isBlocked?: boolean
  blockReason?: string
}

// Get availability
GET /api/facilities/:id/availability
Query: {
  startDate: Date
  endDate: Date
}
Response: AvailabilitySlot[]

// Update availability
PUT /api/facilities/:id/availability/:slotId
Body: Partial<AvailabilitySlot>

// Delete availability
DELETE /api/facilities/:id/availability/:slotId

// Check if time slot is available
GET /api/facilities/:id/availability/check
Query: {
  startTime: Date
  endTime: Date
}
Response: {
  available: boolean
  conflicts?: Booking[]
}
```

### 2. Rate Calculation Service

```typescript
interface RateCalculator {
  calculatePrice(
    facilityId: string,
    startTime: Date,
    endTime: Date
  ): Promise<PriceBreakdown>
  
  getApplicableRates(
    facilityId: string,
    startTime: Date,
    endTime: Date
  ): Promise<RateSchedule[]>
  
  applyRatePriority(rates: RateSchedule[]): RateSchedule
}

interface PriceBreakdown {
  hours: number
  baseRate: number
  appliedRates: AppliedRate[]
  subtotal: number
  fees: number
  total: number
}

interface AppliedRate {
  name: string
  rateType: string
  hourlyRate: number
  hoursApplied: number
  amount: number
}
```

**Rate Calculation Algorithm:**

1. Split booking time into hourly segments
2. For each segment, find all matching rate schedules
3. Apply highest priority rate for that segment
4. Sum all segment costs
5. Apply minimum booking duration rules
6. Add platform fees

### 3. Availability Service

```typescript
interface AvailabilityService {
  isAvailable(
    facilityId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean>
  
  getAvailableSlots(
    facilityId: string,
    date: Date
  ): Promise<TimeSlot[]>
  
  blockTime(
    facilityId: string,
    startTime: Date,
    endTime: Date,
    reason: string
  ): Promise<void>
  
  getConflicts(
    facilityId: string,
    startTime: Date,
    endTime: Date
  ): Promise<Booking[]>
}

interface TimeSlot {
  startTime: string
  endTime: string
  available: boolean
  price: number
}
```

### 4. Verification Service

```typescript
interface VerificationService {
  submitVerification(
    facilityId: string,
    documents: File[]
  ): Promise<Verification>
  
  reviewVerification(
    verificationId: string,
    status: 'approved' | 'rejected',
    notes: string
  ): Promise<Verification>
  
  checkExpiration(): Promise<void> // Cron job
  
  sendExpirationReminders(): Promise<void> // Cron job
}
```

## Data Models

### TypeScript Interfaces

```typescript
interface FacilityVerification {
  id: string
  facilityId: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  submittedAt: Date
  reviewedAt?: Date
  expiresAt?: Date
  rejectionReason?: string
  reviewerNotes?: string
  documents: VerificationDocument[]
}

interface VerificationDocument {
  id: string
  verificationId: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  mimeType: string
  uploadedAt: Date
}

interface FacilityRateSchedule {
  id: string
  facilityId: string
  name: string
  rateType: 'base' | 'peak' | 'seasonal' | 'discount'
  hourlyRate: number
  startDate?: Date
  endDate?: Date
  daysOfWeek?: number[]
  startTime?: string
  endTime?: string
  minHours?: number
  priority: number
  isActive: boolean
}

interface FacilityAvailability {
  id: string
  facilityId: string
  dayOfWeek?: number
  startTime: string
  endTime: string
  isRecurring: boolean
  specificDate?: Date
  isBlocked: boolean
  blockReason?: string
}

interface FacilityAccessImage {
  id: string
  facilityId: string
  imageUrl: string
  caption?: string
  displayOrder: number
}
```

## Error Handling

### Error Codes

```typescript
enum VerificationError {
  INVALID_DOCUMENT_TYPE = 'INVALID_DOCUMENT_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  ALREADY_VERIFIED = 'ALREADY_VERIFIED',
  VERIFICATION_EXPIRED = 'VERIFICATION_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED'
}

enum RateError {
  INVALID_RATE = 'INVALID_RATE',
  OVERLAPPING_SCHEDULES = 'OVERLAPPING_SCHEDULES',
  RATE_OUT_OF_BOUNDS = 'RATE_OUT_OF_BOUNDS'
}

enum AvailabilityError {
  TIME_SLOT_UNAVAILABLE = 'TIME_SLOT_UNAVAILABLE',
  OVERLAPPING_SLOTS = 'OVERLAPPING_SLOTS',
  PAST_DATE = 'PAST_DATE',
  CONFLICTS_WITH_BOOKING = 'CONFLICTS_WITH_BOOKING'
}
```

## Testing Strategy

### Unit Tests

Test individual functions and services:
- Rate calculation logic
- Availability checking
- Document validation
- Time slot parsing

### Integration Tests

Test API endpoints:
- Verification submission flow
- Rate schedule CRUD operations
- Availability management
- Price calculation endpoint

### Property-Based Tests

Test universal properties:
- Rate calculation is deterministic
- Availability checks are consistent
- Price is always non-negative
- Time slots don't overlap

## Security Considerations

### Document Storage

- Store documents in encrypted S3 bucket
- Generate signed URLs with 1-hour expiration
- Log all document access
- Redact sensitive information before storage

### Access Control

- Only facility owners can manage their facilities
- Only admins can review verifications
- Rate limits on verification submissions (3 per day)
- Validate all file uploads (type, size, content)

### Data Protection

- Encrypt documents at rest (AES-256)
- Use TLS 1.3 for all transfers
- Implement GDPR right to deletion
- Auto-delete documents after facility deletion (30 days)

## Performance Optimization

### Caching Strategy

```typescript
// Cache rate schedules (1 hour TTL)
const rateCache = new Map<string, RateSchedule[]>()

// Cache availability (15 minutes TTL)
const availabilityCache = new Map<string, AvailabilitySlot[]>()

// Cache calculated prices (5 minutes TTL)
const priceCache = new Map<string, PriceBreakdown>()
```

### Database Indexes

```sql
CREATE INDEX idx_facility_verification_status ON facility_verifications(status);
CREATE INDEX idx_facility_verification_expires ON facility_verifications("expiresAt");
CREATE INDEX idx_rate_schedule_facility ON facility_rate_schedules("facilityId");
CREATE INDEX idx_availability_facility ON facility_availability("facilityId");
CREATE INDEX idx_availability_date ON facility_availability("specificDate");
```

## Implementation Notes

### File Upload Flow

1. Client uploads file to API
2. API validates file (type, size)
3. API uploads to S3 with encryption
4. API stores metadata in database
5. Return signed URL to client

### Rate Calculation Example

```typescript
// Booking: Saturday 10am-2pm (4 hours)
// Base rate: $50/hr
// Weekend peak (Sat-Sun 10am-6pm): $75/hr

const segments = [
  { time: '10:00-11:00', rate: 75 }, // Peak
  { time: '11:00-12:00', rate: 75 }, // Peak
  { time: '12:00-13:00', rate: 75 }, // Peak
  { time: '13:00-14:00', rate: 75 }, // Peak
]

const total = segments.reduce((sum, seg) => sum + seg.rate, 0)
// total = $300
```

### Availability Check Algorithm

```typescript
function isAvailable(
  facilityId: string,
  startTime: Date,
  endTime: Date
): boolean {
  // 1. Check if time falls within availability slots
  const slots = getAvailabilitySlots(facilityId, startTime)
  const withinSlot = slots.some(slot => 
    timeWithinSlot(startTime, endTime, slot)
  )
  
  if (!withinSlot) return false
  
  // 2. Check for blocked times
  const blocked = getBlockedTimes(facilityId, startTime, endTime)
  if (blocked.length > 0) return false
  
  // 3. Check for existing bookings
  const bookings = getBookings(facilityId, startTime, endTime)
  if (bookings.length > 0) return false
  
  // 4. Check buffer time
  const hasBuffer = checkBufferTime(facilityId, startTime, endTime)
  if (!hasBuffer) return false
  
  return true
}
```

## Mobile UI Components

### Verification Badge Component

```typescript
<VerifiedBadge 
  isVerified={facility.isVerified}
  verificationDate={facility.verification?.reviewedAt}
/>
```

### Rate Calendar Component

```typescript
<RateCalendar
  facilityId={facility.id}
  onDateSelect={(date) => calculatePrice(date)}
  showPriceVariations={true}
/>
```

### Availability Picker Component

```typescript
<AvailabilityPicker
  facilityId={facility.id}
  selectedDate={date}
  onTimeSelect={(start, end) => checkAvailability(start, end)}
  showBufferTime={true}
/>
```

## Success Criteria

The implementation is complete when:

1. ✅ Facility owners can submit verification with documents
2. ✅ Admins can review and approve/reject verifications
3. ✅ Owners can create multiple rate schedules
4. ✅ System correctly calculates prices based on time
5. ✅ Owners can set weekly availability schedules
6. ✅ System prevents double-bookings
7. ✅ Users see verification badges on facilities
8. ✅ Access instructions are sent with bookings
9. ✅ Documents are stored securely
10. ✅ Verifications expire after 12 months

## Future Enhancements

- Automated document verification using OCR
- Dynamic pricing based on demand
- Integration with calendar systems (Google Calendar, Outlook)
- Mobile app document scanning
- Multi-language support for access instructions
- Video access instructions
- Real-time availability updates via WebSockets
