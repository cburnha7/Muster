# Ground Management Implementation Summary

## Overview
Complete backend implementation for court/field-level facility management with availability scheduling and map-based boundary definitions.

## Database Schema

### New Tables

#### facility_courts
Represents individual bookable units (courts/fields) within a facility.

**Fields:**
- `id` (UUID) - Primary key
- `facilityId` (UUID) - Foreign key to facilities table
- `name` (String) - Court/field name (e.g., "Court 1", "Field A")
- `sportType` (String) - Sport type for this court
- `capacity` (Int) - Maximum number of players
- `isIndoor` (Boolean) - Indoor/outdoor flag
- `isActive` (Boolean) - Active status
- `boundaryCoordinates` (JSON) - Polygon coordinates for map visualization (normalized 0-1 range)
- `pricePerHour` (Float, optional) - Price override for this court
- `displayOrder` (Int) - Sort order for listing
- `createdAt`, `updatedAt` (DateTime)

**Relations:**
- Belongs to Facility
- Has many FacilityCourtAvailability
- Has many Bookings

#### facility_court_availability
Stores availability rules for individual courts.

**Fields:**
- `id` (UUID) - Primary key
- `courtId` (UUID) - Foreign key to facility_courts table
- `dayOfWeek` (Int, optional) - 0=Sunday, 1=Monday, etc. (for recurring rules)
- `startTime` (String) - HH:MM format (24-hour)
- `endTime` (String) - HH:MM format (24-hour)
- `isRecurring` (Boolean) - Recurring vs one-time rule
- `specificDate` (DateTime, optional) - For one-time availability/blocks
- `isBlocked` (Boolean) - Blocked status (maintenance, private events)
- `blockReason` (String, optional) - Reason for blocking
- `createdAt`, `updatedAt` (DateTime)

**Relations:**
- Belongs to FacilityCourt

**Indexes:**
- `courtId`
- `specificDate`

### Updated Tables

#### facilities
Added fields:
- `facilityMapUrl` (String, optional) - URL to uploaded facility map image
- `facilityMapThumbnailUrl` (String, optional) - Thumbnail URL for list views

Added relation:
- Has many FacilityCourt

#### bookings
Added fields:
- `courtId` (UUID, optional) - Foreign key to facility_courts table

Added relation:
- Belongs to FacilityCourt (optional)

## API Endpoints

### Court Management

#### GET /api/courts/facility/:facilityId
Get all courts for a facility.

**Query Parameters:**
- `includeInactive` (boolean) - Include inactive courts

**Response:**
```json
{
  "courts": [
    {
      "id": "uuid",
      "name": "Basketball Court 1",
      "sportType": "basketball",
      "capacity": 10,
      "isIndoor": true,
      "isActive": true,
      "displayOrder": 1,
      "boundaryCoordinates": [
        { "x": 0.1, "y": 0.1 },
        { "x": 0.45, "y": 0.1 },
        { "x": 0.45, "y": 0.9 },
        { "x": 0.1, "y": 0.9 }
      ],
      "pricePerHour": null,
      "availability": [...],
      "_count": { "bookings": 5 }
    }
  ]
}
```

#### GET /api/courts/:id
Get single court by ID with full details.

#### POST /api/courts
Create new court.

**Request Body:**
```json
{
  "facilityId": "uuid",
  "name": "Court 1",
  "sportType": "basketball",
  "capacity": 10,
  "isIndoor": true,
  "boundaryCoordinates": [...],
  "pricePerHour": 50,
  "displayOrder": 1
}
```

#### PUT /api/courts/:id
Update court details.

#### DELETE /api/courts/:id
Delete court (soft delete recommended in production).

### Court Availability

#### GET /api/courts/:id/availability
Get availability rules for a court.

**Query Parameters:**
- `startDate` (ISO date) - Filter start date
- `endDate` (ISO date) - Filter end date

**Response:**
```json
{
  "availability": [
    {
      "id": "uuid",
      "courtId": "uuid",
      "dayOfWeek": 1,
      "startTime": "06:00",
      "endTime": "09:00",
      "isRecurring": true,
      "specificDate": null,
      "isBlocked": false,
      "blockReason": null
    }
  ]
}
```

#### POST /api/courts/:id/availability
Create availability rule.

**Request Body:**
```json
{
  "dayOfWeek": 1,
  "startTime": "06:00",
  "endTime": "22:00",
  "isRecurring": true,
  "specificDate": null,
  "isBlocked": false,
  "blockReason": null
}
```

#### PUT /api/courts/:id/availability/:availabilityId
Update availability rule.

#### DELETE /api/courts/:id/availability/:availabilityId
Delete availability rule.

#### POST /api/courts/:id/check-availability
Check if court is available for a specific time.

**Request Body:**
```json
{
  "date": "2026-03-15",
  "startTime": "18:00",
  "endTime": "20:00"
}
```

**Response:**
```json
{
  "available": true,
  "blocked": false,
  "blockReason": null
}
```

## Services

### CourtAvailabilityService

Located at: `server/src/services/CourtAvailabilityService.ts`

**Methods:**

#### isCourtAvailable(check: AvailabilityCheck): Promise<AvailabilityResult>
Check if a court is available for booking at a specific date and time.

**Parameters:**
```typescript
interface AvailabilityCheck {
  courtId: string;
  date: Date;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
}
```

**Returns:**
```typescript
interface AvailabilityResult {
  available: boolean;
  blocked: boolean;
  blockReason?: string;
  conflictingBooking?: any;
}
```

#### getAvailableCourts(facilityId, date, startTime, endTime, sportType?)
Get all available courts for a facility at a specific time.

#### getCourtSchedule(courtId, startDate, endDate)
Get complete schedule for a court over a date range.

#### createBulkAvailability(courtIds, rules)
Create availability rules for multiple courts at once.

#### validateAvailabilityRule(rule)
Validate availability rule format and logic.

## Sample Data

The seed file creates:
- 5 courts across 2 facilities
- Downtown Sports Complex: 2 basketball courts + 1 volleyball court
- Sunset Soccer Fields: 2 soccer fields
- Realistic availability schedules
- Sample blocked time slot for maintenance

## Usage Examples

### 1. Get all courts for a facility
```bash
GET /api/courts/facility/facility-uuid
```

### 2. Create a new court
```bash
POST /api/courts
Content-Type: application/json

{
  "facilityId": "facility-uuid",
  "name": "Tennis Court 1",
  "sportType": "tennis",
  "capacity": 4,
  "isIndoor": false,
  "boundaryCoordinates": [
    { "x": 0.1, "y": 0.1 },
    { "x": 0.3, "y": 0.1 },
    { "x": 0.3, "y": 0.5 },
    { "x": 0.1, "y": 0.5 }
  ]
}
```

### 3. Set weekday availability
```bash
POST /api/courts/court-uuid/availability
Content-Type: application/json

{
  "dayOfWeek": 1,
  "startTime": "06:00",
  "endTime": "22:00",
  "isRecurring": true
}
```

### 4. Block time for maintenance
```bash
POST /api/courts/court-uuid/availability
Content-Type: application/json

{
  "specificDate": "2026-03-20",
  "startTime": "10:00",
  "endTime": "14:00",
  "isRecurring": false,
  "isBlocked": true,
  "blockReason": "Floor maintenance"
}
```

### 5. Check availability
```bash
POST /api/courts/court-uuid/check-availability
Content-Type: application/json

{
  "date": "2026-03-15",
  "startTime": "18:00",
  "endTime": "20:00"
}
```

## Integration with Existing Features

### Facility Details
The facility detail endpoint now includes courts:
```bash
GET /api/facilities/:id
```

Response includes:
```json
{
  "id": "uuid",
  "name": "Downtown Sports Complex",
  ...
  "courts": [
    {
      "id": "uuid",
      "name": "Basketball Court 1",
      "sportType": "basketball",
      "availability": [...]
    }
  ]
}
```

### Bookings
Bookings can now be linked to specific courts:
```json
{
  "userId": "uuid",
  "eventId": "uuid",
  "facilityId": "uuid",
  "courtId": "uuid",  // New field
  "bookingType": "event",
  "totalPrice": 50
}
```

## Boundary Coordinates Format

Coordinates are stored as JSON arrays of points with normalized values (0-1 range):

```json
[
  { "x": 0.1, "y": 0.1 },   // Top-left
  { "x": 0.45, "y": 0.1 },  // Top-right
  { "x": 0.45, "y": 0.9 },  // Bottom-right
  { "x": 0.1, "y": 0.9 }    // Bottom-left
]
```

To convert to screen coordinates:
```typescript
function denormalizeCoordinates(
  point: { x: number; y: number },
  imageWidth: number,
  imageHeight: number
) {
  return {
    x: point.x * imageWidth,
    y: point.y * imageHeight,
  };
}
```

## Validation Rules

### Time Format
- Must be HH:MM in 24-hour format
- Regex: `/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/`

### Time Range
- End time must be after start time
- No overlapping availability rules for the same court

### Recurring Rules
- Must have `dayOfWeek` (0-6)
- 0 = Sunday, 6 = Saturday

### One-Time Rules
- Must have `specificDate`
- Used for special availability or blocks

### Boundary Coordinates
- Minimum 3 points for polygon
- Coordinates must be in 0-1 range
- Boundaries should not overlap (recommended)

## Security Considerations

### TODO: Add Authentication
All court management endpoints should verify:
1. User is authenticated
2. User owns the facility
3. User has permission to modify courts

Example middleware:
```typescript
async function verifyFacilityOwnership(req, res, next) {
  const { facilityId } = req.body;
  const userId = req.user.id; // From auth token
  
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { ownerId: true },
  });
  
  if (facility?.ownerId !== userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  next();
}
```

## Testing

### Manual Testing
1. Create a facility
2. Add courts to the facility
3. Set availability rules
4. Check availability for specific times
5. Create bookings for courts
6. Verify conflicts are detected

### Test Endpoints
```bash
# Get courts
curl http://localhost:3000/api/courts/facility/FACILITY_ID

# Check availability
curl -X POST http://localhost:3000/api/courts/COURT_ID/check-availability \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-03-15","startTime":"18:00","endTime":"20:00"}'
```

## Next Steps

### Backend
1. Add authentication middleware
2. Add authorization checks
3. Add facility map upload endpoint
4. Add image storage (AWS S3, Cloudinary, etc.)
5. Add validation middleware
6. Add rate limiting
7. Add audit logging

### Frontend
1. Create ManageGroundScreen
2. Create GroundAvailabilityScreen with calendar
3. Create FacilityMapEditorScreen
4. Create court drawing tools
5. Update booking flow to show court selection
6. Add court availability visualization

### Database
1. Add indexes for performance
2. Add database constraints
3. Consider partitioning for large datasets
4. Add soft delete for courts

## Performance Optimization

### Indexes
Already added:
- `courtId` on facility_court_availability
- `specificDate` on facility_court_availability

Consider adding:
- Composite index on (courtId, dayOfWeek, startTime)
- Index on (facilityId, isActive) for facility_courts

### Caching
Consider caching:
- Court lists per facility
- Availability rules (rarely change)
- Facility maps

### Query Optimization
- Use `select` to limit returned fields
- Use `include` judiciously
- Paginate court lists for large facilities
- Batch availability checks

## Migration Notes

### Existing Data
- Existing facilities have no courts by default
- Existing bookings have no courtId
- Consider creating a default court for each facility
- Migrate existing bookings to default court

### Backward Compatibility
- `courtId` is optional on bookings
- Facilities without courts still work
- Existing booking flow unchanged

## Monitoring

### Metrics to Track
- Court utilization rate
- Booking conflicts
- Availability rule changes
- Map upload success rate
- API response times

### Alerts
- High conflict rate
- Failed availability checks
- Slow queries
- Storage quota exceeded

## Documentation

### API Documentation
- Add OpenAPI/Swagger specs
- Document all endpoints
- Provide example requests/responses
- Document error codes

### User Documentation
- Operator guide for court management
- Availability scheduling guide
- Map upload guide
- Troubleshooting guide

## Conclusion

The backend implementation is complete and ready for frontend integration. All core functionality for court-level facility management is in place, including:

✅ Database schema with courts and availability
✅ Complete CRUD API for courts
✅ Availability management API
✅ Availability checking service
✅ Sample data and seed scripts
✅ Integration with existing facility system

The system is designed to be scalable, maintainable, and ready for production use with the addition of authentication and authorization.
