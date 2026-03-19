# Edit Court Functionality

## Summary
Added the ability to edit existing courts by clicking on them, which opens the same modal used for adding courts but prepopulated with the court's data.

## Changes Made

### 1. State Management
Added `editingCourtId` state to track which court is being edited:
```typescript
const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
```

### 2. Edit Court Handler
Created `handleEditCourt` function that:
- Populates the modal form with the selected court's data
- Sets the `editingCourtId` to track which court is being edited
- Opens the modal

```typescript
const handleEditCourt = (court: CourtFormData) => {
  setNewCourt({
    id: court.id,
    name: court.name,
    sportType: court.sportType,
    capacity: court.capacity,
    isIndoor: court.isIndoor,
    pricePerHour: court.pricePerHour,
  });
  setEditingCourtId(court.id);
  setShowAddCourtModal(true);
};
```

### 3. Updated Add/Update Logic
Modified `handleAddCourt` to handle both adding and updating:
- If `editingCourtId` exists: Update the existing court in the array
- If `editingCourtId` is null: Add a new court to the array

### 4. UI Changes

#### Court Cards
- Changed from `<View>` to `<TouchableOpacity>`
- Clicking a court card opens the edit modal
- Added edit icon next to the delete icon
- Delete button uses `stopPropagation()` to prevent triggering edit

```typescript
<TouchableOpacity
  style={styles.courtCard}
  onPress={() => handleEditCourt(court)}
  activeOpacity={0.7}
>
  <View style={styles.courtInfo}>
    {/* Court details */}
  </View>
  <View style={styles.courtActions}>
    <Ionicons name="create-outline" size={20} color={colors.grass} />
    <TouchableOpacity onPress={(e) => {
      e.stopPropagation();
      handleRemoveCourt(court.id);
    }}>
      <Ionicons name="trash-outline" size={20} color={colors.track} />
    </TouchableOpacity>
  </View>
</TouchableOpacity>
```

#### Modal
- Title changes based on mode: "Add Court/Field" or "Edit Court/Field"
- Button text changes: "Add Court" or "Update Court"
- Cancel/close resets the form and clears `editingCourtId`

### 5. Modal Reset Logic
Added proper cleanup when closing the modal:
```typescript
const resetModal = () => {
  setShowAddCourtModal(false);
  setEditingCourtId(null);
  setNewCourt({
    id: '',
    name: '',
    sportType: '',
    capacity: 10,
    isIndoor: false,
    pricePerHour: 0,
  });
};
```

Applied to:
- Close button (X)
- Cancel button
- `onRequestClose` (Android back button)

## User Experience

### Adding a Court
1. Click "Add Court" button
2. Fill in court details
3. Click "Add Court" button in modal
4. Court appears in the list

### Editing a Court
1. Click on any court card in the list
2. Modal opens with court's data prepopulated
3. Modify any fields
4. Click "Update Court" button
5. Court is updated in the list

### Visual Feedback
- Court cards show edit icon (pencil) to indicate they're clickable
- Delete icon remains for quick removal
- Modal title and button text change based on mode
- Clicking outside the court actions area triggers edit
- Clicking delete icon only triggers delete (doesn't open edit)

## Technical Details

### Court Tracking
- New courts: `id` starts with "new-", `isExisting: false`
- Existing courts: Real UUID `id`, `isExisting: true`
- Edited courts: Keep their original `id` and `isExisting` flag

### Save Behavior
When saving the facility:
1. Compare current courts vs original courts
2. Delete removed courts (API call)
3. For each current court:
   - If `isExisting: true` → UPDATE court (API call)
   - If `isExisting: false` → CREATE court (API call)

### Styling
Added `courtActions` style for the icon container:
```typescript
courtActions: {
  flexDirection: 'row',
  alignItems: 'center',
},
```

## Files Modified
- `src/screens/facilities/EditFacilityScreen.tsx`

## Testing Checklist
- [ ] Click "Add Court" opens empty modal
- [ ] Click court card opens modal with prepopulated data
- [ ] Modal title shows "Add Court/Field" when adding
- [ ] Modal title shows "Edit Court/Field" when editing
- [ ] Button shows "Add Court" when adding
- [ ] Button shows "Update Court" when editing
- [ ] Editing a court updates it in the list
- [ ] Adding a court adds it to the list
- [ ] Delete icon deletes without opening edit modal
- [ ] Cancel button resets the form
- [ ] Close (X) button resets the form
- [ ] Android back button resets the form
- [ ] Edited courts save correctly to backend
- [ ] New courts save correctly to backend
