# Task 13.6: Rental Information Display - Visual Diagram

## Component Structure

```
EventDetailsScreen
│
├─ ScreenHeader
│  └─ "Event Details"
│
├─ ScrollView
│  │
│  ├─ Header Section
│  │  ├─ Sport Icon
│  │  ├─ Event Title
│  │  └─ Badges (Skill Level, Status)
│  │
│  ├─ League Match Section (if applicable)
│  │
│  ├─ Description Section
│  │
│  ├─ Event Details Section
│  │  │
│  │  ├─ Start Time
│  │  │  └─ Calendar Icon + Date/Time
│  │  │
│  │  ├─ End Time
│  │  │  └─ Time Icon + Date/Time
│  │  │
│  │  ├─ Location
│  │  │  ├─ Location Icon
│  │  │  ├─ Facility Name
│  │  │  └─ Facility Address
│  │  │
│  │  └─ ⭐ RENTAL SECTION (NEW) ⭐
│  │     │
│  │     ├─ Rental Header
│  │     │  ├─ Calendar Icon (green)
│  │     │  └─ "Linked to Rental" (green text)
│  │     │
│  │     └─ Rental Details
│  │        │
│  │        ├─ Court/Field Row
│  │        │  ├─ Basketball Icon
│  │        │  ├─ "Court/Field:" label
│  │        │  └─ Court name (e.g., "Court 1")
│  │        │
│  │        ├─ Sport Type Row
│  │        │  ├─ Fitness Icon
│  │        │  ├─ "Sport Type:" label
│  │        │  └─ Sport type (e.g., "Basketball")
│  │        │
│  │        └─ Info Note
│  │           ├─ Info Icon (blue)
│  │           └─ "This event is using a pre-booked rental slot"
│  │
│  ├─ Participants Section
│  │
│  ├─ Equipment Section
│  │
│  ├─ Rules Section
│  │
│  └─ Organizer Section
│
└─ Action Buttons
   └─ Join Up / Step Out
```

## Data Flow

```
Backend API (GET /api/events/:id)
│
├─ Returns Event with Rental
│  {
│    id: "event-1",
│    title: "Basketball Game",
│    facilityId: "facility-1",
│    facility: { ... },
│    rentalId: "rental-1",
│    rental: {
│      id: "rental-1",
│      timeSlot: {
│        id: "slot-1",
│        court: {
│          id: "court-1",
│          name: "Court 1",
│          sportType: "basketball"
│        }
│      }
│    }
│  }
│
↓
│
EventDetailsScreen Component
│
├─ Checks if event.rental exists
│  │
│  ├─ YES → Display Rental Section
│  │  │
│  │  ├─ Extract court name: event.rental.timeSlot.court.name
│  │  ├─ Extract sport type: event.rental.timeSlot.court.sportType
│  │  ├─ Capitalize sport type for display
│  │  └─ Render rental section with styling
│  │
│  └─ NO → Skip rental section
│     └─ Display only location information
│
↓
│
User sees rental information
```

## Visual Layout

```
┌─────────────────────────────────────────────────────┐
│  Event Details                            [Edit]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🏀  Basketball Pickup Game                        │
│  [INTERMEDIATE]  [ACTIVE]                          │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Casual basketball game for intermediate players   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Event Details                                      │
│                                                     │
│  📅  Start                                          │
│      Monday, January 15, 2024 at 2:00 PM          │
│                                                     │
│  ⏰  End                                            │
│      Monday, January 15, 2024 at 4:00 PM          │
│                                                     │
│  📍  Location                                       │
│      Downtown Sports Complex                       │
│      123 Main St, Springfield                      │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 📅  Linked to Rental                          │ │
│  │                                               │ │
│  │ 🏀  Court/Field:  Court 1                    │ │
│  │                                               │ │
│  │ 💪  Sport Type:   Basketball                 │ │
│  │                                               │ │
│  │ ─────────────────────────────────────────── │ │
│  │                                               │ │
│  │ ℹ️   This event is using a pre-booked        │ │
│  │     rental slot                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  👥  Participants                                   │
│      5 / 10                                         │
│      5 spots available                             │
│                                                     │
│  💳  Price                                          │
│      Free                                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [        Join Up - Free        ]                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Styling Details

### Rental Section Container
```
┌─────────────────────────────────────┐
│ Background: grassLight + '08'       │ ← Light green tint
│ Border: 1px solid grass + '20'      │ ← Subtle green border
│ Border Radius: 12px                 │ ← Rounded corners
│ Padding: 16px                       │ ← Internal spacing
│ Margin Top: 16px                    │ ← Space from location
└─────────────────────────────────────┘
```

### Rental Header
```
┌─────────────────────────────────────┐
│ 📅  Linked to Rental                │
│ ↑   ↑                               │
│ │   └─ Text: 16px, bold, green      │
│ └───── Icon: 18px, green            │
└─────────────────────────────────────┘
```

### Detail Rows
```
┌─────────────────────────────────────┐
│ 🏀  Court/Field:  Court 1           │
│ ↑   ↑             ↑                 │
│ │   │             └─ Value: bold    │
│ │   └─ Label: gray, medium          │
│ └───── Icon: 16px, gray             │
└─────────────────────────────────────┘
```

### Info Note
```
┌─────────────────────────────────────┐
│ ─────────────────────────────────── │ ← Separator line
│                                     │
│ ℹ️   This event is using a          │
│     pre-booked rental slot          │
│ ↑   ↑                               │
│ │   └─ Text: 13px, italic, blue    │
│ └───── Icon: 16px, blue             │
└─────────────────────────────────────┘
```

## Color Scheme

```
Rental Section Colors:
├─ Background: #3D8C5E08 (grass green, 8% opacity)
├─ Border: #3D8C5E20 (grass green, 20% opacity)
├─ Header Text: #3D8C5E (grass green)
├─ Header Icon: #3D8C5E (grass green)
├─ Label Text: #6B7C76 (soft gray)
├─ Value Text: #1C2320 (ink black)
├─ Detail Icons: #6B7C76 (soft gray)
├─ Info Icon: #5B9FD4 (sky blue)
└─ Info Text: #5B9FD4 (sky blue)
```

## Conditional Rendering Logic

```typescript
// In EventDetailsScreen.tsx

{/* Location Section - Always shown */}
<View style={styles.detailRow}>
  <Ionicons name="location-outline" size={20} color="#666" />
  <View style={styles.detailContent}>
    <Text style={styles.detailLabel}>Location</Text>
    <Text style={styles.detailValue}>
      {event.facility?.name || 'Location TBD'}
    </Text>
    {event.facility && (
      <Text style={styles.detailSubtext}>
        {event.facility.street}, {event.facility.city}
      </Text>
    )}
  </View>
</View>

{/* Rental Section - Conditional */}
{event.rental && (
  <View style={styles.rentalSection}>
    {/* Rental content here */}
  </View>
)}

{/* Next section continues... */}
```

## State Diagram

```
Event Loaded
│
├─ Has rentalId?
│  │
│  ├─ YES
│  │  │
│  │  ├─ rental object exists?
│  │  │  │
│  │  │  ├─ YES
│  │  │  │  │
│  │  │  │  ├─ timeSlot exists?
│  │  │  │  │  │
│  │  │  │  │  ├─ YES
│  │  │  │  │  │  │
│  │  │  │  │  │  ├─ court exists?
│  │  │  │  │  │  │  │
│  │  │  │  │  │  │  ├─ YES
│  │  │  │  │  │  │  │  └─ ✅ Display Rental Section
│  │  │  │  │  │  │  │
│  │  │  │  │  │  │  └─ NO
│  │  │  │  │  │  │     └─ ❌ Skip (data incomplete)
│  │  │  │  │  │  │
│  │  │  │  │  │  └─ NO
│  │  │  │  │  │     └─ ❌ Skip (data incomplete)
│  │  │  │  │  │
│  │  │  │  │  └─ NO
│  │  │  │  │     └─ ❌ Skip (data incomplete)
│  │  │  │  │
│  │  │  │  └─ NO
│  │  │  │     └─ ❌ Skip (data incomplete)
│  │  │  │
│  │  │  └─ NO
│  │  │     └─ ❌ Skip (rental not loaded)
│  │  │
│  │  └─ Display location only
│  │
│  └─ NO
│     └─ Display location only
```

## Responsive Behavior

### Mobile (< 768px)
```
┌─────────────────────┐
│ Full width          │
│ Single column       │
│ Stacked layout      │
│                     │
│ 📅 Linked to Rental │
│                     │
│ 🏀 Court/Field:     │
│    Court 1          │
│                     │
│ 💪 Sport Type:      │
│    Basketball       │
│                     │
│ ℹ️  Info note       │
└─────────────────────┘
```

### Tablet (768px - 1024px)
```
┌───────────────────────────────┐
│ Wider layout                  │
│ More horizontal space         │
│                               │
│ 📅 Linked to Rental           │
│                               │
│ 🏀 Court/Field:  Court 1      │
│ 💪 Sport Type:   Basketball   │
│                               │
│ ℹ️  Info note                 │
└───────────────────────────────┘
```

### Desktop (> 1024px)
```
┌─────────────────────────────────────┐
│ Full width with max constraints     │
│ Optimal reading width               │
│                                     │
│ 📅 Linked to Rental                 │
│                                     │
│ 🏀 Court/Field:  Court 1            │
│ 💪 Sport Type:   Basketball         │
│                                     │
│ ℹ️  This event is using a           │
│    pre-booked rental slot           │
└─────────────────────────────────────┘
```

## Integration Points

```
Task 13.5 (Database Link)
│
├─ Event.rentalId → FacilityRental.id
│
└─ Backend includes rental in response
   │
   ↓
Task 13.6 (Display)
│
├─ EventDetailsScreen receives event with rental
│
├─ Conditional rendering checks event.rental
│
└─ Displays rental information
   │
   ↓
Future Tasks
│
├─ Task 14.1: EventCard shows rental indicator
├─ Task 14.2: Enhanced event details
└─ Task 14.3: Facility map with highlighted court
```

## Summary

The rental information display provides:

1. **Clear Visual Indicator**: Green-tinted section with calendar icon
2. **Essential Information**: Court name and sport type
3. **Context**: Informational note explaining the rental link
4. **Brand Consistency**: Uses Muster colors and design patterns
5. **Conditional Display**: Only shows when relevant
6. **Responsive Design**: Works on all screen sizes
7. **Accessibility**: Clear labels and sufficient contrast

This enhancement makes it immediately clear to users when an event is using a pre-booked rental slot and which specific court/field is being used.
