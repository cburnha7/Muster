# Facility Verification Database Setup Complete

## Summary

Extended the Muster database schema to support facility verification, rate schedules, and availability management. The database now includes all necessary tables for the facility verification feature.

## New Database Tables

### 1. FacilityVerification
Tracks the verification status of each facility.

**Fields:**
- `id` - Unique identifier
- `facilityId` - Link to facility (one-to-one)
- `status` - pending, approved, rejected, expired
- `submittedAt` - When verification was requested
- `reviewedAt` - When admin reviewed it
- `expiresAt` - When verification expires (12 months)
- `rejectionReason` - Why it was rejected (if applicable)
- `reviewerNotes` - Admin notes
- `reviewedBy` - Admin who reviewed it

### 2. VerificationDocument
Stores uploaded ownership documents.

**Fields:**
- `id` - Unique identifier
- `verificationId` - Link to verification
- `fileName` - Original file name
- `fileUrl` - Encrypted storage URL
- `fileType` - deed, lease, license, etc.
- `fileSize` - Size in bytes
- `mimeType` - File MIME type
- `uploadedAt` - Upload timestamp

### 3. FacilityRateSchedule
Defines pricing rules for facilities.

**Fields:**
- `id` - Unique identifier
- `facilityId` - Link to facility
- `name` - Schedule name (e.g., "Weekend Peak")
- `rateType` - base, peak, seasonal, discount
- `hourlyRate` - Price per hour
- `startDate` / `endDate` - For seasonal rates
- `daysOfWeek` - Array of days (0=Sunday, 6=Saturday)
- `startTime` / `endTime` - Time range (HH:MM format)
- `minHours` - Minimum booking duration
- `priority` - Rule precedence (higher = more specific)
- `isActive` - Enable/disable rule

### 4. FacilityAvailability
Defines when facilities are available for booking.

**Fields:**
- `id` - Unique identifier
- `facilityId` - Link to facility
- `dayOfWeek` - 0-6 (Sunday-Saturday)
- `startTime` / `endTime` - Available hours (HH:MM)
- `isRecurring` - Weekly recurring or one-time
- `specificDate` - For one-time availability
- `isBlocked` - True for maintenance/private events
- `blockReason` - Why it's blocked

### 5. FacilityAccessImage
Images to help users find and access facilities.

**Fields:**
- `id` - Unique identifier
- `facilityId` - Link to facility
- `imageUrl` - Image storage URL
- `caption` - Description
- `displayOrder` - Sort order

## Updated Facility Model

Added new fields to the existing Facility table:

- `isVerified` - Boolean flag for quick filtering
- `verificationStatus` - Current status (pending, approved, rejected, expired)
- `accessInstructions` - Text instructions for accessing the facility
- `parkingInfo` - Parking details
- `minimumBookingHours` - Minimum booking duration (default: 1)
- `bufferTimeMins` - Time between bookings (default: 0)

## Sample Data Created

### Facilities
Both existing facilities now have:
- ✅ Verified status
- ✅ Access instructions
- ✅ Parking information
- ✅ Minimum booking hours
- ✅ Buffer time settings

### Verification Records
- Downtown Sports Complex: Approved 28 days ago, expires in ~11 months
- Sunset Soccer Fields: Approved 58 days ago, expires in ~10 months

### Rate Schedules

**Downtown Sports Complex:**
1. Base Rate: $50/hour (all times)
2. Weekend Peak: $75/hour (Sat-Sun, 10am-6pm)

**Sunset Soccer Fields:**
1. Base Rate: $75/hour (all times)
2. Evening Discount: $60/hour (6pm-10pm, min 2 hours)

### Availability Slots

**Downtown Sports Complex:**
- Monday-Friday: 6am-10pm
- Saturday-Sunday: 8am-8pm

**Sunset Soccer Fields:**
- Every day: 7am-9pm

## Rate Calculation Logic

The system applies rate schedules based on priority:
1. Seasonal rates (if date matches)
2. Day-of-week + time-specific rates
3. Base rate (fallback)

Higher priority numbers override lower ones.

## Testing the New Features

### View Facility with Verification
```bash
curl http://localhost:3000/api/facilities/[facility-id]
```

Response now includes:
- `isVerified: true`
- `verificationStatus: "approved"`
- `accessInstructions`
- `parkingInfo`
- `minimumBookingHours`
- `bufferTimeMins`

### Query Rate Schedules
```sql
SELECT * FROM facility_rate_schedules WHERE "facilityId" = '[facility-id]';
```

### Query Availability
```sql
SELECT * FROM facility_availability WHERE "facilityId" = '[facility-id]';
```

### View Verification Status
```sql
SELECT * FROM facility_verifications WHERE "facilityId" = '[facility-id]';
```

## Database Schema Diagram

```
User
  └─> Facility (owner)
        ├─> FacilityVerification (1:1)
        │     └─> VerificationDocument (1:many)
        ├─> FacilityRateSchedule (1:many)
        ├─> FacilityAvailability (1:many)
        ├─> FacilityAccessImage (1:many)
        ├─> Event (1:many)
        ├─> Booking (1:many)
        └─> Review (1:many)
```

## Next Steps for Implementation

1. **API Endpoints** - Create routes for:
   - POST /api/facilities/:id/verify (submit verification)
   - GET /api/facilities/:id/verification (check status)
   - POST /api/facilities/:id/rate-schedules (add rate rule)
   - GET /api/facilities/:id/rate-schedules (list rates)
   - POST /api/facilities/:id/availability (set availability)
   - GET /api/facilities/:id/availability (get schedule)
   - POST /api/facilities/:id/calculate-price (calculate booking cost)

2. **File Upload** - Implement document upload with:
   - AWS S3 or similar storage
   - Encryption at rest
   - Access control

3. **Admin Dashboard** - Create verification review interface

4. **Mobile Screens** - Update facility screens to show:
   - Verification badge
   - Access instructions
   - Dynamic pricing
   - Availability calendar

## Database Migrations

The schema has been updated and pushed to the database. To apply these changes to a fresh database:

```bash
cd server
npx prisma db push
npm run prisma:seed
```

## Verification Workflow

1. **Owner submits facility** → Creates Facility with `verificationStatus: "pending"`
2. **Owner uploads documents** → Creates VerificationDocument records
3. **Admin reviews** → Updates FacilityVerification status
4. **If approved** → Sets `isVerified: true`, `expiresAt: +12 months`
5. **If rejected** → Sets status to "rejected", adds reason
6. **After 12 months** → Status changes to "expired", facility hidden from search

## Security Considerations

- All document URLs should be signed/temporary
- Access logs should track who views documents
- Documents should be encrypted at rest
- Personal information should be redacted before storage
- GDPR/CCPA compliance for document retention

## Performance Considerations

- Index on `facilityId` for all related tables
- Index on `verificationStatus` for filtering
- Index on `isVerified` for search queries
- Cache rate calculations for frequently accessed facilities

## Status

✅ Database schema extended
✅ Sample data created
✅ Verification records added
✅ Rate schedules configured
✅ Availability slots defined
✅ Ready for API implementation

The database foundation is now ready to support the full facility verification feature!
