# Navigation Improvements

## Changes Made

### 1. Facilities Tab Always Returns to List Screen

**File**: `src/navigation/TabNavigator.tsx`

Added a `tabPress` listener to the Facilities tab that resets the navigation stack to the FacilitiesList screen whenever the tab is clicked.

```typescript
listeners={({ navigation }) => ({
  tabPress: (e) => {
    // Reset the Facilities stack to the list screen when tab is pressed
    navigation.navigate('Facilities', { screen: 'FacilitiesList' });
  },
})}
```

**Behavior**: 
- Clicking the Grounds tab always brings you back to the list screen
- No longer remembers the last viewed ground

### 2. Owner Navigation to Edit Screen

**Files Modified**:
- `src/screens/profile/ProfileScreen.tsx`
- `src/screens/facilities/FacilitiesListScreen.tsx`

Both screens now check if the current user is the owner of the facility before navigating:

```typescript
const handleFacilityPress = (facility: Facility) => {
  // If user is the owner, navigate to EditFacility screen
  if (currentUser && facility.ownerId === currentUser.id) {
    navigation.navigate('EditFacility', { facilityId: facility.id });
  } else {
    // Otherwise, navigate to FacilityDetails screen
    navigation.navigate('FacilityDetails', { facilityId: facility.id });
  }
};
```

**Behavior**:
- Clicking on your own ground from "My Grounds" → Opens EditFacility screen
- Clicking on your own ground from Grounds list → Opens EditFacility screen
- Clicking on someone else's ground → Opens FacilityDetails screen (read-only)

## User Experience

### Before
- Grounds tab remembered last viewed ground
- Clicking "My Grounds" opened FacilityDetails (read-only view)
- Had to click Edit button to modify your own ground

### After
- Grounds tab always shows the list
- Clicking "My Grounds" directly opens EditFacility screen
- Owners get immediate access to edit their grounds
- Non-owners still see the read-only details view

## Testing Checklist

- [ ] Click Grounds tab multiple times - always returns to list
- [ ] Click your own ground from Profile → Opens EditFacility
- [ ] Click your own ground from Grounds list → Opens EditFacility
- [ ] Click someone else's ground → Opens FacilityDetails
- [ ] Edit button still works in FacilityDetails for owners
- [ ] Delete button works in EditFacility screen
