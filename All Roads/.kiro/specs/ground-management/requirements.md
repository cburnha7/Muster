# Ground Management Features - Requirements

## Overview
Enhanced ground/facility management tools for operators to manage availability and define bookable units within their facilities.

## User Stories

### As a facility operator, I want to:
1. Set availability schedules for individual courts/fields within my ground
2. Upload a facility map image showing the layout of my ground
3. Define bookable boundaries (courts/fields) on the facility map
4. Block specific time slots for maintenance or private events
5. View all bookings across my courts/fields in a calendar view

## Functional Requirements

### 1. Ground Availability Calendar

#### 1.1 Calendar View
- Display a calendar interface within the facility management screen
- Show availability for all courts/fields within the ground
- Support month, week, and day views
- Color-code availability status:
  - Green: Available
  - Red: Unavailable/Blocked
  - Blue: Booked
  - Gray: Outside operating hours

#### 1.2 Availability Management
- Allow operators to select date ranges
- Allow operators to select time slots (15-minute increments)
- Allow operators to select specific courts/fields
- Support bulk operations (set availability for multiple courts at once)
- Provide templates for recurring availability patterns (e.g., "Weekdays 9am-5pm")

#### 1.3 Blocking/Unavailability
- Mark time slots as unavailable
- Add reason for unavailability (maintenance, private event, etc.)
- Set temporary blocks with start and end dates
- Override recurring availability patterns for specific dates

#### 1.4 Data Storage
- Store availability rules in `FacilityAvailability` table
- Link availability to specific courts/fields
- Support recurring and one-time availability rules
- Respect availability when processing bookings

### 2. Facility Map Upload

#### 2.1 Image Upload
- Support common image formats (JPEG, PNG)
- Maximum file size: 10MB
- Image optimization/compression on upload
- Preview uploaded image before saving
- Replace existing map image

#### 2.2 Image Storage
- Store images securely (cloud storage or local)
- Generate thumbnail for list views
- Maintain original resolution for editing
- Associate map image with facility record

### 3. Court/Field Boundary Editor

#### 3.1 Drawing Tools
- Polygon drawing tool for defining boundaries
- Rectangle tool for quick court definition
- Edit mode to adjust existing boundaries
- Delete boundaries
- Undo/redo functionality

#### 3.2 Boundary Properties
- Name each court/field (e.g., "Court 1", "Field A")
- Assign sport type to each boundary
- Set capacity for each court/field
- Set individual pricing (if different from facility base rate)
- Mark as indoor/outdoor

#### 3.3 Visual Feedback
- Highlight boundaries on hover
- Show boundary names as labels
- Color-code boundaries by sport type or status
- Semi-transparent overlays to see map underneath

#### 3.4 Data Storage
- Store boundary coordinates as polygon data
- Link boundaries to facility record
- Create separate bookable units for each boundary
- Enable/disable individual courts/fields

## Technical Requirements

### Database Schema Updates

#### New Table: FacilityCourt
```prisma
model FacilityCourt {
  id          String   @id @default(uuid())
  facilityId  String
  name        String   // "Court 1", "Field A"
  sportType   String
  capacity    Int      @default(1)
  isIndoor    Boolean  @default(false)
  isActive    Boolean  @default(true)
  
  // Map boundary data (stored as JSON)
  boundaryCoordinates Json?  // Array of {x, y} points
  
  // Pricing (optional override)
  pricePerHour Float?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  facility    Facility @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  availability FacilityCourtAvailability[]
  bookings    Booking[]
  
  @@map("facility_courts")
}

model FacilityCourtAvailability {
  id          String   @id @default(uuid())
  courtId     String
  dayOfWeek   Int?     // 0=Sunday, 1=Monday, etc. (null for one-time)
  startTime   String   // HH:MM format
  endTime     String   // HH:MM format
  isRecurring Boolean  @default(true)
  specificDate DateTime? // For one-time availability
  isBlocked   Boolean  @default(false)
  blockReason String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  court       FacilityCourt @relation(fields: [courtId], references: [id], onDelete: Cascade)
  
  @@map("facility_court_availability")
}
```

#### Update Facility Table
```prisma
model Facility {
  // ... existing fields
  facilityMapUrl String?  // URL to uploaded facility map image
  courts         FacilityCourt[]
}
```

#### Update Booking Table
```prisma
model Booking {
  // ... existing fields
  courtId     String?  // Link to specific court/field
  court       FacilityCourt? @relation(fields: [courtId], references: [id])
}
```

### API Endpoints

#### Facility Map
- `POST /api/facilities/:id/map` - Upload facility map image
- `DELETE /api/facilities/:id/map` - Remove facility map image

#### Courts/Fields
- `GET /api/facilities/:id/courts` - List all courts for a facility
- `POST /api/facilities/:id/courts` - Create new court/field
- `PUT /api/facilities/:id/courts/:courtId` - Update court/field
- `DELETE /api/facilities/:id/courts/:courtId` - Delete court/field

#### Court Availability
- `GET /api/facilities/:id/courts/:courtId/availability` - Get availability for a court
- `POST /api/facilities/:id/courts/:courtId/availability` - Set availability
- `PUT /api/facilities/:id/courts/:courtId/availability/:availabilityId` - Update availability
- `DELETE /api/facilities/:id/courts/:courtId/availability/:availabilityId` - Remove availability

### Frontend Components

#### New Screens
- `GroundAvailabilityScreen.tsx` - Calendar view for managing availability
- `FacilityMapEditorScreen.tsx` - Map upload and boundary editor

#### New Components
- `AvailabilityCalendar.tsx` - Calendar component with availability management
- `FacilityMapEditor.tsx` - Interactive map editor with drawing tools
- `CourtBoundaryDrawer.tsx` - Drawing tool for defining boundaries
- `CourtListManager.tsx` - List view of all courts with quick actions

### Libraries/Dependencies
- `react-native-calendar` or `react-native-calendars` - Calendar UI
- `react-native-svg` - Drawing boundaries on map
- `react-native-gesture-handler` - Touch interactions for drawing
- `expo-image-picker` - Image upload
- `expo-file-system` - File handling

## User Interface

### Ground Management Screen
- Add "Manage Availability" button
- Add "Edit Facility Map" button
- Show list of courts/fields with status indicators
- Quick actions: Enable/Disable court, View bookings

### Availability Calendar Screen
- Calendar header with view selector (Month/Week/Day)
- Court/field selector (multi-select)
- Time slot grid
- Availability status legend
- Bulk action toolbar
- Save/Cancel buttons

### Facility Map Editor Screen
- Map image display area
- Drawing toolbar (Polygon, Rectangle, Edit, Delete)
- Court list sidebar showing all defined boundaries
- Boundary properties panel
- Save/Cancel buttons
- Zoom/Pan controls

## Validation Rules

### Availability
- End time must be after start time
- Time slots cannot overlap for the same court
- Blocked slots cannot be booked
- Recurring patterns must have valid day of week (0-6)

### Court Boundaries
- Court name must be unique within facility
- Boundary must have at least 3 points (for polygon)
- Boundaries cannot overlap
- At least one court must be active

### Map Upload
- Image file size ≤ 10MB
- Supported formats: JPEG, PNG, WebP
- Minimum dimensions: 800x600px
- Maximum dimensions: 4000x4000px

## Success Criteria

1. Operators can upload a facility map image
2. Operators can define at least 3 courts/fields on the map
3. Operators can set availability for individual courts
4. Operators can block time slots with reasons
5. Booking system respects court availability
6. Users can see which courts are available when booking
7. Calendar view shows all bookings across courts
8. Performance: Map editor loads in <2 seconds
9. Performance: Availability calendar loads in <1 second

## Future Enhancements

- Auto-detect courts from map image using ML
- Import/export availability schedules
- Availability templates library
- Multi-facility management dashboard
- Real-time availability updates
- Integration with external calendar systems (Google Calendar, Outlook)
- Automated pricing based on demand
- Court maintenance scheduling
- Equipment assignment per court
