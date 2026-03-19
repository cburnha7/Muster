# Salute Submission and Rating Recalculation Implementation

## Summary
Added the ability to submit salutes for event participants, which triggers automatic player rating recalculation based on salute frequency.

## Changes Made

### 1. Frontend Updates

#### EventDetailsScreen (`src/screens/events/EventDetailsScreen.tsx`)

**New State Variables**
- `isSubmittingSalutes`: Loading state for submission
- `salutesSubmitted`: Tracks if salutes have been submitted for this event

**New Handler**
```typescript
handleSubmitSalutes()
```
- Shows confirmation dialog
- Converts saluted participants Set to array
- Calls API to submit salutes
- Displays success message with ratings updated count
- Marks salutes as submitted

**UI Updates**
- "Submit Salutes" button appears after saluting 1-3 participants
- Button shows count: "Submit X Salute(s)"
- Hint text: "This will update player ratings"
- Loading state while submitting
- After submission, shows success state with checkmark icon
- Prevents re-saluting after submission

**Submitted State UI**
- Large checkmark icon (grass green)
- "Salutes Submitted!" title
- Description showing count of saluted players
- Replaces the participants grid

#### EventService (`src/services/api/EventService.ts`)

**New Methods**

1. `submitSalutes(eventId, salutedUserIds)`
   - Submits array of saluted user IDs
   - Returns: `{ success, salutesRecorded, ratingsUpdated }`

2. `getEventSalutes(eventId)`
   - Gets all salutes for an event
   - Returns array of `{ fromUserId, toUserId, createdAt }`

3. `getUserSalutesForEvent(eventId)`
   - Gets current user's salutes for specific event
   - Returns array of saluted user IDs

### 2. Backend Updates

#### Database Schema (`server/prisma/schema.prisma`)

**New Model: Salute**
```prisma
model Salute {
  id          String   @id @default(uuid())
  createdAt   DateTime @default(now())
  
  eventId     String
  fromUserId  String
  toUserId    String
  
  event       Event    @relation(...)
  fromUser    User     @relation("SalutesGiven", ...)
  toUser      User     @relation("SalutesReceived", ...)
  
  @@unique([eventId, fromUserId, toUserId])
  @@index([eventId])
  @@index([fromUserId])
  @@index([toUserId])
  @@map("salutes")
}
```

**User Model Updates**
- Added `salutesGiven` relation
- Added `salutesReceived` relation

**Event Model Updates**
- Added `salutes` relation

#### API Endpoints (`server/src/routes/events.ts`)

**POST /events/:id/salutes**
- Submits salutes for event participants
- Validates:
  - Event exists and is in the past
  - User hasn't already submitted salutes
  - Max 3 salutes per event
  - Valid user IDs
- Creates salute records in database
- Recalculates ratings for all saluted users
- Returns: `{ success, salutesRecorded, ratingsUpdated }`

**GET /events/:id/salutes**
- Gets all salutes for an event
- Returns array of salute records

**GET /events/:id/salutes/me**
- Gets current user's salutes for specific event
- Returns array of saluted user IDs

### 3. Rating Calculation Algorithm

**Current Implementation**
```typescript
// Get total salutes received by user
const totalSalutes = await prisma.salute.count({
  where: { toUserId: userId },
});

// Get total completed games
const totalGames = await prisma.booking.count({
  where: {
    userId,
    status: 'confirmed',
    event: { endTime: { lt: new Date() } },
  },
});

// Calculate salute ratio
const saluteRatio = totalGames > 0 ? totalSalutes / totalGames : 0;

// New rating: base 1.0 + (salute ratio * 2), capped at 5.0
const newRating = Math.min(5.0, 1.0 + saluteRatio * 2);
```

**Rating Formula**
- Base rating: 1.0
- Bonus: (salutes / games) * 2
- Maximum: 5.0
- Example: 10 salutes in 20 games = 1.0 + (0.5 * 2) = 2.0 rating

**Fields Updated**
- `currentRating`: Overall rating
- `pickupRating`: Pickup game rating (same as current for now)
- `ratingLastUpdated`: Timestamp of last update

## User Flow

### Saluting Process
1. User views past event details
2. Taps participants to salute (up to 3)
3. Salute badges appear on selected cards
4. "Submit Salutes" button appears
5. User taps submit button
6. Confirmation dialog appears
7. User confirms submission
8. API processes salutes and updates ratings
9. Success message shows ratings updated count
10. UI shows "Salutes Submitted!" state

### Validation Rules
- Can only salute after event has ended
- Maximum 3 salutes per event
- Cannot salute yourself
- Cannot submit salutes twice for same event
- Must salute at least 1 participant

## Database Migration

**Migration Name**: `20260310205432_add_salutes`

**Changes**
- Created `salutes` table
- Added foreign keys to `users` and `events`
- Added unique constraint on `(eventId, fromUserId, toUserId)`
- Added indexes for performance

**Command Used**
```bash
npx prisma migrate dev --name add-salutes
```

## API Response Examples

### Submit Salutes Success
```json
{
  "success": true,
  "salutesRecorded": 3,
  "ratingsUpdated": 3
}
```

### Submit Salutes Error (Already Submitted)
```json
{
  "error": "Salutes already submitted for this event"
}
```

### Get Event Salutes
```json
[
  {
    "fromUserId": "user-1-id",
    "toUserId": "user-2-id",
    "createdAt": "2024-03-10T20:30:00Z"
  },
  {
    "fromUserId": "user-1-id",
    "toUserId": "user-3-id",
    "createdAt": "2024-03-10T20:30:00Z"
  }
]
```

## Styling

### New Styles Added
- `submittedBadge`: Green badge with checkmark
- `submittedText`: Green text for submitted state
- `submitSalutesContainer`: Container for submit button
- `submitSalutesButton`: Orange button with send icon
- `submitSalutesButtonText`: White button text
- `submitSalutesHint`: Gray hint text below button
- `salutesSubmittedContainer`: Success state container
- `salutesSubmittedTitle`: Large green title
- `salutesSubmittedDescription`: Gray description text

### Colors Used
- **Court Orange** (`colors.court`): Submit button
- **Grass Green** (`colors.grass`): Success state, checkmark
- **White**: Button text
- **Gray**: Hint text, description

## Future Enhancements

### Rating Algorithm Improvements
1. **Sport-Specific Ratings**: Different ratings for basketball, soccer, etc.
2. **Skill Level Weighting**: Advanced games count more
3. **Recency Weighting**: Recent salutes count more
4. **Decay Over Time**: Ratings decay without activity
5. **Minimum Games Threshold**: Require X games before rating is visible

### Additional Features
1. **Salute Leaderboard**: Top saluted players by sport
2. **Salute Streaks**: Consecutive events with salutes
3. **Salute Categories**: Skill, Sportsmanship, Teamwork
4. **Mutual Salute Bonus**: Extra points when both players salute each other
5. **Salute Comments**: Optional message with salute
6. **Salute Notifications**: Push notification when saluted
7. **Salute History**: View all salutes given/received
8. **Undo Submission**: Allow undo within time window

### Analytics
- Salute submission rate per event
- Average salutes per player
- Correlation between salutes and event attendance
- Most saluted players by sport/skill level
- Salute patterns (who salutes whom)

## Testing Checklist

- [x] Submit button appears after saluting
- [x] Submit button shows correct count
- [x] Confirmation dialog appears
- [x] API call submits salutes
- [x] Success message shows ratings updated
- [x] UI shows submitted state
- [x] Cannot submit twice
- [x] Cannot submit more than 3 salutes
- [x] Cannot salute yourself
- [x] Only works for past events
- [x] Load existing salutes on mount (checks submission status)
- [x] Submission state persists across navigation
- [ ] Ratings display on profile
- [ ] Salute notifications

## Known Issues

None currently.

## Related Files

- `src/screens/events/EventDetailsScreen.tsx` - Main UI
- `src/services/api/EventService.ts` - API methods
- `server/src/routes/events.ts` - Backend endpoints
- `server/prisma/schema.prisma` - Database schema
- `docs/salute-feature-implementation.md` - Initial salute UI
- `docs/past-events-for-saluting.md` - Test data

## Conclusion

The salute submission feature is now fully functional with backend integration and automatic rating recalculation. Users can salute up to 3 participants per event, and the system automatically updates player ratings based on salute frequency. The rating algorithm is simple but effective, providing a base rating of 1.0 with bonuses for receiving salutes.

Next steps: Display ratings on player profiles, add salute notifications, and refine the rating algorithm based on user feedback.
