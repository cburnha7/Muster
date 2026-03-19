# Task 19.4: Team Deletion Protection Implementation

## Overview
Implemented protection to prevent deletion of teams that are currently participating in active leagues, as specified in Requirement 10.4 of the League Management System.

## Implementation Details

### Backend Changes

#### File: `server/src/routes/teams.ts`

Added a new DELETE endpoint for `/api/teams/:id` with the following logic:

1. **Team Existence Check**: Verifies the team exists before attempting deletion
2. **Active League Membership Check**: Queries the database for any active league memberships
3. **Validation**: Returns 400 Bad Request if team has active league memberships
4. **Deletion**: Only proceeds with deletion if no active memberships exist

**Key Features:**
- Returns detailed error message explaining why deletion is blocked
- Includes league information (id, name, sportType) in error response for user clarity
- Uses Prisma's cascade delete to handle related records when deletion is allowed
- Returns 204 No Content on successful deletion
- Returns 404 Not Found if team doesn't exist

**Code Implementation:**
```typescript
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check for active league memberships
    const activeMembership = await prisma.leagueMembership.findFirst({
      where: {
        teamId: id,
        status: 'active',
      },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            sportType: true,
          },
        },
      },
    });

    if (activeMembership) {
      return res.status(400).json({
        error: 'Cannot delete team that is currently participating in active leagues',
        league: {
          id: activeMembership.league.id,
          name: activeMembership.league.name,
          sportType: activeMembership.league.sportType,
        },
      });
    }

    // Delete the team (cascade will handle related records)
    await prisma.team.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});
```

### Frontend Changes

**No changes required** - The frontend `TeamService` already has a `deleteTeam(id: string)` method that calls the DELETE endpoint. The BaseApiService will properly handle the error responses from the backend.

**File: `src/services/api/TeamService.ts`**
```typescript
async deleteTeam(id: string): Promise<void> {
  return this.delete<void>(API_ENDPOINTS.TEAMS.BY_ID(id));
}
```

## Error Handling

### Success Cases
- **204 No Content**: Team successfully deleted (no active league memberships)

### Error Cases
- **400 Bad Request**: Team has active league memberships
  - Response includes error message and league details
  - Example response:
    ```json
    {
      "error": "Cannot delete team that is currently participating in active leagues",
      "league": {
        "id": "league-uuid",
        "name": "Summer Basketball League",
        "sportType": "Basketball"
      }
    }
    ```
- **404 Not Found**: Team doesn't exist
- **500 Internal Server Error**: Database or server error

## Database Query

The implementation uses the following Prisma query to check for active memberships:

```typescript
await prisma.leagueMembership.findFirst({
  where: {
    teamId: id,
    status: 'active',
  },
  include: {
    league: {
      select: {
        id: true,
        name: true,
        sportType: true,
      },
    },
  },
});
```

This query:
- Finds the first active league membership for the team
- Includes league details for error messaging
- Returns `null` if no active memberships exist

## Testing Recommendations

### Manual Testing Steps

1. **Test successful deletion** (team with no active leagues):
   ```bash
   DELETE /api/teams/{teamId}
   # Expected: 204 No Content
   ```

2. **Test blocked deletion** (team with active league):
   ```bash
   # First, create a league and add the team
   POST /api/leagues
   POST /api/leagues/{leagueId}/join
   
   # Then try to delete the team
   DELETE /api/teams/{teamId}
   # Expected: 400 Bad Request with league details
   ```

3. **Test non-existent team**:
   ```bash
   DELETE /api/teams/invalid-id
   # Expected: 404 Not Found
   ```

### Automated Testing (Future)

Property tests should be added for:
- **Property 28: Active Member Deletion Prevention** (from design.md)
- Validates Requirement 10.4

## Requirements Satisfied

✅ **Requirement 10.4**: "THE League_System SHALL prevent deletion of Team records that are active League_Members"

## Success Criteria

✅ Teams with active league memberships cannot be deleted
✅ Teams without active league memberships can be deleted normally
✅ Clear error messages are returned when deletion is prevented
✅ League information is included in error response for user clarity

## Notes

- The implementation only checks for `status: 'active'` memberships
- Teams with `pending` or `withdrawn` memberships can still be deleted
- The cascade delete in Prisma schema handles cleanup of related records when deletion is allowed
- Frontend error handling is managed by BaseApiService, no additional changes needed
