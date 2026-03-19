# Edit Facility Screen Redesign

## Goal
Make the EditFacilityScreen match the CreateFacilityScreen layout with all the same sections, but prepopulated with existing facility data.

## Key Changes Needed

### 1. Component Structure
- Add `route.params.facilityId` prop
- Add loading state for initial data fetch
- Load facility data and courts on mount
- Prepopulate all form fields with existing data

### 2. Data Loading (useEffect)
```typescript
useEffect(() => {
  loadFacilityData();
}, [facilityId]);

const loadFacilityData = async () => {
  try {
    setIsLoading(true);
    const facility = await facilityService.getFacility(facilityId);
    const facilityCourts = await courtService.getCourts(facilityId);
    
    // Prepopulate form data
    setFormData({
      name: facility.name,
      description: facility.description,
      address: {
        street: facility.street,
        city: facility.city,
        state: facility.state,
        zipCode: facility.zipCode,
        country: 'USA',
      },
      contactInfo: {
        phone: facility.contactPhone || '',
        email: facility.contactEmail || '',
        website: facility.contactWebsite || '',
      },
      sportTypes: facility.sportTypes,
      amenities: facility.amenities || [],
      pricing: {
        wholeFacilityRate: facility.pricePerHour || 0,
        currency: 'USD',
      },
    });
    
    // Prepopulate courts
    setCourts(facilityCourts.map(court => ({
      id: court.id,
      name: court.name,
      sportType: court.sportType,
      capacity: court.capacity,
      isIndoor: court.isIndoor,
      pricePerHour: court.pricePerHour || 0,
    })));
    
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### 3. Update Function (replace createFacility)
```typescript
const updateFacility = async () => {
  const facilityData = {
    name: formData.name,
    description: formData.description,
    sportTypes: formData.sportTypes,
    // ... all other fields
  };
  
  const updated = await facilityService.updateFacility(facilityId, facilityData);
  
  // Handle courts - compare existing vs new
  // Delete removed courts
  // Update existing courts
  // Create new courts
  
  dispatch(updateFacility(updated));
  navigation.goBack();
};
```

### 4. Delete Function
```typescript
const handleDelete = () => {
  Alert.alert(
    'Delete Ground',
    'Are you sure? This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await facilityService.deleteFacility(facilityId);
          dispatch(removeFacility(facilityId));
          navigation.navigate('Facilities', { screen: 'FacilitiesList' });
        },
      },
    ]
  );
};
```

### 5. UI Changes
- Change "Create Ground" button to "Update Ground"
- Add "Delete Ground" button (red, destructive style)
- Add loading spinner while fetching data
- Add error display if loading fails

### 6. Courts Management
- Load existing courts from API
- Track which courts are new vs existing
- On save:
  - Create new courts (those without real IDs)
  - Update existing courts (those with real IDs)
  - Delete courts that were removed (compare before/after)

## Implementation Approach

Since the file is large (600+ lines), the best approach is:

1. Copy CreateFacilityScreen.tsx to EditFacilityScreen.tsx
2. Add the route params interface
3. Add loading state and useEffect
4. Replace createFacility with updateFacility
5. Add delete functionality
6. Update button text and add delete button
7. Handle courts CRUD operations properly

## Alternative: Shared Component

Consider creating a shared `FacilityForm` component that both Create and Edit screens use:
- FacilityForm handles all the form UI
- CreateFacilityScreen passes empty initial data
- EditFacilityScreen loads and passes existing data
- Both handle their own submit logic

This would reduce code duplication and make maintenance easier.
