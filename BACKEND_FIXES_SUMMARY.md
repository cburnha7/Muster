# Backend API Fixes Summary

## Issues Identified

### 1. Missing Endpoint: GET /facilities/:id/events
**Error:** `404 (Not Found)` when trying to fetch events for a facility

**Root Cause:** The endpoint `/facilities/:id/events` was not implemented in the backend

**Fix Applied:** Added the endpoint to `server/src/routes/facilities.ts`

### 2. HTML Response Instead of JSON
**Error:** `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

**Root Cause:** Backend server is either:
- Not running
- Returning HTML error pages instead of JSON
- Route not properly registered

## Changes Made

### server/src/routes/facilities.ts

Added new endpoint after the `GET /:id` route:

```typescript
// Get events at a facility
router.get('/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Check if facility exists
    const facility = await prisma.facility.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: { facilityId: id },
        skip,
        take,
        include: {
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          facility: {
            select: {
              id: true,
              name: true,
              street: true,
              city: true,
              state: true,
            },
          },
          rental: {
            include: {
              timeSlot: {
                include: {
                  court: {
                    select: {
                      id: true,
                      name: true,
                      sportType: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.event.count({ where: { facilityId: id } }),
    ]);

    res.json({
      data: events,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get facility events error:', error);
    res.status(500).json({ error: 'Failed to fetch facility events' });
  }
});
```

## Endpoint Details

### GET /facilities/:id/events

**Description:** Fetches all events scheduled at a specific facility

**Parameters:**
- `id` (path parameter) - Facility ID
- `page` (query parameter, optional) - Page number (default: 1)
- `limit` (query parameter, optional) - Items per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": "event-id",
      "title": "Event Title",
      "description": "Event Description",
      "sportType": "basketball",
      "facilityId": "facility-id",
      "organizerId": "user-id",
      "startTime": "2024-01-01T10:00:00Z",
      "endTime": "2024-01-01T12:00:00Z",
      "maxParticipants": 10,
      "currentParticipants": 5,
      "price": 20,
      "status": "active",
      "organizer": {
        "id": "user-id",
        "firstName": "John",
        "lastName": "Doe"
      },
      "facility": {
        "id": "facility-id",
        "name": "Facility Name",
        "street": "123 Main St",
        "city": "Seattle",
        "state": "WA"
      },
      "rental": {
        "id": "rental-id",
        "timeSlot": {
          "id": "slot-id",
          "court": {
            "id": "court-id",
            "name": "Court 1",
            "sportType": "basketball"
          }
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

**Error Responses:**
- `404` - Facility not found
- `500` - Server error

## Required Actions

### 1. Restart Backend Server

The backend server needs to be restarted to pick up the new endpoint:

```bash
cd server
npm run dev
```

### 2. Verify Server is Running

Check that the server is running on the correct port:
- Default: http://localhost:3000
- Check console output for "Server running on port 3000"

### 3. Test the Endpoint

Once the server is restarted, test the endpoint:

```bash
# Test with curl
curl http://localhost:3000/api/facilities/{facility-id}/events

# Or in browser
http://localhost:3000/api/facilities/{facility-id}/events
```

### 4. Check Frontend Configuration

Verify the frontend is pointing to the correct API URL:

**File:** `.env` or `.env.local`
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

## Frontend Usage

The endpoint is already being used in:

**File:** `src/screens/facilities/FacilityDetailsScreen.tsx`
```typescript
const loadFacilityEvents = async () => {
  try {
    const response = await facilityService.getFacilityEvents(facilityId, {
      page: 1,
      limit: 10,
    });
    setEvents(response.data);
  } catch (err: any) {
    console.error('Failed to load facility events:', err);
  }
};
```

**File:** `src/services/api/FacilityService.ts`
```typescript
async getFacilityEvents(
  facilityId: string,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Event>> {
  const params = pagination || {};
  return this.get<PaginatedResponse<Event>>(
    API_ENDPOINTS.FACILITIES.EVENTS(facilityId),
    { params }
  );
}
```

## Additional Errors to Address

### "Unexpected text node" Error

This React Native error suggests there's a text node outside of a `<Text>` component. This is likely in the FacilityDetailsScreen or a related component. The error message indicates:

```
Unexpected text node: . A text node cannot be a child of a <View>.
```

This means there's a period (`.`) or other text directly inside a `<View>` without being wrapped in a `<Text>` component.

**To fix:** Search for any text content in JSX that's not wrapped in `<Text>` tags.

### Courts Loading Error

The error `Load courts error: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON` suggests the courts endpoint is also returning HTML instead of JSON.

**Possible causes:**
1. Backend server not running
2. CORS issues
3. Route not properly registered
4. Wrong API URL in frontend

**To verify:** Check that the courts routes are properly imported and registered in the main server file.

## Testing Checklist

After restarting the backend:

- [ ] Backend server starts without errors
- [ ] Can access http://localhost:3000/api/facilities
- [ ] Can access http://localhost:3000/api/facilities/:id
- [ ] Can access http://localhost:3000/api/facilities/:id/events
- [ ] Can access http://localhost:3000/api/facilities/:id/courts
- [ ] Frontend can fetch facility details
- [ ] Frontend can fetch facility events
- [ ] Frontend can fetch facility courts
- [ ] No HTML parsing errors in console
- [ ] No 404 errors in console

## Summary

The main issue was a missing API endpoint for fetching events at a facility. This has been fixed by adding the `GET /facilities/:id/events` endpoint to the backend routes.

**Next steps:**
1. Restart the backend server
2. Verify all endpoints are accessible
3. Test the FacilityDetailsScreen
4. Fix any remaining "Unexpected text node" errors in the frontend
