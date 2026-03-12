# Task 19.4 Verification Guide

## Quick Verification Steps

This guide helps verify that the team deletion protection is working correctly.

## Prerequisites

1. Backend server is running (`cd server && npm run dev`)
2. Database is set up with league management tables
3. You have a REST client (Postman, curl, or similar)

## Verification Scenarios

### Scenario 1: Delete Team Without Active League Memberships ✅

**Setup:**
```bash
# Create a test team
POST http://localhost:3000/api/teams
Content-Type: application/json

{
  "name": "Test Team Alpha",
  "sportType": "Basketball",
  "description": "A test team"
}

# Note the returned team ID
```

**Test:**
```bash
# Delete the team
DELETE http://localhost:3000/api/teams/{teamId}
```

**Expected Result:**
- Status: `204 No Content`
- Team is successfully deleted
- No error message

---

### Scenario 2: Delete Team With Active League Membership ❌

**Setup:**
```bash
# 1. Create a test team
POST http://localhost:3000/api/teams
Content-Type: application/json

{
  "name": "Test Team Beta",
  "sportType": "Soccer",
  "description": "A test team in a league"
}
# Note the team ID

# 2. Create a league
POST http://localhost:3000/api/leagues
Content-Type: application/json

{
  "name": "Summer Soccer League",
  "sportType": "Soccer",
  "skillLevel": "Intermediate",
  "startDate": "2024-06-01",
  "endDate": "2024-08-31"
}
# Note the league ID

# 3. Join the league with the team
POST http://localhost:3000/api/leagues/{leagueId}/join
Content-Type: application/json

{
  "teamId": "{teamId}"
}
```

**Test:**
```bash
# Try to delete the team
DELETE http://localhost:3000/api/teams/{teamId}
```

**Expected Result:**
- Status: `400 Bad Request`
- Response body:
  ```json
  {
    "error": "Cannot delete team that is currently participating in active leagues",
    "league": {
      "id": "league-uuid",
      "name": "Summer Soccer League",
      "sportType": "Soccer"
    }
  }
  ```

---

### Scenario 3: Delete Team After Leaving League ✅

**Setup:**
```bash
# Using the team from Scenario 2, leave the league
POST http://localhost:3000/api/leagues/{leagueId}/leave
Content-Type: application/json

{
  "teamId": "{teamId}"
}
```

**Test:**
```bash
# Now try to delete the team
DELETE http://localhost:3000/api/teams/{teamId}
```

**Expected Result:**
- Status: `204 No Content`
- Team is successfully deleted
- The membership status is no longer 'active'

---

### Scenario 4: Delete Non-Existent Team ❌

**Test:**
```bash
# Try to delete a team that doesn't exist
DELETE http://localhost:3000/api/teams/invalid-uuid-12345
```

**Expected Result:**
- Status: `404 Not Found`
- Response body:
  ```json
  {
    "error": "Team not found"
  }
  ```

---

## Using curl Commands

If you prefer command-line testing:

```bash
# Scenario 1: Create and delete team
TEAM_ID=$(curl -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Team","sportType":"Basketball"}' \
  | jq -r '.id')

curl -X DELETE http://localhost:3000/api/teams/$TEAM_ID -v
# Should return 204

# Scenario 2: Create team, join league, try to delete
TEAM_ID=$(curl -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -d '{"name":"League Team","sportType":"Soccer"}' \
  | jq -r '.id')

LEAGUE_ID=$(curl -X POST http://localhost:3000/api/leagues \
  -H "Content-Type: application/json" \
  -d '{"name":"Test League","sportType":"Soccer","skillLevel":"Intermediate"}' \
  | jq -r '.id')

curl -X POST http://localhost:3000/api/leagues/$LEAGUE_ID/join \
  -H "Content-Type: application/json" \
  -d "{\"teamId\":\"$TEAM_ID\"}"

curl -X DELETE http://localhost:3000/api/teams/$TEAM_ID -v
# Should return 400 with error message
```

## Frontend Testing

To test from the frontend:

```typescript
import { teamService } from './services/api/TeamService';

// Test deletion
try {
  await teamService.deleteTeam(teamId);
  console.log('Team deleted successfully');
} catch (error) {
  // Error will be caught by BaseApiService
  // Check error.response.status and error.response.data
  if (error.response?.status === 400) {
    console.log('Cannot delete team:', error.response.data.error);
    console.log('League:', error.response.data.league);
  }
}
```

## Database Verification

You can also verify directly in the database:

```sql
-- Check team's league memberships
SELECT 
  lm.id,
  lm.status,
  l.name as league_name,
  t.name as team_name
FROM league_memberships lm
JOIN leagues l ON lm.league_id = l.id
JOIN teams t ON lm.team_id = t.id
WHERE t.id = 'your-team-id';

-- If status is 'active', deletion should be blocked
-- If no rows or status is 'withdrawn'/'pending', deletion should succeed
```

## Success Indicators

✅ **Implementation is correct if:**
1. Teams without active league memberships can be deleted (204 response)
2. Teams with active league memberships cannot be deleted (400 response)
3. Error message clearly explains why deletion is blocked
4. League information is included in the error response
5. Non-existent teams return 404
6. Teams with 'pending' or 'withdrawn' memberships can be deleted

## Troubleshooting

**Issue: All deletions return 500 error**
- Check that the database migration has been run
- Verify the `league_memberships` table exists
- Check server logs for detailed error messages

**Issue: Teams with active memberships can be deleted**
- Verify the membership status is exactly 'active' (case-sensitive)
- Check that the team is actually in the league (query the database)
- Ensure the backend code is running the latest version

**Issue: Frontend doesn't show error message**
- Check that BaseApiService is properly handling 400 errors
- Verify the error response structure matches expectations
- Check browser console for error details
