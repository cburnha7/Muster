# Ground Management Features - Design

## Architecture Overview

This feature extends the existing facility management system with:
1. Court/field-level granularity for bookings
2. Visual map-based court definition
3. Calendar-based availability management

## Data Model

### Entity Relationships

```
Facility (1) -----> (N) FacilityCourt
FacilityCourt (1) -----> (N) FacilityCourtAvailability
FacilityCourt (1) -----> (N) Booking
```

### Key Entities

#### FacilityCourt
Represents an individual bookable unit within a facility (court, field, pitch, etc.)

**Properties:**
- Unique identifier
- Name/label
- Sport type
- Capacity
- Indoor/outdoor flag
- Active status
- Boundary coordinates (for map visualization)
- Optional price override

#### FacilityCourtAvailability
Defines when a court is available for booking

**Properties:**
- Recurring or one-time
- Day of week (for recurring)
- Specific date (for one-time)
- Start/end time
- Blocked status
- Block reason

## Component Architecture

### Screen Hierarchy

```
FacilityDetailsScreen (existing)
  ├─> ManageGroundScreen (new)
  │     ├─> GroundAvailabilityScreen (new)
  │     └─> FacilityMapEditorScreen (new)
  └─> BookingScreen (updated to show court selection)
```

### Component Structure

#### ManageGroundScreen
Main hub for ground operators

**Sections:**
- Ground overview (name, address, stats)
- Courts/fields list
- Quick actions (Add court, Manage availability, Edit map)
- Recent bookings

#### GroundAvailabilityScreen
Calendar-based availability management

**Components:**
- `AvailabilityCalendar` - Main calendar view
- `CourtSelector` - Multi-select court picker
- `TimeSlotGrid` - Time slot selection
- `AvailabilityRuleForm` - Form for creating availability rules
- `BlockReasonModal` - Modal for blocking time slots

#### FacilityMapEditorScreen
Interactive map editor

**Components:**
- `MapImageUploader` - Image upload and preview
- `MapCanvas` - SVG canvas for drawing
- `DrawingToolbar` - Tool selection (polygon, rectangle, edit, delete)
- `CourtPropertiesPanel` - Form for court details
- `CourtListSidebar` - List of defined courts

## User Flows

### Flow 1: Upload Facility Map and Define Courts

1. Operator navigates to Facility Details
2. Taps "Manage Ground" button
3. Taps "Edit Facility Map"
4. Uploads facility map image
5. Selects polygon tool
6. Taps points on map to define court boundary
7. Closes polygon
8. Fills in court properties (name, sport type, capacity)
9. Saves court
10. Repeats steps 5-9 for additional courts
11. Taps "Save All" to persist changes

### Flow 2: Set Court Availability

1. Operator navigates to Manage Ground screen
2. Taps "Manage Availability"
3. Selects court(s) from list
4. Selects date range
5. Selects time slots
6. Marks as available or blocked
7. (If blocked) Enters reason
8. Saves availability rule
9. Rule appears in calendar view

### Flow 3: User Books Specific Court

1. User browses facilities
2. Selects facility with multiple courts
3. Views facility details showing court map
4. Taps "Book" button
5. Selects date and time
6. System shows available courts for selected time
7. User selects specific court
8. Completes booking

## UI/UX Design

### Design Principles

1. **Visual First**: Use map visualization to make court selection intuitive
2. **Bulk Operations**: Allow operators to manage multiple courts at once
3. **Clear Feedback**: Show availability status with color coding
4. **Mobile Optimized**: Touch-friendly drawing tools and calendar
5. **Progressive Disclosure**: Show advanced options only when needed

### Color Coding

**Availability Status:**
- Available: `#3D8C5E` (grass green)
- Booked: `#5B9FD4` (sky blue)
- Blocked: `#D45B5B` (track red)
- Unavailable: `#6B7C76` (soft gray)

**Court Boundaries:**
- Basketball: `#E8A030` (court orange)
- Soccer: `#3D8C5E` (grass green)
- Tennis: `#FFD700` (gold)
- Volleyball: `#9C27B0` (purple)
- Other: `#6B7C76` (soft gray)

### Responsive Design

**Mobile (< 768px):**
- Single column layout
- Full-width calendar
- Drawer-based court selector
- Simplified drawing tools

**Tablet (768px - 1024px):**
- Two-column layout
- Side-by-side calendar and court list
- Expanded drawing toolbar

**Desktop (> 1024px):**
- Three-column layout
- Calendar + Court list + Properties panel
- Full drawing toolbar with labels

## Technical Implementation

### Map Drawing Implementation

Use `react-native-svg` for cross-platform drawing:

```typescript
interface Point {
  x: number;
  y: number;
}

interface CourtBoundary {
  id: string;
  name: string;
  points: Point[];
  sportType: string;
}

// Convert screen coordinates to relative coordinates (0-1 range)
function normalizeCoordinates(
  point: Point,
  imageWidth: number,
  imageHeight: number
): Point {
  return {
    x: point.x / imageWidth,
    y: point.y / imageHeight,
  };
}

// Convert relative coordinates back to screen coordinates
function denormalizeCoordinates(
  point: Point,
  imageWidth: number,
  imageHeight: number
): Point {
  return {
    x: point.x * imageWidth,
    y: point.y * imageHeight,
  };
}
```

### Availability Checking Algorithm

```typescript
interface AvailabilityCheck {
  courtId: string;
  date: Date;
  startTime: string;
  endTime: string;
}

function isCourtAvailable(check: AvailabilityCheck): boolean {
  // 1. Check if court exists and is active
  // 2. Check recurring availability rules for day of week
  // 3. Check one-time availability overrides
  // 4. Check for existing bookings
  // 5. Check for blocked time slots
  // 6. Return true only if all checks pass
}
```

### Calendar Data Structure

```typescript
interface CalendarDay {
  date: Date;
  courts: {
    courtId: string;
    courtName: string;
    timeSlots: {
      startTime: string;
      endTime: string;
      status: 'available' | 'booked' | 'blocked' | 'unavailable';
      bookingId?: string;
      blockReason?: string;
    }[];
  }[];
}
```

## API Design

### Court Management

```typescript
// GET /api/facilities/:facilityId/courts
interface GetCourtsResponse {
  courts: {
    id: string;
    name: string;
    sportType: string;
    capacity: number;
    isIndoor: boolean;
    isActive: boolean;
    boundaryCoordinates: Point[];
    pricePerHour: number | null;
  }[];
}

// POST /api/facilities/:facilityId/courts
interface CreateCourtRequest {
  name: string;
  sportType: string;
  capacity: number;
  isIndoor: boolean;
  boundaryCoordinates: Point[];
  pricePerHour?: number;
}

// PUT /api/facilities/:facilityId/courts/:courtId
interface UpdateCourtRequest {
  name?: string;
  sportType?: string;
  capacity?: number;
  isIndoor?: boolean;
  isActive?: boolean;
  boundaryCoordinates?: Point[];
  pricePerHour?: number;
}
```

### Availability Management

```typescript
// GET /api/facilities/:facilityId/courts/:courtId/availability
interface GetAvailabilityResponse {
  availability: {
    id: string;
    dayOfWeek: number | null;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
    specificDate: string | null;
    isBlocked: boolean;
    blockReason: string | null;
  }[];
}

// POST /api/facilities/:facilityId/courts/:courtId/availability
interface CreateAvailabilityRequest {
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate?: string;
  isBlocked: boolean;
  blockReason?: string;
}
```

### Map Upload

```typescript
// POST /api/facilities/:facilityId/map
// Content-Type: multipart/form-data
interface UploadMapRequest {
  image: File; // Image file
}

interface UploadMapResponse {
  facilityMapUrl: string;
  thumbnailUrl: string;
}
```

## Performance Considerations

### Optimization Strategies

1. **Image Optimization**
   - Compress uploaded images to max 2MB
   - Generate thumbnails for list views
   - Use progressive JPEG for faster loading
   - Cache images locally

2. **Calendar Rendering**
   - Virtualize calendar rows for large date ranges
   - Lazy load availability data as user scrolls
   - Cache availability rules in Redux
   - Debounce availability checks

3. **Map Drawing**
   - Limit polygon complexity (max 20 points)
   - Use simplified rendering for zoom-out view
   - Throttle drawing events
   - Batch boundary updates

4. **Data Fetching**
   - Paginate court lists for facilities with many courts
   - Fetch availability data in weekly chunks
   - Use optimistic updates for better UX
   - Implement background sync for offline changes

## Security Considerations

1. **Authorization**
   - Only facility owners can edit maps and availability
   - Verify ownership on all court management endpoints
   - Rate limit map uploads (max 5 per hour)

2. **Input Validation**
   - Validate image file types and sizes
   - Sanitize court names and descriptions
   - Validate coordinate ranges (0-1)
   - Prevent overlapping boundaries

3. **Data Privacy**
   - Don't expose booking user details in availability API
   - Redact block reasons from public availability view
   - Audit log all availability changes

## Testing Strategy

### Unit Tests
- Coordinate normalization/denormalization
- Availability checking logic
- Boundary overlap detection
- Time slot validation

### Integration Tests
- Court CRUD operations
- Availability rule creation and updates
- Map upload and storage
- Booking with court selection

### E2E Tests
- Complete flow: Upload map → Define courts → Set availability → Book court
- Multi-court booking scenarios
- Availability conflict resolution
- Map editor interactions

## Migration Strategy

### Phase 1: Database Schema
1. Create new tables (FacilityCourt, FacilityCourtAvailability)
2. Add facilityMapUrl to Facility table
3. Add courtId to Booking table
4. Run migrations

### Phase 2: Backend API
1. Implement court management endpoints
2. Implement availability endpoints
3. Implement map upload endpoint
4. Update booking logic to support courts

### Phase 3: Frontend Components
1. Build map editor components
2. Build availability calendar
3. Update facility details screen
4. Update booking flow

### Phase 4: Data Migration
1. Create default court for existing facilities
2. Migrate existing availability to court-level
3. Update existing bookings to reference default court

### Phase 5: Testing & Rollout
1. Beta test with select operators
2. Gather feedback and iterate
3. Full rollout to all users
4. Monitor performance and errors

## Future Enhancements

1. **AI-Powered Court Detection**
   - Use computer vision to auto-detect courts from map image
   - Suggest boundary coordinates
   - Recognize court types from markings

2. **Dynamic Pricing**
   - Adjust prices based on demand
   - Peak/off-peak pricing per court
   - Seasonal pricing rules

3. **Advanced Scheduling**
   - Recurring booking templates
   - Tournament mode (block multiple courts)
   - Waitlist for fully booked courts

4. **Analytics Dashboard**
   - Court utilization rates
   - Revenue per court
   - Popular time slots
   - Booking patterns
