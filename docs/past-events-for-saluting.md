# Past Events for Saluting Testing

## Summary
Added 3 past events with multiple participants to test the after-game saluting process.

## Changes Made

### 1. Database Seed Updates (`server/src/prisma/seed.ts`)
Added three completed events with Edwin and other users as participants:

#### Past Basketball Pickup Game
- **Date**: 3 days ago
- **Duration**: 2 hours
- **Sport**: Basketball
- **Facility**: Downtown Sports Complex
- **Organizer**: John Smith
- **Participants**: 6 total
  - Edwin Chen (edwin@muster.app)
  - John Smith (john@example.com)
  - Sarah Johnson (sarah@example.com)
  - 3 additional mock participants
- **Status**: completed
- **Price**: Free

#### Past Soccer Match
- **Date**: 5 days ago
- **Duration**: 90 minutes
- **Sport**: Soccer
- **Facility**: Sunset Soccer Fields
- **Organizer**: Sarah Johnson
- **Participants**: 8 total
  - Edwin Chen (edwin@muster.app)
  - John Smith (john@example.com)
  - Sarah Johnson (sarah@example.com)
  - 5 additional mock participants
- **Status**: completed
- **Price**: $10

#### Past Tennis Doubles
- **Date**: 7 days ago
- **Duration**: 3 hours
- **Sport**: Tennis
- **Facility**: Mission District Tennis Center
- **Organizer**: Edwin Chen
- **Participants**: 8 total (full capacity)
  - Edwin Chen (edwin@muster.app)
  - John Smith (john@example.com)
  - Sarah Johnson (sarah@example.com)
  - 5 additional mock participants
- **Status**: completed
- **Price**: $20

### 2. Package.json Configuration (`server/package.json`)
Added Prisma seed configuration:
```json
"prisma": {
  "seed": "tsx src/prisma/seed.ts"
}
```

This allows running `npx prisma db seed` directly.

## Testing the Saluting Feature

### How to Access Past Events

1. **Navigate to Bookings Tab**
   - Open the app
   - Go to the Bookings tab in the bottom navigation

2. **View Past Bookings**
   - The BookingsListScreen should show a filter/toggle for "Past" bookings
   - Select "Past" to see completed events
   - You should see 3 past events:
     - Past Basketball Pickup Game (3 days ago)
     - Past Soccer Match (5 days ago)
     - Past Tennis Doubles (7 days ago)

3. **Open Event Details**
   - Tap on any past event
   - The EventDetailsScreen should detect it's a completed event
   - Should show a "Salute Players" button or similar UI

4. **Salute Other Players**
   - View the list of participants who attended
   - Salute/rate other players who participated
   - Test the saluting flow with multiple participants

### Backend API Endpoints

The following endpoints support the saluting feature:

- `GET /users/bookings?status=past` - Get user's past bookings
- `GET /events/:id/participants` - Get list of participants for an event
- `POST /events/:id/salute` - Salute/rate a player (to be implemented)

### Database State

After running the seed:
- Database has been reset and re-seeded
- All past events have `status: 'completed'`
- All bookings have `status: 'confirmed'` and `paymentStatus: 'completed'`
- Edwin (user ID from auth context) has bookings for all 3 past events

## Commands Used

```bash
# Reset database and apply schema
npx prisma db push --force-reset

# Seed database with test data
npx prisma db seed
```

## Next Steps

1. Implement the saluting UI in EventDetailsScreen for completed events
2. Create a VotePlayersScreen or SalutePlayersScreen
3. Implement the backend endpoint for submitting salutes/ratings
4. Update the player profile to show salute count and ratings
5. Test the complete flow from viewing past events to saluting players

## Notes

- The mock user in AuthService (edwin@muster.app, ID "1") is mapped to the first real user in the database by the backend
- All 3 past events have Edwin as a participant, so they will appear in his "Past" bookings
- Each event has multiple participants (6-8 players) to test the saluting interface with a realistic number of players
- Events are spread across different dates (3, 5, and 7 days ago) to test date sorting and display
