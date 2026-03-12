# Edit Facility Screen - Complete Redesign

## Summary
Completely redesigned the EditFacilityScreen to match the CreateFacilityScreen layout with all sections prepopulated with existing facility data.

## Changes Made

### 1. Complete Screen Redesign
- Copied structure from CreateFacilityScreen
- Added facility loading on mount
- Prepopulates all form fields with existing data
- Includes courts management with add/edit/delete

### 2. Data Loading
- Loads facility data on mount using `facilityId` from route params
- Loads existing courts for the facility
- Tracks which courts are existing vs newly added
- Shows loading spinner while fetching data
- Shows error display if loading fails

### 3. Form Sections (Same as Create)
- Basic Information (name, description)
- Address (street, city, state, zip)
- Contact Information (phone, email, website)
- Sport Types (multi-select chips)
- Courts/Fields (add, remove, list)
- Ground Pricing (whole facility rate)

### 4. Courts Management
- Displays existing courts
- Add new courts via modal
- Remove courts (with confirmation)
- Tracks `isExisting` flag to differentiate new vs existing
- On save:
  - Deletes removed courts
  - Updates existing courts
  - Creates new courts

### 5. Update Functionality
- Updates facility data
- Handles court CRUD operations:
  - DELETE: Courts removed from list
  - UPDATE: Existing courts with changes
  - CREATE: New courts added
- Updates Redux state
- Shows success message and navigates back

### 6. Delete Functionality
- Red "Delete Ground" button at bottom
- Confirmation alert before deletion
- Deletes facility and all related data
- Removes from Redux state
- Navigates to Facilities list

## User Experience

### Navigation Flow
```
Profile "My Grounds" → EditFacility (prepopulated)
Grounds List (owner) → EditFacility (prepopulated)
```

### Form Behavior
- All fields prepopulated with existing data
- Courts list shows existing courts
- Can add/remove courts
- Can update all facility information
- Save updates everything
- Delete removes everything

### Visual Match
- Identical layout to CreateFacilityScreen
- Same sections in same order
- Same styling and components
- Only differences:
  - "Update Ground" instead of "Create Ground"
  - "Delete Ground" button added
  - Data is prepopulated

## Files Modified
- `src/screens/facilities/EditFacilityScreen.tsx` - Complete rewrite

## Technical Details

### State Management
```typescript
- isLoading: Loading facility data
- isSubmitting: Saving changes
- error: Loading error message
- formData: All facility fields
- courts: Array of courts (existing + new)
- originalCourts: Track original court IDs for deletion
- showAddCourtModal: Modal visibility
```

### Court Tracking
```typescript
interface CourtFormData {
  id: string;
  name: string;
  sportType: string;
  capacity: number;
  isIndoor: boolean;
  pricePerHour: number;
  isExisting?: boolean; // true = existing, false/undefined = new
}
```

### Update Logic
1. Update facility data
2. Compare current courts vs original courts
3. Delete removed courts (in originalCourts but not in courts)
4. Loop through current courts:
   - If `isExisting`: UPDATE court
   - If not `isExisting`: CREATE court
5. Update Redux state
6. Navigate back

## Testing Checklist
- [ ] Edit screen loads with prepopulated data
- [ ] All form fields show existing values
- [ ] Existing courts are displayed
- [ ] Can add new courts
- [ ] Can remove existing courts
- [ ] Can remove new courts (before saving)
- [ ] Update button saves all changes
- [ ] Courts are created/updated/deleted correctly
- [ ] Delete button shows confirmation
- [ ] Delete removes facility and navigates away
- [ ] Loading spinner shows while fetching
- [ ] Error display shows if loading fails
- [ ] Form validation works
- [ ] Navigation works from Profile and Grounds list
