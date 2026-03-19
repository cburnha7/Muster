# Test Data Summary

## Current User: Edwin Chen
- **Email**: edwin@muster.app
- **Password**: password123
- **ID**: e59004fd-5ce2-4952-9048-4973034ec6c9

## Edwin's Facilities (2)

### 1. Mission District Tennis Center
- **Sport**: Tennis
- **Location**: 789 Valencia Street, San Francisco, CA 94110
- **Price**: $60/hour
- **Courts**: 4 indoor tennis courts
  - Court 1 (Standard)
  - Court 2 (Standard)
  - Court 3 (Premium - $70/hour)
  - Court 4 (Premium - $70/hour)
- **Availability**: 6am-10pm daily
- **Amenities**: Parking, Locker Rooms, Pro Shop, Coaching, Cafe
- **Status**: Verified

### 2. Bay Area Badminton Club
- **Sport**: Badminton
- **Location**: 321 Market Street, San Francisco, CA 94103
- **Price**: $40/hour
- **Courts**: 4 indoor badminton courts
  - Court A
  - Court B
  - Court C
  - Court D
- **Availability**: 7am-11pm daily
- **Amenities**: Parking, Locker Rooms, Equipment Rental, Showers, Vending Machines
- **Status**: Verified

## Edwin's Events (7)

### Tennis Events

1. **Doubles Tennis Tournament**
   - Type: Game
   - Skill: Intermediate
   - Date: +2 days
   - Duration: 4 hours
   - Price: $30
   - Participants: 8/16
   - Facility: Mission District Tennis Center

2. **Morning Tennis Practice**
   - Type: Practice
   - Skill: All Levels
   - Date: +4 days, 7am-9am
   - Price: $15
   - Participants: 5/12
   - Facility: Mission District Tennis Center

### Badminton Events

3. **Badminton Pickup Games**
   - Type: Pickup
   - Skill: All Levels
   - Date: Tomorrow, 6pm-9pm
   - Price: Free
   - Participants: 6/16
   - Facility: Bay Area Badminton Club

4. **Advanced Badminton Training**
   - Type: Practice
   - Skill: Advanced
   - Date: +6 days, 7pm-9pm
   - Price: $25
   - Participants: 4/8
   - Facility: Bay Area Badminton Club

### Basketball Events

5-7. **Pickup Basketball Game** (3 instances)
   - Type: Pickup
   - Skill: Intermediate
   - Various dates
   - Price: Free
   - Facility: Downtown Sports Complex

## Other Facilities in Database

### Downtown Sports Complex (John's)
- **Sports**: Basketball, Volleyball, Badminton
- **Location**: 123 Main Street, San Francisco
- **Courts**: 3 (2 basketball, 1 volleyball)
- **Owner**: John Smith

### Sunset Soccer Fields (Sarah's)
- **Sport**: Soccer
- **Location**: 456 Ocean Avenue, San Francisco
- **Courts**: 2 soccer fields
- **Owner**: Sarah Johnson

## Total Database Statistics

- **Users**: 3 (Edwin, John, Sarah)
- **Facilities**: 4 total (2 owned by Edwin)
- **Courts**: 13 total (8 owned by Edwin)
- **Events**: 7+ (7 organized by Edwin)
- **Teams**: 2
- **Bookings**: 1

## Court Features Demonstrated

### Boundary Coordinates
All courts have normalized boundary coordinates (0-1 range) ready for map visualization:
```json
[
  { "x": 0.05, "y": 0.1 },
  { "x": 0.25, "y": 0.1 },
  { "x": 0.25, "y": 0.45 },
  { "x": 0.05, "y": 0.45 }
]
```

### Availability Schedules
- Tennis courts: 6am-10pm daily
- Badminton courts: 7am-11pm daily
- Basketball courts: Weekday mornings/evenings + weekends
- Soccer fields: All week 7am-9pm

### Pricing Variations
- Standard tennis courts: $60/hour
- Premium tennis courts: $70/hour
- Badminton courts: $40/hour
- Basketball/Volleyball: $50/hour
- Soccer fields: $75/hour

## Testing the "Your Facilities" and "Your Events" Sections

When logged in as Edwin, you should see:

### Facilities Tab
**Your Facilities** section showing:
- Mission District Tennis Center
- Bay Area Badminton Club

**All Facilities** section showing:
- Downtown Sports Complex
- Sunset Soccer Fields

### Events Tab
**Your Events** section showing:
- Doubles Tennis Tournament
- Morning Tennis Practice
- Badminton Pickup Games
- Advanced Badminton Training
- Pickup Basketball Game (3x)

**All Events** section showing:
- Weekend Soccer Match
- Beach Volleyball Tournament
- (Other events organized by John and Sarah)

## API Endpoints to Test

### Get Edwin's Facilities
```bash
GET http://localhost:3000/api/facilities
# Filter by ownerId: e59004fd-5ce2-4952-9048-4973034ec6c9
```

### Get Edwin's Events
```bash
GET http://localhost:3000/api/events
# Filter by organizerId: e59004fd-5ce2-4952-9048-4973034ec6c9
```

### Get Courts for Tennis Center
```bash
GET http://localhost:3000/api/courts/facility/{facilityId}
```

### Check Court Availability
```bash
POST http://localhost:3000/api/courts/{courtId}/check-availability
{
  "date": "2026-03-15",
  "startTime": "18:00",
  "endTime": "20:00"
}
```

## Servers Running

- **Frontend**: http://localhost:8081
- **Backend**: http://localhost:3000

## Login Credentials

All test users have the same password: `password123`

- **Edwin**: edwin@muster.app (Main test user - facility owner)
- **John**: john@example.com (Facility owner)
- **Sarah**: sarah@example.com (Facility owner)

## What to Test

1. ✅ Login as Edwin
2. ✅ Navigate to Facilities tab
3. ✅ See "Your Facilities" section at top with 2 facilities
4. ✅ See "All Facilities" section below with other facilities
5. ✅ Navigate to Events tab
6. ✅ See "Your Events" section at top with 7 events
7. ✅ See "All Events" section below with other events
8. ✅ Click on Edwin's facilities to see court details
9. ✅ View court availability schedules
10. ✅ Book events at specific courts

## Notes

- All facilities are verified and active
- All courts have availability schedules set
- Boundary coordinates are ready for map visualization
- Court-specific pricing is demonstrated (premium tennis courts)
- Multiple sport types are represented
- Various event types (Game, Practice, Pickup) are included
- Events span different dates and times for testing

---

**Status**: ✅ Test data loaded and servers running
**Frontend**: http://localhost:8081
**Backend**: http://localhost:3000
**Date**: March 10, 2026
