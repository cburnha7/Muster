# Event Eligibility Restrictions Feature

## Overview
Added comprehensive eligibility restrictions for events, allowing organizers to limit participation based on team membership, league affiliation, age, and skill level.

## Features Implemented

### 1. Eligibility Criteria
Event organizers can now restrict events based on:
- **Team Restrictions**: Limit to specific teams only
- **League Restrictions**: Limit to teams in specific leagues
- **Age Restrictions**: Set minimum and/or maximum age requirements
- **Skill Level**: Require exact skill level or set min/max skill levels
- **Invite Only**: Make events private and invitation-only

### 2. Database Changes

#### Event Model Updates
Added eligibility fields to the Event model:
```prisma
eligibilityRestrictedToTeams String[] @default([])
eligibilityRestrictedToLeagues String[] @default([])
eligibilityMinAge Int?
eligibilityMaxAge Int?
eligibilityRequiredSkillLevel String?
eligibilityMinSkillLevel String?
eligibilityMaxSkillLevel String?
eligibilityIsInviteOnly Boolean @default(false)
```

#### New League Model
```prisma
model League {
  id          String   @id @default(uuid())
  name        String
  description String?
  sportType   String
  skillLevel  String
  season      String?
  startDate   DateTime?
  endDate     DateTime?
  isActive    Boolean  @default(true)
  imageUrl    String?
  organizerId String
  organizer   User     @relation("LeagueOrganizer", fields: [organizerId], references: [id])
  teams       Team[]
}
```

#### Team Model Updates
Added league association:
```prisma
leagueId    String?
league      League?  @relation(fields: [leagueId], references: [id])
```

### 3. TypeScript Types

#### EventEligibility Interface
```typescript
export interface EventEligibility {
  restrictedToTeams?: string[];
  restrictedToLeagues?: string[];
  minAge?: number;
  maxAge?: number;
  requiredSkillLevel?: SkillLevel;
  minSkillLevel?: SkillLevel;
  maxSkillLevel?: SkillLevel;
  isInviteOnly?: boolean;
}
```

#### League Interface
```typescript
export interface League {
  id: string;
  name: string;
  description?: string;
  sportType: SportType;
  skillLevel: SkillLevel;
  organizerId: string;
  organizer?: User;
  teams: Team[];
  isActive: boolean;
  season?: string;
  startDate?: Date;
  endDate?: Date;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. Services

#### EventEligibilityService
New service for validating user eligibility:

**Methods:**
- `checkEligibility(event, user, userTeams)`: Validates if a user meets all eligibility requirements
- `getEligibilitySummary(eligibility)`: Returns human-readable summary of restrictions
- `calculateAge(dateOfBirth)`: Helper to calculate user age
- `getUserSkillLevel(user, userTeams)`: Determines user's skill level from teams

**Returns:**
```typescript
interface EligibilityCheckResult {
  eligible: boolean;
  reasons: string[]; // Array of reasons if not eligible
}
```

### 5. UI Components

#### CreateEventScreen Updates
Added eligibility restrictions section with:
- Toggle to enable/disable restrictions
- Invite-only checkbox
- Age range inputs (min/max)
- Required skill level selector
- Team restriction multi-select
- League restriction support (ready for future implementation)

#### EventCard Updates
- Displays eligibility summary with shield icon
- Shows restrictions like "Ages 18-35", "Advanced only", "Restricted to 2 team(s)"
- Orange color to indicate restrictions

### 6. User Experience

#### For Event Organizers:
1. Create event as usual
2. Optionally enable "Add Eligibility Restrictions"
3. Configure desired restrictions:
   - Check "Invite Only" for private events
   - Set age range (e.g., 18-35)
   - Select required skill level
   - Choose specific teams that can join
4. Restrictions are saved with the event

#### For Participants:
1. Browse events and see eligibility indicators
2. When attempting to join, system validates eligibility
3. Clear feedback if not eligible with specific reasons
4. Examples:
   - "Minimum age requirement: 18 years"
   - "You must be a member of an allowed team"
   - "Required skill level: Advanced"

### 7. Validation Logic

**Age Validation:**
- Calculates age from user's date of birth
- Checks against min/max age requirements
- Prompts for profile update if DOB missing

**Team Validation:**
- Checks if user is member of any allowed teams
- Works with team-based and individual events

**League Validation:**
- Checks if user's teams belong to allowed leagues
- Supports multi-league restrictions

**Skill Level Validation:**
- Can require exact skill level match
- Or set minimum/maximum skill levels
- Uses skill hierarchy: Beginner < Intermediate < Advanced
- Derives user skill from their team memberships

### 8. Database Migration Required

Run these commands to apply the schema changes:

```bash
cd server
npx prisma migrate dev --name add-event-eligibility
npx prisma generate
```

This will:
1. Add eligibility fields to Event table
2. Create League table
3. Add leagueId to Team table
4. Add organizedLeagues relation to User table

### 9. Future Enhancements

**Potential additions:**
- League management UI (create/edit leagues)
- Bulk team invitations
- Waitlist for restricted events
- Eligibility verification badges
- Custom eligibility rules (e.g., gender, location)
- Eligibility history tracking
- Auto-approve based on criteria

### 10. Testing Recommendations

**Test Cases:**
1. Create event with no restrictions (open to all)
2. Create invite-only event
3. Create age-restricted event (18+, 21-35, etc.)
4. Create skill-level restricted event
5. Create team-restricted event
6. Combine multiple restrictions
7. Verify eligibility checks work correctly
8. Test with users who meet/don't meet criteria
9. Verify error messages are clear
10. Test edge cases (missing DOB, no teams, etc.)

## Files Modified

### Frontend
- `src/types/index.ts` - Added EventEligibility, League types
- `src/services/events/EventEligibilityService.ts` - New service (created)
- `src/screens/events/CreateEventScreen.tsx` - Added eligibility UI
- `src/components/ui/EventCard.tsx` - Added eligibility display

### Backend
- `server/prisma/schema.prisma` - Added eligibility fields, League model

## Usage Example

```typescript
// Create event with eligibility restrictions
const eventData: CreateEventData = {
  title: "Advanced Basketball Tournament",
  description: "Competitive tournament for experienced players",
  sportType: SportType.BASKETBALL,
  // ... other fields ...
  eligibility: {
    minAge: 18,
    maxAge: 35,
    requiredSkillLevel: SkillLevel.ADVANCED,
    restrictedToTeams: ["team-id-1", "team-id-2"],
    isInviteOnly: false,
  },
};

// Check if user can join
const result = EventEligibilityService.checkEligibility(
  event,
  user,
  userTeams
);

if (!result.eligible) {
  console.log("Cannot join:", result.reasons);
  // ["Minimum age requirement: 18 years", "Required skill level: Advanced"]
}
```

## Benefits

1. **Better Event Organization**: Organizers can create targeted events
2. **Fair Competition**: Skill-matched participants
3. **Age-Appropriate**: Safe and suitable age groups
4. **Team Cohesion**: League and team-specific events
5. **Privacy**: Invite-only events for private groups
6. **Clear Communication**: Users know requirements upfront
7. **Reduced No-Shows**: Participants are qualified and committed

## Notes

- All eligibility restrictions are optional
- Events without restrictions remain open to all
- Multiple restrictions can be combined (AND logic)
- Eligibility is checked at join time, not display time
- Organizers can update restrictions after creation
- System provides clear feedback for ineligible users
