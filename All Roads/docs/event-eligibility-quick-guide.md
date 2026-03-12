# Event Eligibility Restrictions - Quick Guide

## For Event Organizers

### How to Add Eligibility Restrictions

1. **Create a new event** as usual
2. Scroll down to find **"Add Eligibility Restrictions"** section
3. **Tap the toggle** to enable restrictions
4. **Configure your restrictions:**

#### Invite Only
- Check this box to make the event private
- Only invited users can join

#### Age Restrictions
- **Min Age**: Set minimum age (e.g., 18 for adults only)
- **Max Age**: Set maximum age (e.g., 35 for youth leagues)
- Leave empty for no age restrictions

#### Skill Level
- Select a **Required Skill Level** to limit to exact skill level
- Examples:
  - "Beginner" - Only beginners
  - "Advanced" - Only advanced players
  - Leave empty - Any skill level

#### Team Restrictions
- Select specific teams that can join
- Only members of selected teams will be eligible
- Useful for league games or team tournaments

### Examples

**Adult Recreational League:**
```
✓ Add Eligibility Restrictions
  ✓ Min Age: 21
  ✓ Max Age: 45
  ✓ Required Skill Level: Intermediate
```

**Youth Tournament:**
```
✓ Add Eligibility Restrictions
  ✓ Min Age: 13
  ✓ Max Age: 17
  ✓ Restrict to Teams: [Select participating teams]
```

**Private Pickup Game:**
```
✓ Add Eligibility Restrictions
  ✓ Invite Only
```

**Advanced Competition:**
```
✓ Add Eligibility Restrictions
  ✓ Required Skill Level: Advanced
  ✓ Min Age: 18
```

## For Participants

### Understanding Eligibility Indicators

When browsing events, you'll see eligibility restrictions displayed with a shield icon (🛡️):

- **"Open to all"** - No restrictions, anyone can join
- **"Ages 18+"** - Minimum age requirement
- **"Ages 21-35"** - Age range requirement
- **"Advanced only"** - Skill level requirement
- **"Restricted to 2 team(s)"** - Team membership required
- **"Invite only"** - Private event

### What Happens When You Try to Join

**If you're eligible:**
- You can join the event normally
- No additional steps required

**If you're not eligible:**
- System will show why you can't join
- Examples:
  - "Minimum age requirement: 18 years"
  - "You must be a member of an allowed team"
  - "Required skill level: Advanced"
  - "This event is invite-only"

### How to Become Eligible

**Age Requirements:**
- Update your date of birth in your profile
- Go to Profile → Edit Profile → Date of Birth

**Team Requirements:**
- Join one of the allowed teams
- Go to Teams → Browse Teams → Join Team

**Skill Level Requirements:**
- Join a team with the required skill level
- Your skill level is determined by your team memberships
- Higher skill level teams increase your eligibility

## Database Migration

Before using this feature, run the database migration:

```bash
cd server
npx prisma migrate dev --name add-event-eligibility
npx prisma generate
npm run seed  # Optional: reseed with updated data
```

## API Usage

### Creating an Event with Eligibility

```typescript
POST /api/events

{
  "title": "Advanced Basketball Tournament",
  "description": "Competitive tournament",
  "sportType": "basketball",
  "facilityId": "facility-id",
  "startTime": "2024-03-15T18:00:00Z",
  "endTime": "2024-03-15T20:00:00Z",
  "maxParticipants": 20,
  "price": 25,
  "skillLevel": "advanced",
  "eventType": "tournament",
  "eligibility": {
    "minAge": 18,
    "maxAge": 35,
    "requiredSkillLevel": "advanced",
    "restrictedToTeams": ["team-id-1", "team-id-2"],
    "isInviteOnly": false
  }
}
```

### Checking Eligibility

```typescript
import { EventEligibilityService } from './services/events/EventEligibilityService';

const result = EventEligibilityService.checkEligibility(
  event,
  user,
  userTeams
);

if (result.eligible) {
  // User can join
  joinEvent();
} else {
  // Show reasons
  alert(`Cannot join: ${result.reasons.join(', ')}`);
}
```

### Getting Eligibility Summary

```typescript
const summary = EventEligibilityService.getEligibilitySummary(
  event.eligibility
);

// Returns: ["Ages 18-35", "Advanced only", "Restricted to 2 team(s)"]
```

## Tips & Best Practices

### For Organizers

1. **Be Clear**: Use eligibility restrictions that match your event description
2. **Not Too Restrictive**: Avoid combining too many restrictions
3. **Test First**: Create a test event to verify restrictions work as expected
4. **Communicate**: Mention restrictions in event description too
5. **Update Profile**: Ensure your own profile meets requirements

### For Participants

1. **Complete Profile**: Fill in date of birth for age-restricted events
2. **Join Teams**: Join teams to access team-restricted events
3. **Check Requirements**: Read eligibility before attempting to join
4. **Contact Organizer**: If you think you should be eligible but aren't

## Troubleshooting

**"Age verification required"**
- Go to Profile → Edit Profile
- Add your date of birth
- Save changes

**"You must be a member of an allowed team"**
- Check which teams are allowed
- Join one of those teams
- Try joining the event again

**"Required skill level: Advanced"**
- Join a team with Advanced skill level
- Your skill level is based on your teams
- Contact team captain to join

**Event not showing restrictions**
- Refresh the event list
- Check if restrictions were saved
- Verify database migration ran successfully

## Support

For issues or questions:
1. Check this guide first
2. Review the full documentation: `docs/event-eligibility-feature-summary.md`
3. Contact support or file an issue
