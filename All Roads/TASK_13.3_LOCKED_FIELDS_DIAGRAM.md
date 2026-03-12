# Task 13.3: Locked Fields Visual Diagram

## Screen Layout When Creating Event from Rental

```
┌─────────────────────────────────────────────────────────┐
│  ← Create Event                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 📅 Creating Event from Rental                     │ │
│  │ Court 1 at Test Facility                          │ │
│  │ Location and time are locked to match your rental │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Event Title *                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Basketball at Test Facility                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Description *                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Event at Court 1                                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Event Type *                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Select event type                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Sport Type *                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Basketball                                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Facility * 🔒                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Test Facility                          🔒       │   │ ← LOCKED
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Start Date * 🔒                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 12/25/2024                             🔒       │   │ ← LOCKED
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Start Time *          Duration *                       │
│  ┌──────────────────┐ ┌──────────────────┐             │
│  │ 14:00     🔒     │ │ 2 hours   🔒     │             │ ← LOCKED
│  └──────────────────┘ └──────────────────┘             │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ℹ️  Location, date, and time are locked to match │ │
│  │    your rental slot and cannot be changed.       │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Max Participants *    Price (USD)                      │
│  ┌──────────────────┐ ┌──────────────────┐             │
│  │ 10               │ │ 0.00             │             │
│  └──────────────────┘ └──────────────────┘             │
│                                                         │
│  Skill Level *                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ All Levels                                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [... rest of form ...]                                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [ Cancel ]                    [ Create Event ]         │
└─────────────────────────────────────────────────────────┘
```

## Locked Field Indicators

### 1. Rental Banner (Top)
```
┌───────────────────────────────────────────────────┐
│ 📅 Creating Event from Rental                     │
│ Court 1 at Test Facility                          │
│ Location and time are locked to match your rental │
└───────────────────────────────────────────────────┘
```
- **Color**: Light green background with green left border
- **Icon**: Calendar icon
- **Purpose**: Inform user they're creating from a rental

### 2. Lock Icons on Fields
```
Facility * 🔒
┌─────────────────────────────────────────────────┐
│ Test Facility                          🔒       │
└─────────────────────────────────────────────────┘
```
- **Position**: Top-right corner of field
- **Icon**: `lock-closed` from Ionicons
- **Color**: Soft gray (#6B7C76)
- **Background**: Semi-transparent white overlay

### 3. Info Box (Below Time Fields)
```
┌───────────────────────────────────────────────────┐
│ ℹ️  Location, date, and time are locked to match │
│    your rental slot and cannot be changed.       │
└───────────────────────────────────────────────────┘
```
- **Color**: Light blue background with blue left border
- **Icon**: Information circle icon
- **Purpose**: Explain why fields are locked

## Visual States

### Locked Field Styling
- **Background**: `#F3F4F6` (light gray)
- **Opacity**: `0.7`
- **Text Color**: `colors.soft` (#6B7C76)
- **Border**: Same as normal fields
- **Cursor**: Not allowed (disabled)

### Lock Icon Overlay
- **Size**: 16x16 pixels
- **Position**: Absolute, top-right (12px from top, 12px from right)
- **Background**: `rgba(255, 255, 255, 0.9)` (semi-transparent white)
- **Border Radius**: 12px
- **Padding**: 4px

### Info Box Styling
- **Background**: `colors.skyLight + '20'` (light blue with transparency)
- **Border Left**: 3px solid `colors.sky` (#5B9FD4)
- **Padding**: 12px
- **Border Radius**: 8px
- **Margin**: 8px top, 16px bottom

## Interaction Behavior

### Locked Fields:
1. **Facility Selector**
   - ❌ Cannot open dropdown
   - ❌ Cannot change selection
   - ✅ Shows current value
   - ✅ Shows lock icon

2. **Date Picker**
   - ❌ Cannot open date picker
   - ❌ Cannot change date
   - ✅ Shows current date
   - ✅ Shows lock icon inline

3. **Start Time Input**
   - ❌ Cannot type or edit
   - ❌ Keyboard doesn't appear
   - ✅ Shows current time
   - ✅ Shows lock icon overlay

4. **Duration Selector**
   - ❌ Cannot open dropdown
   - ❌ Cannot change duration
   - ✅ Shows current duration
   - ✅ Shows lock icon overlay

### Unlocked Fields:
- All other fields remain fully editable
- User can modify title, description, participants, etc.
- Form validation still applies

## Color Palette

### Brand Colors Used:
- **Grass Green** (`#3D8C5E`): Rental banner border
- **Grass Light** (`#5BAB79`): Rental banner background (with transparency)
- **Sky Blue** (`#5B9FD4`): Info box border
- **Sky Light** (`#85BEE8`): Info box background (with transparency)
- **Soft Gray** (`#6B7C76`): Lock icons, disabled text
- **Ink** (`#1C2320`): Primary text

## Accessibility Considerations

### Screen Reader Support:
- Lock icons have semantic meaning
- Disabled fields are announced as "disabled"
- Info box provides context for locked fields

### Visual Contrast:
- Lock icons have sufficient contrast (4.5:1 minimum)
- Disabled text maintains readability
- Info box has clear visual distinction

### Touch Targets:
- Lock icons are visual indicators only (not interactive)
- Disabled fields don't respond to touch
- Info box is informational (not interactive)

## Implementation Details

### Conditional Rendering:
```typescript
const isFromRental = !!rentalId && !!rentalDetails;

// Wrap field in locked container
<View style={isFromRental ? styles.lockedFieldContainer : undefined}>
  <FormSelect
    disabled={isFromRental}
    // ... other props
  />
  {isFromRental && (
    <View style={styles.lockIconOverlay}>
      <Ionicons name="lock-closed" size={16} color={colors.soft} />
    </View>
  )}
</View>
```

### Styles:
```typescript
lockedFieldContainer: {
  position: 'relative', // For absolute positioning of lock icon
}

lockIconOverlay: {
  position: 'absolute',
  top: 12,
  right: 12,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderRadius: 12,
  padding: 4,
}

disabledField: {
  backgroundColor: '#F3F4F6',
  opacity: 0.7,
}

disabledText: {
  color: colors.soft,
}
```

## User Flow

1. **User navigates to My Rentals**
2. **User taps "Create Event" on a rental**
3. **Screen loads with rental banner** ✅
4. **Form pre-fills with rental details** ✅
5. **Locked fields show lock icons** ✅
6. **Info box explains locked fields** ✅
7. **User fills in remaining fields**
8. **User submits form**
9. **Event is created linked to rental** ✅

## Success Metrics

✅ **Visual Clarity**: Lock icons clearly indicate locked fields
✅ **User Understanding**: Info box explains why fields are locked
✅ **Consistent Design**: Uses brand colors and existing patterns
✅ **Accessibility**: Maintains contrast and screen reader support
✅ **User Experience**: Clear feedback prevents confusion

## Comparison: Before vs After

### Before:
- Fields were disabled but not clearly marked
- No explanation of why fields couldn't be edited
- Minimal visual feedback
- User might be confused

### After:
- Lock icons on all locked fields
- Prominent info box with explanation
- Consistent disabled styling
- Clear visual hierarchy
- User immediately understands the context
