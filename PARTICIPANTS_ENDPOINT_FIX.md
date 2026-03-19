# Participants Endpoint and Favicon Fix

## Issues Addressed

### 1. Participants Endpoint 404 Error
**Status**: Investigated - Route exists and is properly registered

**Findings**:
- The `/api/events/:id/participants` endpoint EXISTS on the server (server/src/routes/events.ts line 110)
- The route is properly registered in server/src/index.ts at `/api/events`
- The EventService correctly calls `API_ENDPOINTS.EVENTS.PARTICIPANTS(eventId)`

**Improvements Made**:
- Added validation in `EventService.getEventParticipants()` to check if eventId is defined
- Added logging to help debug if the issue occurs again
- The 404 might have been a transient issue or caused by calling the endpoint before eventId was available

**Files Modified**:
- `src/services/api/EventService.ts` - Added eventId validation and logging

### 2. Favicon 404 Error
**Status**: Fixed

**Problem**: No favicon was configured, causing 404 errors in the browser

**Solution**:
- Created `web/favicon.svg` with Muster branding (green background with white "M")
- Added favicon link to `web/index.html`
- Updated page title and meta description to match brand guidelines

**Files Modified**:
- `web/index.html` - Added favicon link, updated title and description
- `web/favicon.svg` - Created new favicon

## Testing

### Participants Endpoint
1. Navigate to an event details page
2. Check browser network tab for `/api/events/{id}/participants` request
3. Should return 200 with array of participants
4. If 404 occurs, check console for "❌ getEventParticipants called with undefined eventId"

### Favicon
1. Open the app in a browser
2. Check browser tab - should show green "M" icon
3. No more 404 errors for favicon.ico in network tab

## Related Files
- `src/services/api/EventService.ts` - Event API service with participants endpoint
- `src/screens/events/EventDetailsScreen.tsx` - Calls getEventParticipants
- `server/src/routes/events.ts` - Server-side participants endpoint
- `web/index.html` - HTML with favicon link
- `web/favicon.svg` - Muster favicon

## Notes
- The participants endpoint was already correctly implemented
- The 404 error may have been caused by:
  - Calling the endpoint before eventId was available
  - A race condition during page load
  - Cached 404 response from earlier development
- Added defensive checks to prevent future issues
