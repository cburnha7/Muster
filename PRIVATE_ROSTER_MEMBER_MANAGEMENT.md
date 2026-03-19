# Private Roster Member Management Implementation

## Overview
This document describes the implementation of direct member addition for private rosters, allowing roster owners and admins to search for and add existing users without requiring the user to initiate a join request.

## Features Implemented

### 1. User Search Component
**File**: `src/components/teams/AddMemberSearch.tsx`

A reusable search component that:
- Provides real-time search with 300ms debounce
- Searches users by first name, last name, or email
- Filters out users who are already roster members
- Shows user avatars and basic info
- Displays loading states during search and add operations
- Shows helpful messages for empty states

**Key Features**:
- Minimum 2 characters required to trigger search
- Inline results display below search input
- One-click add with immediate feedback
- Automatic result removal after successful add
- Error handling with user-friendly messages

### 2. Frontend API Methods

#### UserService
**File**: `src/services/api/UserService.ts`

Added method:
```typescript
async searchUsers(query: string): Promise<User[]>
```
- Searches registered users by name or email
- Returns array of matching User objects
- Used by AddMemberSearch component

#### TeamService
**File**: `src/services/api/TeamService.ts`

Added method:
```typescript
async addMemberDirectly(teamId: string, userId: string): Promise<TeamMember>
```
- Adds a user directly to a roster (owner/admin only)
- Returns the created TeamMember object
- Triggers notification to added user

### 3. TeamDetailsScreen Updates
**File**: `src/screens/teams/TeamDetailsScreen.tsx`

**Changes Made**:
1. Added import for `AddMemberSearch` component
2. Added `handleAddMemberDirectly` function to handle member addition
3. Integrated AddMemberSearch in Players section
4. Added conditional rendering (only for private rosters with owner/admin access)
5. Updated all brand terminology:
   - "Team" → "Roster"
   - "Members" → "Players"
   - "Cancel" → "Step Out"
   - "Join" → "Join Up"

**UI Structure**:
```
Players Section
├── Players List (existing members)
└── Add Players Section (private rosters only)
    ├── Header with "Private" badge
    ├── Description text
    └── AddMemberSearch component
```

### 4. Visual Design

**Add Member Section**:
- Only visible for private rosters
- Only accessible to roster owners and admins
- Only shown when roster has available slots
- Clear visual separation from existing members list
- "🔒 Private" badge to indicate roster type
- Descriptive text explaining the feature

**Search Component**:
- Clean, minimal design using brand colors
- Search icon with input field
- Loading spinner during search
- Results displayed as cards with user info
- Green add button (colors.grass)
- Empty state with helpful message

## Business Logic

### Visibility Rules
The Add Players section is shown when ALL of the following are true:
1. Roster is private (`!team.isPublic`)
2. User is owner or admin (`canManageTeam`)
3. Roster has available slots (`availableSlots > 0`)

### Permission Checks
- Frontend: Checks `canManageTeam` before showing UI
- Backend: Validates user role before adding member (to be implemented)

### User Flow

#### For Roster Owner/Admin:
1. Navigate to private roster details
2. Scroll to Players section
3. See "Add Players" section with search
4. Type user's name or email (min 2 characters)
5. See matching results (excluding current members)
6. Tap user to add them
7. User is added immediately
8. Success message confirms addition
9. User receives notification

#### For Added User:
1. Receives notification: "You've been added to [Roster Name]"
2. Roster appears in their roster list
3. Can immediately participate in roster activities
4. No acceptance required (direct add by authorized role)

### Differences from Join Request Flow

**Direct Add (Private Rosters)**:
- Initiated by roster owner/admin
- User added immediately without confirmation
- User receives notification after addition
- Only for private rosters
- Requires owner/admin permission

**Join Request (Public Rosters)**:
- Initiated by user
- May require approval (depending on settings)
- User requests to join
- For public rosters
- Open to all users

## Backend Requirements

### API Endpoints

#### User Search
```
GET /api/users/search?query={searchQuery}
```
**Query Parameters**:
- `query`: Search string (min 2 characters)

**Response**:
```json
[
  {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profileImage": "https://..."
  }
]
```

**Implementation Notes**:
- Search should be case-insensitive
- Match against firstName, lastName, and email
- Limit results to 20 users
- Exclude deactivated accounts
- Consider privacy settings

#### Add Member Directly
```
POST /api/teams/:teamId/add-member
```
**Request Body**:
```json
{
  "userId": "user-id-to-add"
}
```

**Response**:
```json
{
  "id": "member-id",
  "userId": "user-id",
  "teamId": "team-id",
  "role": "member",
  "status": "active",
  "joinedAt": "2026-03-13T10:00:00Z",
  "user": {
    "id": "user-id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "profileImage": "https://..."
  }
}
```

**Validation**:
- Verify requesting user is roster owner or admin
- Verify roster is private
- Verify user exists and is active
- Verify user is not already a member
- Verify roster has available slots
- Return appropriate error codes

**Error Responses**:
- 401: Unauthorized (not owner/admin)
- 403: Forbidden (roster is public, use join request flow)
- 404: User or roster not found
- 409: User already a member
- 422: Roster is full

### Notification Service

When a user is added directly:
```typescript
{
  type: 'roster_member_added',
  userId: 'added-user-id',
  data: {
    rosterId: 'roster-id',
    rosterName: 'Roster Name',
    addedBy: {
      id: 'admin-user-id',
      name: 'Admin Name'
    }
  },
  message: 'You have been added to [Roster Name] by [Admin Name]'
}
```

## Security Considerations

### Authorization
- Only roster owners and admins can add members directly
- Backend must verify user role on every request
- Frontend checks are for UX only, not security

### Privacy
- User search should respect privacy settings
- Consider limiting search to users who have opted in
- Don't expose sensitive user information in search results

### Rate Limiting
- Implement rate limiting on search endpoint
- Prevent abuse of member addition
- Consider daily limits per roster

## Testing Checklist

### Frontend
- [ ] Search triggers after 2 characters
- [ ] Search debounces correctly (300ms)
- [ ] Results exclude current members
- [ ] Add button shows loading state
- [ ] Success message appears after add
- [ ] User removed from results after add
- [ ] Empty state shows for no results
- [ ] Component only visible for private rosters
- [ ] Component only visible for owners/admins
- [ ] Component hidden when roster is full

### Backend
- [ ] Search returns correct users
- [ ] Search is case-insensitive
- [ ] Add member validates permissions
- [ ] Add member checks roster capacity
- [ ] Add member prevents duplicates
- [ ] Notification sent to added user
- [ ] Error handling for all edge cases

### Integration
- [ ] End-to-end flow works smoothly
- [ ] Added user appears in roster immediately
- [ ] Added user receives notification
- [ ] Roster count updates correctly
- [ ] Available slots decrease

## Brand Compliance

All terminology follows Muster brand guidelines:
- ✅ "Roster" (not "Team")
- ✅ "Players" (not "Members")
- ✅ "Step Out" (not "Cancel")
- ✅ "Join Up" (not "Join" or "Register")
- ✅ Brand colors used throughout (colors.grass, colors.court, etc.)
- ✅ No hardcoded colors

## Future Enhancements

### Bulk Add
- Allow adding multiple users at once
- CSV import for large rosters
- Batch notification sending

### Invitation System
- Send invitation before adding
- User can accept/decline
- Invitation expiry

### Role Assignment
- Assign role during add (player, co-captain)
- Bulk role updates
- Role templates

### Advanced Search
- Filter by sport preference
- Filter by skill level
- Filter by location
- Search history

### Analytics
- Track add success rate
- Monitor search patterns
- Roster growth metrics

## Related Files

### Frontend
- `src/components/teams/AddMemberSearch.tsx` - Search component
- `src/screens/teams/TeamDetailsScreen.tsx` - Roster details with add feature
- `src/services/api/UserService.ts` - User search API
- `src/services/api/TeamService.ts` - Add member API

### Backend (To Be Implemented)
- `server/src/routes/users.ts` - User search endpoint
- `server/src/routes/teams.ts` - Add member endpoint
- `server/src/services/NotificationService.ts` - Member added notification
- `server/src/middleware/RosterPermissions.ts` - Permission checks

### Documentation
- `PRIVATE_ROSTER_MEMBER_MANAGEMENT.md` - This file

## Summary

The private roster member management feature enables roster owners and admins to directly add existing users to their private rosters through an intuitive search interface. This streamlines roster building for private groups while maintaining clear distinction from the public join request flow. The implementation follows all Muster brand guidelines and provides a smooth, user-friendly experience.
